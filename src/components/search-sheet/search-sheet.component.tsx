import React, { useEffect, useState } from 'react';
import { FaPlus } from 'react-icons/fa';
import { useSelector } from 'react-redux';

import { BottomSheet, Input, RecIcon } from '@shared/ui';
import { getCssVar } from '@shared/utils';
import { RecipeCard } from '@api/models';
import { listRecipeCardsByOwnerPaged } from '@api/services';
import { selectAuthUserId } from '@store/auth-store';
import { RecipeCategory } from '@api/types';

import './search-sheet.styles.scss';
const placeholderImage = require('../../assets/img_placeholder.png');

interface SearchSheetProps {
  selectedMealCategory: RecipeCategory;
}

const SearchSheet: React.FC<SearchSheetProps> = ({ selectedMealCategory }) => {
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
        category: selectedMealCategory, // 'breakfast' / 'lunch' / ...
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
            <RecIcon icon={FaPlus} size={32} color={getCssVar('--color-primary')} />
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
                <div key={rec.id} className="recipe-row">
                  <img
                    className="recipe-image"
                    src={rec.imageUrl ?? placeholderImage}
                    alt={`${rec.title}`}
                  />
                  <h3>{rec.title}</h3>
                </div>
              ))}
          </div>
        </div>
      </BottomSheet>
    </div>
  );
};

export default SearchSheet;
