import { addDays, formatISO } from 'date-fns';
import { createSelector } from '@reduxjs/toolkit';

import { MealSlot, RootState } from '@api/types';
import { MEAL_SLOTS } from '@api/misc';
import { selectPlannerByDate } from './planner.selectors';

// 'YYYY-MM-DD' -> { breakfast?: boolean; lunch?: boolean; ... }
export type WeekGrid = Record<string, Partial<Record<MealSlot, boolean>>>;

export const makeSelectWeekGrid = () =>
  createSelector(
    [
      selectPlannerByDate,
      (_: RootState, weekStart: string) => weekStart, // 'YYYY-MM-DD'
    ],
    (byDate, weekStart): WeekGrid => {
      const grid: WeekGrid = {};

      const startDate = new Date(weekStart);

      // 1) initialize 7 days × meals as false
      for (let i = 0; i < 7; i++) {
        const date = formatISO(addDays(startDate, i), { representation: 'date' });
        grid[date] = {};
        for (const meal of MEAL_SLOTS) {
          grid[date][meal] = false;
        }
      }

      // 2) mark cells that have at least one item
      for (const date in byDate) {
        if (!Object.prototype.hasOwnProperty.call(byDate, date)) continue;
        if (!grid[date]) continue;

        const itemsForDay = byDate[date]; // inferred as PlanItem[]
        for (const item of itemsForDay) {
          grid[date][item.meal] = true;
        }
      }

      return grid;
    },
  );
