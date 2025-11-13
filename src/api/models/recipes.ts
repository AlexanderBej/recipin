import { RatingCategory, RecipeCategory, RecipeDifficulty } from '@api/types';

export interface RecipeCard {
  id: string;
  authorId: string;
  title: string;
  category: RecipeCategory;
  imageUrl?: string;
  excerpt?: string | null;
  tags: string[];
  difficulty?: RecipeDifficulty;
  ratingCategories?: Partial<Record<RatingCategory, number>>;
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

// export interface RecipeRating {
//   categories: Partial<Record<RatingCategory, number>>; // integers 0..5
//   total: number;                                        // sum(categories)
//   updatedAt?: number;                                   // ms since epoch (keep it serializable)
// };
