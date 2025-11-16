import { onAuthStateChanged } from 'firebase/auth';

import { auth } from '@lib/firebase';
import { AppDispatch } from '@store/store';
import { setAuthLoading, userSignedIn, userSignedOut } from '@store/auth-store';
import { fetchMyFavorites, fetchMyRecipeCardsPage, resetMine } from '@store/recipes-store';

export const initApp = (dispatch: AppDispatch) => {
  dispatch(setAuthLoading());

  const unsubAuth = onAuthStateChanged(auth, async (fbUser) => {
    // clear list on every auth change
    dispatch(resetMine());

    console.log(fbUser?.uid);

    dispatch(fetchMyRecipeCardsPage({ uid: fbUser?.uid ?? '' }));
    dispatch(fetchMyFavorites(fbUser?.uid ?? ''));

    if (!fbUser) {
      dispatch(userSignedOut());
      return;
    }
    dispatch(
      userSignedIn({
        uid: fbUser.uid,
        displayName: fbUser.displayName,
        photoURL: fbUser.photoURL,
        email: fbUser.email,
        createdAt: fbUser.metadata.creationTime ?? '',
      }),
    );
  });

  return () => {
    try {
      unsubAuth();
    } catch {}
  };
};
