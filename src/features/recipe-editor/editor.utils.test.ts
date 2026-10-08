import { expect, test, beforeEach } from 'vitest';
import type { RecipeEntity } from '@api/models';
import {
  editorChanges,
  formFromRecipe,
  newRecipeInput,
  validateForm,
  draftKey,
  readDraft,
} from './editor.utils';

beforeEach(() => localStorage.clear());
test('normalizes numeric values, imageUrl, and meaningful rows for new recipes', () => {
  const form = formFromRecipe();
  Object.assign(form, {
    title: ' Soup ',
    servings: '2.5',
    prepMinutes: '0',
    cookMinutes: '20',
    imageUrl: ' https://example.com/soup.jpg ',
    steps: [' ', ' Simmer. '],
  });
  form.ingredients.push({ key: 'salt', sourceIndex: null, item: ' Salt ', quantity: '', unit: '' });
  expect(newRecipeInput(form, 'user')).toEqual({
    authorId: 'user',
    title: 'Soup',
    description: '',
    servings: 2.5,
    prepMinutes: 0,
    cookMinutes: 20,
    imageUrl: 'https://example.com/soup.jpg',
    tags: [],
    ingredients: [{ item: 'Salt' }],
    steps: ['Simmer.'],
  });
});
test.each(['-1', '0', 'abc', 'Infinity'])(
  'rejects invalid servings %s but drafts are not validated',
  (value) => {
    expect(validateForm({ ...formFromRecipe(), title: 'Soup', servings: value })).toMatch(
      /Servings/,
    );
  },
);
test('title is required, times cannot be negative, all optional metadata may be omitted', () => {
  expect(validateForm(formFromRecipe())).toMatch(/title/);
  expect(validateForm({ ...formFromRecipe(), title: 'Soup', prepMinutes: '-5' })).toMatch(/Times/);
  expect(validateForm({ ...formFromRecipe(), title: 'Soup' })).toBeNull();
});
test('patches only changed fields, preserving legacy values and ingredient metadata', () => {
  const recipe = {
    id: 'old',
    authorId: 'user',
    title: 'Old',
    category: 'legacy-category',
    servings: '3',
    tags: null,
    ingredients: [{ item: 'Salt', quantity: '1', note: 'family recipe' }],
    steps: ['Mix.'],
    isPublic: true,
    custom: 'keep',
  } as unknown as RecipeEntity;
  const base = formFromRecipe(recipe);
  expect(editorChanges({ ...base, title: 'New' }, base, recipe)).toEqual({ title: 'New' });
  const changed = {
    ...base,
    ingredients: base.ingredients.map((row) => ({ ...row, item: 'Sea salt' })),
  };
  expect(editorChanges(changed, base, recipe)).toEqual({
    ingredients: [{ item: 'Sea salt', quantity: '1', note: 'family recipe' }],
  });
});
test('validates restored drafts and isolates user, new, and edit keys', () => {
  const form = formFromRecipe();
  const draft = {
    version: 1,
    uid: 'a',
    recipeId: null,
    revision: null,
    form,
    base: form,
    section: 'ingredients',
  };
  localStorage.setItem(draftKey('a'), JSON.stringify(draft));
  expect(readDraft('a')?.section).toBe('ingredients');
  expect(readDraft('b')).toBeNull();
  expect(readDraft('a', 'recipe')).toBeNull();
  localStorage.setItem(draftKey('a'), JSON.stringify({ ...draft, form: {} }));
  expect(readDraft('a')).toBeNull();
});
