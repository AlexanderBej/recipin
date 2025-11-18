import { RatingCategory, RecipeCategory, RecipeDifficulty, TagCategory } from '@api/types';

export interface RecipeCard {
  id: string;
  authorId: string;
  title: string;
  titleSearch?: string;
  category: RecipeCategory;
  imageUrl?: string;
  excerpt?: string | null;
  tags: string[];
  difficulty?: RecipeDifficulty;
  ratingCategories?: Partial<Record<RatingCategory, number>>;
  isFavorite?: boolean;
  createdAt?: number | null;
  updatedAt?: number | null;
}

export interface RecipeEntity extends RecipeCard {
  description?: string;
  ingredients: Ingredient[];
  steps: string[];
  servings?: number;
  prepMinutes?: number;
  cookMinutes?: number;
  isPublic?: boolean;
}

export interface Ingredient {
  item: string;
  unit?: string;
  quantity?: string;
}

export interface TagDef {
  id: string; // 'vegan'
  label: string; // 'Vegan'
}
