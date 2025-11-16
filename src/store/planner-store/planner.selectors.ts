import { createSelector } from '@reduxjs/toolkit';

import { RootState } from '../store';
import { MealSlot } from '@api/types';
import { PlannerByDate } from './planner.slice';

export const selectPlannerState = (state: RootState) => state.planner;

// Map: 'YYYY-MM-DD' -> PlanItem[]
export const selectPlannerByDate = (state: RootState): PlannerByDate => state.planner.byDate ?? {};

export const selectPlannerWeekStart = (state: RootState) => state.planner.anchorWeekStart;

export const makeSelectPlanForDate = () =>
  createSelector(
    [
      selectPlannerByDate,
      (_: RootState, date: string) => date, // 'YYYY-MM-DD'
    ],
    (byDate, date) => byDate[date] ?? [],
  );

export const makeSelectItemsForSlot = () =>
  createSelector(
    [
      selectPlannerByDate,
      (_: RootState, date: string) => date,
      (_: RootState, __: string, meal: MealSlot) => meal,
    ],
    (byDate, date, meal) => {
      const dayItems = byDate[date] ?? [];
      return dayItems.filter((item: { meal: string }) => item.meal === meal);
    },
  );

export const makeSelectItemForSlot = () =>
  createSelector(
    [
      selectPlannerByDate,
      (_: RootState, date: string) => date,
      (_: RootState, __: string, meal: MealSlot) => meal,
    ],
    (byDate, date, meal) => {
      const dayItems = byDate[date] ?? [];
      return dayItems.find((item: { meal: string }) => item.meal === meal);
    },
  );
