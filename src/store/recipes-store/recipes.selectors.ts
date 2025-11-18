import { RootState } from '../store';
import { cardsAdapter } from './recipes.slice';

const cardsSelectors = cardsAdapter.getSelectors<RootState>((st) => st.recipes.cards);
export const selectAllRecipes = cardsSelectors.selectAll;

export const selectRecipesLoading = (state: RootState) => state.recipes.mine.loading;
export const selectRecipesBootLoading = (state: RootState) => state.recipes.bootLoading;

export const selectRecipesError = (state: RootState) => state.recipes.mine.error;
export const selectMyCardsHasMore = (s: RootState) =>
  !!s.recipes.mine.nextStartAfterCreatedAt || !!s.recipes.mine.nextStartAfterTitle;

export const selectRecipesPageSize = (state: RootState) => state.recipes.mine.pageSize;

export const selectCardById = (s: RootState, id: string) => cardsSelectors.selectById(s, id);
export const selectRecipesCurrent = (state: RootState) => state.recipes.currentRecipe;
export const selectRecipesFavorites = (state: RootState) => state.recipes.favorites;

export const selectRecipesLastFilters = (state: RootState) => state.recipes.mine.lastFilters;
