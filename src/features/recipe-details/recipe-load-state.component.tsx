import { Link } from 'react-router-dom';
import './recipe-content.styles.scss';
export default function RecipeLoadState({
  status,
  retry,
}: {
  status: string;
  retry: () => unknown;
}) {
  if (status === 'not-found')
    return (
      <section className="recipe-load-state">
        <h1>Recipe not found</h1>
        <p>This recipe may have been removed.</p>
        <Link to="/recipes/library">Back to Library</Link>
      </section>
    );
  if (status === 'error')
    return (
      <section className="recipe-load-state" role="alert">
        <h1>Couldn't load this recipe</h1>
        <p>Please try again when you're connected.</p>
        <button className="recipes-action" onClick={retry}>
          Try again
        </button>
        <Link to="/recipes/library">Back to Library</Link>
      </section>
    );
  return (
    <section className="recipe-load-state" role="status">
      <p>Loading recipe…</p>
      <div className="recipe-load-skeleton" />
    </section>
  );
}
