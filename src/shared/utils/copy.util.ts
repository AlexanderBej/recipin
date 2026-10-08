import { GroceryItem, GroceryRecipe } from '@api/models';
import { buildIngredient } from './formatters.util';

export function buildIngredientText(
  ingredients: GroceryItem[],
  { onlyUnchecked }: { onlyUnchecked?: boolean } = {},
) {
  const filtered = onlyUnchecked ? ingredients.filter((i) => !i.checked) : ingredients;

  return filtered
    .map((ing) => buildIngredient({ item: ing.name, quantity: ing.quantity, unit: ing.unit }))
    .join('\n');
}

export function buildPageIngredientsText(
  recipes: GroceryRecipe[],
  { onlyUnchecked }: { onlyUnchecked?: boolean } = {},
) {
  const lines: string[] = [];

  recipes.forEach((recipe) => {
    const text = buildIngredientText(recipe.items, { onlyUnchecked });
    if (!text) return;

    lines.push(recipe.title);
    lines.push(text);
    lines.push(''); // blank line between recipes
  });

  return lines.join('\n');
}
