import type { RecipeCard, RecipeCardFilters } from '@api/models';
import { CATEGORY_META } from '@api/misc';
import { getRatingAverage, makeTitleSearch } from '@shared/utils';

export const recipeTitle = (recipe: RecipeCard) =>
  (typeof recipe.title === 'string' && recipe.title.trim()) || 'Untitled recipe';
export const recipeCategory = (recipe: RecipeCard) =>
  CATEGORY_META[recipe.category]?.label ?? 'Recipe';
export const recipeRating = (recipe: RecipeCard) => {
  const value = getRatingAverage(recipe.ratingCategories);
  return Number.isFinite(value) ? value : 0;
};

export function filterCollection(recipes: RecipeCard[], filters: RecipeCardFilters) {
  const prefix = makeTitleSearch(filters.searchTerm?.trim() ?? '');
  return recipes.filter(
    (recipe) =>
      (!prefix || makeTitleSearch(recipeTitle(recipe)).startsWith(prefix)) &&
      (!filters.category || recipe.category === filters.category) &&
      (!filters.difficulty || recipe.difficulty === filters.difficulty) &&
      (!filters.tag || recipe.tags?.includes(filters.tag)),
  );
}

export function recentRecipes(recipes: RecipeCard[]) {
  return [...recipes].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
}

export function rediscoverRecipe(recipes: RecipeCard[]) {
  const olderFirst = [...recentRecipes(recipes)].reverse();
  return (
    olderFirst.find((recipe) => typeof recipe.imageUrl === 'string' && recipe.imageUrl.trim()) ??
    olderFirst[0]
  );
}
