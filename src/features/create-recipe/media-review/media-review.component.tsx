import React from 'react';

import { StepProps } from '../create-recipe.misc';

import './media-review.styles.scss';

const MediaReview: React.FC<StepProps> = ({ formData, handleChange }) => {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border p-4">
        <p className="text-sm text-muted-foreground">Preview</p>
        <h3 className="mt-1 text-lg font-semibold">{formData.title || 'Untitled recipe'}</h3>
        {formData.description && <p className="mt-1 text-sm">{formData.description}</p>}
        {formData.category && (
          <p className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">
            {formData.category}
          </p>
        )}
      </div>
    </div>
  );
};

export default MediaReview;
