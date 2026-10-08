import React from 'react';
import { expect, test, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { MemoryRouter, useNavigate } from 'react-router-dom';

import App from './App';
import authReducer, {
  setAuthLoading,
  userSignedIn,
  userSignedOut,
} from './store/auth-store/auth.slice';

vi.mock('@shared/providers', () => ({ initApp: () => vi.fn() }));
vi.mock('./features/restaurants/restaurants.provider', () => ({
  default: ({ children }: { children: React.ReactNode }) => children,
  useRestaurants: () => ({ quickAdd: vi.fn() }),
}));
vi.mock('@store/index', () => {
  const ready = { booting: false };
  return { selectAppBootState: () => ready };
});
vi.mock('@shared/ui', async () => ({
  Spinner: (await import('./shared/ui/spinner/spinner.component')).default,
}));

// Keep the real routes, guard, shell, and landing; legacy page stubs avoid Firebase imports.
vi.mock('@pages', async () => {
  const { useLocation, useParams } = await import('react-router-dom');
  const Placeholder = () => <h1>Other page</h1>;
  return {
    Layout: (await import('./pages/layout/layout.component')).default,
    FoodHub: (await import('./pages/food-hub/food-hub.component')).default,
    Login: () => {
      const location = useLocation();
      const from = location.state?.from;
      return (
        <>
          <h1>Login</h1>
          {from && <p>Return to {from.pathname + from.search + from.hash}</p>}
        </>
      );
    },
    Library: () => <h1>Recipe library</h1>,
    RecipesDiscovery: () => <h1>Recipes discovery</h1>,
    RestaurantsDiscovery: () => <h1>Restaurants discovery</h1>,
    RestaurantsLibrary: () => <h1>Restaurant library</h1>,
    RestaurantDetail: () => <h1>Restaurant {useParams().id}</h1>,
    RecipeDetails: () => <h1>Recipe {useParams().id}</h1>,
    Cooking: () => <h1>Cooking {useParams().id}</h1>,
    Create: Placeholder,
    Grocery: () => <h2>Grocery content</h2>,
    Import: Placeholder,
    Planner: () => <h2>Planner content</h2>,
    Profile: Placeholder,
  };
});

const user = {
  uid: 'baseline-user',
  displayName: 'Baseline user',
  email: null,
  photoURL: null,
  createdAt: '',
};

function HistoryControls() {
  const navigate = useNavigate();
  return (
    <>
      <button onClick={() => navigate(-1)}>Test back</button>
      <button onClick={() => navigate(1)}>Test forward</button>
    </>
  );
}

function renderRoute(path: string, state: 'idle' | 'loading' | 'guest' | 'authenticated') {
  const store = configureStore({ reducer: { auth: authReducer } });
  if (state === 'guest') store.dispatch(userSignedOut());
  if (state === 'authenticated' || state === 'loading') store.dispatch(userSignedIn(user));
  if (state === 'loading') store.dispatch(setAuthLoading());

  const view = render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[path]}>
        <App />
        <HistoryControls />
      </MemoryRouter>
    </Provider>,
  );
  return { store, ...view };
}

test.each(['idle', 'loading'] as const)('waits for authentication while %s', (state) => {
  const { container } = renderRoute('/recipe/recipe-123', state);
  expect(container.querySelector('.spinner__page')).toBeInTheDocument();
  expect(screen.queryByRole('heading')).not.toBeInTheDocument();
});

test('redirects a guest and preserves the requested recipe URL', () => {
  renderRoute('/recipe/recipe-123?source=planner#ingredients', 'guest');
  expect(screen.getByRole('heading', { name: 'Login' })).toBeInTheDocument();
  expect(
    screen.getByText('Return to /recipe/recipe-123?source=planner#ingredients'),
  ).toBeInTheDocument();
});

test('keeps the login route public', () => {
  renderRoute('/login', 'idle');
  expect(screen.getByRole('heading', { name: 'Login' })).toBeInTheDocument();
});

test('opens the library for an authenticated user', () => {
  renderRoute('/recipes/library', 'authenticated');
  expect(screen.getByRole('heading', { name: 'Recipe library' })).toBeInTheDocument();
});

test('opens Food Hub with working Recipes and Restaurants entries', () => {
  renderRoute('/', 'authenticated');
  expect(screen.getByRole('heading', { name: 'Food Hub', level: 1 })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Recipes' })).toHaveAttribute('href', '/recipes');
  expect(screen.getByRole('link', { name: 'Restaurants' })).toHaveAttribute('href', '/restaurants');
  expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/profile');
  expect(screen.queryByRole('navigation', { name: 'Recipe tools' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('link', { name: 'Restaurants' }));
  expect(screen.getByRole('heading', { name: 'Restaurants discovery' })).toBeInTheDocument();
});

test.each([
  '/',
  '/recipes',
  '/recipes/library',
  '/planner',
  '/grocery',
  '/recipes/new',
  '/recipe/soup/edit',
  '/restaurants',
  '/restaurants/library',
  '/restaurant/cafe',
])('protects %s from guest access', (path) => {
  renderRoute(path, 'guest');
  expect(screen.getByRole('heading', { name: 'Login' })).toBeInTheDocument();
  expect(screen.getByText(`Return to ${path}`)).toBeInTheDocument();
});

test.each(['/recipes/new', '/recipe/soup/edit?section=ingredients', '/create'])(
  'opens the unified authenticated editor at %s',
  (path) => {
    renderRoute(path, 'authenticated');
    expect(screen.getByRole('heading', { name: 'Other page' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'World' })).toHaveValue('/recipes');
  },
);

test.each([
  ['/planner', 'Planner content'],
  ['/grocery', 'Grocery content'],
])('preserves %s', (path, heading) => {
  renderRoute(path, 'authenticated');
  expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
  expect(screen.getByRole('combobox', { name: 'World' })).toHaveValue('/recipes');
});

test('switches worlds and recipe tools while preserving back and forward navigation', () => {
  renderRoute('/', 'authenticated');
  expect(screen.getByRole('option', { name: 'Restaurants' })).toBeEnabled();
  fireEvent.change(screen.getByRole('combobox', { name: 'World' }), {
    target: { value: '/recipes' },
  });
  expect(screen.getByRole('heading', { name: 'Recipes discovery' })).toBeInTheDocument();
  const tools = screen.getByRole('navigation', { name: 'Recipe tools' });
  fireEvent.click(within(tools).getByRole('link', { name: 'Library' }));
  expect(screen.getByRole('heading', { name: 'Recipe library' })).toBeInTheDocument();
  fireEvent.click(within(tools).getByRole('link', { name: 'Planner' }));
  expect(screen.getByRole('heading', { name: 'Planner content' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('link', { name: 'Groceries' }));
  expect(screen.getByRole('heading', { name: 'Grocery content' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Test back' }));
  expect(screen.getByRole('heading', { name: 'Planner content' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Test forward' }));
  expect(screen.getByRole('heading', { name: 'Grocery content' })).toBeInTheDocument();
  fireEvent.change(screen.getByRole('combobox', { name: 'World' }), { target: { value: '/' } });
  expect(screen.getByRole('heading', { name: 'Food Hub', level: 1 })).toBeInTheDocument();
});

test('switches to Restaurants, exposes only its contextual tools, and returns to Recipes', () => {
  renderRoute('/recipes', 'authenticated');
  fireEvent.change(screen.getByRole('combobox', { name: 'World' }), {
    target: { value: '/restaurants' },
  });
  expect(screen.getByRole('heading', { name: 'Restaurants discovery' })).toBeInTheDocument();
  expect(screen.getByRole('combobox', { name: 'World' })).toHaveValue('/restaurants');
  expect(screen.queryByRole('navigation', { name: 'Recipe tools' })).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Planner' })).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Groceries' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Quick Add restaurant' })).toBeInTheDocument();
  fireEvent.click(
    within(screen.getByRole('navigation', { name: 'Restaurant tools' })).getByRole('link', {
      name: 'Library',
    }),
  );
  expect(screen.getByRole('heading', { name: 'Restaurant library' })).toBeInTheDocument();
  fireEvent.change(screen.getByRole('combobox', { name: 'World' }), {
    target: { value: '/recipes' },
  });
  expect(screen.getByRole('heading', { name: 'Recipes discovery' })).toBeInTheDocument();
});
test('direct Restaurant details stay in the Restaurants shell without Recipe tools', () => {
  renderRoute('/restaurant/cafe', 'authenticated');
  expect(screen.getByRole('heading', { name: 'Restaurant cafe' })).toBeInTheDocument();
  expect(screen.getByRole('combobox', { name: 'World' })).toHaveValue('/restaurants');
  expect(screen.queryByRole('link', { name: 'Planner' })).not.toBeInTheDocument();
});

test('keeps creation available and redirects the old library alias', () => {
  renderRoute('/library', 'authenticated');
  expect(screen.getByRole('heading', { name: 'Recipe library' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'New recipe' })).toHaveAttribute('href', '/create');
});

test('opens the requested recipe after authentication resolves', () => {
  const { store } = renderRoute('/recipe/recipe-123', 'idle');
  act(() => {
    store.dispatch(userSignedIn(user));
  });
  expect(screen.getByRole('heading', { name: 'Recipe recipe-123' })).toBeInTheDocument();
});

test('removes protected content when authentication is lost', () => {
  const { store } = renderRoute('/recipe/recipe-123', 'authenticated');
  act(() => {
    store.dispatch(userSignedOut());
  });
  expect(screen.getByRole('heading', { name: 'Login' })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Recipe recipe-123' })).not.toBeInTheDocument();
});

test('Cooking route remains authenticated and uses a distraction-free shell', () => {
  const first = renderRoute('/recipe/pesto/cook', 'guest');
  expect(screen.getByRole('heading', { name: 'Login' })).toBeInTheDocument();
  expect(screen.getByText('Return to /recipe/pesto/cook')).toBeInTheDocument();
  first.unmount();
  renderRoute('/recipe/pesto/cook', 'authenticated');
  expect(screen.getByRole('heading', { name: 'Cooking pesto' })).toBeInTheDocument();
  expect(screen.queryByRole('combobox', { name: 'World' })).not.toBeInTheDocument();
  expect(screen.queryByRole('navigation', { name: 'Recipe tools' })).not.toBeInTheDocument();
});
