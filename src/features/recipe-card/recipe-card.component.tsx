import React from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router';
import clsx from 'clsx';

import { RecipeCard as RecipeCardModel } from '@api/models';
import { AppDispatch } from '@api/types';
import { fetchRecipeById } from '@store/recipes-store';
import FavoriteCard from './favorite-card/favorite-card.component';
import DetailedCard from './detailed-card/detailed-card.component';

import './recipe-card.styles.scss';
interface RecipeCardProps {
  recipe: RecipeCardModel;
  type: 'favorite' | 'detailed';
}

const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, type }) => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const handleRecipeTap = () => {
    dispatch(fetchRecipeById(recipe.id));
    navigate(`/recipe/${recipe.id}`);
  };

  const btnClass = clsx('recipe-card-btn', {
    'detailed-card': type === 'detailed',
    'favorite-card': type === 'favorite',
  });

  return (
    <div
      role="button"
      aria-label="Open Recipe Details"
      onClick={handleRecipeTap}
      className={btnClass}
    >
      {type === 'favorite' ? <FavoriteCard recipe={recipe} /> : <DetailedCard recipe={recipe} />}
    </div>
  );
};

export default RecipeCard;
