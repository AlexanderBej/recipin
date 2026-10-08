import { createAppAsyncThunk } from '@api/types';
import type { PlanItem, GroceryRecipe } from '@api/models';
import { getRecipe } from '@api/services';
import { addGroceryRecipe, setLastGeneratedAt } from './grocery.slice';
import { recipeIngredients } from '../../features/recipe-details/recipe-display.utils';

export const generatePlannedGroceries = createAppAsyncThunk<
  { added: number; existing: number; unavailable: number },
  { uid: string; items: PlanItem[] }
>('grocery/generatePlanned', async ({ uid, items }, { getState, dispatch, rejectWithValue }) => {
  try {
    const ids = [
      ...new Set(
        items.filter((item) => item.userId === uid && item.recipeId).map((item) => item.recipeId),
      ),
    ];
    const existingIds = new Set(getState().grocery.recipes.map((group) => group.recipeId));
    let existing = ids.filter((id) => existingIds.has(id)).length;
    let unavailable = 0;
    // Collect everything first: failed reads must not leave a partially generated list.
    const groups = await Promise.all(
      ids
        .filter((id) => !existingIds.has(id))
        .map(async (id): Promise<GroceryRecipe | null> => {
          const recipe = await getRecipe(id);
          if (!recipe || recipe.authorId !== uid) {
            unavailable++;
            return null;
          }
          const ingredients = recipeIngredients(recipe);
          if (!ingredients.length) {
            unavailable++;
            return null;
          }
          return {
            recipeId: id,
            title:
              typeof recipe.title === 'string' && recipe.title.trim()
                ? recipe.title
                : 'Untitled recipe',
            items: ingredients.map((ingredient) => ({
              id: crypto.randomUUID(),
              name: ingredient.item,
              quantity: ingredient.quantity,
              unit: ingredient.unit,
              checked: false,
              sourceRecipeId: [id],
            })),
          };
        }),
    );
    if (getState().auth.user?.uid !== uid) return rejectWithValue('Your session changed.');
    let added = 0;
    for (const group of groups) {
      if (!group) continue;
      if (getState().grocery.recipes.some((current) => current.recipeId === group.recipeId)) {
        existing++;
        continue;
      }
      dispatch(addGroceryRecipe(group));
      added++;
    }
    if (added) dispatch(setLastGeneratedAt(new Date().toISOString()));
    return { added, existing, unavailable };
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : 'Could not generate Groceries.',
    );
  }
});
