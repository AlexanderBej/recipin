import { RecipeCard } from './recipe.interface';

export interface RecipeCardFilters {
  category?: string;
  tag?: string;
  searchTerm?: string; // NEW
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
