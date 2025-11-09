import { onAuthStateChanged } from 'firebase/auth';

import { onUserRecipesSnapshot } from '@api/services';
import { auth } from '@lib/firebase';
import { AppDispatch } from '@store/store';
import { setAuthLoading, userSignedIn, userSignedOut } from '@store/auth-store';
import { setItems } from '@store/recipes-store';

export const initApp = (dispatch: AppDispatch) => {
  dispatch(setAuthLoading());

  // Keep a reference to active listeners so we can clean them up on auth change
  let recipesUnsub: (() => void) | null = null;

  const unsubAuth = onAuthStateChanged(auth, async (fbUser) => {
    // Clean previous listeners whenever auth changes
    try {
      recipesUnsub?.();
    } catch {}
    recipesUnsub = null;

    if (!fbUser) {
      dispatch(userSignedOut());
      // Clear any stale recipes when signed out (optional)
      dispatch(setItems([]));
      return;
    }

    // Set user in store
    dispatch(
      userSignedIn({
        uid: fbUser.uid,
        displayName: fbUser.displayName,
        photoURL: fbUser.photoURL,
        email: fbUser.email,
        createdAt: new Date(fbUser.metadata.creationTime ?? ''),
      }),
    );

    // Attach live recipes listener
    recipesUnsub = onUserRecipesSnapshot(fbUser.uid, (recipes) => {
      dispatch(setItems(recipes));
    });
  });

  // Return a cleanup function for when the app unmounts (mirrors your original)
  return () => {
    try {
      unsubAuth();
    } catch {}
    try {
      recipesUnsub?.();
    } catch {}
  };
};
