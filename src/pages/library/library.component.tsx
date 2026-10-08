import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useSearchParams } from 'react-router-dom';
import { FiGrid, FiList, FiPlus, FiSearch, FiX } from 'react-icons/fi';
import { AppDispatch, RECIPE_CATEGORIES, RecipeDifficulty } from '@api/types';
import { RecipeCardFilters } from '@api/models';
import { selectAuthUserId } from '@store/auth-store';
import {
  fetchMyRecipeCardsPage,
  selectAllRecipes,
  selectMyCardsHasMore,
  selectRecipesError,
  selectRecipesLoading,
  selectRecipesLastFilters,
} from '@store/recipes-store';
import { RecipeCard } from '@features/recipe-card';
import { useDiscoveryCollection } from '@features/recipe-card/use-discovery-collection';
import { filterCollection } from '@features/recipe-card/collection.utils';
import { FilterSheet } from '@components';
import '../../features/recipe-card/recipes-collection.styles.scss';
import './library.styles.scss';

const VIEW_KEY = 'foodhub.recipes.layout';
export default function Library() {
  const dispatch = useDispatch<AppDispatch>();
  const uid = useSelector(selectAuthUserId);
  const recipes = useSelector(selectAllRecipes);
  const loading = useSelector(selectRecipesLoading);
  const error = useSelector(selectRecipesError);
  const hasMore = useSelector(selectMyCardsHasMore);
  const lastFilters = useSelector(selectRecipesLastFilters);
  const [params, setParams] = useSearchParams();
  const favoritesOnly = params.get('favorites') === '1';
  const collection = useDiscoveryCollection(favoritesOnly);
  const [view, setView] = useState<'grid' | 'list'>(() => {
    try {
      return localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'grid';
    } catch {
      return 'grid';
    }
  });
  const searchTerm = params.get('q') ?? '';
  const category = RECIPE_CATEGORIES.find((value) => value === params.get('category'));
  const difficulty = (['easy', 'intermediate', 'advanced'] as RecipeDifficulty[]).find(
    (value) => value === params.get('difficulty'),
  );
  const tag = params.get('tag') || undefined;
  const filters = useMemo<RecipeCardFilters>(
    () => ({ searchTerm, category, difficulty, tag }),
    [searchTerm, category, difficulty, tag],
  );
  useEffect(() => {
    if (!uid || favoritesOnly) return;
    const timer = setTimeout(() => {
      dispatch(fetchMyRecipeCardsPage({ uid, reset: true, filters }));
    }, 300);
    return () => clearTimeout(timer);
  }, [uid, favoritesOnly, filters, dispatch]);
  const update = (values: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params);
    Object.entries(values).forEach(([key, value]) =>
      value ? next.set(key, value) : next.delete(key),
    );
    setParams(next, { replace: true });
  };
  const chooseView = (next: 'grid' | 'list') => {
    setView(next);
    try {
      localStorage.setItem(VIEW_KEY, next);
    } catch {
      /* Storage can be unavailable in private browsing. */
    }
  };
  const items = favoritesOnly
    ? filterCollection(
        collection.items.filter((recipe) => recipe.isFavorite),
        filters,
      )
    : recipes;
  const queryPending =
    !lastFilters ||
    (['searchTerm', 'category', 'difficulty', 'tag'] as const).some(
      (key) => (lastFilters[key] || '') !== (filters[key] || ''),
    );
  const busy = favoritesOnly
    ? collection.status === 'idle' || collection.status === 'loading'
    : loading || (queryPending && !error);
  const failure = favoritesOnly ? collection.error : error;
  const filtered = !!(searchTerm || category || difficulty || tag || favoritesOnly);
  const retry = () =>
    favoritesOnly
      ? collection.retry()
      : uid && dispatch(fetchMyRecipeCardsPage({ uid, reset: true, filters }));
  return (
    <div className="recipes-page recipe-library">
      <header className="recipes-intro">
        <div>
          <p className="recipes-eyebrow">Your collection</p>
          <h1>Recipe Library</h1>
          <p>Every recipe, ready for your next meal.</p>
        </div>
        <Link className="recipes-action recipes-action--primary" to="/create">
          <FiPlus /> New Recipe
        </Link>
      </header>
      <div className="library-toolbar">
        <label className="recipes-search">
          <FiSearch />
          <input
            aria-label="Search recipes by title"
            placeholder="Search by title"
            value={searchTerm}
            onChange={(event) => update({ q: event.target.value })}
          />
          {searchTerm && (
            <button
              title="Clear search"
              aria-label="Clear search"
              onClick={() => update({ q: undefined })}
            >
              <FiX />
            </button>
          )}
        </label>
        <FilterSheet
          selected={filters}
          onChange={(next) =>
            update({ category: next.category, difficulty: next.difficulty, tag: next.tag })
          }
        />
        <div className="library-view" role="group" aria-label="Recipe view">
          <button
            title="Grid view"
            aria-label="Grid view"
            aria-pressed={view === 'grid'}
            onClick={() => chooseView('grid')}
          >
            <FiGrid />
          </button>
          <button
            title="List view"
            aria-label="List view"
            aria-pressed={view === 'list'}
            onClick={() => chooseView('list')}
          >
            <FiList />
          </button>
        </div>
      </div>
      <div className="library-quick" aria-label="Quick filters">
        <button aria-pressed={!filtered} onClick={() => setParams({})}>
          All recipes
        </button>
        <button
          aria-pressed={favoritesOnly}
          onClick={() => update({ favorites: favoritesOnly ? undefined : '1' })}
        >
          Favorites
        </button>
        <button
          aria-pressed={tag === 'quick-meal'}
          onClick={() => update({ tag: tag === 'quick-meal' ? undefined : 'quick-meal' })}
        >
          Quick meals
        </button>
        <button
          aria-pressed={tag === 'vegetarian'}
          onClick={() => update({ tag: tag === 'vegetarian' ? undefined : 'vegetarian' })}
        >
          Vegetarian
        </button>
        <button
          aria-pressed={difficulty === 'easy'}
          onClick={() => update({ difficulty: difficulty === 'easy' ? undefined : 'easy' })}
        >
          Easy
        </button>
      </div>
      <div className="library-results">
        <p>{busy ? 'Loading recipes…' : `${items.length} recipes shown`}</p>
        <div className="library-applied">
          {(['category', 'difficulty', 'tag'] as const).map(
            (key) =>
              filters[key] && (
                <button
                  key={key}
                  aria-label={`Remove ${filters[key]} filter`}
                  onClick={() => update({ [key]: undefined })}
                >
                  {filters[key]} <FiX />
                </button>
              ),
          )}
          {filtered && <button onClick={() => setParams({})}>Clear filters</button>}
        </div>
      </div>
      {failure && (
        <div className="recipes-error" role="alert">
          <p>We couldn't load your recipes.</p>
          <button className="recipes-action" onClick={retry}>
            Try again
          </button>
        </div>
      )}
      {busy && (
        <p className="recipes-status" role="status">
          Updating your collection…
        </p>
      )}
      <div className={`library-cards library-cards--${view}`}>
        {items.map((recipe) => (
          <RecipeCard key={recipe.id} recipe={recipe} variant={view} />
        ))}
        {busy &&
          !items.length &&
          [0, 1, 2].map((key) => <div className="recipes-skeleton library-skeleton" key={key} />)}
      </div>
      {!busy && !failure && !items.length && (
        <div className="recipes-empty">
          <h2>{filtered ? 'No matching recipes' : 'Your collection starts here'}</h2>
          <p>
            {filtered
              ? 'Try another title or a different filter.'
              : 'Add a recipe you want to cook again.'}
          </p>
          {filtered ? (
            <button className="recipes-action" onClick={() => setParams({})}>
              Clear filters
            </button>
          ) : (
            <Link className="recipes-action" to="/create">
              New Recipe
            </Link>
          )}
        </div>
      )}
      {!favoritesOnly && hasMore && !failure && (
        <button
          className="recipes-action library-load-more"
          disabled={busy}
          onClick={() => uid && dispatch(fetchMyRecipeCardsPage({ uid, reset: false, filters }))}
        >
          Load more
        </button>
      )}
    </div>
  );
}
