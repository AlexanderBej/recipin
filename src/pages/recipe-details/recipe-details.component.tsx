import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { format } from 'date-fns';
import { useNavigate } from 'react-router';
import { v4 as uuidv4 } from 'uuid';
import { FaPlus } from 'react-icons/fa';
import { FaMinus } from 'react-icons/fa';
import { FaRegClock } from 'react-icons/fa';
import { IoFlash } from 'react-icons/io5';
import { MdOutlineLocalGroceryStore } from 'react-icons/md';
import { MdLocalGroceryStore } from 'react-icons/md';

import { removeRecipe, selectRecipesCurrent } from '@store/recipes-store';
import { Chip, Favorite, RecIcon } from '@shared/ui';
import { buildIngredient, formatHoursAndMinutes, getCssVar, toDateOrNull } from '@shared/utils';
import { CATEGORY_META } from '@api/misc';
import { ConfirmaModal, PlannerModal, RatingsSheet, RecipeImg } from '@components';
import { GroceryItem } from '@api/models';
import { AppDispatch } from '@api/types';
import { addGroceryRecipe, makeSelectHasGroceryRecipe } from '@store/grocery-store';

import './recipe-details.styles.scss';
const placeholderImage = require('../../assets/img_placeholder.png');

const RecipeDetails: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const recipe = useSelector(selectRecipesCurrent);
  const isRecipeInGrocery = useSelector(makeSelectHasGroceryRecipe(recipe?.id ?? ''));

  const [portions, setPortions] = useState<number>(recipe?.servings ?? 1);

  const prepTime = formatHoursAndMinutes(recipe?.cookMinutes ?? 1);
  const cookTime = formatHoursAndMinutes(recipe?.prepMinutes ?? 1);

  // easy = 1, hard = 3, intermediate / null = 2
  const difficultyNum =
    recipe?.difficulty === 'easy' ? 1 : recipe?.difficulty === 'advanced' ? 3 : 2;

  const icon = isRecipeInGrocery ? MdLocalGroceryStore : MdOutlineLocalGroceryStore;
  const iconColor = isRecipeInGrocery ? '--color-primary' : '--color-text-primary';

  console.log('recipe', recipe);

  const handleAddToGrocery = () => {
    if (recipe) {
      const groceryItems: GroceryItem[] = recipe?.ingredients.map((rec) => {
        return {
          id: uuidv4(),
          name: rec.item,
          quantity: rec.quantity,
          unit: rec.unit,
          checked: false,
          sourceRecipeId: [recipe.id],
        };
      });

      dispatch(addGroceryRecipe({ items: groceryItems, recipeId: recipe.id, title: recipe.title }));
      navigate('/grocery');
    }
  };

  const handleRecipeRemove = async () => {
    if (recipe?.id) {
      await dispatch(removeRecipe(recipe.id));
      navigate('/library');
    }
  };

  const updatedAtDate = toDateOrNull(recipe?.updatedAt);

  return (
    <div className="recipe-details">
      <div className="recipe-image-wrapper">
        <div className="recipe-image-overlay" />
        <Favorite
          small={false}
          isFavorite={recipe?.isFavorite ?? false}
          recipeId={recipe?.id ?? ''}
        />
        <RecipeImg src={recipe?.imageUrl} alt={recipe?.title} variant="detail" />

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
        </div>
      </div>

      <div className="tags-row">
        {recipe?.tags.map((tag) => (
          <Chip key={tag} tag={tag} active onToggle={() => {}} />
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
        <div className="description-heading">
          <h3 className="container-heading">Description</h3>
          <PlannerModal recipe={recipe} />
        </div>
        <p>{recipe?.description}</p>
        <p className="last-update">
          {updatedAtDate
            ? `Last updated: ${format(updatedAtDate, 'MMMM do, yyyy')}`
            : 'Last updated: —'}
        </p>
      </div>

      <hr className="divider" />
      <div className="ingredients-container">
        <div className="ingredients-heading">
          <h3 className="container-heading">Ingredients</h3>
          <button type="button" onClick={() => handleAddToGrocery()}>
            <RecIcon icon={icon} size={24} color={getCssVar(iconColor)} />
          </button>
        </div>
        <ul>
          {recipe?.ingredients.map((ingr, index) => (
            <li key={index}>{buildIngredient(ingr)}</li>
          ))}
        </ul>
      </div>

      <hr className="divider" />
      <div className="steps-container">
        <h3 className="container-heading">Steps</h3>
        <ol>
          {recipe?.steps.map((step, index) => (
            <li key={index}>{step}</li>
          ))}
        </ol>
      </div>

      <hr className="divider" />
      <div
        className="ratings-container"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <h3 className="container-heading">Rating</h3>
        <RatingsSheet recipeId={recipe?.id ?? ''} ratingCategories={recipe?.ratingCategories} />
      </div>

      <hr className="divider" />
      <ConfirmaModal
        buttonLabel="Delete Recipe"
        message="Are you sure you want to delete this recipe? This process is irreversible!"
        handleConfirm={handleRecipeRemove}
      />
    </div>
  );
};

export default RecipeDetails;
