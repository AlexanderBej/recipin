import React from 'react';
import { format } from 'date-fns';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router';

import { RecipeCard as RecipeCardModel } from '@api/models';
import { CATEGORY_META } from '@api/misc';
import { Chip, Favorite, RecIcon } from '@shared/ui';
import { AppDispatch, RecipeDifficulty } from '@api/types';
import { getCssVar, toDateOrNull } from '@shared/utils';
import { fetchRecipeById } from '@store/recipes-store';
import { RecipeImg } from '@components';

import './recipe-card.styles.scss';
interface RecipeCardProps {
  recipe: RecipeCardModel;
}

const RecipeCard: React.FC<RecipeCardProps> = ({ recipe }) => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const getDifColor = (dif: RecipeDifficulty | undefined): string => {
    return dif === 'easy'
      ? getCssVar('--color-success')
      : dif === 'intermediate'
        ? getCssVar('--color-warning')
        : getCssVar('--color-error');
  };

  const handleRecipeTap = () => {
    console.log('get here');

    dispatch(fetchRecipeById(recipe.id));
    navigate(`/recipe/${recipe.id}`);
  };

  const updatedAtDate = toDateOrNull(recipe.updatedAt);

  return (
    <div className="recipe-card" onClick={handleRecipeTap}>
      <Favorite
        isFavorite={recipe?.isFavorite ?? false}
        recipeId={recipe?.id ?? ''}
        className="recipe-card-fav"
      />

      <RecipeImg src={recipe.imageUrl} alt={recipe.title} variant="square" />
      <div className="recipe-details">
        <div className="details-container">
          <h4 className="recipe-title">{recipe.title}</h4>

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
          <p className="truncate-p">{recipe.excerpt}</p>
          <div className="row">
            <span style={{ color: getDifColor(recipe.difficulty) }}>{recipe.difficulty}</span>
            <span>{updatedAtDate ? format(updatedAtDate, 'MMM, yyyy') : '—'}</span>
          </div>
        </div>
        <div className="tags-container">
          {recipe.tags.map((tag) => (
            <Chip key={tag} tag={tag} onToggle={() => {}} active className="card-tag" />
          ))}
        </div>
      </div>
    </div>
  );
};

export default RecipeCard;
