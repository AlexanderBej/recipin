import type { Ingredient, RecipeEntity } from '@api/models';
import type { RatingCategory } from '@api/types';

export function positiveNumber(value: unknown): number | undefined {
  if (typeof value !== 'number' && typeof value !== 'string') return undefined;
  if (typeof value === 'string' && !value.trim()) return undefined;
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : undefined;
}
export const textValue = (value: unknown): string =>
  typeof value === 'string'
    ? value.trim()
    : typeof value === 'number' && Number.isFinite(value)
      ? String(value)
      : '';
export function recipeIngredients(recipe: RecipeEntity): Ingredient[] {
  return Array.isArray(recipe.ingredients)
    ? recipe.ingredients.flatMap((value: unknown) => {
        if (typeof value === 'string') return value.trim() ? [{ item: value.trim() }] : [];
        if (!value || typeof value !== 'object') return [];
        const item = value as Record<string, unknown>;
        const name = textValue(item.item);
        return name
          ? [
              {
                item: name,
                quantity: textValue(item.quantity) || undefined,
                unit: textValue(item.unit) || undefined,
              },
            ]
          : [];
      })
    : [];
}
export function recipeSteps(recipe: RecipeEntity): string[] {
  return Array.isArray(recipe.steps)
    ? recipe.steps
        .filter((step): step is string => typeof step === 'string' && !!step.trim())
        .map((step) => step.trim())
    : [];
}
export function displayMinutes(value: unknown): string | undefined {
  if ((typeof value !== 'string' && typeof value !== 'number') || value === '') return undefined;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || (typeof value === 'string' && !value.trim()))
    return undefined;
  return `${number} min`;
}
export function safeRatings(value: RecipeEntity['ratingCategories']) {
  const result: Partial<Record<RatingCategory, number>> = {};
  for (const category of ['taste', 'ease', 'health', 'presentation', 'value'] as const) {
    const rating = positiveNumber(value?.[category]);
    if (rating && rating <= 5) result[category] = rating;
  }
  return result;
}
