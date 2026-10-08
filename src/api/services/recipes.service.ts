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
  runTransaction,
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

// Discovery uses the complete personal card collection, independently of Library queries.
export async function listDiscoveryRecipeCards(uid: string): Promise<RecipeCard[]> {
  const snap = await getDocs(query(cardsCol, where('authorId', '==', uid)));
  return snap.docs.map((d) => {
    const x = d.data();
    return {
      id: d.id,
      authorId: x.authorId,
      title: x.title,
      category: x.category,
      tags: Array.isArray(x.tags) ? x.tags : [],
      difficulty: x.difficulty,
      imageUrl: x.imageUrl,
      excerpt: x.excerpt,
      isFavorite: x.isFavorite,
      ratingCategories: x.ratingCategories,
      createdAt: toMillis(x.createdAt),
      updatedAt: toMillis(x.updatedAt),
    };
  });
}

export async function listRecipeCardsByOwnerPaged(
  uid: string,
  {
    pageSize = 24,
    startAfterCreatedAt = null,
    startAfterTitle = null,
    filters = {},
  }: ListRecipeCardsOptions = {},
): Promise<ListRecipeCardsResult> {
  const { category, tag, searchTerm, difficulty } = filters;
  const hasSearch = !!searchTerm && searchTerm.trim().length > 0;

  const clauses = [where('authorId', '==', uid)];

  if (category) clauses.push(where('category', '==', category));
  if (tag) clauses.push(where('tags', 'array-contains', tag));
  if (difficulty) clauses.push(where('difficulty', '==', difficulty));

  console.log('filters', filters);
  console.log('clauses', clauses);

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
  return recipeFromData(snap.id, snap.data());
}

function recipeFromData(id: string, d: DocumentData): RecipeEntity {
  return {
    id,
    authorId: d.authorId,
    title: d.title,
    titleSearch: makeTitleSearch(typeof d.title === 'string' ? d.title : ''),
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

const editableFields = [
  'title',
  'description',
  'category',
  'difficulty',
  'tags',
  'servings',
  'prepMinutes',
  'cookMinutes',
  'ingredients',
  'steps',
  'imageUrl',
] as const;

// Include content as well as the timestamp: legacy writers may not update updatedAt.
export function recipeRevision(data: DocumentData): string {
  return JSON.stringify([
    data.updatedAt ?? null,
    ...editableFields.map((field) => data[field] ?? null),
  ]);
}

export async function getRecipeForEditing(uid: string, id: string) {
  const snap = await getDoc(doc(recipesCol, id));
  if (!snap.exists()) return null;
  const data = snap.data();
  if (data.authorId !== uid) throw new Error('You cannot edit this recipe.');
  return { recipe: recipeFromData(id, data), revision: recipeRevision(data) };
}

export type UpdateRecipeInput = {
  uid: string;
  id: string;
  expectedRevision: string;
  changes: DocumentData;
};

export async function updateRecipePair({ uid, id, expectedRevision, changes }: UpdateRecipeInput) {
  return runTransaction(db, async (transaction) => {
    const recipeRef = doc(recipesCol, id);
    const cardRef = doc(cardsCol, id);
    const recipeSnap = await transaction.get(recipeRef);
    const cardSnap = await transaction.get(cardRef);
    if (!recipeSnap.exists()) throw new Error('This recipe no longer exists.');
    const current = recipeSnap.data();
    if (current.authorId !== uid) throw new Error('You cannot edit this recipe.');
    if (recipeRevision(current) !== expectedRevision) {
      const error = new Error(
        'This recipe changed. Discard this draft and reload the latest version before saving.',
      );
      error.name = 'RecipeEditConflict';
      throw error;
    }
    const patch: DocumentData = {};
    for (const field of editableFields) {
      if (Object.hasOwn(changes, field) && changes[field] !== undefined)
        patch[field] = changes[field];
    }
    const merged = { ...current, ...patch };
    const derived = {
      titleSearch: makeTitleSearch(typeof merged.title === 'string' ? merged.title : ''),
      excerpt: typeof merged.description === 'string' ? merged.description.slice(0, 140) : '',
    };
    const cardPatch: DocumentData = { ...derived, updatedAt: serverTimestamp() };
    for (const field of ['title', 'category', 'difficulty', 'tags', 'imageUrl']) {
      if (Object.hasOwn(patch, field)) cardPatch[field] = patch[field];
    }
    transaction.update(recipeRef, { ...patch, ...derived, updatedAt: serverTimestamp() });
    let cardData: DocumentData;
    if (cardSnap.exists()) {
      transaction.update(cardRef, cardPatch);
      cardData = { ...cardSnap.data(), ...cardPatch };
    } else {
      cardData = {
        authorId: uid,
        title: merged.title,
        category: merged.category ?? null,
        tags: merged.tags ?? [],
        difficulty: merged.difficulty ?? null,
        imageUrl: merged.imageUrl ?? null,
        isFavorite: merged.isFavorite ?? false,
        ratingCategories: merged.ratingCategories ?? null,
        createdAt: merged.createdAt ?? serverTimestamp(),
        ...cardPatch,
      };
      transaction.set(cardRef, cardData);
    }
    const recipe = recipeFromData(id, { ...merged, ...derived, updatedAt: null });
    const card = {
      ...cardData,
      id,
      createdAt: toMillis(cardData.createdAt),
      updatedAt: null,
    } as RecipeCard;
    return { recipe, card };
  });
}

export async function addRecipePair(data: CreateRecipeInput) {
  const batch = writeBatch(db);
  const recipeRef = doc(recipesCol); // generate ID once
  const cardRef = doc(cardsCol, recipeRef.id); // reuse same ID

  const now = { createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
  const titleSearch = makeTitleSearch(data.title);
  const definedData = Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined),
  );
  const recipeDoc: DocumentData = {
    ...definedData,
    titleSearch,
    excerpt: (data.description ?? '').slice(0, 140),
    ...now,
    isPublic: data.isPublic ?? false,
  };
  batch.set(recipeRef, recipeDoc);

  const cardDoc: DocumentData = {
    authorId: data.authorId,
    title: data.title,
    titleSearch,
    category: data.category ?? null,
    tags: data.tags ?? [],
    difficulty: data.difficulty ?? null,
    imageUrl: data.imageUrl ?? null,
    excerpt: (data.description ?? '').slice(0, 140),
    isFavorite: data.isFavorite ?? false,
    ratingCategories: data.ratingCategories ?? null,
    ...now,
  };
  batch.set(cardRef, cardDoc);

  await batch.commit();

  // Return a UI-ready card so the list can update instantly
  const card: RecipeCard = {
    id: recipeRef.id,
    authorId: cardDoc.authorId,
    title: cardDoc.title,
    titleSearch,
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

export async function toggleRecipeFavorite(recipeId: string, fav: boolean) {
  // Write to both collections in parallel
  await Promise.all([
    updateDoc(doc(db, 'recipe_cards', recipeId), { isFavorite: fav }),
    updateDoc(doc(db, 'recipes', recipeId), { isFavorite: fav }),
  ]);

  return { id: recipeId, fav };
}
