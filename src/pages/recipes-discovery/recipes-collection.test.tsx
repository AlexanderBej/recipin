import { beforeEach, expect, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import type { RecipeCard } from '@api/models';
import authReducer, { userSignedIn } from '@store/auth-store/auth.slice';
import recipesReducer, {
  fetchDiscoveryRecipes,
  fetchMyRecipeCardsPage,
  resetMine,
  createRecipe,
  invalidateDiscovery,
} from '@store/recipes-store/recipes.slice';
import {
  listDiscoveryRecipeCards,
  listRecipeCardsByOwnerPaged,
  getRecipe,
  toggleRecipeFavorite,
} from '@api/services';
import RecipesDiscovery from './recipes-discovery.component';
import Library from '../library/library.component';

vi.mock('@api/services', () => ({
  listDiscoveryRecipeCards: vi.fn(),
  listRecipeCardsByOwnerPaged: vi.fn(),
  getRecipe: vi.fn(),
  toggleRecipeFavorite: vi.fn(),
  listFavoriteRecipes: vi.fn(),
  addRecipePair: vi.fn(),
  deleteRecipePair: vi.fn(),
  saveSoloRating: vi.fn(),
}));

const cards: RecipeCard[] = [
  {
    id: 'older',
    authorId: 'test-user',
    title: 'Pesto pasta',
    category: 'dinner',
    tags: ['vegetarian'],
    imageUrl: '/pasta.jpg',
    isFavorite: true,
    createdAt: 1,
    difficulty: 'easy',
  },
  {
    id: 'newer',
    authorId: 'test-user',
    title: 'Soup',
    category: 'soups-stews',
    tags: [],
    createdAt: 2,
  },
];
beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  vi.mocked(listDiscoveryRecipeCards).mockResolvedValue(cards);
  vi.mocked(listRecipeCardsByOwnerPaged).mockResolvedValue({
    items: cards,
    nextStartAfterCreatedAt: null,
    nextStartAfterTitle: null,
  });
  vi.mocked(toggleRecipeFavorite).mockImplementation(async (id, favorite) => ({
    id,
    fav: favorite,
  }));
});
function Location() {
  const location = useLocation();
  return <output aria-label="Current URL">{location.pathname + location.search}</output>;
}
function setup(path = '/recipes') {
  const store = configureStore({ reducer: { auth: authReducer, recipes: recipesReducer } });
  store.dispatch(
    userSignedIn({
      uid: 'test-user',
      displayName: 'Test',
      email: null,
      photoURL: null,
      createdAt: '',
    }),
  );
  const rendered = render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[path]}>
        <Location />
        <Routes>
          <Route path="/recipes" element={<RecipesDiscovery />} />
          <Route path="/recipes/library" element={<Library />} />
          <Route path="/recipe/:id" element={<h1>Recipe details</h1>} />
          <Route path="/create" element={<h1>Create recipe</h1>} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
  return { store, ...rendered };
}

test('Discovery prefers an older photograph, shows favorites, and orders recent recipes', async () => {
  setup();
  const hero = await screen.findByRole('region', { name: 'Rediscover a recipe' });
  expect(within(hero).getByRole('heading', { name: 'Pesto pasta' })).toBeInTheDocument();
  expect(screen.getByRole('region', { name: 'Your favourites' })).toBeInTheDocument();
  const links = within(screen.getByRole('region', { name: 'Recently added' })).getAllByRole(
    'link',
    { name: /^Open / },
  );
  expect(links.map((link) => link.getAttribute('href'))).toEqual([
    '/recipe/newer',
    '/recipe/older',
  ]);
});
test('empty Discovery hides shelves and disables Surprise Me', async () => {
  vi.mocked(listDiscoveryRecipeCards).mockResolvedValue([]);
  setup();
  expect(
    await screen.findByRole('heading', { name: 'Your collection starts here.' }),
  ).toBeInTheDocument();
  expect(screen.queryByRole('region', { name: 'Your favourites' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Surprise Me' })).toBeDisabled();
  fireEvent.click(screen.getByRole('link', { name: 'Create your first recipe' }));
  expect(screen.getByRole('heading', { name: 'Create recipe' })).toBeInTheDocument();
});
test('one legacy recipe without optional metadata supports Surprise Me', async () => {
  vi.mocked(listDiscoveryRecipeCards).mockResolvedValue([cards[1]]);
  setup();
  await screen.findByRole('region', { name: 'Rediscover a recipe' });
  expect(screen.getAllByText('No photo yet').length).toBeGreaterThan(0);
  fireEvent.click(screen.getByRole('button', { name: 'Surprise Me' }));
  expect(screen.getByLabelText('Current URL')).toHaveTextContent('/recipe/newer');
  expect(getRecipe).toHaveBeenCalledWith('newer');
});
test('Discovery search opens Library with the title query applied', async () => {
  setup();
  fireEvent.change(screen.getByRole('textbox', { name: 'Search recipes by title' }), {
    target: { value: 'Pesto' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Search collection' }));
  expect(screen.getByLabelText('Current URL')).toHaveTextContent('/recipes/library?q=Pesto');
  await waitFor(() =>
    expect(listRecipeCardsByOwnerPaged).toHaveBeenCalledWith(
      'test-user',
      expect.objectContaining({ filters: expect.objectContaining({ searchTerm: 'Pesto' }) }),
    ),
  );
});
test('Browse All opens Library and New Recipe preserves creation route', async () => {
  setup();
  fireEvent.click(screen.getByRole('link', { name: /Browse All/ }));
  expect(screen.getByRole('heading', { name: 'Recipe Library' })).toBeInTheDocument();
  fireEvent.click(screen.getAllByRole('link', { name: 'New Recipe' })[0]);
  expect(screen.getByRole('heading', { name: 'Create recipe' })).toBeInTheDocument();
});
test('Library switches Grid/List and restores the local preference', () => {
  const first = setup('/recipes/library');
  expect(screen.getByRole('button', { name: 'Grid view' })).toHaveAttribute('aria-pressed', 'true');
  fireEvent.click(screen.getByRole('button', { name: 'List view' }));
  expect(localStorage.getItem('foodhub.recipes.layout')).toBe('list');
  first.unmount();
  setup('/recipes/library');
  expect(screen.getByRole('button', { name: 'List view' })).toHaveAttribute('aria-pressed', 'true');
});
test('Library forwards title, category, difficulty, and tag filters without changing the backend', async () => {
  setup('/recipes/library?q=Pa&category=dinner&difficulty=easy&tag=vegetarian');
  await waitFor(() =>
    expect(listRecipeCardsByOwnerPaged).toHaveBeenCalledWith(
      'test-user',
      expect.objectContaining({
        filters: { searchTerm: 'Pa', category: 'dinner', difficulty: 'easy', tag: 'vegetarian' },
      }),
    ),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Easy' }));
  await waitFor(() =>
    expect(listRecipeCardsByOwnerPaged).toHaveBeenLastCalledWith(
      'test-user',
      expect.objectContaining({ filters: expect.objectContaining({ difficulty: undefined }) }),
    ),
  );
});
test('Library offers a clear action for no search results', async () => {
  vi.mocked(listRecipeCardsByOwnerPaged).mockResolvedValue({
    items: [],
    nextStartAfterCreatedAt: null,
    nextStartAfterTitle: null,
  });
  setup('/recipes/library?q=missing');
  await waitFor(() => expect(listRecipeCardsByOwnerPaged).toHaveBeenCalled());
  expect(await screen.findByRole('heading', { name: 'No matching recipes' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Clear search' })).toBeInTheDocument();
});
test('favorite changes update Discovery even when the recipe is not in the paginated Library', async () => {
  const { store } = setup('/recipes/library?favorites=1');
  const button = await screen.findByRole('button', { name: 'Remove Pesto pasta from favorites' });
  fireEvent.click(button);
  await waitFor(() => expect(store.getState().recipes.discovery.items[0].isFavorite).toBe(false));
  expect(toggleRecipeFavorite).toHaveBeenCalledWith('older', false);
  expect(store.getState().recipes.cards.ids).toEqual([]);
});
test('a Library page response does not overwrite Discovery and stale responses are ignored', () => {
  let state = recipesReducer(undefined, fetchDiscoveryRecipes.pending('discovery', 'test-user'));
  state = recipesReducer(state, fetchDiscoveryRecipes.fulfilled(cards, 'discovery', 'test-user'));
  const arg = { uid: 'test-user', reset: true };
  state = recipesReducer(state, fetchMyRecipeCardsPage.pending('old', arg));
  state = recipesReducer(state, fetchMyRecipeCardsPage.pending('new', arg));
  state = recipesReducer(
    state,
    fetchMyRecipeCardsPage.fulfilled(
      { items: [cards[1]], nextStartAfterCreatedAt: null, nextStartAfterTitle: null },
      'new',
      arg,
    ),
  );
  state = recipesReducer(
    state,
    fetchMyRecipeCardsPage.fulfilled(
      { items: [cards[0]], nextStartAfterCreatedAt: null, nextStartAfterTitle: null },
      'old',
      arg,
    ),
  );
  expect(state.cards.ids).toEqual(['newer']);
  expect(state.discovery.items).toEqual(cards);
  expect(recipesReducer(state, resetMine()).discovery.items).toEqual([]);
});

test('Discovery shows loading and allows retry after a failed read', async () => {
  vi.mocked(listDiscoveryRecipeCards).mockRejectedValueOnce(new Error('Offline'));
  setup();
  expect(screen.getByRole('status', { name: 'Loading your recipes' })).toBeInTheDocument();
  expect(await screen.findByRole('alert')).toHaveTextContent("Your collection couldn't load");
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(await screen.findByRole('region', { name: 'Rediscover a recipe' })).toBeInTheDocument();
  expect(listDiscoveryRecipeCards).toHaveBeenCalledTimes(2);
});
test('a broken photograph uses the honest no-photo fallback', async () => {
  setup();
  const hero = await screen.findByRole('region', { name: 'Rediscover a recipe' });
  fireEvent.error(within(hero).getByRole('img', { name: 'Pesto pasta' }));
  expect(within(hero).getByText('No photo yet')).toBeInTheDocument();
});
test('advanced filters retain the selected difficulty and apply category changes', async () => {
  setup('/recipes/library?difficulty=easy');
  fireEvent.click(screen.getByRole('button', { name: 'Filters' }));
  const dialog = screen.getByRole('dialog', { name: 'Filters' });
  expect(within(dialog).getByRole('button', { name: 'Easy' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  fireEvent.click(within(dialog).getByRole('button', { name: 'Dinner' }));
  fireEvent.click(within(dialog).getByRole('button', { name: 'Apply filters' }));
  await waitFor(() =>
    expect(listRecipeCardsByOwnerPaged).toHaveBeenCalledWith(
      'test-user',
      expect.objectContaining({
        filters: expect.objectContaining({ category: 'dinner', difficulty: 'easy' }),
      }),
    ),
  );
});
test('Library load more retains the existing timestamp cursor', async () => {
  vi.mocked(listRecipeCardsByOwnerPaged).mockResolvedValueOnce({
    items: [cards[1]],
    nextStartAfterCreatedAt: 2,
    nextStartAfterTitle: null,
  });
  setup('/recipes/library');
  const button = await screen.findByRole('button', { name: 'Load more' });
  fireEvent.click(button);
  await waitFor(() =>
    expect(listRecipeCardsByOwnerPaged).toHaveBeenLastCalledWith(
      'test-user',
      expect.objectContaining({ startAfterCreatedAt: 2 }),
    ),
  );
  expect(await screen.findByRole('link', { name: 'Open Pesto pasta' })).toBeInTheDocument();
});
test('creation and import invalidation force fresh Discovery timestamps on the next visit', () => {
  let state = recipesReducer(undefined, fetchDiscoveryRecipes.pending('discovery', 'test-user'));
  state = recipesReducer(state, fetchDiscoveryRecipes.fulfilled(cards, 'discovery', 'test-user'));
  const created = { ...cards[0], createdAt: null };
  state = recipesReducer(
    state,
    createRecipe.fulfilled(created, 'create', {
      ...cards[0],
      description: '',
      ingredients: [],
      steps: [],
      isPublic: false,
    }),
  );
  expect(state.discovery.status).toBe('idle');
  expect(recipesReducer(state, invalidateDiscovery()).discovery.items).toEqual([]);
});
