import type { RecipeEntity } from '@api/models';
import type { CreateRecipeInput, RecipeCategory, RecipeDifficulty } from '@api/types';

export const sections = [
  'basics',
  'ingredients',
  'instructions',
  'presentation',
  'review',
] as const;
export type EditorSection = (typeof sections)[number];
export const sectionLabels = [
  'Basics',
  'Ingredients',
  'Instructions',
  'Presentation',
  'Review & Save',
];
export type IngredientRow = {
  key: string;
  sourceIndex: number | null;
  item: string;
  quantity: string;
  unit: string;
};
export type EditorForm = {
  title: string;
  description: string;
  category: string;
  difficulty: string;
  servings: string;
  prepMinutes: string;
  cookMinutes: string;
  imageUrl: string;
  tags: string[];
  ingredients: IngredientRow[];
  steps: string[];
};
const text = (value: unknown) =>
  typeof value === 'string' || typeof value === 'number' ? String(value) : '';
export const emptyIngredient = (): IngredientRow => ({
  key: crypto.randomUUID(),
  sourceIndex: null,
  item: '',
  quantity: '',
  unit: '',
});
export function formFromRecipe(recipe?: RecipeEntity): EditorForm {
  const ingredients = Array.isArray(recipe?.ingredients) ? recipe.ingredients : [];
  return {
    title: text(recipe?.title),
    description: text(recipe?.description),
    category: text(recipe?.category),
    difficulty: text(recipe?.difficulty),
    servings: text(recipe?.servings),
    prepMinutes: text(recipe?.prepMinutes),
    cookMinutes: text(recipe?.cookMinutes),
    imageUrl: text(recipe?.imageUrl),
    tags: Array.isArray(recipe?.tags) ? recipe.tags.filter((tag) => typeof tag === 'string') : [],
    ingredients: ingredients.length
      ? ingredients.map((row, sourceIndex) => ({
          key: crypto.randomUUID(),
          sourceIndex,
          item: text(row?.item),
          quantity: text(row?.quantity),
          unit: text(row?.unit),
        }))
      : [emptyIngredient()],
    steps: Array.isArray(recipe?.steps) && recipe.steps.length ? recipe.steps.map(text) : [''],
  };
}
export function validateForm(form: EditorForm): string | null {
  if (!form.title.trim()) return 'Add a title before saving.';
  for (const field of ['servings', 'prepMinutes', 'cookMinutes'] as const) {
    const value = form[field].trim();
    if (
      value &&
      (!Number.isFinite(Number(value)) ||
        Number(value) < 0 ||
        (field === 'servings' && Number(value) === 0))
    )
      return field === 'servings'
        ? 'Servings must be a positive number.'
        : 'Times must be zero or a positive number.';
  }
  return null;
}
function ingredientsFromForm(form: EditorForm, original?: RecipeEntity) {
  return form.ingredients
    .filter((row) => row.item.trim())
    .map((row) => {
      const source =
        row.sourceIndex !== null && Array.isArray(original?.ingredients)
          ? original.ingredients[row.sourceIndex]
          : undefined;
      const result = source && typeof source === 'object' ? { ...source } : { item: '' };
      if (!source || text(source.item) !== row.item) result.item = row.item.trim();
      if (!source || text(source.quantity) !== row.quantity) {
        if (row.quantity.trim()) result.quantity = row.quantity.trim();
        else delete result.quantity;
      }
      if (!source || text(source.unit) !== row.unit) {
        if (row.unit.trim()) result.unit = row.unit.trim();
        else delete result.unit;
      }
      return result;
    });
}
export function newRecipeInput(form: EditorForm, uid: string): CreateRecipeInput {
  return {
    authorId: uid,
    title: form.title.trim(),
    description: form.description.trim(),
    ...(form.category ? { category: form.category as RecipeCategory } : {}),
    ...(form.difficulty ? { difficulty: form.difficulty as RecipeDifficulty } : {}),
    ...(form.imageUrl.trim() ? { imageUrl: form.imageUrl.trim() } : {}),
    ...Object.fromEntries(
      (['servings', 'prepMinutes', 'cookMinutes'] as const)
        .filter((field) => form[field].trim())
        .map((field) => [field, Number(form[field])]),
    ),
    tags: form.tags,
    ingredients: ingredientsFromForm(form),
    steps: form.steps.map((step) => step.trim()).filter(Boolean),
  };
}
export function editorChanges(
  form: EditorForm,
  base: EditorForm,
  recipe: RecipeEntity,
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  for (const field of ['title', 'description', 'category', 'difficulty', 'imageUrl'] as const) {
    if (form[field] !== base[field])
      patch[field] =
        form[field].trim() || (field === 'title' || field === 'description' ? '' : null);
  }
  for (const field of ['servings', 'prepMinutes', 'cookMinutes'] as const)
    if (form[field] !== base[field]) patch[field] = form[field].trim() ? Number(form[field]) : null;
  if (JSON.stringify(form.tags) !== JSON.stringify(base.tags)) patch.tags = form.tags;
  if (JSON.stringify(form.ingredients) !== JSON.stringify(base.ingredients))
    patch.ingredients = ingredientsFromForm(form, recipe);
  if (JSON.stringify(form.steps) !== JSON.stringify(base.steps))
    patch.steps = form.steps.map((step) => step.trim()).filter(Boolean);
  return patch;
}

export type RecipeDraft = {
  version: 1;
  uid: string;
  recipeId: string | null;
  revision: string | null;
  form: EditorForm;
  base: EditorForm;
  section: EditorSection;
};
export const draftKey = (uid: string, id?: string) =>
  `foodhub.recipe-draft.v1.${encodeURIComponent(uid)}.${id ? `edit.${encodeURIComponent(id)}` : 'new'}`;
function validForm(value: unknown): value is EditorForm {
  if (!value || typeof value !== 'object') return false;
  const form = value as EditorForm;
  return (
    [
      'title',
      'description',
      'category',
      'difficulty',
      'servings',
      'prepMinutes',
      'cookMinutes',
      'imageUrl',
    ].every((field) => typeof (form as unknown as Record<string, unknown>)[field] === 'string') &&
    Array.isArray(form.tags) &&
    form.tags.every((tag) => typeof tag === 'string') &&
    Array.isArray(form.steps) &&
    form.steps.every((step) => typeof step === 'string') &&
    Array.isArray(form.ingredients) &&
    form.ingredients.every(
      (row) =>
        row &&
        typeof row.key === 'string' &&
        [row.item, row.quantity, row.unit].every((value) => typeof value === 'string') &&
        (row.sourceIndex === null || Number.isInteger(row.sourceIndex)),
    )
  );
}
export function readDraft(uid: string, id?: string): RecipeDraft | null {
  try {
    const draft = JSON.parse(
      localStorage.getItem(draftKey(uid, id)) ?? 'null',
    ) as RecipeDraft | null;
    return draft?.version === 1 &&
      draft.uid === uid &&
      draft.recipeId === (id ?? null) &&
      (draft.revision === null || typeof draft.revision === 'string') &&
      validForm(draft.form) &&
      validForm(draft.base) &&
      sections.includes(draft.section)
      ? draft
      : null;
  } catch {
    return null;
  }
}
