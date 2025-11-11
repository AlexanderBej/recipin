import { Ingredient } from '@api/models';
import { RecipeCategory, RecipeDifficulty } from '@api/types';

export interface CreateRecipeForm {
  title: string;
  category: RecipeCategory;
  description?: string;
  ingredients: Ingredient[];
  tags?: string[];
  imageURL?: string;
  steps: string[];
  cookMinutes?: number;
  prepMinutes?: number;
  servings?: number;
  difficulty?: RecipeDifficulty;
}

export interface StepProps {
  formData: CreateRecipeForm;
  handleChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => void;
}

export interface StepThreeProps extends StepProps {
  setFormData: React.Dispatch<React.SetStateAction<CreateRecipeForm>>;
}
