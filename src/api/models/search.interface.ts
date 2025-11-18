import { RecipeCategory, RecipeDifficulty } from '@api/types';
import { RecipeCard } from './recipe.interface';

export interface RecipeCardFilters {
  category?: RecipeCategory;
  tag?: string;
  searchTerm?: string;
  difficulty?: RecipeDifficulty;
}

export interface ListRecipeCardsOptions {
  pageSize?: number;
  startAfterCreatedAt?: number | null; // browse cursor
  startAfterTitle?: string | null; // search cursor
  filters?: RecipeCardFilters;
}

export interface ListRecipeCardsResult {
  items: RecipeCard[];
  nextStartAfterCreatedAt: number | null;
  nextStartAfterTitle: string | null;
}
