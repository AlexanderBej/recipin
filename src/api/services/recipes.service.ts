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
  startAt,
  endAt,
} from 'firebase/firestore';

import { db } from '@lib/firebase';
import {
  ListRecipeCardsOptions,
  ListRecipeCardsResult,
  RecipeCard,
  RecipeEntity,
} from '@api/models';
import { CreateRecipeInput, RatingCategory } from '@api/types';
import { makeTitleSearch } from '@shared/utils';

const recipesCol = collection(db, 'recipes');
const cardsCol = collection(db, 'recipe_cards');

const toMillis = (v: any): number | null =>
  v && typeof v.toMillis === 'function' ? v.toMillis() : null;

export async function listRecipeCardsByOwnerPaged(
  uid: string,
  {
    pageSize = 24,
    startAfterCreatedAt = null,
    startAfterTitle = null,
    filters = {},
  }: ListRecipeCardsOptions = {},
): Promise<ListRecipeCardsResult> {
  const { category, tag, searchTerm } = filters;
  const hasSearch = !!searchTerm && searchTerm.trim().length > 0;

  const clauses = [where('authorId', '==', uid)];

  if (category) clauses.push(where('category', '==', category));
  if (tag) clauses.push(where('tags', 'array-contains', tag));

  let q;

  if (hasSearch) {
    // ---------- SEARCH MODE (titleSearch prefix) ----------
    const normalizedSearch = makeTitleSearch(searchTerm!.trim());

    // base query: titleSearch range
    let base = query(
      cardsCol,
      ...clauses,
      orderBy('titleSearch'),
      endAt(normalizedSearch + '\uf8ff'),
      limit(pageSize),
    );

    // first page vs next pages
    if (startAfterTitle) {
      base = query(base, startAfter(startAfterTitle));
    } else {
      base = query(base, startAt(normalizedSearch));
    }

    q = base;
  } else {
    // ---------- BROWSE MODE (createdAt desc) ----------
    let base = query(cardsCol, ...clauses, orderBy('createdAt', 'desc'), limit(pageSize));

    if (startAfterCreatedAt != null) {
      base = query(base, startAfter(Timestamp.fromMillis(startAfterCreatedAt)));
    }

    q = base;
  }

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
        isFavorite: x.isFavorite,
        ratingCategories: x.ratingCategories ?? null,
        createdAt: toMillis(x.createdAt),
        updatedAt: toMillis(x.updatedAt),
        // NOTE: we don't need to expose titleSearch in RecipeCard
      };
    });

    const last = snap.docs.at(-1);
    let nextStartAfterCreatedAt: number | null = null;
    let nextStartAfterTitle: string | null = null;

    if (last) {
      const data = last.data() as any;

      if (hasSearch) {
        nextStartAfterTitle = data.titleSearch ?? null;
      } else {
        nextStartAfterCreatedAt = toMillis(data.createdAt);
      }
    }

    return { items, nextStartAfterCreatedAt, nextStartAfterTitle };
  } catch (e) {
    console.error('[cards paged] query failed:', e);
    throw e;
  }
}

export async function listFavoriteRecipes(uid: string) {
  const clauses = [where('authorId', '==', uid), where('isFavorite', '==', true)];
  const base = query(cardsCol, ...clauses, orderBy('createdAt', 'desc'), limit(100));

  try {
    const snap = await getDocs(base);

    const items: RecipeCard[] = snap.docs.map((d) => {
      const x = d.data() as any;
      return {
        id: d.id,
        authorId: x.authorId,
        title: x.title,
        titleSearch: makeTitleSearch(x.title),
        category: x.category,
        tags: x.tags ?? [],
        difficulty: x.difficulty ?? null,
        imageUrl: x.imageUrl ?? null,
        excerpt: x.excerpt ?? null,
        isFavorite: x.isFavorite,
        ratingCategories: x.ratingCategories ?? null,
        createdAt: toMillis(x.createdAt),
        updatedAt: toMillis(x.updatedAt),
      };
    });

    return { items };
  } catch (e) {
    console.error('[cards paged] favorite query failed:', e);
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
    titleSearch: makeTitleSearch(d.title),
    category: d.category,
    tags: d.tags ?? [],
    difficulty: d.difficulty ?? null,
    imageUrl: d.imageUrl ?? null,
    excerpt: d.excerpt ?? null,
    description: d.description ?? '',
    ingredients: d.ingredients ?? [],
    steps: d.steps ?? [],
    isFavorite: d.isFavorite,
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
    titleSearch: makeTitleSearch(cardDoc.title),
    category: cardDoc.category,
    tags: cardDoc.tags,
    isFavorite: false,
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

export async function toggleRecipeFavorite(recipeId: string, fav: boolean) {
  // Write to both collections in parallel
  await Promise.all([
    updateDoc(doc(db, 'recipe_cards', recipeId), { isFavorite: fav }),
    updateDoc(doc(db, 'recipes', recipeId), { isFavorite: fav }),
  ]);

  return { id: recipeId, fav };
}
