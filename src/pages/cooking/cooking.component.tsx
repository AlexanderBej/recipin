import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiArrowLeft,
  FiArrowRight,
  FiCheck,
  FiList,
  FiRotateCcw,
  FiShoppingBag,
  FiX,
} from 'react-icons/fi';
import * as Dialog from '@radix-ui/react-dialog';
import type { RecipeEntity } from '@api/models';
import { BottomSheet } from '@shared/ui';
import { recipeTitle } from '../../features/recipe-card/collection.utils';
import { useRecipeDetails } from '../../features/recipe-details/use-recipe-details';
import { recipeIngredients, recipeSteps } from '../../features/recipe-details/recipe-display.utils';
import RecipeLoadState from '../../features/recipe-details/recipe-load-state.component';
import IngredientsList from '../../features/recipe-details/ingredients-list.component';
import { useCookingProgress } from '../../features/cooking/use-cooking-progress';
import { useScreenWakeLock } from '../../features/cooking/use-screen-wake-lock';
import '../../features/recipe-card/recipes-collection.styles.scss';
import '../../features/recipe-details/recipe-content.styles.scss';
import './cooking.styles.scss';

function CookingSession({ recipe, steps }: { recipe: RecipeEntity; steps: string[] }) {
  const progress = useCookingProgress(recipe.id, steps);
  useScreenWakeLock();
  const [ingredientsOpen, setIngredientsOpen] = useState(false);
  const complete = progress.completed.length === steps.length;
  return (
    <div className="recipes-page cooking-page">
      <header className="cooking-header">
        <div>
          <p className="recipes-eyebrow">COOKING MODE</p>
          <h1>{recipeTitle(recipe)}</h1>
        </div>
        <Link
          className="cooking-icon-button"
          to={`/recipe/${recipe.id}`}
          aria-label="Exit Cooking Mode"
          title="Exit Cooking Mode"
        >
          <FiX aria-hidden="true" />
        </Link>
      </header>
      <div className="cooking-tools">
        <div className="cooking-view" role="group" aria-label="Cooking view">
          <button aria-pressed={progress.view === 'step'} onClick={() => progress.setView('step')}>
            Step-by-step
          </button>
          <button
            aria-pressed={progress.view === 'checklist'}
            onClick={() => progress.setView('checklist')}
          >
            <FiList aria-hidden="true" />
            Checklist
          </button>
        </div>
        <BottomSheet
          open={ingredientsOpen}
          onOpenChange={setIngredientsOpen}
          title="Ingredients"
          size="tall"
          className="cooking-ingredients-sheet"
          trigger={
            <button className="cooking-icon-button" aria-label="Ingredients" title="Ingredients">
              <FiShoppingBag aria-hidden="true" />
            </button>
          }
        >
          <Dialog.Description className="cooking-sheet-description">
            {recipeTitle(recipe)}
          </Dialog.Description>
          <IngredientsList ingredients={recipeIngredients(recipe)} />
        </BottomSheet>
      </div>
      <div className="cooking-progress">
        <div>
          <p aria-live="polite">
            {progress.completed.length} of {steps.length} steps complete
          </p>
          <button
            className="cooking-reset"
            aria-label="Restart cooking"
            title="Restart cooking"
            onClick={progress.restart}
          >
            <FiRotateCcw aria-hidden="true" />
          </button>
        </div>
        <progress
          aria-label="Cooking progress"
          value={progress.completed.length}
          max={steps.length}
        />
      </div>
      {complete && (
        <section className="cooking-complete" role="status">
          <FiCheck aria-hidden="true" />
          <div>
            <h2>Ready to enjoy.</h2>
            <p>All steps complete.</p>
          </div>
        </section>
      )}
      {progress.view === 'step' ? (
        <section className="cooking-step" aria-label="Current instruction">
          <p className="recipes-eyebrow">
            Step {progress.current + 1} of {steps.length}
          </p>
          <h2>Step {progress.current + 1}</h2>
          <p className="cooking-step__instruction">{steps[progress.current]}</p>
          <label className="cooking-step__check">
            <input
              type="checkbox"
              checked={progress.completed.includes(progress.current)}
              onChange={() => progress.toggle(progress.current)}
            />
            <span>Mark step complete</span>
          </label>
          <div className="cooking-step__navigation">
            <button
              className="recipes-action"
              disabled={progress.current === 0}
              onClick={() => progress.move(-1)}
            >
              <FiArrowLeft aria-hidden="true" />
              Previous
            </button>
            <button
              className="recipes-action recipes-action--primary"
              disabled={progress.current === steps.length - 1}
              onClick={() => progress.move(1)}
            >
              Next
              <FiArrowRight aria-hidden="true" />
            </button>
          </div>
        </section>
      ) : (
        <section className="cooking-checklist" aria-label="Instruction checklist">
          <h2>Instructions</h2>
          <ol>
            {steps.map((step, index) => (
              <li key={index} className={progress.completed.includes(index) ? 'is-complete' : ''}>
                <label>
                  <input
                    type="checkbox"
                    aria-label={`Complete step ${index + 1}`}
                    checked={progress.completed.includes(index)}
                    onChange={() => progress.toggle(index)}
                  />
                  <span>
                    <strong>Step {index + 1}</strong>
                    <span>{step}</span>
                  </span>
                </label>
              </li>
            ))}
          </ol>
        </section>
      )}
      <footer className="cooking-footer">
        <Link to={`/recipe/${recipe.id}`}>
          <FiArrowLeft aria-hidden="true" />
          Back to recipe
        </Link>
        {complete && (
          <button className="recipes-action" onClick={progress.restart}>
            <FiRotateCcw aria-hidden="true" />
            Cook again
          </button>
        )}
      </footer>
    </div>
  );
}

export default function Cooking() {
  const { recipe, status, retry } = useRecipeDetails();
  if (!recipe) return <RecipeLoadState status={status} retry={retry} />;
  const steps = recipeSteps(recipe);
  if (!steps.length)
    return (
      <section className="recipe-load-state">
        <h1>No instructions yet</h1>
        <p>Add instructions before cooking this recipe.</p>
        <Link to={`/recipe/${recipe.id}`}>Back to recipe</Link>
      </section>
    );
  return <CookingSession key={recipe.id + JSON.stringify(steps)} recipe={recipe} steps={steps} />;
}
