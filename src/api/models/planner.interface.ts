import { MealSlot } from '@api/types';

export interface PlanItem {
  id: string; // unique local id (e.g. uuid)
  userId: string;
  date: string; // ISO date 'YYYY-MM-DD'
  meal: MealSlot; // which meal of the day
  recipeId: string; // reference to recipe doc/id
  recipeName: string; // reference to recipe doc/id
  recipeImgUrl?: string; // reference to recipe doc/id
  servings?: number; // overrides recipe default
  notes?: string; // optional notes or reminders
}
