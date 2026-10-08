import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '@api/types';
import { selectAuthUserId } from '@store/auth-store';
import { fetchDiscoveryRecipes } from '@store/recipes-store';

export function useDiscoveryCollection(enabled = true) {
  const dispatch = useDispatch<AppDispatch>();
  const uid = useSelector(selectAuthUserId);
  const collection = useSelector((state: RootState) => state.recipes.discovery);
  useEffect(() => {
    if (enabled && uid && (collection.ownerId !== uid || collection.status === 'idle')) {
      dispatch(fetchDiscoveryRecipes(uid));
    }
  }, [uid, enabled, collection.ownerId, collection.status, dispatch]);
  return {
    ...collection,
    retry: () => {
      if (uid) dispatch(fetchDiscoveryRecipes(uid));
    },
  };
}
