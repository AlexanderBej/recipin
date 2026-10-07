import React from 'react';
import { expect, test, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';

import App from './App';
import authReducer, {
  setAuthLoading,
  userSignedIn,
  userSignedOut,
} from './store/auth-store/auth.slice';

vi.mock('@shared/providers', () => ({ initApp: () => vi.fn() }));
vi.mock('@shared/ui', async () => ({
  Spinner: (await import('./shared/ui/spinner/spinner.component')).default,
}));

// Keep the real App routes and guard; page stubs avoid unrelated UI and Firebase imports.
vi.mock('@pages', async () => {
  const { Outlet, useLocation, useParams } = await import('react-router-dom');
  const Placeholder = () => <h1>Other page</h1>;
  return {
    Layout: () => <Outlet />,
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
    RecipeDetails: () => <h1>Recipe {useParams().id}</h1>,
    Create: Placeholder,
    Grocery: Placeholder,
    Import: Placeholder,
    Planner: Placeholder,
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

function renderRoute(path: string, state: 'idle' | 'loading' | 'guest' | 'authenticated') {
  const store = configureStore({ reducer: { auth: authReducer } });
  if (state === 'guest') store.dispatch(userSignedOut());
  if (state === 'authenticated' || state === 'loading') store.dispatch(userSignedIn(user));
  if (state === 'loading') store.dispatch(setAuthLoading());

  const view = render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[path]}>
        <App />
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
  renderRoute('/', 'authenticated');
  expect(screen.getByRole('heading', { name: 'Recipe library' })).toBeInTheDocument();
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
