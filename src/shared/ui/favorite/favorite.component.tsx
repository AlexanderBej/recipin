import React from 'react';
import clsx from 'clsx';
import { useDispatch } from 'react-redux';
import { MdFavoriteBorder } from 'react-icons/md';
import { MdFavorite } from 'react-icons/md';

import { RecIcon } from '../icon';
import { getCssVar } from '@shared/utils';
import { AppDispatch } from '@api/types';
import { toggleFavorite } from '@store/recipes-store';

import './favorite.styles.scss';

interface FavoriteProps {
  isFavorite: boolean;
  recipeId: string;
  small?: boolean;
  className?: string;
}

const Favorite: React.FC<FavoriteProps> = ({ isFavorite, recipeId, className, small = true }) => {
  const dispatch = useDispatch<AppDispatch>();

  const handleFavoriteTap = (e: any) => {
    e.preventDefault();
    e.stopPropagation();
    if (recipeId) {
      dispatch(toggleFavorite({ recipeId, favorite: !isFavorite }));
    }
  };
  return (
    <button
      type="button"
      aria-label="Toggle favorite"
      onClick={(e) => handleFavoriteTap(e)}
      className={clsx('favorite-icon', className)}
    >
      <RecIcon
        icon={isFavorite ? MdFavorite : MdFavoriteBorder}
        size={small ? 24 : 32}
        color={getCssVar('--color-error')}
      />
    </button>
  );
};

export default Favorite;
