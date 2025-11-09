import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';

import { Recipe } from '@api/models/recipes';
import { db } from '@lib/firebase';

const col = collection(db, 'recipes');

export async function listRecipesByOwner(uid: string) {
  const q = query(col, where('authorId', '==', uid), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Recipe) }));
}

export async function getRecipe(id: string) {
  const ref = doc(db, 'recipes', id);
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...(snap.data() as Recipe) } : null;
}

export async function addRecipe(data: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>) {
  const res = await addDoc(col, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    isPublic: false,
  });
  return res.id;
}

export async function updateRecipe(id: string, data: Partial<Recipe>) {
  const ref = doc(db, 'recipes', id);
  await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
}

export async function deleteRecipe(id: string) {
  await deleteDoc(doc(db, 'recipes', id));
}

export function onUserRecipesSnapshot(uid: string, cb: (recipes: Recipe[]) => void) {
  const col = collection(db, 'recipes');
  const q = query(col, where('authorId', '==', uid), orderBy('createdAt', 'desc'));

  // returns unsubscribe
  return onSnapshot(q, (snap) => {
    const items: Recipe[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Recipe) }));
    cb(items);
  });
}
