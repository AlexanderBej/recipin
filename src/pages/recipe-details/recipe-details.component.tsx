import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { useDispatch } from 'react-redux';
import { FaPlus } from 'react-icons/fa';
import { FaMinus } from 'react-icons/fa';
import { FaRegClock } from 'react-icons/fa';
import { IoFlash } from 'react-icons/io5';

import { RecipeEntity } from '@api/models';
import { AppDispatch, RecipeDifficulty } from '@api/types';
import { fetchRecipeById } from '@store/recipes-store';
import { Chip, RecIcon } from '@shared/ui';
import { formatHoursAndMinutes, getCssVar } from '@shared/utils';

import './recipe-details.styles.scss';
import { CATEGORY_META } from '@api/misc';
import { format } from 'date-fns';
const placeholderImage = require('../../assets/img_placeholder.png');

const RecipeDetails: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { id } = useParams<{ id: string }>();

  const [recipe, setRecipe] = useState<RecipeEntity | null>(null);
  const [portions, setPortions] = useState<number>(recipe?.servings ?? 1);

  const prepTime = formatHoursAndMinutes(recipe?.cookMinutes ?? 1);
  const cookTime = formatHoursAndMinutes(recipe?.prepMinutes ?? 1);

  // easy = 1, hard = 3, intermediate / null = 2
  const difficultyNum =
    recipe?.difficulty === 'easy' ? 1 : recipe?.difficulty === 'advanced' ? 3 : 2;

  useEffect(() => {
    if (id) {
      dispatch(fetchRecipeById(id))
        .unwrap()
        .then((rec) => {
          setRecipe(rec);
          setPortions(rec?.servings ?? 2);
          console.log('full rec', rec);
        });
    }
  }, [id, dispatch]);

  // const formatDiffCard = (diff: RecipeDifficulty | undefined): string => {
  //   return diff === 'easy' ? 'Easy' : diff === 'advanced' ? 'Hard' : 'Inter';
  // };

  return (
    <div className="recipe-details">
      <div className="recipe-image-wrapper">
        <div className="recipe-image-overlay" />
        <img
          className="recipe-image"
          src={recipe?.imageUrl ?? placeholderImage}
          alt={`${recipe?.title}`}
        />

        <h2 className="recipe-title">{recipe?.title}</h2>
      </div>
      <div className="action-row">
        <div className="portions-container">
          <button className="portions-toggler" onClick={() => setPortions(portions - 1)}>
            <RecIcon icon={FaMinus} size={16} />
          </button>
          <span>{portions}</span>
          <button className="portions-toggler" onClick={() => setPortions(portions + 1)}>
            <RecIcon icon={FaPlus} size={16} />
          </button>
        </div>
        <div className="time-container">
          <div className="time-box">
            <RecIcon icon={FaRegClock} size={18} color={getCssVar('--color-primary')} />
            <span>{prepTime}</span>
          </div>
          <div className="time-box">
            <RecIcon icon={FaRegClock} size={18} color={getCssVar('--color-primary')} />
            <span>{cookTime}</span>
          </div>
        </div>
        <div className="difficulty-container">
          <div className="difficulty-icons">
            {Array.from({ length: difficultyNum }).map((_, i) => (
              <RecIcon key={i} icon={IoFlash} size={18} color={getCssVar('--color-primary')} />
            ))}
          </div>
          {/* <span>{formatDiffCard(recipe?.difficulty)}</span> */}
        </div>
      </div>

      <div className="tags-row">
        {recipe?.tags.map((tag) => (
          <Chip key={tag} tag={tag} active={true} onToggle={() => {}} />
        ))}
        <div
          className="category-box"
          style={{
            backgroundColor: `${CATEGORY_META[recipe?.category ?? 'appetizers'].color}99`,
            borderColor: CATEGORY_META[recipe?.category ?? 'appetizers'].color,
          }}
        >
          <RecIcon icon={CATEGORY_META[recipe?.category ?? 'appetizers'].icon} size={18} />
          <span>{CATEGORY_META[recipe?.category ?? 'appetizers'].label}</span>
        </div>
      </div>

      <hr className="divider" />
      <div className="description-container">
        <h3 className="container-heading">Description</h3>
        <p>{recipe?.description}</p>
        <p className="last-update">
          Last updated: {format(new Date(recipe?.updatedAt ?? ''), 'MMMM do, yyyy')}
        </p>
      </div>

      <hr className="divider" />
      <div className="ingredients-container">
        <h3 className="container-heading">Ingredients</h3>
        <ul>
          {recipe?.ingredients.map((ingr, index) => (
            <li key={index}>{ingr.item}</li>
          ))}
        </ul>
      </div>

      <div className="steps-container">
        <h3 className="container-heading">Steps</h3>
        <ul>
          {recipe?.steps.map((step, index) => (
            <li key={index}>{step}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default RecipeDetails;
