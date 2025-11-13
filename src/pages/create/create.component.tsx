import React, { useCallback, useMemo, useState } from 'react';
import clsx from 'clsx';
import { useDispatch, useSelector } from 'react-redux';

import { Button } from '@shared/ui';
import {
  BasicInfo,
  CreateRecipeForm,
  Ingredients,
  MediaReview,
  Steps,
  StepSlide,
} from '@features/create-recipe';
import { AppDispatch, CreateRecipeInput } from '@api/types';
import { createRecipe } from '@store/recipes-store';
import { selectAuthUserId } from '@store/auth-store';

import './create.styles.scss';

const Create: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();

  const userId = useSelector(selectAuthUserId);

  const [formData, setFormData] = useState<CreateRecipeForm>({
    title: '',
    category: 'appetizers',
    ingredients: [{ item: '', unit: 'gr' }],
    steps: [''],
  });
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(0); // -1 back, 1 next

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };

  const steps = useMemo(
    () => [
      {
        id: 'basic',
        title: 'Basic Info',
        element: (
          <BasicInfo formData={formData} handleChange={handleChange} setFormData={setFormData} />
        ),
      },
      {
        id: 'ingredients',
        title: 'Ingredients',
        element: (
          <Ingredients formData={formData} setFormData={setFormData} handleChange={handleChange} />
        ),
      },
      {
        id: 'steps',
        title: 'Steps',
        element: (
          <Steps formData={formData} setFormData={setFormData} handleChange={handleChange} />
        ),
      },
      {
        id: 'review',
        title: 'Review',
        element: <MediaReview formData={formData} handleChange={handleChange} />,
      },
    ],
    [formData],
  );

  const canNext = useMemo(() => {
    if (step === 0) return formData.title.trim().length > 0; // basic validation example
    return true;
  }, [formData.title, step]);

  const go = useCallback(
    (delta: number) => {
      setDirection(delta);
      setStep((s) => Math.min(Math.max(s + delta, 0), steps.length - 1));
    },
    [steps.length],
  );

  const handleSubmit = (e: any) => {
    e.preventDefault();
    console.log(e);
    if (!userId) return;
    const payload: CreateRecipeInput = {
      title: formData.title,
      authorId: userId,
      category: formData.category,
      description: formData.description,
      ingredients: formData.ingredients,
      tags: formData.tags ?? [],
      imageUrl: formData.imageURL,
      steps: formData.steps,
      cookMinutes: formData.cookMinutes,
      prepMinutes: formData.prepMinutes,
      servings: formData.servings,
      difficulty: formData.difficulty,
    };

    dispatch(createRecipe(payload)).unwrap();
  };

  return (
    <div className="create-recipe-page">
      {/* Step tabs */}
      <div className="recipe-tabs-switcher">
        {steps.map((s, i) => (
          <button
            key={s.id}
            className={clsx('recipe-tab', { 'recipe-tab__active': i === step })}
            onClick={() => {
              setDirection(i > step ? 1 : -1);
              setStep(i);
            }}
          >
            {s.title}
          </button>
        ))}
      </div>

      {/* Animated step content */}
      <div className="recipes-tabs">
        <StepSlide
          stepKey={steps[step].id}
          direction={direction}
          onSwipePrev={() => go(-1)}
          onSwipeNext={() => go(1)}
        >
          {steps[step].element}
        </StepSlide>
      </div>

      {/* Footer actions */}
      <div className="recipes-actions">
        <Button variant="secondary" onClick={() => go(-1)} disabled={step === 0}>
          Back
        </Button>
        {step < steps.length - 1 ? (
          <Button onClick={() => go(1)} disabled={!canNext}>
            Next
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={!formData.title.trim()}>
            Save Recipe
          </Button>
        )}
      </div>

      {/* Tiny helper text */}
      <p className="mt-2 text-center text-[11px] text-muted-foreground">
        Tip: swipe left/right to move between steps
      </p>
    </div>
  );
};

export default Create;
