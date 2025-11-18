import React from 'react';
import { format } from 'date-fns';

import { RecipeCard as RecipeCardModel } from '@api/models';
import { CATEGORY_META } from '@api/misc';
import { Chip, Favorite, RecIcon } from '@shared/ui';
import { RecipeDifficulty } from '@api/types';
import { getCssVar, toDateOrNull } from '@shared/utils';
import { RecipeImg } from '@components';

import './detailed-card.styles.scss';
interface RecipeCardProps {
  recipe: RecipeCardModel;
}

const DetailedCard: React.FC<RecipeCardProps> = ({ recipe }) => {
  const getDifColor = (dif: RecipeDifficulty | undefined): string => {
    return dif === 'easy'
      ? getCssVar('--color-success')
      : dif === 'intermediate'
        ? getCssVar('--color-warning')
        : getCssVar('--color-error');
  };

  const updatedAtDate = toDateOrNull(recipe.updatedAt);

  return (
    <>
      <Favorite
        isFavorite={recipe?.isFavorite ?? false}
        recipeId={recipe?.id ?? ''}
        className="recipe-card-fav"
      />

      <RecipeImg src={recipe.imageUrl} alt={recipe.title} variant="square" />
      <div className="det-card-details">
        <div>
          <h4 className="det-card-recipe-title">{recipe.title}</h4>

          <div
            className="det-card-category-box"
            style={{
              backgroundColor: `${CATEGORY_META[recipe.category].color}99`,
              borderColor: CATEGORY_META[recipe.category].color,
            }}
          >
            <RecIcon icon={CATEGORY_META[recipe.category].icon} size={11} />
            <span>{CATEGORY_META[recipe.category].label}</span>
          </div>
          <p className="truncate-p">{recipe.excerpt}</p>
          <div className="det-card-row">
            <span style={{ color: getDifColor(recipe.difficulty) }}>{recipe.difficulty}</span>
            <span>{updatedAtDate ? format(updatedAtDate, 'MMM, yyyy') : '—'}</span>
          </div>
        </div>
        <div className="det-card-tags-container">
          {recipe.tags.map((tag) => (
            <Chip key={tag} tag={tag} onToggle={() => {}} active className="card-tag" />
          ))}
        </div>
      </div>
    </>
  );
};

export default DetailedCard;
