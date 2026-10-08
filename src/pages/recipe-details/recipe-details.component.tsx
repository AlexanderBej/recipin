import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  FiArrowLeft,
  FiHeart,
  FiMoreHorizontal,
  FiPlay,
  FiShoppingBag,
  FiEdit2,
} from 'react-icons/fi';
import { removeRecipe, toggleFavorite } from '@store/recipes-store';
import { ConfirmaModal, PlannerModal, RatingsSheet } from '@components';
import type { AppDispatch } from '@api/types';
import { addGroceryRecipe, makeSelectHasGroceryRecipe } from '@store/grocery-store';
import { displayTag } from '@shared/utils';
import { useRecipeDetails } from '../../features/recipe-details/use-recipe-details';
import {
  displayMinutes,
  positiveNumber,
  recipeIngredients,
  recipeSteps,
  safeRatings,
  textValue,
} from '../../features/recipe-details/recipe-display.utils';
import RecipeLoadState from '../../features/recipe-details/recipe-load-state.component';
import IngredientsList from '../../features/recipe-details/ingredients-list.component';
import RecipePhoto from '../../features/recipe-card/recipe-photo.component';
import { recipeCategory, recipeTitle } from '../../features/recipe-card/collection.utils';
import '../../features/recipe-card/recipe-card.styles.scss';
import '../../features/recipe-card/recipes-collection.styles.scss';
import '../../features/recipe-details/recipe-content.styles.scss';
import './recipe-details.styles.scss';

export default function RecipeDetails() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const location = useLocation();
  const { recipe, status, retry } = useRecipeDetails();
  const inGroceries = useSelector(makeSelectHasGroceryRecipe(recipe?.id ?? ''));
  const [savingFavorite, setSavingFavorite] = useState(false);
  const [favoriteError, setFavoriteError] = useState('');
  if (!recipe) return <RecipeLoadState status={status} retry={retry} />;
  const title = recipeTitle(recipe);
  const ingredients = recipeIngredients(recipe);
  const steps = recipeSteps(recipe);
  const tags = Array.isArray(recipe.tags)
    ? recipe.tags.filter((tag) => typeof tag === 'string' && tag.trim())
    : [];
  const description = textValue(recipe.description);
  const favorite = async () => {
    setSavingFavorite(true);
    setFavoriteError('');
    try {
      await dispatch(
        toggleFavorite({ recipeId: recipe.id, favorite: !recipe.isFavorite }),
      ).unwrap();
    } catch {
      setFavoriteError('Could not save favorite. Try again.');
    } finally {
      setSavingFavorite(false);
    }
  };
  const groceries = () => {
    if (!inGroceries)
      dispatch(
        addGroceryRecipe({
          recipeId: recipe.id,
          title,
          items: ingredients.map((ingredient) => ({
            id: crypto.randomUUID(),
            name: ingredient.item,
            quantity: ingredient.quantity,
            unit: ingredient.unit,
            checked: false,
            sourceRecipeId: [recipe.id],
          })),
        }),
      );
    navigate('/grocery');
  };
  const remove = async () => {
    await dispatch(removeRecipe(recipe.id)).unwrap();
    navigate('/recipes/library', { replace: true });
  };
  return (
    <article className="recipes-page recipe-detail-page">
      <div className="recipe-detail-toolbar">
        <Link to="/recipes/library">
          <FiArrowLeft aria-hidden="true" /> Back to Library
        </Link>
        <details className="recipe-action-menu">
          <summary aria-label="More recipe actions">
            <FiMoreHorizontal aria-hidden="true" /> More actions
          </summary>
          <div className="recipe-action-menu__items">
            <PlannerModal recipe={recipe} />
            <button onClick={groceries} disabled={!ingredients.length}>
              <FiShoppingBag aria-hidden="true" />
              {inGroceries ? 'View Groceries' : 'Add to Groceries'}
            </button>
            <Link to={`/recipe/${recipe.id}/edit`}>
              <FiEdit2 aria-hidden="true" /> Edit Recipe
            </Link>
            <ConfirmaModal
              buttonLabel="Delete Recipe"
              message="Delete this recipe permanently? This cannot be undone."
              handleConfirm={remove}
            />
          </div>
        </details>
      </div>
      {location.state?.recipeSaved && <p role="status">Recipe saved.</p>}
      {location.state?.draftClearFailed && (
        <p role="alert">
          The recipe was saved, but its local draft could not be removed. Discard that draft before
          starting another recipe.
        </p>
      )}
      <nav className="recipe-quick-edits" aria-label="Edit recipe sections">
        {['basics', 'ingredients', 'instructions', 'presentation'].map((section) => (
          <Link key={section} to={`/recipe/${recipe.id}/edit?section=${section}`}>
            <FiEdit2 aria-hidden="true" />
            Edit {section}
          </Link>
        ))}
      </nav>
      <header className="recipe-detail-hero">
        <RecipePhoto src={recipe.imageUrl} title={title} eager />
        <div className="recipe-detail-hero__copy">
          <p className="recipes-eyebrow">{recipeCategory(recipe)}</p>
          <h1>{title}</h1>
          {recipe.difficulty && (
            <p className="recipe-detail-difficulty">{displayTag(recipe.difficulty)}</p>
          )}
        </div>
      </header>
      <div className="recipe-detail-summary">
        <dl className="recipe-detail-facts">
          <div>
            <dt>Prep time</dt>
            <dd>{displayMinutes(recipe.prepMinutes) ?? 'Not specified'}</dd>
          </div>
          <div>
            <dt>Cook time</dt>
            <dd>{displayMinutes(recipe.cookMinutes) ?? 'Not specified'}</dd>
          </div>
          <div>
            <dt>Servings</dt>
            <dd>{positiveNumber(recipe.servings) ?? 'Not specified'}</dd>
          </div>
        </dl>
        <div className="recipe-detail-primary-actions">
          <button
            className="recipe-favorite-action"
            aria-label={recipe.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            aria-pressed={!!recipe.isFavorite}
            disabled={savingFavorite}
            onClick={favorite}
          >
            <FiHeart aria-hidden="true" />
          </button>
          {steps.length ? (
            <Link
              className="recipes-action recipes-action--primary"
              to={`/recipe/${recipe.id}/cook`}
            >
              <FiPlay aria-hidden="true" />
              Start Cooking
            </Link>
          ) : (
            <button className="recipes-action" disabled>
              Start Cooking
            </button>
          )}
        </div>
      </div>
      {favoriteError && (
        <p role="alert" className="recipe-action-error">
          {favoriteError}
        </p>
      )}
      {!!tags.length && (
        <ul className="recipe-detail-tags" aria-label="Recipe tags">
          {tags.map((tag, index) => (
            <li key={index}>{displayTag(tag)}</li>
          ))}
        </ul>
      )}
      {description && (
        <section className="recipe-description">
          <h2>About this recipe</h2>
          <p>{description}</p>
        </section>
      )}
      <div className="recipe-detail-body">
        <section className="recipe-detail-ingredients">
          <h2>Ingredients</h2>
          <IngredientsList ingredients={ingredients} />
          <button className="recipe-text-action" disabled={!ingredients.length} onClick={groceries}>
            <FiShoppingBag aria-hidden="true" />
            {inGroceries ? 'View Groceries' : 'Add to Groceries'}
          </button>
        </section>
        <section className="recipe-detail-instructions">
          <h2>Instructions</h2>
          {steps.length ? (
            <ol className="recipe-instructions-list">
              {steps.map((step, index) => (
                <li key={index}>
                  <span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                  <p>{step}</p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="recipe-muted">No instructions added yet.</p>
          )}
        </section>
      </div>
      <section className="recipe-detail-rating">
        <h2>Your rating</h2>
        <RatingsSheet
          recipeId={recipe.id}
          ratingCategories={safeRatings(recipe.ratingCategories)}
        />
      </section>
    </article>
  );
}
