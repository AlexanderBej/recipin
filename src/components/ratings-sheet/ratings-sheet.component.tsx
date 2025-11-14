import React, { useState } from 'react';
import { useDispatch } from 'react-redux';

import { AppDispatch, RatingCategory } from '@api/types';
import { BottomSheet, StarRating } from '@shared/ui';
import { getRatingAverage } from '@shared/utils';
import { RATING_CATEGORIES } from '@api/misc';
import { saveSoloRatingThunk } from '@store/recipes-store';

import './ratings-sheet.styles.scss';

interface RatingsSheetProps {
  recipeId: string;
  ratingCategories: Partial<Record<RatingCategory, number>> | undefined;
}

const RatingsSheet: React.FC<RatingsSheetProps> = ({ recipeId, ratingCategories }) => {
  const dispatch = useDispatch<AppDispatch>();
  const [open, setOpen] = useState(false);

  const total = getRatingAverage(ratingCategories);

  console.log('rating', ratingCategories, total);

  const handleRatingSave = (cat: RatingCategory, value: number) => {
    dispatch(saveSoloRatingThunk({ recipeId, cat, value }));
  };

  return (
    <div
      className="ratings-panel"
      role="group"
      aria-label="Rating"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="open-ratings-row">
        <StarRating
          value={total}
          showValue={true}
          onChange={() => {
            setOpen(true);
          }}
        />
      </div>
      <BottomSheet
        open={open}
        onOpenChange={setOpen}
        title="Rate the recipe"
        size="auto"
        showHandle
      >
        <div className="ratings">
          {RATING_CATEGORIES.map((cat) => (
            <div key={cat} className="rating-container">
              <span className="rating-label">{cat}</span>
              <StarRating
                value={ratingCategories?.[cat] ?? 0}
                onChange={(val) => handleRatingSave(cat, val)}
              />
            </div>
          ))}
        </div>
      </BottomSheet>
    </div>
  );
};

export default RatingsSheet;
