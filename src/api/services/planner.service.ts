// planner.service.ts

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { addDays, formatISO } from 'date-fns';

import { db } from '@lib/firebase';
import { PlanItem } from '@api/models';

// Collection reference (could also be exported from a central api/services file)
const plannerCol = collection(db, 'planner_items');

/**
 * Internal helper to map Firestore doc -> PlanItem domain object.
 */
function mapDocToPlanItem(d: any): PlanItem {
  const data = d.data() as any;

  return {
    id: d.id,
    userId: d.userId,
    date: data.date,
    meal: data.meal,
    recipeId: data.recipeId,
    recipeName: data.name,
    recipeImgUrl: data.recipeImgUrl,
    servings: data.servings,
    notes: data.notes,
  };
}

/**
 * Add (or overwrite) a single plan item.
 *
 * You typically call this when the user planners a recipe in a given slot.
 */
export async function addPlanItem(uid: string, input: Omit<PlanItem, 'id'>): Promise<PlanItem> {
  const now = Timestamp.now();

  // You can decide to enforce uniqueness (date+meal) in Firestore rules
  // if you don't want multiple recipes in the same slot.
  const docRef = await addDoc(plannerCol, {
    userId: uid,
    date: input.date,
    meal: input.meal,
    recipeId: input.recipeId,
    recipeName: input.recipeName,
    recipeImgUrl: input.recipeImgUrl,
    servings: input.servings ?? null,
    notes: input.notes ?? null,
    createdAt: now,
    updatedAt: now,
  });

  return {
    ...input,
    id: docRef.id,
  };
}

/**
 * Remove a plan item by Firestore id.
 * You’ll typically already know the id from the Redux PlanItem.
 */
export async function removePlanItemFromDb(planItemId: string): Promise<void> {
  const ref = doc(plannerCol, planItemId);
  await deleteDoc(ref);
}

/**
 * List all plan items for a user in a date range [fromDate, toDate].
 *
 * Dates are 'YYYY-MM-DD' strings.
 */
export async function listPlanItemsForRange(
  uid: string,
  fromDate: string,
  toDate: string,
): Promise<PlanItem[]> {
  const q = query(
    plannerCol,
    where('userId', '==', uid),
    where('date', '>=', fromDate),
    where('date', '<=', toDate),
    orderBy('date', 'asc'),
    orderBy('meal', 'asc'), // optional, but makes results stable / nice
  );

  const snap = await getDocs(q);
  return snap.docs.map(mapDocToPlanItem);
}

/**
 * Convenience: list all items for a given week.
 *
 * weekStartISO is a Date or ISO string representing the Monday (or whatever) of the week.
 * It will fetch [weekStart, weekStart+6 days].
 */
export async function listPlanItemsForWeek(
  uid: string,
  weekStart: Date | string,
): Promise<PlanItem[]> {
  const startDate = typeof weekStart === 'string' ? new Date(weekStart) : weekStart;

  const from = formatISO(startDate, { representation: 'date' });
  const endDate = addDays(startDate, 6);
  const to = formatISO(endDate, { representation: 'date' });

  return listPlanItemsForRange(uid, from, to);
}
