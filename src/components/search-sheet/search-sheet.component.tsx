import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { FiPlus, FiSearch } from 'react-icons/fi';
import { BottomSheet } from '@shared/ui';
import type { RecipeCard } from '@api/models';
import type { RecipeCategory } from '@api/types';
import { listRecipeCardsByOwnerPaged } from '@api/services';
import { selectAuthUserId } from '@store/auth-store';
import RecipePhoto from '../../features/recipe-card/recipe-photo.component';
import { recipeTitle } from '../../features/recipe-card/collection.utils';
import './search-sheet.styles.scss';

export default function SearchSheet({
  selectedMealCategory,
  onRecipeTap,
  disabled = false,
}: {
  selectedMealCategory: RecipeCategory;
  onRecipeTap: (recipe: RecipeCard) => Promise<unknown> | unknown;
  disabled?: boolean;
}) {
  const uid = useSelector(selectAuthUserId);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [recipes, setRecipes] = useState<RecipeCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!open || !uid) return;
    let active = true;
    setLoading(true);
    setError('');
    setRecipes([]);
    listRecipeCardsByOwnerPaged(uid, { pageSize: 24, filters: { searchTerm: search } })
      .then((result) => {
        if (active) setRecipes(result.items);
      })
      .catch(() => {
        if (active) setError('Could not load recipes. Try again.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open, uid, search, attempt]);
  const add = async (recipe: RecipeCard) => {
    setAdding(true);
    setError('');
    try {
      await onRecipeTap(recipe);
      setOpen(false);
    } catch {
      setError('Could not add this recipe. Try again.');
    } finally {
      setAdding(false);
    }
  };
  return (
    <BottomSheet
      title={`Add to ${selectedMealCategory}`}
      className="planner-search-sheet recipes-page"
      open={open}
      onOpenChange={(value) => {
        if (!adding) setOpen(value);
      }}
      nonDismissable={adding}
      showClose={!adding}
      trigger={
        <button className="planner-add-recipe" disabled={disabled} type="button">
          <FiPlus />
          Add to {selectedMealCategory}
        </button>
      }
    >
      <label className="planner-search-input">
        <FiSearch aria-hidden="true" />
        <input
          aria-label="Search by title"
          value={search}
          placeholder="Search by title"
          disabled={adding}
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>
      {loading && <p role="status">Loading recipes…</p>}
      {error && (
        <div role="alert">
          <p>{error}</p>
          {!recipes.length && (
            <button className="recipes-action" onClick={() => setAttempt((value) => value + 1)}>
              Try again
            </button>
          )}
        </div>
      )}
      {!loading && !error && !recipes.length && <p>No recipes found.</p>}
      <div className="planner-search-results">
        {recipes.map((recipe) => (
          <button
            key={recipe.id}
            aria-label={recipeTitle(recipe)}
            disabled={adding || disabled}
            onClick={() => add(recipe)}
          >
            <RecipePhoto src={recipe.imageUrl} title={recipeTitle(recipe)} />
            <span>{recipeTitle(recipe)}</span>
            <FiPlus aria-hidden="true" />
          </button>
        ))}
      </div>
      {adding && <p role="status">Adding recipe…</p>}
    </BottomSheet>
  );
}
