import { useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { FiArrowRight, FiPlus, FiSearch, FiShuffle } from 'react-icons/fi';
import type { AppDispatch } from '@api/types';
import type { RecipeCard as CardModel } from '@api/models';
import { fetchRecipeById } from '@store/recipes-store';
import { RecipeCard } from '@features/recipe-card';
import { useDiscoveryCollection } from '../../features/recipe-card/use-discovery-collection';
import {
  recentRecipes,
  recipeCategory,
  recipeTitle,
  rediscoverRecipe,
} from '../../features/recipe-card/collection.utils';
import RecipePhoto from '../../features/recipe-card/recipe-photo.component';
import emptyImage from '../../assets/world-recipes.jpg';
import '../../features/recipe-card/recipes-collection.styles.scss';
import './recipes-discovery.styles.scss';

function Shelf({ title, recipes, to }: { title: string; recipes: CardModel[]; to: string }) {
  return (
    <section className="discovery-shelf" aria-label={title}>
      <div className="discovery-section-heading">
        <h2>{title}</h2>
        <Link to={to}>
          View all <FiArrowRight aria-hidden="true" />
        </Link>
      </div>
      <div className="discovery-shelf__track" tabIndex={0} aria-label={`${title} recipes`}>
        {recipes.map((recipe) => (
          <RecipeCard key={recipe.id} recipe={recipe} variant="shelf" />
        ))}
      </div>
    </section>
  );
}

export default function RecipesDiscovery() {
  const { items, status, retry } = useDiscoveryCollection();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const [search, setSearch] = useState('');
  const hero = useMemo(() => rediscoverRecipe(items), [items]);
  const recent = useMemo(() => recentRecipes(items).slice(0, 8), [items]);
  const favorites = items.filter((recipe) => recipe.isFavorite).slice(0, 8);
  const loading = status === 'idle' || status === 'loading';
  const surprise = () => {
    const recipe = items[Math.floor(Math.random() * items.length)];
    if (recipe) {
      dispatch(fetchRecipeById(recipe.id));
      navigate(`/recipe/${recipe.id}`);
    }
  };

  return (
    <div className="recipes-page recipes-discovery">
      <div className="recipes-intro">
        <div>
          <span className="recipes-eyebrow">YOUR KITCHEN, COLLECTED</span>
          <h1>Recipes</h1>
          <p>A familiar favourite. A forgotten gem. Something good for tonight.</p>
        </div>
        <Link to="/create" className="recipes-action recipes-action--primary">
          <FiPlus aria-hidden="true" />
          New Recipe
        </Link>
      </div>
      <div className="discovery-tools">
        <form
          className="recipes-search"
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            navigate(
              `/recipes/library${search.trim() ? `?q=${encodeURIComponent(search.trim())}` : ''}`,
            );
          }}
        >
          <FiSearch aria-hidden="true" />
          <input
            aria-label="Search recipes by title"
            placeholder="Find a recipe by title"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <button type="submit" aria-label="Search collection" title="Search collection">
            <FiArrowRight aria-hidden="true" />
          </button>
        </form>
        <Link className="discovery-browse" to="/recipes/library">
          Browse All <FiArrowRight aria-hidden="true" />
        </Link>
      </div>
      {loading ? (
        <div role="status" aria-label="Loading your recipes">
          <div className="discovery-hero recipes-skeleton" />
          <div className="discovery-loading-shelf">
            {[0, 1, 2].map((key) => (
              <div key={key} className="recipes-skeleton" />
            ))}
          </div>
        </div>
      ) : status === 'error' ? (
        <div className="recipes-error" role="alert">
          <p>Your collection couldn't load. Please try again.</p>
          <button className="recipes-action" onClick={retry}>
            Try again
          </button>
        </div>
      ) : hero ? (
        <>
          <section className="discovery-hero" aria-label="Rediscover a recipe">
            <RecipePhoto src={hero.imageUrl} title={recipeTitle(hero)} eager />
            <div className="discovery-hero__copy">
              <span className="recipes-eyebrow">WORTH MAKING AGAIN</span>
              <h2>{recipeTitle(hero)}</h2>
              <p>
                {recipeCategory(hero)}
                {hero.difficulty ? ` / ${hero.difficulty}` : ''}
              </p>
              <Link
                className="recipes-action recipes-action--primary"
                to={`/recipe/${hero.id}`}
                onClick={() => dispatch(fetchRecipeById(hero.id))}
              >
                Open recipe <FiArrowRight aria-hidden="true" />
              </Link>
            </div>
            <span className="discovery-hero__caption">FROM YOUR COLLECTION</span>
          </section>
          {!!favorites.length && (
            <Shelf title="Your favourites" recipes={favorites} to="/recipes/library?favorites=1" />
          )}
          <Shelf title="Recently added" recipes={recent} to="/recipes/library" />
        </>
      ) : (
        <section
          className="discovery-hero discovery-hero--empty"
          aria-label="Start your collection"
        >
          <img src={emptyImage} alt="Pesto pasta served on a ceramic plate" />
          <div className="discovery-hero__copy">
            <span className="recipes-eyebrow">GOOD THINGS START IN THE KITCHEN</span>
            <h2>Your collection starts here.</h2>
            <p>Keep the recipes you love making.</p>
            <Link to="/create" className="recipes-action recipes-action--primary">
              <FiPlus aria-hidden="true" />
              Create your first recipe
            </Link>
          </div>
        </section>
      )}
      <section className="discovery-surprise" aria-label="Surprise Me">
        <div>
          <span className="recipes-eyebrow">LET CHANCE CHOOSE</span>
          <h2>A little kitchen serendipity.</h2>
          <p>Something from your own collection.</p>
        </div>
        <button className="recipes-action" onClick={surprise} disabled={!items.length || loading}>
          <FiShuffle aria-hidden="true" />
          Surprise Me
        </button>
      </section>
    </div>
  );
}
