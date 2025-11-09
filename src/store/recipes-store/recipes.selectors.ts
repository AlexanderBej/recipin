import { RootState } from '../store';

export const selectAllRecipes = (state: RootState) => state.recipes.items;
export const selectRecipesLoading = (state: RootState) => state.recipes.loading;
export const selectRecipesError = (state: RootState) => state.recipes.error;
export const selectRecipesSelected = (state: RootState) => state.recipes.selected;
