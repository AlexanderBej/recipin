import { beforeEach, expect, test, vi } from 'vitest';
import {
  addRecipePair,
  getRecipeForEditing,
  recipeRevision,
  updateRecipePair,
} from './recipes.service';
import { getDoc, runTransaction, writeBatch } from 'firebase/firestore';

vi.mock('@lib/firebase', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  collection: (_db: unknown, name: string) => ({ path: name }),
  doc: (collection: { path: string }, id = 'generated-id') => ({
    id,
    path: `${collection.path}/${id}`,
  }),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  writeBatch: vi.fn(),
  runTransaction: vi.fn(),
  deleteDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  startAfter: vi.fn(),
  startAt: vi.fn(),
  endAt: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  serverTimestamp: () => 'server-time',
  Timestamp: { fromMillis: vi.fn() },
}));
const data = {
  authorId: 'user',
  title: 'Old Soup',
  description: 'Old description',
  category: 'legacy',
  tags: ['family'],
  ingredients: [{ item: 'Salt', note: 'keep' }],
  steps: ['Simmer'],
  servings: '3',
  isPublic: true,
  isFavorite: true,
  ratingCategories: { taste: 5 },
  unknown: { keep: true },
  createdAt: 'old-created',
  updatedAt: 'old-updated',
};
const snapshot = (value: Record<string, unknown> | null) => ({
  id: 'soup',
  exists: () => value !== null,
  data: () => value,
});
const transaction = { get: vi.fn(), update: vi.fn(), set: vi.fn() };
beforeEach(() => {
  vi.clearAllMocks();
  transaction.get.mockImplementation(async (ref: { path: string }) =>
    snapshot(ref.path.startsWith('recipes/') ? data : { ...data, cardOnly: 'keep' }),
  );
  vi.mocked(runTransaction).mockImplementation(async (_db, callback) =>
    callback(transaction as never),
  );
  vi.mocked(getDoc).mockResolvedValue(snapshot(data) as never);
});
test('atomically creates paired documents with a shared ID, derived fields, and no undefined values', async () => {
  const batch = { set: vi.fn(), commit: vi.fn().mockResolvedValue(undefined) };
  vi.mocked(writeBatch).mockReturnValue(batch as never);
  const result = await addRecipePair({
    authorId: 'user',
    title: 'Soup',
    description: 'A'.repeat(160),
    tags: [],
    ingredients: [],
    steps: [],
    imageUrl: 'https://example.com/soup.jpg',
    difficulty: undefined,
  });
  expect(batch.set).toHaveBeenCalledTimes(2);
  expect(batch.commit).toHaveBeenCalledOnce();
  const [recipeCall, cardCall] = batch.set.mock.calls;
  expect(recipeCall[0].path).toBe('recipes/generated-id');
  expect(cardCall[0].path).toBe('recipe_cards/generated-id');
  for (const call of [recipeCall, cardCall]) {
    expect(call[1]).toMatchObject({
      titleSearch: 'soup',
      excerpt: 'A'.repeat(140),
      imageUrl: 'https://example.com/soup.jpg',
    });
    expect(Object.values(call[1])).not.toContain(undefined);
  }
  expect(result.id).toBe('generated-id');
});
test('updates the same paired IDs, derives search and excerpt, and leaves unrelated fields untouched', async () => {
  const result = await updateRecipePair({
    uid: 'user',
    id: 'soup',
    expectedRevision: recipeRevision(data),
    changes: {
      title: 'New Soup',
      description: 'B'.repeat(150),
      imageUrl: 'https://example.com/new.jpg',
      authorId: 'attacker',
      isFavorite: false,
      unknown: null,
    },
  });
  expect(transaction.get).toHaveBeenCalledTimes(2);
  expect(transaction.update).toHaveBeenCalledTimes(2);
  const [recipeCall, cardCall] = transaction.update.mock.calls;
  expect(recipeCall[0].path).toBe('recipes/soup');
  expect(cardCall[0].path).toBe('recipe_cards/soup');
  for (const call of [recipeCall, cardCall]) {
    expect(call[1]).toMatchObject({
      title: 'New Soup',
      titleSearch: 'new soup',
      excerpt: 'B'.repeat(140),
      imageUrl: 'https://example.com/new.jpg',
      updatedAt: 'server-time',
    });
    for (const field of [
      'id',
      'authorId',
      'createdAt',
      'isFavorite',
      'ratingCategories',
      'isPublic',
      'unknown',
      'servings',
      'ingredients',
    ])
      expect(call[1]).not.toHaveProperty(field);
  }
  expect(result.recipe).toMatchObject({
    id: 'soup',
    servings: '3',
    isFavorite: true,
    ratingCategories: { taste: 5 },
    isPublic: true,
  });
  expect(result.card).toMatchObject({ id: 'soup', isFavorite: true, cardOnly: 'keep' });
});
test('a concurrent content change rejects the entire edit without writing either document', async () => {
  await expect(
    updateRecipePair({
      uid: 'user',
      id: 'soup',
      expectedRevision: 'old-revision',
      changes: { title: 'New' },
    }),
  ).rejects.toMatchObject({ name: 'RecipeEditConflict' });
  expect(transaction.update).not.toHaveBeenCalled();
  expect(transaction.set).not.toHaveBeenCalled();
});
test('favorites and ratings do not create content conflicts and fresh values are retained', async () => {
  const fresh = { ...data, isFavorite: false, ratingCategories: { taste: 4 } };
  transaction.get.mockResolvedValue(snapshot(fresh));
  expect(recipeRevision(fresh)).toBe(recipeRevision(data));
  const result = await updateRecipePair({
    uid: 'user',
    id: 'soup',
    expectedRevision: recipeRevision(data),
    changes: { servings: 4 },
  });
  expect(result.recipe.isFavorite).toBe(false);
  expect(result.card.ratingCategories).toEqual({ taste: 4 });
});
test('repairs a missing card with compatible metadata rather than creating another recipe', async () => {
  transaction.get.mockImplementation(async (ref: { path: string }) =>
    snapshot(ref.path.startsWith('recipes/') ? data : null),
  );
  await updateRecipePair({
    uid: 'user',
    id: 'soup',
    expectedRevision: recipeRevision(data),
    changes: { title: 'New' },
  });
  expect(transaction.update).toHaveBeenCalledOnce();
  expect(transaction.set).toHaveBeenCalledWith(
    { id: 'soup', path: 'recipe_cards/soup' },
    expect.objectContaining({
      title: 'New',
      authorId: 'user',
      category: 'legacy',
      isFavorite: true,
      ratingCategories: { taste: 5 },
      createdAt: 'old-created',
    }),
  );
});
test('missing recipes and wrong owners cannot be edited', async () => {
  await expect(getRecipeForEditing('other', 'soup')).rejects.toThrow('cannot edit');
  await expect(
    updateRecipePair({
      uid: 'other',
      id: 'soup',
      expectedRevision: recipeRevision(data),
      changes: {},
    }),
  ).rejects.toThrow('cannot edit');
  transaction.get.mockResolvedValue(snapshot(null));
  await expect(
    updateRecipePair({
      uid: 'user',
      id: 'soup',
      expectedRevision: recipeRevision(data),
      changes: {},
    }),
  ).rejects.toThrow('no longer exists');
  expect(transaction.update).not.toHaveBeenCalled();
});
test('legacy changes without timestamp updates still change the revision', () => {
  expect(recipeRevision({ ...data, steps: ['Different'] })).not.toBe(recipeRevision(data));
});
