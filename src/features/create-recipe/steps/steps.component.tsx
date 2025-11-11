import React from 'react';

import { StepThreeProps } from '../create-recipe.misc';
import { Button, Input, Textarea } from '@shared/ui';

import './steps.styles.scss';

const Steps: React.FC<StepThreeProps> = ({ formData, setFormData }) => {
  const update = (i: number, val: string) => {
    const next = [...formData.steps];
    next[i] = val;
    setFormData({ ...formData, steps: next });
  };

  const removeStep = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      steps: prev.steps.filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="space-y-3">
      {formData.steps.map((s, i) => (
        <Textarea
          key={i}
          value={s}
          onChange={(e) => update(i, e.target.value)}
          placeholder={`Step ${i + 1}`}
          className="recipe-step-input"
        />
      ))}
      <Button
        variant="secondary"
        className="w-full"
        onClick={() => setFormData({ ...formData, steps: [...formData.steps, ''] })}
      >
        + Add step
      </Button>
    </div>
  );
};

export default Steps;
