import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import { FiHeart, FiStar } from 'react-icons/fi';

import { RecipeCard as RecipeCardModel } from '@api/models';
import { AppDispatch } from '@api/types';
import { fetchRecipeById, toggleFavorite } from '@store/recipes-store';
import { displayTag } from '@shared/utils';
import RecipePhoto from './recipe-photo.component';
import { recipeCategory, recipeRating, recipeTitle } from './collection.utils';

import './recipe-card.styles.scss';
interface RecipeCardProps {
  recipe: RecipeCardModel;
  variant?: 'grid' | 'list' | 'shelf';
}

export default function RecipeCard({ recipe, variant = 'grid' }: RecipeCardProps) {
  const dispatch = useDispatch<AppDispatch>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const title = recipeTitle(recipe);
  const rating = recipeRating(recipe);
  const favorite = !!recipe.isFavorite;

  const handleFavorite = async () => {
    setSaving(true);
    setError('');
    try {
      await dispatch(toggleFavorite({ recipeId: recipe.id, favorite: !favorite })).unwrap();
    } catch {
      setError('Could not save favorite. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <article className={`collection-card collection-card--${variant}`}>
      <Link
        className="collection-card__link"
        to={`/recipe/${recipe.id}`}
        aria-label={`Open ${title}`}
        onClick={(event) => {
          if (!event.ctrlKey && !event.metaKey && !event.shiftKey && event.button === 0)
            dispatch(fetchRecipeById(recipe.id));
        }}
      >
        <RecipePhoto src={recipe.imageUrl} title={title} />
        <div className="collection-card__copy">
          <span className="collection-card__category">{recipeCategory(recipe)}</span>
          <h3>{title}</h3>
          {variant === 'list' && recipe.excerpt && (
            <p className="collection-card__excerpt">{recipe.excerpt}</p>
          )}
          <div className="collection-card__meta">
            {recipe.difficulty && <span>{displayTag(recipe.difficulty)}</span>}
            {rating > 0 && (
              <span className="collection-card__rating">
                <FiStar aria-hidden="true" />
                {rating.toFixed(1)}
              </span>
            )}
          </div>
          {variant === 'list' && !!recipe.tags?.length && (
            <p className="collection-card__tags">
              {recipe.tags.slice(0, 3).map(displayTag).join(' / ')}
            </p>
          )}
        </div>
      </Link>
      <button
        type="button"
        className="collection-card__favorite"
        aria-pressed={favorite}
        aria-label={`${favorite ? 'Remove' : 'Add'} ${title} ${favorite ? 'from' : 'to'} favorites`}
        title={favorite ? 'Remove favorite' : 'Add favorite'}
        disabled={saving}
        onClick={handleFavorite}
      >
        <FiHeart aria-hidden="true" />
      </button>
      {error && (
        <p className="collection-card__error" role="alert">
          {error}
        </p>
      )}
    </article>
  );
}
