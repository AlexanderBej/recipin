import { StrictMode } from 'react';
import { beforeEach, afterEach, expect, test, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { RecipeEntity } from '@api/models';
import { getRecipe, toggleRecipeFavorite, deleteRecipePair, saveSoloRating } from '@api/services';
import { addPlanItem } from '@api/services/planner.service';
import authReducer, { userSignedIn } from '@store/auth-store/auth.slice';
import recipesReducer, {
  fetchRecipeById,
  resetMine,
  saveSoloRatingThunk,
} from '@store/recipes-store/recipes.slice';
import groceryReducer from '@store/grocery-store/grocery.slice';
import plannerReducer from '@store/planner-store/planner.slice';
import RecipeDetails from './recipe-details.component';
import Cooking from '../cooking/cooking.component';

vi.mock('@api/services', () => ({
  getRecipe: vi.fn(),
  toggleRecipeFavorite: vi.fn(),
  deleteRecipePair: vi.fn(),
  saveSoloRating: vi.fn(),
  addRecipePair: vi.fn(),
  listRecipeCardsByOwnerPaged: vi.fn(),
  listDiscoveryRecipeCards: vi.fn(),
  listFavoriteRecipes: vi.fn(),
}));
vi.mock('@api/services/planner.service', () => ({
  addPlanItem: vi.fn(),
  listPlanItemsForRange: vi.fn(),
  removePlanItemFromDb: vi.fn(),
}));

const recipe: RecipeEntity = {
  id: 'pesto',
  authorId: 'test-user',
  title: 'Pesto pasta',
  category: 'dinner',
  tags: ['vegetarian'],
  imageUrl: '/pasta.jpg',
  description: 'A good weeknight dinner.',
  servings: 2,
  prepMinutes: 10,
  cookMinutes: 25,
  ingredients: [
    { item: 'Pasta', quantity: '200', unit: 'g' },
    { item: 'Pesto', quantity: '2', unit: 'tbsp' },
  ],
  steps: ['Boil the water.', 'Cook the pasta.', 'Stir in the pesto.'],
};
beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  vi.mocked(getRecipe).mockResolvedValue(recipe);
  vi.mocked(toggleRecipeFavorite).mockImplementation(async (id, favorite) => ({
    id,
    fav: favorite,
  }));
  vi.mocked(deleteRecipePair).mockResolvedValue(undefined);
  vi.mocked(addPlanItem).mockImplementation(async (_uid, input) => ({ ...input, id: 'planned' }));
  vi.mocked(saveSoloRating).mockImplementation(async (id, cat, value) => ({ id, cat, value }));
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
function setup(path = '/recipe/pesto', loaded = false) {
  const store = configureStore({
    reducer: {
      auth: authReducer,
      recipes: recipesReducer,
      grocery: groceryReducer,
      planner: plannerReducer,
    },
  });
  store.dispatch(
    userSignedIn({
      uid: 'test-user',
      displayName: 'Test',
      email: null,
      photoURL: null,
      createdAt: '',
    }),
  );
  if (loaded) {
    store.dispatch(fetchRecipeById.pending('warm', 'pesto'));
    store.dispatch(fetchRecipeById.fulfilled(recipe, 'warm', 'pesto'));
  }
  const view = render(
    <StrictMode>
      <Provider store={store}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/recipe/:id" element={<RecipeDetails />} />
            <Route path="/recipe/:id/cook" element={<Cooking />} />
            <Route path="/recipes/library" element={<h1>Library destination</h1>} />
            <Route path="/grocery" element={<h1>Groceries destination</h1>} />
          </Routes>
        </MemoryRouter>
      </Provider>
    </StrictMode>,
  );
  return { store, ...view };
}
test('cold direct loading fetches the route ID once even under StrictMode', async () => {
  setup();
  expect(screen.getByRole('status')).toHaveTextContent('Loading recipe');
  expect(await screen.findByRole('heading', { name: 'Pesto pasta', level: 1 })).toBeInTheDocument();
  expect(getRecipe).toHaveBeenCalledExactlyOnceWith('pesto');
});

test('Edit and quick section links use the same editor and preserve the recipe ID', async () => {
  setup();
  await screen.findByRole('heading', { name: 'Pesto pasta' });
  expect(screen.getByRole('link', { name: 'Edit Recipe' })).toHaveAttribute(
    'href',
    '/recipe/pesto/edit',
  );
  for (const section of ['basics', 'ingredients', 'instructions', 'presentation'])
    expect(screen.getByRole('link', { name: `Edit ${section}` })).toHaveAttribute(
      'href',
      `/recipe/pesto/edit?section=${section}`,
    );
});
test('refresh with a new store fetches the recipe again', async () => {
  const first = setup();
  await screen.findByRole('heading', { name: 'Pesto pasta' });
  first.unmount();
  setup();
  await screen.findByRole('heading', { name: 'Pesto pasta' });
  expect(getRecipe).toHaveBeenCalledTimes(2);
});
test('uses an already-loaded full recipe without a redundant read', async () => {
  setup('/recipe/pesto', true);
  expect(screen.getByRole('heading', { name: 'Pesto pasta' })).toBeInTheDocument();
  expect(getRecipe).not.toHaveBeenCalled();
});
test('not found is distinct from a failed request', async () => {
  vi.mocked(getRecipe).mockResolvedValue(null);
  setup('/recipe/missing');
  expect(await screen.findByRole('heading', { name: 'Recipe not found' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Back to Library' })).toHaveAttribute(
    'href',
    '/recipes/library',
  );
});
test('failed reads show a retry action and can recover', async () => {
  vi.mocked(getRecipe).mockRejectedValueOnce(new Error('offline'));
  setup();
  expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't load this recipe");
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(await screen.findByRole('heading', { name: 'Pesto pasta' })).toBeInTheDocument();
  expect(getRecipe).toHaveBeenCalledTimes(2);
});
test('prep and cook times are correctly labelled and legacy numeric strings are safe', async () => {
  vi.mocked(getRecipe).mockResolvedValue({
    ...recipe,
    prepMinutes: '10',
    cookMinutes: '25',
    servings: '2',
  } as unknown as RecipeEntity);
  setup();
  await screen.findByRole('heading', { name: 'Pesto pasta' });
  expect(screen.getByText('Prep time').parentElement).toHaveTextContent('10 min');
  expect(screen.getByText('Cook time').parentElement).toHaveTextContent('25 min');
  expect(screen.getByText('Servings').parentElement).toHaveTextContent('2');
});
test('missing metadata, legacy categories, and incomplete lists render safely', async () => {
  vi.mocked(getRecipe).mockResolvedValue({
    ...recipe,
    category: 'legacy',
    imageUrl: null,
    description: null,
    tags: null,
    servings: 'bad',
    prepMinutes: null,
    cookMinutes: -1,
    ingredients: [null, {}, { item: 'Salt', quantity: 1 }],
    steps: [null, '', {}],
  } as unknown as RecipeEntity);
  setup();
  await screen.findByRole('heading', { name: 'Pesto pasta' });
  expect(screen.getByText('No photo yet')).toBeInTheDocument();
  expect(screen.getByText('Salt')).toBeInTheDocument();
  expect(screen.getAllByText('Not specified')).toHaveLength(3);
  expect(screen.getByRole('button', { name: 'Start Cooking' })).toBeDisabled();
});
test('favorite writes still update the full recipe and favorite collection on cold load', async () => {
  const { store } = setup();
  await screen.findByRole('heading', { name: 'Pesto pasta' });
  fireEvent.click(screen.getByRole('button', { name: 'Add to favorites' }));
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Remove from favorites' })).toHaveAttribute(
      'aria-pressed',
      'true',
    ),
  );
  expect(toggleRecipeFavorite).toHaveBeenCalledExactlyOnceWith('pesto', true);
  expect(store.getState().recipes.favorites.map((item) => item.id)).toEqual(['pesto']);
  fireEvent.click(screen.getByRole('button', { name: 'Remove from favorites' }));
  await waitFor(() => expect(store.getState().recipes.favorites).toHaveLength(0));
});
test('Planner action retains the existing meal dialog and recipe ID', async () => {
  setup();
  await screen.findByRole('heading', { name: 'Pesto pasta' });
  fireEvent.click(screen.getByLabelText('More recipe actions'));
  fireEvent.click(screen.getByRole('button', { name: 'Add to Planner' }));
  expect(screen.getByText('Plan a meal')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));
  await waitFor(() =>
    expect(addPlanItem).toHaveBeenCalledWith(
      'test-user',
      expect.objectContaining({ recipeId: 'pesto', recipeName: 'Pesto pasta' }),
    ),
  );
});
test('Groceries action preserves recipe relationships and item structure', async () => {
  const { store } = setup();
  await screen.findByRole('heading', { name: 'Pesto pasta' });
  fireEvent.click(screen.getAllByRole('button', { name: 'Add to Groceries' }).at(-1)!);
  expect(screen.getByRole('heading', { name: 'Groceries destination' })).toBeInTheDocument();
  expect(store.getState().grocery.recipes[0]).toMatchObject({
    recipeId: 'pesto',
    title: 'Pesto pasta',
    items: [
      { name: 'Pasta', quantity: '200', unit: 'g', checked: false, sourceRecipeId: ['pesto'] },
      { name: 'Pesto', quantity: '2', unit: 'tbsp', checked: false, sourceRecipeId: ['pesto'] },
    ],
  });
});
test('deletion requires confirmation and returns to Library only after success', async () => {
  setup();
  await screen.findByRole('heading', { name: 'Pesto pasta' });
  fireEvent.click(screen.getByLabelText('More recipe actions'));
  fireEvent.click(screen.getByRole('button', { name: 'Delete Recipe' }));
  expect(deleteRecipePair).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
  expect(await screen.findByRole('heading', { name: 'Library destination' })).toBeInTheDocument();
  expect(deleteRecipePair).toHaveBeenCalledExactlyOnceWith('pesto');
});
test('failed deletion keeps confirmation open and does not navigate', async () => {
  vi.mocked(deleteRecipePair).mockRejectedValue(new Error('denied'));
  setup();
  await screen.findByRole('heading', { name: 'Pesto pasta' });
  fireEvent.click(screen.getByLabelText('More recipe actions'));
  fireEvent.click(screen.getByRole('button', { name: 'Delete Recipe' }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
  expect(await screen.findByText('Something went wrong. Please try again.')).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Library destination' })).not.toBeInTheDocument();
});
test('rating changes work without any Library cards loaded', async () => {
  const { store } = setup();
  await screen.findByRole('heading', { name: 'Pesto pasta' });
  await act(async () => {
    await store.dispatch(saveSoloRatingThunk({ recipeId: 'pesto', cat: 'taste', value: 4 }));
  });
  expect(store.getState().recipes.currentRecipe?.ratingCategories?.taste).toBe(4);
});
test('Details starts Cooking Mode and exit returns to the same recipe without refetching', async () => {
  setup();
  await screen.findByRole('heading', { name: 'Pesto pasta' });
  fireEvent.click(screen.getByRole('link', { name: 'Start Cooking' }));
  expect(screen.getByRole('region', { name: 'Current instruction' })).toHaveTextContent(
    'Boil the water.',
  );
  fireEvent.click(screen.getByRole('link', { name: 'Exit Cooking Mode' }));
  expect(screen.getByRole('heading', { name: 'Ingredients' })).toBeInTheDocument();
  expect(getRecipe).toHaveBeenCalledTimes(1);
});
test('Cooking cold loads and supports Previous/Next without implicitly completing steps', async () => {
  setup('/recipe/pesto/cook');
  await screen.findByRole('heading', { name: 'Pesto pasta' });
  expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  expect(screen.getByRole('region', { name: 'Current instruction' })).toHaveTextContent(
    'Cook the pasta.',
  );
  fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
  expect(screen.getByRole('region', { name: 'Current instruction' })).toHaveTextContent(
    'Boil the water.',
  );
  expect(screen.getByText('0 of 3 steps complete')).toBeInTheDocument();
});
test('Step and Checklist share completion state and can uncheck steps', async () => {
  setup('/recipe/pesto/cook');
  await screen.findByRole('heading', { name: 'Pesto pasta' });
  fireEvent.click(screen.getByRole('checkbox', { name: 'Mark step complete' }));
  fireEvent.click(screen.getByRole('button', { name: 'Checklist' }));
  expect(screen.getByRole('checkbox', { name: 'Complete step 1' })).toBeChecked();
  fireEvent.click(screen.getByRole('checkbox', { name: 'Complete step 2' }));
  fireEvent.click(screen.getByRole('button', { name: 'Step-by-step' }));
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  expect(screen.getByRole('checkbox', { name: 'Mark step complete' })).toBeChecked();
  fireEvent.click(screen.getByRole('checkbox', { name: 'Mark step complete' }));
  expect(screen.getByText('1 of 3 steps complete')).toBeInTheDocument();
});
test('ingredients sheet opens and dismisses without losing progress', async () => {
  setup('/recipe/pesto/cook');
  await screen.findByRole('heading', { name: 'Pesto pasta' });
  fireEvent.click(screen.getByRole('checkbox', { name: 'Mark step complete' }));
  fireEvent.click(screen.getByRole('button', { name: 'Ingredients' }));
  const sheet = screen.getByRole('dialog', { name: 'Ingredients' });
  expect(within(sheet).getByText('Pasta')).toBeInTheDocument();
  fireEvent.click(within(sheet).getByRole('button', { name: 'Close' }));
  expect(screen.getByRole('checkbox', { name: 'Mark step complete' })).toBeChecked();
});
test('cooking progress, view, and current step survive refresh and remain recipe-scoped', async () => {
  const first = setup('/recipe/pesto/cook');
  await screen.findByRole('heading', { name: 'Pesto pasta' });
  fireEvent.click(screen.getByRole('checkbox', { name: 'Mark step complete' }));
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  fireEvent.click(screen.getByRole('button', { name: 'Checklist' }));
  first.unmount();
  const second = setup('/recipe/pesto/cook');
  await screen.findByRole('heading', { name: 'Pesto pasta' });
  expect(screen.getByRole('checkbox', { name: 'Complete step 1' })).toBeChecked();
  fireEvent.click(screen.getByRole('button', { name: 'Step-by-step' }));
  expect(screen.getByRole('region', { name: 'Current instruction' })).toHaveTextContent(
    'Cook the pasta.',
  );
  second.unmount();
  vi.mocked(getRecipe).mockResolvedValue({ ...recipe, id: 'other' });
  setup('/recipe/other/cook');
  await screen.findByRole('heading', { name: 'Pesto pasta' });
  expect(screen.getByText('0 of 3 steps complete')).toBeInTheDocument();
});
test('all checked steps show completion and Cook again resets persisted progress', async () => {
  setup('/recipe/pesto/cook');
  await screen.findByRole('heading', { name: 'Pesto pasta' });
  fireEvent.click(screen.getByRole('button', { name: 'Checklist' }));
  for (let index = 1; index <= 3; index++)
    fireEvent.click(screen.getByRole('checkbox', { name: `Complete step ${index}` }));
  expect(screen.getByRole('status')).toHaveTextContent('Ready to enjoy.');
  fireEvent.click(screen.getByRole('button', { name: 'Cook again' }));
  expect(screen.getByText('0 of 3 steps complete')).toBeInTheDocument();
  expect(JSON.parse(sessionStorage.getItem('foodhub.cooking.pesto')!).completed).toEqual([]);
});
test('invalid stored progress is ignored and no instructions has a graceful fallback', async () => {
  sessionStorage.setItem('foodhub.cooking.pesto', '{broken');
  const first = setup('/recipe/pesto/cook');
  await screen.findByRole('heading', { name: 'Pesto pasta' });
  expect(screen.getByText('0 of 3 steps complete')).toBeInTheDocument();
  first.unmount();
  vi.mocked(getRecipe).mockResolvedValue({ ...recipe, steps: [] });
  setup('/recipe/pesto/cook');
  expect(await screen.findByRole('heading', { name: 'No instructions yet' })).toBeInTheDocument();
});
test('stale responses and signed-out resets cannot restore the wrong recipe', () => {
  let state = recipesReducer(undefined, fetchRecipeById.pending('old', 'old'));
  state = recipesReducer(state, fetchRecipeById.pending('new', 'pesto'));
  state = recipesReducer(state, fetchRecipeById.fulfilled(recipe, 'new', 'pesto'));
  state = recipesReducer(state, fetchRecipeById.fulfilled({ ...recipe, id: 'old' }, 'old', 'old'));
  expect(state.currentRecipe?.id).toBe('pesto');
  state = recipesReducer(state, resetMine());
  state = recipesReducer(state, fetchRecipeById.fulfilled(recipe, 'new', 'pesto'));
  expect(state.currentRecipe).toBeNull();
});

test('Cooking stays usable when wake lock is rejected', async () => {
  const request = vi.fn().mockRejectedValue(new Error('NotAllowedError'));
  vi.stubGlobal('navigator', { wakeLock: { request } });
  setup('/recipe/pesto/cook');
  await screen.findByRole('heading', { name: 'Pesto pasta' });
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  expect(screen.getByRole('region', { name: 'Current instruction' })).toHaveTextContent(
    'Cook the pasta.',
  );
  expect(request).toHaveBeenCalledWith('screen');
});

test('unavailable session storage does not block cooking', async () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('Storage unavailable');
  });
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('Storage unavailable');
  });
  setup('/recipe/pesto/cook');
  await screen.findByRole('heading', { name: 'Pesto pasta' });
  fireEvent.click(screen.getByRole('checkbox', { name: 'Mark step complete' }));
  expect(screen.getByText('1 of 3 steps complete')).toBeInTheDocument();
});
test('changed instructions invalidate old persisted completion', async () => {
  sessionStorage.setItem(
    'foodhub.cooking.pesto',
    JSON.stringify({ steps: ['Old instruction'], current: 0, completed: [0], view: 'checklist' }),
  );
  setup('/recipe/pesto/cook');
  await screen.findByRole('heading', { name: 'Pesto pasta' });
  expect(screen.getByText('0 of 3 steps complete')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Step-by-step' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});
