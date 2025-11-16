import { PlanItem } from '@api/models';
import { MealSlot } from '@api/types';
import { addDays, formatISO } from 'date-fns';

export const getItemsForSlot = (items: PlanItem[], date: string, meal: MealSlot): PlanItem[] =>
  items.filter((item) => item.date === date && item.meal === meal);

export const getItemForSlot = (
  items: PlanItem[],
  date: string,
  meal: MealSlot,
): PlanItem | undefined => items.find((item) => item.date === date && item.meal === meal);

/**
 * Helper: group a flat list into PlannerByDate for your Redux slice.
 */
export function groupPlanItemsByDate(items: PlanItem[]): Record<string, PlanItem[]> {
  const byDate: Record<string, PlanItem[]> = {};

  for (const item of items) {
    if (!byDate[item.date]) byDate[item.date] = [];
    byDate[item.date].push(item);
  }

  return byDate;
}

export function computeThreeWeekWindow(anchor: Date): { fromISO: string; toISO: string } {
  const lastWeekStart = addDays(anchor, -7);
  const nextWeekEnd = addDays(anchor, 6 + 7); // current week + 7 days → Sunday of next week

  const fromISO = formatISO(lastWeekStart, { representation: 'date' });
  const toISO = formatISO(nextWeekEnd, { representation: 'date' });

  return { fromISO, toISO };
}
