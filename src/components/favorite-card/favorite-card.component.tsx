import React from 'react';

import { RecipeCard as RecipeCardModel } from '@api/models';

import './favorite-card.styles.scss';
const placeholderImage = require('../../assets/img_placeholder.png');

interface FavoriteCardProps {
  recipe: RecipeCardModel;
}

const FavoriteCard: React.FC<FavoriteCardProps> = ({ recipe }) => {
  return (
    <div className="favorite-card">
      <img
        className="favorite-image"
        src={recipe?.imageUrl ?? placeholderImage}
        alt={`${recipe?.title}`}
      />
      <div className="favorite-details">
        <h4>{recipe.title}</h4>
      </div>
    </div>
  );
};

export default FavoriteCard;
