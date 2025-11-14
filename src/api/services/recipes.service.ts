import {
  collection,
  doc,
  getDoc,
  getDocs,
  writeBatch,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  DocumentData,
  Timestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

import { db } from '@lib/firebase';
import { RecipeCard, RecipeEntity } from '@api/models';
import { CreateRecipeInput, RatingCategory } from '@api/types';

const recipesCol = collection(db, 'recipes');
const cardsCol = collection(db, 'recipe_cards');

const toMillis = (v: any): number | null =>
  v && typeof v.toMillis === 'function' ? v.toMillis() : null;

export async function listRecipeCardsByOwnerPaged(
  uid: string,
  pageSize = 24,
  startAfterCreatedAt?: number | null,
  filters: { category?: string; tag?: string } = {},
) {
  const clauses = [where('authorId', '==', uid)];

  if (filters.category) clauses.push(where('category', '==', filters.category));
  if (filters.tag) clauses.push(where('tags', 'array-contains', filters.tag));
  const base = query(cardsCol, ...clauses, orderBy('createdAt', 'desc'), limit(pageSize));

  const q =
    startAfterCreatedAt != null
      ? query(base, startAfter(Timestamp.fromMillis(startAfterCreatedAt)))
      : base;

  try {
    const snap = await getDocs(q);

    const items: RecipeCard[] = snap.docs.map((d) => {
      const x = d.data() as any;
      return {
        id: d.id,
        authorId: x.authorId,
        title: x.title,
        category: x.category,
        tags: x.tags ?? [],
        difficulty: x.difficulty ?? null,
        imageUrl: x.imageUrl ?? null,
        excerpt: x.excerpt ?? null,
        ratingCategories: x.ratingCategories ?? null,
        createdAt: toMillis(x.createdAt),
        updatedAt: toMillis(x.updatedAt),
      };
    });

    const last = snap.docs.at(-1);
    const nextStartAfter = last ? toMillis((last.data() as any).createdAt) : null;

    return { items, nextStartAfter };
  } catch (e) {
    console.error('[cards paged] query failed:', e);
    throw e;
  }
}

export async function getRecipe(id: string): Promise<RecipeEntity | null> {
  const ref = doc(recipesCol, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const d = snap.data() as any;
  return {
    id: snap.id,
    authorId: d.authorId,
    title: d.title,
    category: d.category,
    tags: d.tags ?? [],
    difficulty: d.difficulty ?? null,
    imageUrl: d.imageUrl ?? null,
    excerpt: d.excerpt ?? null,
    description: d.description ?? '',
    ingredients: d.ingredients ?? [],
    steps: d.steps ?? [],
    servings: d.servings,
    prepMinutes: d.prepMinutes,
    cookMinutes: d.cookMinutes,
    isPublic: !!d.isPublic,
    ratingCategories: d.ratingCategories,
    createdAt: toMillis(d.createdAt),
    updatedAt: toMillis(d.updatedAt),
  };
}

export async function addRecipePair(data: CreateRecipeInput) {
  const batch = writeBatch(db);
  const recipeRef = doc(recipesCol); // generate ID once
  const cardRef = doc(cardsCol, recipeRef.id); // reuse same ID

  const now = { createdAt: serverTimestamp(), updatedAt: serverTimestamp() };

  const recipeDoc: DocumentData = { ...data, ...now, isPublic: data.isPublic ?? false };
  batch.set(recipeRef, recipeDoc);

  const cardDoc: DocumentData = {
    authorId: data.authorId,
    title: data.title,
    category: data.category,
    tags: data.tags ?? [],
    difficulty: data.difficulty ?? null,
    imageUrl: data.imageUrl ?? null,
    excerpt: (data.description ?? '').slice(0, 140),
    ...now,
  };
  batch.set(cardRef, cardDoc);

  await batch.commit();

  // Return a UI-ready card so the list can update instantly
  const card: RecipeCard = {
    id: recipeRef.id,
    authorId: cardDoc.authorId,
    title: cardDoc.title,
    category: cardDoc.category,
    tags: cardDoc.tags,
    ...cardDoc,
    createdAt: null, // server sets it; you can refetch page or leave null until next load
    updatedAt: null,
  };

  return { id: recipeRef.id, card };
}

export async function deleteRecipePair(id: string) {
  await Promise.all([deleteDoc(doc(recipesCol, id)), deleteDoc(doc(cardsCol, id))]);
}

export async function saveMyRating(
  recipeId: string,
  cats: Partial<Record<RatingCategory, number>>,
) {
  await setDoc(doc(db, 'recipe_cards', recipeId), { ratingCategories: cats }, { merge: true });
  return { cats, id: recipeId };
}

export async function saveSoloRating(recipeId: string, cat: RatingCategory, value: number) {
  const path = `ratingCategories.${cat}`;

  // Write to both collections in parallel
  await Promise.all([
    updateDoc(doc(db, 'recipe_cards', recipeId), { [path]: value }),
    updateDoc(doc(db, 'recipes', recipeId), { [path]: value }),
  ]);

  return { id: recipeId, cat, value };
}
