import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FaCheck, FaExternalLinkAlt } from 'react-icons/fa';
import { useNavigate } from 'react-router';

import { selectGroceryRecipes, toggelItem } from '@store/grocery-store';
import { Button, CheckboxInput, RecIcon } from '@shared/ui';
import { buildIngredient, buildPageIngredientsText, getCssVar } from '@shared/utils';
import { AppDispatch } from '@api/types';
import { CopyDropdown } from '@components';
import { useClipboard } from '@shared/hooks';
import { fetchRecipeById } from '@store/recipes-store';

import './grocery.styles.scss';

const Grocery: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { copy, copied } = useClipboard();
  const [copiedRef, setCopiedRef] = useState<Record<string, boolean>>({
    all: false,
    remaining: false,
  });
  const groceryRecipes = useSelector(selectGroceryRecipes);

  const toggleItemChecked = (checked: boolean, recipeId: string, itemId: string) => {
    dispatch(toggelItem({ recipeId, itemId, checked }));
  };

  const handleRecipeTap = (recipeId: string) => {
    dispatch(fetchRecipeById(recipeId));
    navigate(`/recipe/${recipeId}`);
  };

  const handleCopyAllRecipes = () => {
    copy(buildPageIngredientsText(groceryRecipes, { onlyUnchecked: false }));
    setCopiedRef({ all: true, remaining: false });
  };

  const handleCopyRemainingRecipes = () => {
    copy(buildPageIngredientsText(groceryRecipes, { onlyUnchecked: true }));
    setCopiedRef({ all: false, remaining: true });
  };

  if (!groceryRecipes) {
    return <p>Nothing in your grocery basket</p>;
  }

  return (
    <div className="grocery">
      <div className="grocery-heading">
        <Button
          variant="secondary"
          type="button"
          onClick={handleCopyAllRecipes}
          className="page-copy-btn"
        >
          <div className="copy-succes copy-success__all">
            {copied && copiedRef.all && (
              <RecIcon icon={FaCheck} size={18} color={getCssVar('--color-success')} />
            )}
          </div>
          Copy All
        </Button>
        <Button
          variant="primary"
          type="button"
          onClick={handleCopyRemainingRecipes}
          className="page-copy-btn"
        >
          <div className="copy-succes copy-success__remaining">
            {copied && copiedRef.remaining && (
              <RecIcon icon={FaCheck} size={18} color={getCssVar('--color-success')} />
            )}
          </div>
          Copy Remaining
        </Button>
      </div>
      {groceryRecipes.map((gRec) => {
        return (
          <div key={gRec.recipeId} className="grocery-recipe">
            <div className="rec-heading">
              <button
                type="button"
                className="title-with-icon"
                onClick={() => handleRecipeTap(gRec.recipeId)}
              >
                <h3 className="grocery-rec-title">{gRec.title}</h3>
                <RecIcon icon={FaExternalLinkAlt} size={18} color={getCssVar('--color-primary')} />
              </button>
              <CopyDropdown ingredients={gRec.items} small={true} />
            </div>
            <div className="grocery-items">
              {gRec.items.map((gItem) => {
                return (
                  <div key={gItem.id} className="grocery-item">
                    <CheckboxInput
                      name="checked"
                      checked={gItem.checked}
                      onChange={(e) => toggleItemChecked(e.target.checked, gRec.recipeId, gItem.id)}
                      label={buildIngredient({
                        item: gItem.name,
                        unit: gItem.unit,
                        quantity: gItem.quantity,
                      })}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Grocery;
