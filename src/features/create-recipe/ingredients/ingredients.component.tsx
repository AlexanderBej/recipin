import React from 'react';
import { IoIosRemoveCircle } from 'react-icons/io';

import { StepThreeProps } from '../create-recipe.misc';
import { Button, Input, RecIcon, Select, SelectOption } from '@shared/ui';
import { getCssVar } from '@shared/utils';
import { MEASURING_UNITS_ALL } from '@api/misc';

import './ingredients.styles.scss';

const Ingredients: React.FC<StepThreeProps> = ({ formData, setFormData }) => {
  const update = (i: number, key: 'item' | 'quantity' | 'unit', val: string) => {
    const next = [...formData.ingredients];
    next[i] = { ...next[i], [key]: val };
    setFormData({ ...formData, ingredients: next });
  };

  const removeIngredient = (index: number) => {
    setFormData((prev) => {
      const next = prev.ingredients.filter((_, i) => i !== index);
      return { ...prev, ingredients: next };
    });
  };

  const UNITS_OPTIONS: SelectOption[] = MEASURING_UNITS_ALL.map((unit) => {
    return { label: unit, value: unit };
  });

  return (
    <div className="ingredients-wrapper">
      {formData.ingredients.map((ing, i) => (
        <div key={i} className="ingredient-container">
          <div className="ingr-row">
            <Input
              value={ing.item}
              onChange={(e) => update(i, 'item', e.target.value)}
              placeholder="Flour"
              name="item"
            />
            <button className="delete-ingr-btn" onClick={() => removeIngredient(i)}>
              <RecIcon icon={IoIosRemoveCircle} size={32} color={getCssVar('--color-error')} />
            </button>
          </div>
          <div className="ingr-row">
            <Input
              value={ing.quantity}
              onChange={(e) => update(i, 'quantity', e.target.value)}
              placeholder="200"
              type="number"
              name="quantity"
            />
            <Select
              name="unit"
              value={ing.unit ?? ''}
              options={UNITS_OPTIONS}
              onChange={(e) => update(i, 'unit', e.target.value)}
              customClassName="unit-select"
            />
          </div>
        </div>
      ))}
      <Button
        variant="secondary"
        className="w-full"
        onClick={() =>
          setFormData({
            ...formData,
            ingredients: [...formData.ingredients, { item: '', quantity: '' }],
          })
        }
      >
        + Add ingredient
      </Button>
    </div>
  );
};

export default Ingredients;
