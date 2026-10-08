import { expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import authReducer, { userSignedIn } from '../../store/auth-store/auth.slice';
import Login from './login.component';

vi.mock('@api/services', () => ({ ensureUserProfile: vi.fn(), signInWithGoogle: vi.fn() }));

function Destination() {
  const location = useLocation();
  return <p>{location.pathname + location.search + location.hash}</p>;
}

test.each([
  [undefined, '/'],
  [
    { pathname: '/recipe/existing-id', search: '?source=planner', hash: '#ingredients' },
    '/recipe/existing-id?source=planner#ingredients',
  ],
  [{ pathname: '/recipes' }, '/recipes'],
  [{ pathname: '//external.example' }, '/'],
])('returns authenticated users to their internal destination: %s', (from, expected) => {
  const store = configureStore({ reducer: { auth: authReducer } });
  store.dispatch(
    userSignedIn({
      uid: 'test-user',
      displayName: null,
      photoURL: null,
      email: null,
      createdAt: '',
    }),
  );
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[{ pathname: '/login', state: { from } }]}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Destination />} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
  expect(screen.getByText(expected)).toBeInTheDocument();
});
