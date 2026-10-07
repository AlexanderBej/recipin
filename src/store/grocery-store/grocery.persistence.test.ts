import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { addGroceryRecipe, toggelItem } from './grocery.slice';
import type { GroceryRecipe } from '../../api/models/grocery.interface';

// Load the real store and persistence configuration without initializing Firebase.
vi.mock('@api/services', () => ({}));
vi.mock('@api/services/planner.service', () => ({}));

type StoreModule = typeof import('../store');
let appStore: StoreModule;

async function loadStore() {
  vi.resetModules();
  appStore = await import('../store');
  if (!appStore.persistor.getState().bootstrapped) {
    await new Promise<void>((resolve) => {
      const unsubscribe = appStore.persistor.subscribe(() => {
        if (appStore.persistor.getState().bootstrapped) {
          unsubscribe();
          resolve();
        }
      });
    });
  }
}

const recipe: GroceryRecipe = {
  recipeId: 'recipe-123',
  title: 'Soup',
  items: [
    {
      id: 'item-123',
      name: 'Carrots',
      quantity: '2',
      unit: 'pcs',
      checked: false,
      sourceRecipeId: ['recipe-123'],
    },
  ],
};

beforeEach(() => localStorage.clear());
afterEach(async () => {
  await appStore.persistor.flush();
  appStore.persistor.pause();
  localStorage.clear();
});

test('persists groceries and checked state, then restores them into a fresh store', async () => {
  await loadStore();
  expect(appStore.store.getState().grocery.recipes).toEqual([]);
  appStore.store.dispatch(addGroceryRecipe(recipe));
  appStore.store.dispatch(
    toggelItem({ recipeId: recipe.recipeId, itemId: 'item-123', checked: true }),
  );
  await appStore.persistor.flush();
  const expected = appStore.store.getState().grocery;
  const saved = JSON.parse(localStorage.getItem('persist:root')!);
  expect(JSON.parse(saved.grocery)).toEqual(expected);
  expect(saved).not.toHaveProperty('auth');
  expect(saved).not.toHaveProperty('recipes');

  appStore.persistor.pause();
  await loadStore();
  expect(appStore.store.getState().grocery).toEqual(expected);
  expect(appStore.store.getState().grocery.recipes[0].items[0].checked).toBe(true);
});

test('rehydrates the existing persisted grocery format without losing fields', async () => {
  const grocery = { recipes: [recipe], lastGeneratedAt: '2025-11-17' };
  localStorage.setItem(
    'persist:root',
    JSON.stringify({
      grocery: JSON.stringify(grocery),
      _persist: JSON.stringify({ version: -1, rehydrated: true }),
    }),
  );
  await loadStore();
  expect(appStore.store.getState().grocery).toEqual(grocery);
});
