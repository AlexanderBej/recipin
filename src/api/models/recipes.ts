import { RecipeCategory, RecipeDifficulty } from '@api/types';

export interface Recipe {
  id?: string;
  authorId: string;
  title: string;
  description?: string;
  ingredients: Ingredient[];
  steps: string[];
  category: RecipeCategory;
  tags: string[];
  servings?: number;
  prepMinutes?: number;
  cookMinutes?: number;
  imageUrl?: string;
  difficulty?: RecipeDifficulty;
  createdAt?: any;
  updatedAt?: any;
  isPublic?: boolean;
}

export interface Ingredient {
  item: string;
  unit?: string;
  quantity?: string;
}
