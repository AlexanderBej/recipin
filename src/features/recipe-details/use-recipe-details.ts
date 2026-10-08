import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import type { AppDispatch, RootState } from '@api/types';
import { selectAuthUserId } from '@store/auth-store';
import { fetchRecipeById, selectRecipesCurrent } from '@store/recipes-store';

export function useRecipeDetails() {
  const { id = '' } = useParams();
  const uid = useSelector(selectAuthUserId);
  const dispatch = useDispatch<AppDispatch>();
  const current = useSelector(selectRecipesCurrent);
  const detail = useSelector((state: RootState) => state.recipes.detail);
  const recipe = current?.id === id ? current : null;
  useEffect(() => {
    if (uid && id && !recipe && (detail.id !== id || detail.status === 'idle'))
      dispatch(fetchRecipeById(id));
  }, [dispatch, uid, id, recipe, detail.id, detail.status]);
  return {
    id,
    recipe,
    status: recipe ? 'ready' : detail.id === id ? detail.status : 'loading',
    error: detail.id === id ? detail.error : undefined,
    retry: () => uid && dispatch(fetchRecipeById(id)),
  };
}
