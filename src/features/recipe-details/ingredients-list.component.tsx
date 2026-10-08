import type { Ingredient } from '@api/models';
export default function IngredientsList({ ingredients }: { ingredients: Ingredient[] }) {
  return ingredients.length ? (
    <ul className="recipe-ingredients-list">
      {ingredients.map((ingredient, index) => (
        <li key={index}>
          <span className="recipe-ingredient-amount">
            {[ingredient.quantity, ingredient.unit].filter(Boolean).join(' ')}
          </span>
          <span>{ingredient.item}</span>
        </li>
      ))}
    </ul>
  ) : (
    <p className="recipe-muted">No ingredients added yet.</p>
  );
}
