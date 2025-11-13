import React from 'react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router';

import { RecipeCard as RecipeCardModel } from '@api/models';
import { CATEGORY_META } from '@api/misc';
import { Chip, RecIcon } from '@shared/ui';
import { RecipeDifficulty } from '@api/types';
import { getCssVar } from '@shared/utils';

import './recipe-card.styles.scss';
const placeholderImage = require('../../assets/img_placeholder.png');

interface RecipeCardProps {
  recipe: RecipeCardModel;
}

const RecipeCard: React.FC<RecipeCardProps> = ({ recipe }) => {
  const navigate = useNavigate();

  const getDifColor = (dif: RecipeDifficulty | undefined): string => {
    return dif === 'easy'
      ? getCssVar('--color-success')
      : dif === 'intermediate'
        ? getCssVar('--color-warning')
        : getCssVar('--color-error');
  };

  return (
    <div className="recipe-card" onClick={() => navigate(`/recipe/${recipe.id}`)}>
      <img
        className="recipe-image"
        src={recipe?.imageUrl ?? placeholderImage}
        alt={`${recipe?.title}`}
      />
      <div className="recipe-details">
        <div className="details-container">
          <div
            className="category-box"
            style={{
              backgroundColor: `${CATEGORY_META[recipe.category].color}99`,
              borderColor: CATEGORY_META[recipe.category].color,
            }}
          >
            <RecIcon icon={CATEGORY_META[recipe.category].icon} size={11} />
            <span>{CATEGORY_META[recipe.category].label}</span>
          </div>
          <h4 className="recipe-title">{recipe.title}</h4>
          <p className="truncate-p">{recipe.excerpt}</p>
          <div className="row">
            <span style={{ color: getDifColor(recipe.difficulty) }}>{recipe.difficulty}</span>
            <span>{format(new Date(recipe.updatedAt ?? ''), 'MMM, yyyy')}</span>
          </div>
        </div>
        <div className="tags-container">
          {recipe.tags.map((tag) => (
            <Chip key={tag} tag={tag} onToggle={() => {}} active={true} className="card-tag" />
          ))}
        </div>
      </div>
    </div>
  );
};

export default RecipeCard;
