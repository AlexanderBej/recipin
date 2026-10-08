import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { FiCheck, FiCopy, FiExternalLink, FiTrash2, FiShoppingBag } from 'react-icons/fi';
import {
  selectGroceryRecipes,
  toggelItem,
  removeGroceryRecipe,
  clearGrocery,
} from '@store/grocery-store';
import { BottomSheet } from '@shared/ui';
import { buildIngredient, buildPageIngredientsText } from '@shared/utils';
import { useClipboard } from '@shared/hooks';
import { textValue } from '../../features/recipe-details/recipe-display.utils';
import '../../features/recipe-card/recipes-collection.styles.scss';
import '../planner/planner.styles.scss';
import './grocery.styles.scss';

export default function Grocery() {
  const dispatch = useDispatch();
  const persisted = useSelector(selectGroceryRecipes);
  const { copy } = useClipboard();
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const [clearOpen, setClearOpen] = useState(false);
  // Defensive presentation only; existing persisted groups and optional fields stay untouched.
  const groups = (Array.isArray(persisted) ? persisted : [])
    .filter((group) => group && typeof group.recipeId === 'string')
    .map((group) => ({
      ...group,
      title: textValue(group.title) || 'Untitled recipe',
      items: (Array.isArray(group.items) ? group.items : [])
        .filter((item) => item && textValue(item.name))
        .map((item) => ({
          ...item,
          name: textValue(item.name),
          quantity: textValue(item.quantity) || undefined,
          unit: textValue(item.unit) || undefined,
        })),
    }));
  const total = groups.reduce((count, group) => count + group.items.length, 0);
  const remaining = groups.reduce(
    (count, group) => count + group.items.filter((item) => !item.checked).length,
    0,
  );
  const copyGroups = async (onlyUnchecked: boolean, recipeId?: string) => {
    setError('');
    const target =
      recipeId === undefined ? groups : groups.filter((group) => group.recipeId === recipeId);
    const text = buildPageIngredientsText(target, { onlyUnchecked });
    if (!text.trim()) return;
    const success = await copy(text);
    if (success)
      setFeedback(
        recipeId === undefined
          ? onlyUnchecked
            ? 'Remaining items copied.'
            : 'All items copied.'
          : 'Recipe group copied.',
      );
    else setError('Could not copy to the clipboard. Try again.');
  };
  return (
    <section className="recipes-page grocery-page">
      <header className="grocery-toolbar">
        <p>{total ? `${remaining} of ${total} items remaining` : 'Your shopping list'}</p>
        <div>
          <button className="recipes-action" disabled={!total} onClick={() => copyGroups(false)}>
            <FiCopy />
            Copy all
          </button>
          <button className="recipes-action" disabled={!remaining} onClick={() => copyGroups(true)}>
            <FiCopy />
            Copy remaining
          </button>
          <button
            className="tool-icon"
            aria-label="Clear grocery list"
            title="Clear grocery list"
            disabled={!groups.length}
            onClick={() => setClearOpen(true)}
          >
            <FiTrash2 />
          </button>
        </div>
      </header>
      {!!total && !remaining && (
        <p className="grocery-complete" role="status">
          <FiCheck />
          Everything checked. Ready to go.
        </p>
      )}
      {!groups.length && (
        <div className="grocery-empty">
          <FiShoppingBag aria-hidden="true" />
          <h2>Your list is clear</h2>
          <p>No groceries yet.</p>
          <Link className="recipes-action" to="/planner">
            Open Planner
          </Link>
          <Link to="/recipes/library">Browse recipes</Link>
        </div>
      )}
      {groups.map((group, index) => (
        <section className="grocery-group" key={`${group.recipeId}:${index}`}>
          <header>
            <Link to={`/recipe/${group.recipeId}`}>
              <h2>{group.title}</h2>
              <FiExternalLink aria-hidden="true" />
            </Link>
            <div>
              <button
                className="tool-icon"
                aria-label={`Copy ${group.title}`}
                title="Copy recipe group"
                disabled={!group.items.length}
                onClick={() => copyGroups(false, group.recipeId)}
              >
                <FiCopy />
              </button>
              <button
                className="tool-icon"
                aria-label={`Remove ${group.title} grocery group`}
                title="Remove recipe group"
                onClick={() => {
                  dispatch(removeGroceryRecipe(group.recipeId));
                  setFeedback(`${group.title} removed from Groceries.`);
                  setError('');
                }}
              >
                <FiTrash2 />
              </button>
            </div>
          </header>
          <ul className="grocery-checklist">
            {group.items.map((item, itemIndex) => (
              <li key={`${item.id}:${itemIndex}`}>
                <label
                  className={item.checked ? 'grocery-check grocery-check--done' : 'grocery-check'}
                >
                  <input
                    type="checkbox"
                    checked={!!item.checked}
                    disabled={!item.id}
                    onChange={(event) =>
                      dispatch(
                        toggelItem({
                          recipeId: group.recipeId,
                          itemId: item.id,
                          checked: event.target.checked,
                        }),
                      )
                    }
                  />
                  <span>
                    {buildIngredient({ item: item.name, quantity: item.quantity, unit: item.unit })}
                  </span>
                </label>
              </li>
            ))}
          </ul>
          {!group.items.length && <p className="recipe-muted">No ingredients in this group.</p>}
        </section>
      ))}
      {feedback && (
        <p role="status" className="tool-feedback">
          {feedback}
        </p>
      )}
      {error && (
        <p role="alert" className="tool-error">
          {error}
        </p>
      )}
      <BottomSheet
        title="Clear grocery list?"
        className="grocery-clear-sheet recipes-page"
        open={clearOpen}
        onOpenChange={setClearOpen}
        footer={
          <div className="grocery-clear-actions">
            <button className="recipes-action" onClick={() => setClearOpen(false)}>
              Cancel
            </button>
            <button
              className="recipes-action recipes-action--primary"
              onClick={() => {
                dispatch(clearGrocery());
                setClearOpen(false);
                setFeedback('Grocery list cleared.');
                setError('');
              }}
            >
              Clear list
            </button>
          </div>
        }
      >
        <p>Remove every recipe group and checked item from your grocery list?</p>
      </BottomSheet>
    </section>
  );
}
