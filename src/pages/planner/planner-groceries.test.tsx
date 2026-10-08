import { beforeEach, afterEach, expect, test, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { format } from 'date-fns';
import type { PlanItem, RecipeEntity } from '@api/models';
import type { AppDispatch } from '@api/types';
import { getRecipe, listRecipeCardsByOwnerPaged } from '@api/services';
import {
  listPlanItemsForRange,
  addPlanItem,
  removePlanItemFromDb,
} from '@api/services/planner.service';
import authReducer, { userSignedIn } from '@store/auth-store/auth.slice';
import recipesReducer from '@store/recipes-store/recipes.slice';
import groceryReducer, { addGroceryRecipe } from '@store/grocery-store/grocery.slice';
import { generatePlannedGroceries } from '@store/grocery-store/grocery-generation.thunk';
import plannerReducer from '@store/planner-store/planner.slice';
import Planner from './planner.component';
import Grocery from '../grocery/grocery.component';

vi.mock('@api/services', () => ({
  getRecipe: vi.fn(),
  listRecipeCardsByOwnerPaged: vi.fn(),
  addRecipePair: vi.fn(),
  updateRecipePair: vi.fn(),
  listDiscoveryRecipeCards: vi.fn(),
  listFavoriteRecipes: vi.fn(),
  deleteRecipePair: vi.fn(),
  saveSoloRating: vi.fn(),
  toggleRecipeFavorite: vi.fn(),
}));
vi.mock('@api/services/planner.service', () => ({
  listPlanItemsForRange: vi.fn(),
  addPlanItem: vi.fn(),
  removePlanItemFromDb: vi.fn(),
}));
const date = format(new Date(), 'yyyy-MM-dd');
const plan: PlanItem = {
  id: 'plan',
  userId: 'user',
  date,
  meal: 'lunch',
  recipeId: 'soup',
  recipeName: 'Soup',
};
const recipe: RecipeEntity = {
  id: 'soup',
  authorId: 'user',
  title: 'Soup',
  category: 'lunch',
  tags: [],
  ingredients: [
    { item: 'Carrots', quantity: '2' },
    { item: 'Salt', quantity: '1', unit: 'tsp' },
  ],
  steps: [],
};
const group = {
  recipeId: 'soup',
  title: 'Soup',
  items: [
    { id: 'carrots', name: 'Carrots', quantity: '2', checked: false, sourceRecipeId: ['soup'] },
    { id: 'salt', name: 'Salt', unit: 'tsp', quantity: '1', checked: true },
  ],
};
const clipboard = vi.fn().mockResolvedValue(undefined);
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(listPlanItemsForRange).mockResolvedValue([plan]);
  vi.mocked(listRecipeCardsByOwnerPaged).mockResolvedValue({
    items: [recipe],
    nextStartAfterCreatedAt: null,
    nextStartAfterTitle: null,
  });
  vi.mocked(getRecipe).mockResolvedValue(recipe);
  vi.mocked(addPlanItem).mockImplementation(async (_uid, item) => ({ ...item, id: 'new-plan' }));
  vi.mocked(removePlanItemFromDb).mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: clipboard },
  });
});
afterEach(() => vi.restoreAllMocks());
function setup(path = '/planner', groceries = false) {
  const store = configureStore({
    reducer: {
      auth: authReducer,
      recipes: recipesReducer,
      grocery: groceryReducer,
      planner: plannerReducer,
    },
  });
  store.dispatch(
    userSignedIn({ uid: 'user', displayName: 'User', email: null, photoURL: null, createdAt: '' }),
  );
  if (groceries) store.dispatch(addGroceryRecipe(group));
  return {
    store,
    ...render(
      <Provider store={store}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/planner" element={<Planner />} />
            <Route path="/grocery" element={<Grocery />} />
            <Route path="/recipe/:id" element={<h1>Recipe destination</h1>} />
          </Routes>
        </MemoryRouter>
      </Provider>,
    ),
  };
}
test('loads and opens planned recipes, navigates three weeks, and removes a record', async () => {
  const { store } = setup();
  await screen.findByRole('link', { name: 'Soup' });
  expect(screen.getByRole('link', { name: 'Soup' })).toHaveAttribute('href', '/recipe/soup');
  fireEvent.click(screen.getByRole('button', { name: 'Previous week' }));
  expect(screen.getByRole('button', { name: 'Previous week' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Next week' }));
  fireEvent.click(screen.getByRole('button', { name: 'Next week' }));
  expect(screen.getByRole('button', { name: 'Next week' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Previous week' }));
  fireEvent.click(screen.getByRole('button', { name: 'Remove Soup from lunch' }));
  await waitFor(() => expect(screen.queryByRole('link', { name: 'Soup' })).not.toBeInTheDocument());
  expect(removePlanItemFromDb).toHaveBeenCalledWith('plan');
  expect(store.getState().planner.byDate[date]).toBeUndefined();
});
test('empty plans and empty generation have clear feedback', async () => {
  vi.mocked(listPlanItemsForRange).mockResolvedValue([]);
  setup();
  await screen.findByText('Nothing planned for this day.');
  fireEvent.click(screen.getByRole('button', { name: 'Generate Grocery List' }));
  expect(await screen.findByRole('status')).toHaveTextContent('No new groceries');
  expect(getRecipe).not.toHaveBeenCalled();
});
test('adds from the recipe picker and closes only after success', async () => {
  const { store } = setup();
  await screen.findByRole('link', { name: 'Soup' });
  fireEvent.click(screen.getByRole('button', { name: 'Add to dinner' }));
  const sheet = screen.getByRole('dialog', { name: 'Add to dinner' });
  fireEvent.click(await within(sheet).findByRole('button', { name: 'Soup' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(addPlanItem).toHaveBeenCalledWith(
    'user',
    expect.objectContaining({ recipeId: 'soup', recipeName: 'Soup', date, meal: 'dinner' }),
  );
  expect(store.getState().planner.byDate[date]).toHaveLength(2);
});
test('picker shows no matching recipes and errors can be retried', async () => {
  setup();
  await screen.findByRole('link', { name: 'Soup' });
  vi.mocked(listRecipeCardsByOwnerPaged).mockResolvedValue({
    items: [],
    nextStartAfterCreatedAt: null,
    nextStartAfterTitle: null,
  });
  fireEvent.click(screen.getByRole('button', { name: 'Add to breakfast' }));
  expect(await screen.findByText('No recipes found.')).toBeInTheDocument();
  vi.mocked(listRecipeCardsByOwnerPaged).mockRejectedValueOnce(new Error('Offline'));
  fireEvent.change(screen.getByRole('textbox', { name: 'Search by title' }), {
    target: { value: 'missing' },
  });
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not load recipes');
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
});

test('failed additions and removals keep the existing plan intact', async () => {
  vi.mocked(removePlanItemFromDb).mockRejectedValue(new Error('Offline'));
  vi.mocked(addPlanItem).mockRejectedValue(new Error('Offline'));
  const { store } = setup();
  await screen.findByRole('link', { name: 'Soup' });
  fireEvent.click(screen.getByRole('button', { name: 'Remove Soup from lunch' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not remove');
  expect(store.getState().planner.byDate[date]).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: 'Add to dinner' }));
  const dialog = screen.getByRole('dialog');
  fireEvent.click(await within(dialog).findByRole('button', { name: 'Soup' }));
  expect(await within(dialog).findByRole('alert')).toHaveTextContent('Could not add');
  expect(store.getState().planner.byDate[date]).toHaveLength(1);
});

test('checks ingredients in older duplicate groups without changing optional persisted fields', () => {
  const { store } = setup('/grocery', true);
  const legacy = {
    recipeId: 'soup',
    title: 'Another contribution',
    items: [
      {
        id: 'legacy-item',
        name: 'Onion',
        quantity: '½',
        checked: false,
        notes: 'Keep this note',
        sourceRecipeId: ['soup'],
      },
    ],
  };
  act(() => store.dispatch(addGroceryRecipe(legacy)));
  fireEvent.click(screen.getByRole('checkbox', { name: '½ Onion' }));
  expect(store.getState().grocery.recipes[1]).toEqual({
    ...legacy,
    items: [{ ...legacy.items[0], checked: true }],
  });
  expect(store.getState().grocery.recipes[0]).toEqual(group);
});

test('clipboard failure is reported without claiming a successful copy', async () => {
  clipboard.mockRejectedValueOnce(new Error('Unavailable'));
  setup('/grocery', true);
  fireEvent.click(screen.getByRole('button', { name: 'Copy all' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not copy');
  expect(screen.queryByText('All items copied.')).not.toBeInTheDocument();
});
test('load failures have retry and a successful retry recovers', async () => {
  vi.mocked(listPlanItemsForRange).mockRejectedValueOnce(new Error('Offline'));
  setup();
  expect(await screen.findByRole('alert')).toHaveTextContent('Offline');
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  await screen.findByRole('link', { name: 'Soup' });
});
test('generates only the displayed week and groups ingredients without quantity aggregation', async () => {
  vi.mocked(listPlanItemsForRange).mockResolvedValue([
    plan,
    { ...plan, id: 'duplicate', meal: 'dinner' },
    { ...plan, id: 'next-week', date: '2099-01-01', recipeId: 'future' },
  ]);
  const { store } = setup();
  await screen.findAllByRole('link', { name: 'Soup' });
  fireEvent.click(screen.getByRole('button', { name: 'Generate Grocery List' }));
  await screen.findByText('Added 1 recipe group to Groceries.');
  expect(getRecipe).toHaveBeenCalledExactlyOnceWith('soup');
  expect(store.getState().grocery.recipes[0]).toMatchObject({
    recipeId: 'soup',
    items: [
      { name: 'Carrots', quantity: '2', checked: false, sourceRecipeId: ['soup'] },
      { name: 'Salt', quantity: '1', unit: 'tsp', checked: false },
    ],
  });
  fireEvent.click(screen.getByRole('button', { name: 'Generate Grocery List' }));
  await screen.findByText(/already in your list/);
  expect(store.getState().grocery.recipes).toHaveLength(1);
});
test('existing grocery groups retain checked items on generation', async () => {
  const { store } = setup('/planner', true);
  await screen.findByRole('link', { name: 'Soup' });
  fireEvent.click(screen.getByRole('button', { name: 'Generate Grocery List' }));
  await screen.findByText(/checked items kept/);
  expect(store.getState().grocery.recipes).toEqual([group]);
  expect(getRecipe).not.toHaveBeenCalled();
});
test('missing or ingredient-free recipes are skipped and failed generation changes nothing', async () => {
  const { store } = setup('/grocery');
  vi.mocked(getRecipe).mockResolvedValue(null);
  await act(async () => {
    expect(
      await (store.dispatch as AppDispatch)(
        generatePlannedGroceries({ uid: 'user', items: [plan] }),
      ).unwrap(),
    ).toEqual({ added: 0, existing: 0, unavailable: 1 });
  });
  vi.mocked(getRecipe).mockRejectedValue(new Error('Offline'));
  await act(async () => {
    await expect(
      (store.dispatch as AppDispatch)(
        generatePlannedGroceries({ uid: 'user', items: [plan] }),
      ).unwrap(),
    ).rejects.toBe('Offline');
  });
  expect(store.getState().grocery.recipes).toEqual([]);
});
test('Groceries check/uncheck, copy all/remaining/group, source link and group removal work', async () => {
  const { store } = setup('/grocery', true);
  expect(screen.getByRole('link', { name: 'Soup' })).toHaveAttribute('href', '/recipe/soup');
  fireEvent.click(screen.getByRole('checkbox', { name: '2 Carrots' }));
  expect(store.getState().grocery.recipes[0].items[0].checked).toBe(true);
  expect(screen.getByRole('button', { name: 'Copy remaining' })).toBeDisabled();
  expect(screen.getByText(/Everything checked/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('checkbox', { name: '2 Carrots' }));
  expect(store.getState().grocery.recipes[0].items[0].checked).toBe(false);
  fireEvent.click(screen.getByRole('button', { name: 'Copy all' }));
  await screen.findByText('All items copied.');
  expect(clipboard).toHaveBeenLastCalledWith('Soup\n2 Carrots\n1 tsp Salt\n');
  fireEvent.click(screen.getByRole('button', { name: 'Copy remaining' }));
  await screen.findByText('Remaining items copied.');
  expect(clipboard).toHaveBeenLastCalledWith('Soup\n2 Carrots\n');
  fireEvent.click(screen.getByRole('button', { name: 'Copy Soup' }));
  await screen.findByText('Recipe group copied.');
  expect(clipboard).toHaveBeenLastCalledWith('Soup\n2 Carrots\n1 tsp Salt\n');
  fireEvent.click(screen.getByRole('button', { name: 'Remove Soup grocery group' }));
  expect(store.getState().grocery.recipes).toEqual([]);
  expect(screen.getByText('No groceries yet.')).toBeInTheDocument();
});
test('clear-all requires confirmation and the empty state disables meaningless actions', () => {
  const { store } = setup('/grocery', true);
  fireEvent.click(screen.getByRole('button', { name: 'Clear grocery list' }));
  expect(store.getState().grocery.recipes).toHaveLength(1);
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));
  expect(store.getState().grocery.recipes).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: 'Clear grocery list' }));
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Clear list' }));
  expect(screen.getByRole('status')).toHaveTextContent('Grocery list cleared.');
  expect(screen.getByRole('button', { name: 'Copy all' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Copy remaining' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Clear grocery list' })).toBeDisabled();
});
