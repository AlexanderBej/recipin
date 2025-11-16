import React, { useState } from 'react';
import clsx from 'clsx';

import './recipe-img.styles.scss';
const placeholderImage = require('../../assets/img_placeholder.png');

type RecipeImageVariant = 'card' | 'detail' | 'thumb' | 'square' | 'landscape';

interface RecipeImgProps {
  src?: string | null;
  alt?: string;
  variant?: RecipeImageVariant;
  rounded?: boolean;
  className?: string;
}

const RecipeImg: React.FC<RecipeImgProps> = ({
  src,
  alt = 'Recipe image',
  variant = 'card',
  rounded = true,
  className,
}) => {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const finalSrc = !src || failed ? placeholderImage : src;

  return (
    <div
      className={clsx(
        'recipe-image',
        `recipe-image--${variant}`,
        { 'recipe-image--rounded': rounded },
        className,
      )}
    >
      {!loaded && <div className="recipe-image__skeleton" />}

      <img
        src={finalSrc}
        alt={alt}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
      />
    </div>
  );
};

export default RecipeImg;
