import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { FaPlus } from 'react-icons/fa';
import { GoPlusCircle } from 'react-icons/go';

import { BottomSheet, Input, RecIcon } from '@shared/ui';
import { getCssVar } from '@shared/utils';
import { RecipeCard } from '@api/models';
import { listRecipeCardsByOwnerPaged } from '@api/services';
import { selectAuthUserId } from '@store/auth-store';
import { RecipeCategory } from '@api/types';
import { RecipeImg } from '@components';

import './search-sheet.styles.scss';

interface SearchSheetProps {
  selectedMealCategory: RecipeCategory;
  onRecipeTap: (rec: RecipeCard) => void;
  isMainMeal?: boolean;
}

const SearchSheet: React.FC<SearchSheetProps> = ({
  selectedMealCategory,
  onRecipeTap,
  isMainMeal = true,
}) => {
  const uid = useSelector(selectAuthUserId);

  const [recipes, setRecipes] = useState<RecipeCard[]>([]);
  const [cursor, setCursor] = useState<string | null>(null); // titleSearch cursor
  const [searchTerm, setSearchTerm] = useState('');

  async function loadPlannerRecipes(initial = false) {
    if (!uid) return;
    const { items, nextStartAfterTitle } = await listRecipeCardsByOwnerPaged(uid, {
      pageSize: 24,
      startAfterTitle: initial ? null : cursor,
      filters: {
        // category: selectedMealCategory, // 'breakfast' / 'lunch' / ...
        searchTerm, // works both with '' (browse-by-title) and non-empty
      },
    });

    setRecipes((prev) => (initial ? items : [...prev, ...items]));
    setCursor(nextStartAfterTitle);
  }

  // on open
  useEffect(() => {
    loadPlannerRecipes(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMealCategory, searchTerm, uid]);

  return (
    <div className="search-sheet" role="group" aria-label="Search recipe">
      <BottomSheet
        trigger={
          <button type="button" aria-label="Open search recipe sheet">
            <RecIcon
              icon={isMainMeal ? FaPlus : GoPlusCircle}
              size={32}
              color={getCssVar(isMainMeal ? '--color-primary' : '--color-text-primary')}
            />
          </button>
        }
        title="Search recipe"
        size="tall"
        showHandle
      >
        <div className="search-recipe-container">
          <Input
            className="search-input"
            placeholder="Search by title"
            name="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            prefix="search"
          />

          <div className="search-results">
            {recipes &&
              recipes.map((rec) => (
                <button
                  key={rec.id}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onRecipeTap(rec);
                  }}
                  className="recipe-row"
                >
                  <RecipeImg src={rec.imageUrl} alt={rec.title} variant="thumb" />
                  <h3>{rec.title}</h3>
                </button>
              ))}
          </div>
        </div>
      </BottomSheet>
    </div>
  );
};

export default SearchSheet;
