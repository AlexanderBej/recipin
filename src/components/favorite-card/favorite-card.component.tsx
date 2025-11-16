import React from 'react';

import { RecipeCard as RecipeCardModel } from '@api/models';
import { Favorite, StarRating } from '@shared/ui';
import { getRatingAverage } from '@shared/utils';
import { RecipeImg } from '@components';

import './favorite-card.styles.scss';
interface FavoriteCardProps {
  recipe: RecipeCardModel;
}

const FavoriteCard: React.FC<FavoriteCardProps> = ({ recipe }) => {
  const total = getRatingAverage(recipe.ratingCategories);

  return (
    <div className="favorite-card">
      <Favorite isFavorite={recipe?.isFavorite ?? false} recipeId={recipe?.id ?? ''} />
      <RecipeImg
        src={recipe.imageUrl}
        alt={recipe.title}
        variant="landscape"
        className="favorite-img"
      />
      <div className="favorite-details">
        <h4 className="fav-rec-title">{recipe.title}</h4>
        <div className="fav-rating-container">
          <StarRating value={total} onChange={() => {}} small showValue />
        </div>
      </div>
    </div>
  );
};

export default FavoriteCard;
