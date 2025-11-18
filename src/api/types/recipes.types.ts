import { FieldValue, Timestamp } from 'firebase/firestore';

import { MEASURING_UNITS } from '@api/misc';
import { RecipeEntity } from '@api/models';

export const RECIPE_CATEGORIES = [
  'breakfast',
  'lunch',
  'dinner',
  'snacks',
  'appetizers',
  'soups-stews',
  'salads',
  'sides',
  'flatbreads-breads',
  'pastries-doughs',
  'pasta-noodles',
  'rice-grains',
  'meat-dishes',
  'seafood-dishes',
  'vegetarian-mains',
  'vegan-mains',
  'desserts',
  'cakes-muffins',
  'cookies-bars',
  'drinks-smoothies',
  'sauces-condiments',
  'spice-mixes-marinades',
] as const;

export type RecipeCategory = (typeof RECIPE_CATEGORIES)[number];

export type RecipeDifficulty = 'easy' | 'intermediate' | 'advanced';

export type TagCategory = 'cuisine' | 'dietary' | 'method' | 'occasion' | 'time' | 'specific';
// export type TagValue = (typeof TAGS)[TagCategory][number];

export type MeasuringUnitCategory = keyof typeof MEASURING_UNITS;
// export type MeasuringUnit = (typeof MEASURING_UNITS)[MeasuringUnitCategory][number];

export type FireDate = Timestamp | FieldValue | null | undefined;

export type RatingCategory = 'taste' | 'ease' | 'health' | 'presentation' | 'value';

export type CreateRecipeInput = Omit<RecipeEntity, 'id' | 'createdAt' | 'updatedAt'>;
