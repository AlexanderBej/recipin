import { beforeEach, afterEach, expect, test, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom';
import type { RecipeEntity } from '@api/models';
import { addRecipePair, getRecipeForEditing, updateRecipePair } from '@api/services';
import authReducer, { userSignedIn } from '@store/auth-store/auth.slice';
import recipesReducer from '@store/recipes-store/recipes.slice';
import groceryReducer, { addGroceryRecipe } from '@store/grocery-store/grocery.slice';
import plannerReducer, { setDayItems } from '@store/planner-store/planner.slice';
import RecipeEditor from './recipe-editor.component';
import { draftKey } from './editor.utils';

vi.mock('@api/services', () => ({
  addRecipePair: vi.fn(),
  getRecipeForEditing: vi.fn(),
  updateRecipePair: vi.fn(),
  getRecipe: vi.fn(),
  listDiscoveryRecipeCards: vi.fn(),
  listRecipeCardsByOwnerPaged: vi.fn(),
  listFavoriteRecipes: vi.fn(),
  deleteRecipePair: vi.fn(),
  saveSoloRating: vi.fn(),
  toggleRecipeFavorite: vi.fn(),
}));
const recipe: RecipeEntity = {
  id: 'soup',
  authorId: 'user',
  title: 'Soup',
  category: 'dinner',
  tags: [],
  ingredients: [{ item: 'Salt' }],
  steps: ['Simmer.'],
  isFavorite: true,
  ratingCategories: { taste: 5 },
};
beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  vi.mocked(getRecipeForEditing).mockResolvedValue({ recipe, revision: 'revision-1' });
  vi.mocked(addRecipePair).mockImplementation(async (input) => ({
    id: 'new-id',
    card: { ...recipe, ...input, id: 'new-id', category: input.category ?? 'dinner' },
  }));
  vi.mocked(updateRecipePair).mockImplementation(async (input) => ({
    recipe: { ...recipe, ...input.changes },
    card: { ...recipe, ...input.changes },
  }));
});
afterEach(() => vi.restoreAllMocks());
const Destination = () => <h1>Saved {useParams().id}</h1>;
function setup(path = '/recipes/new', uid = 'user') {
  const store = configureStore({
    reducer: {
      auth: authReducer,
      recipes: recipesReducer,
      grocery: groceryReducer,
      planner: plannerReducer,
    },
  });
  store.dispatch(
    userSignedIn({ uid, displayName: 'User', email: null, photoURL: null, createdAt: '' }),
  );
  return {
    store,
    ...render(
      <Provider store={store}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/recipes/new" element={<RecipeEditor />} />
            <Route path="/recipe/:id/edit" element={<RecipeEditor />} />
            <Route path="/recipe/:id" element={<Destination />} />
            <Route path="/recipes/library" element={<h1>Library</h1>} />
          </Routes>
        </MemoryRouter>
      </Provider>,
    ),
  };
}
const stage = (name: string) =>
  fireEvent.click(
    within(screen.getByRole('navigation', { name: 'Recipe editor sections' })).getByRole('button', {
      name: new RegExp(name),
    }),
  );
const fill = (name: string, value: string) =>
  fireEvent.change(screen.getByLabelText(name), { target: { value } });
test('freely navigates stages and adds, removes, and reorders ingredients and instructions', () => {
  setup();
  stage('Ingredients');
  fill('Ingredient 1', 'Salt');
  fireEvent.click(screen.getByRole('button', { name: 'Add ingredient' }));
  fill('Ingredient 2', 'Water');
  fireEvent.click(screen.getByRole('button', { name: 'Move ingredient 2 up' }));
  expect(screen.getByLabelText('Ingredient 1')).toHaveValue('Water');
  fireEvent.click(screen.getByRole('button', { name: 'Remove ingredient 2' }));
  expect(screen.queryByLabelText('Ingredient 2')).not.toBeInTheDocument();
  stage('Instructions');
  fill('Step 1', 'Simmer.');
  fireEvent.click(screen.getByRole('button', { name: 'Add step' }));
  fill('Step 2', 'Serve.');
  fireEvent.click(screen.getByRole('button', { name: 'Move step 2 up' }));
  expect(screen.getByLabelText('Step 1')).toHaveValue('Serve.');
  fireEvent.click(screen.getByRole('button', { name: 'Remove step 2' }));
  expect(screen.queryByLabelText('Step 2')).not.toBeInTheDocument();
  stage('Review & Save');
  fireEvent.click(screen.getByRole('button', { name: 'Save Recipe' }));
  expect(screen.getByRole('alert')).toHaveTextContent('title');
});
test('creates normalized data, waits for save, navigates to its ID, and clears only its draft', async () => {
  setup();
  fill('Title', ' New Soup ');
  fill('Servings', '2');
  fill('Cook minutes', '15');
  stage('Presentation');
  fill('Image URL', 'https://example.com/soup.jpg');
  stage('Review & Save');
  expect(localStorage.getItem(draftKey('user'))).not.toBeNull();
  localStorage.setItem(draftKey('other'), 'untouched');
  fireEvent.click(screen.getByRole('button', { name: 'Save Recipe' }));
  await screen.findByRole('heading', { name: 'Saved new-id' });
  expect(addRecipePair).toHaveBeenCalledWith(
    expect.objectContaining({
      title: 'New Soup',
      servings: 2,
      cookMinutes: 15,
      imageUrl: 'https://example.com/soup.jpg',
      ingredients: [],
      steps: [],
    }),
  );
  expect(localStorage.getItem(draftKey('user'))).toBeNull();
  expect(localStorage.getItem(draftKey('other'))).toBe('untouched');
});
test('restores incomplete local drafts after remount and isolates accounts', () => {
  const first = setup();
  fill('Title', 'Unfinished');
  stage('Instructions');
  fill('Step 1', 'Half a thought');
  first.unmount();
  const second = setup();
  expect(screen.getByLabelText('Step 1')).toHaveValue('Half a thought');
  stage('Basics');
  expect(screen.getByLabelText('Title')).toHaveValue('Unfinished');
  second.unmount();
  setup('/recipes/new', 'other');
  expect(screen.getByLabelText('Title')).toHaveValue('');
});
test('discard requires confirmation and removes the draft', async () => {
  setup();
  fill('Title', 'Discard me');
  fireEvent.click(screen.getByRole('button', { name: 'Discard draft' }));
  expect(screen.getByLabelText('Title')).toHaveValue('Discard me');
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirm' }));
  await waitFor(() => expect(screen.getByLabelText('Title')).toHaveValue(''));
  expect(localStorage.getItem(draftKey('user'))).toBeNull();
});
test('failed saves retain form and draft without navigating', async () => {
  vi.mocked(addRecipePair).mockRejectedValue(new Error('Offline'));
  setup();
  fill('Title', 'Keep me');
  stage('Review & Save');
  fireEvent.click(screen.getByRole('button', { name: 'Save Recipe' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Offline');
  expect(localStorage.getItem(draftKey('user'))).toContain('Keep me');
  expect(screen.queryByText('Saved new-id')).not.toBeInTheDocument();
});

test('a save that completes after leaving the editor still clears its unchanged draft', async () => {
  let finish!: (result: Awaited<ReturnType<typeof addRecipePair>>) => void;
  vi.mocked(addRecipePair).mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  setup();
  fill('Title', 'Pending');
  stage('Review & Save');
  fireEvent.click(screen.getByRole('button', { name: 'Save Recipe' }));
  fireEvent.click(screen.getByRole('link', { name: 'Back to Library' }));
  await act(async () => finish({ id: 'new-id', card: { ...recipe, id: 'new-id' } }));
  expect(screen.getByRole('heading', { name: 'Library' })).toBeInTheDocument();
  expect(localStorage.getItem(draftKey('user'))).toBeNull();
});

test('saving never erases a newer draft from another editor session', async () => {
  let finish!: (result: Awaited<ReturnType<typeof addRecipePair>>) => void;
  vi.mocked(addRecipePair).mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  setup();
  fill('Title', 'Pending');
  stage('Review & Save');
  fireEvent.click(screen.getByRole('button', { name: 'Save Recipe' }));
  localStorage.setItem(draftKey('user'), 'newer draft');
  await act(async () => finish({ id: 'new-id', card: { ...recipe, id: 'new-id' } }));
  expect(localStorage.getItem(draftKey('user'))).toBe('newer draft');
});
test('direct section editing preserves ID and updates only changed fields and cached Details', async () => {
  const { store } = setup('/recipe/soup/edit?section=ingredients');
  store.dispatch(
    addGroceryRecipe({
      recipeId: 'soup',
      title: 'Soup',
      items: [{ id: 'salt', name: 'Salt', checked: true, sourceRecipeId: ['soup'] }],
    }),
  );
  store.dispatch(
    setDayItems({
      date: '2026-10-07',
      items: [
        {
          id: 'plan',
          userId: 'user',
          date: '2026-10-07',
          recipeId: 'soup',
          recipeName: 'Soup',
          meal: 'dinner',
        },
      ],
    }),
  );
  const groceryBefore = store.getState().grocery;
  const plannerBefore = store.getState().planner;
  await screen.findByLabelText('Ingredient 1');
  fill('Ingredient 1', 'Sea salt');
  stage('Review & Save');
  fireEvent.click(screen.getByRole('button', { name: 'Save Recipe' }));
  await screen.findByRole('heading', { name: 'Saved soup' });
  expect(updateRecipePair).toHaveBeenCalledWith({
    uid: 'user',
    id: 'soup',
    expectedRevision: 'revision-1',
    changes: { ingredients: [{ item: 'Sea salt' }] },
  });
  expect(store.getState().recipes.currentRecipe).toMatchObject({
    id: 'soup',
    isFavorite: true,
    ratingCategories: { taste: 5 },
    ingredients: [{ item: 'Sea salt' }],
  });
  expect(localStorage.getItem(draftKey('user', 'soup'))).toBeNull();
  expect(store.getState().grocery).toEqual(groceryBefore);
  expect(store.getState().planner).toEqual(plannerBefore);
});
test('stale edit drafts block save and confirmed discard reloads latest data', async () => {
  const first = setup('/recipe/soup/edit');
  await screen.findByLabelText('Title');
  fill('Title', 'My draft');
  first.unmount();
  vi.mocked(getRecipeForEditing).mockResolvedValue({
    recipe: { ...recipe, title: 'Newer recipe' },
    revision: 'revision-2',
  });
  setup('/recipe/soup/edit');
  await screen.findByLabelText('Title');
  expect(screen.getByRole('alert')).toHaveTextContent('older recipe');
  stage('Review & Save');
  expect(screen.getByRole('button', { name: 'Save Recipe' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Discard draft' }));
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirm' }));
  await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  stage('Basics');
  expect(screen.getByLabelText('Title')).toHaveValue('Newer recipe');
});
test('server conflicts during final save retain the draft and block retries', async () => {
  const error = new Error('Recipe changed');
  error.name = 'RecipeEditConflict';
  vi.mocked(updateRecipePair).mockRejectedValue(error);
  setup('/recipe/soup/edit?section=review');
  await screen.findByRole('button', { name: 'Save Recipe' });
  fireEvent.click(screen.getByRole('button', { name: 'Save Recipe' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Save Recipe' })).toBeDisabled());
  expect(localStorage.getItem(draftKey('user', 'soup'))).not.toBeNull();
});
test('storage failure is explicit and does not block a remote save', async () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('Quota exceeded');
  });
  setup();
  fill('Title', 'Soup');
  expect(screen.getByRole('status')).toHaveTextContent('could not be saved');
  stage('Review & Save');
  fireEvent.click(screen.getByRole('button', { name: 'Save Recipe' }));
  await screen.findByRole('heading', { name: 'Saved new-id' });
});
test('in-flight save cannot populate another authenticated account cache', async () => {
  let finish!: (result: Awaited<ReturnType<typeof addRecipePair>>) => void;
  vi.mocked(addRecipePair).mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  const { store } = setup();
  fill('Title', 'Private');
  stage('Review & Save');
  fireEvent.click(screen.getByRole('button', { name: 'Save Recipe' }));
  act(() =>
    store.dispatch(
      userSignedIn({
        uid: 'other',
        displayName: 'Other',
        email: null,
        photoURL: null,
        createdAt: '',
      }),
    ),
  );
  await act(async () => finish({ id: 'new-id', card: { ...recipe, id: 'new-id' } }));
  expect(store.getState().recipes.cards.ids).toEqual([]);
  stage('Basics');
  expect(screen.getByLabelText('Title')).toHaveValue('');
});
