import { beforeEach, expect, test, vi } from 'vitest';
import { onAuthStateChanged, type User } from 'firebase/auth';
import type { AppDispatch } from '@store/store';
import { setAuthLoading, userSignedIn, userSignedOut } from '@store/auth-store';
import {
  fetchMyFavorites,
  fetchMyRecipeCardsPage,
  resetMine,
  startBootLoading,
} from '@store/recipes-store';
import { initApp } from './app-init.util';

vi.mock('firebase/auth', () => ({ onAuthStateChanged: vi.fn() }));
vi.mock('@lib/firebase', () => ({ auth: {} }));
// Observe query requests without contacting Firestore or starting async thunks.
vi.mock('@store/recipes-store', () => ({
  fetchMyFavorites: vi.fn((uid: string) => ({ type: 'test/favorites', payload: uid })),
  fetchMyRecipeCardsPage: vi.fn((args: { uid: string }) => ({
    type: 'test/cards',
    payload: args,
  })),
  resetMine: () => ({ type: 'recipes/resetMine' }),
  startBootLoading: () => ({ type: 'recipes/startBootLoading' }),
}));

let resolveAuth: (user: User | null) => void;
const unsubscribe = vi.fn();
const dispatch = vi.fn() as unknown as AppDispatch;
const user = {
  uid: 'smoke-user',
  displayName: 'Smoke user',
  photoURL: null,
  email: null,
  metadata: { creationTime: '2025-01-01' },
} as User;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(onAuthStateChanged).mockImplementation((_auth, callback) => {
    resolveAuth = callback as (user: User | null) => void;
    return unsubscribe;
  });
});

test('waits for auth resolution without requesting recipes', () => {
  initApp(dispatch);
  expect(dispatch).toHaveBeenCalledExactlyOnceWith(setAuthLoading());
  expect(fetchMyRecipeCardsPage).not.toHaveBeenCalled();
  expect(fetchMyFavorites).not.toHaveBeenCalled();
});

test.each([null, { ...user, uid: '' }])('does not query without a user ID: %s', (guest) => {
  initApp(dispatch);
  resolveAuth(guest);
  expect(dispatch).toHaveBeenCalledWith(resetMine());
  expect(dispatch).toHaveBeenCalledWith(userSignedOut());
  expect(dispatch).not.toHaveBeenCalledWith(startBootLoading());
  expect(fetchMyRecipeCardsPage).not.toHaveBeenCalled();
  expect(fetchMyFavorites).not.toHaveBeenCalled();
});

test('loads both recipe lists for an authenticated user and does not reload on sign-out', () => {
  const cleanup = initApp(dispatch);
  resolveAuth(user);
  expect(dispatch).toHaveBeenCalledWith(startBootLoading());
  expect(fetchMyRecipeCardsPage).toHaveBeenCalledExactlyOnceWith({ uid: user.uid });
  expect(fetchMyFavorites).toHaveBeenCalledExactlyOnceWith(user.uid);
  expect(dispatch).toHaveBeenCalledWith(
    userSignedIn({
      uid: user.uid,
      displayName: user.displayName,
      photoURL: user.photoURL,
      email: user.email,
      createdAt: user.metadata.creationTime!,
    }),
  );
  resolveAuth(null);
  expect(dispatch).toHaveBeenLastCalledWith(userSignedOut());
  expect(fetchMyRecipeCardsPage).toHaveBeenCalledTimes(1);
  expect(fetchMyFavorites).toHaveBeenCalledTimes(1);
  cleanup();
  expect(unsubscribe).toHaveBeenCalledOnce();
});
