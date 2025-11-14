import { createSelector } from '@reduxjs/toolkit';

import { RootState } from '../store';

export const selectGroceryRecipes = (state: RootState) => state.grocery.recipes;

// export const selectHasGroceryRecipe = (recipeId: string) =>
//   state.grocery.recipes.some((r) => r.recipeId === recipeId);

// Optional: get the full recipe by id
export const selectGroceryRecipeById = (state: RootState, recipeId: string) =>
  state.grocery.recipes.find((r) => r.recipeId === recipeId) ?? null;

export const makeSelectHasGroceryRecipe = (recipeId: string) =>
  createSelector(
    [selectGroceryRecipes],
    (recipes) => recipes.some((r) => r.recipeId === recipeId) ?? null,
  );
