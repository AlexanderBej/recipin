import { MEASURING_UNITS, TAGS } from '@api/misc';

export type RecipeCategory =
  | 'breakfast'
  | 'lunch'
  | 'dinner'
  | 'snacks'
  | 'appetizers'
  | 'soups-stews'
  | 'salads'
  | 'sides'
  | 'flatbreads-breads'
  | 'pastries-doughs'
  | 'pasta-noodles'
  | 'rice-grains'
  | 'meat-dishes'
  | 'seafood-dishes'
  | 'vegetarian-mains'
  | 'vegan-mains'
  | 'desserts'
  | 'cakes-muffins'
  | 'cookies-bars'
  | 'drinks-smoothies'
  | 'sauces-condiments'
  | 'spice-mixes-marinades';

export type RecipeDifficulty = 'easy' | 'intermediate' | 'advanced';

export type TagCategory = keyof typeof TAGS;
export type TagValue = (typeof TAGS)[TagCategory][number];

export type MeasuringUnitCategory = keyof typeof MEASURING_UNITS;
export type MeasuringUnit = (typeof MEASURING_UNITS)[MeasuringUnitCategory][number];
