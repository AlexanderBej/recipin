import { beforeEach, expect, test, vi } from 'vitest';
import { addDoc, getDocs } from 'firebase/firestore';
import { addPlanItem, listPlanItemsForRange } from './planner.service';
vi.mock('@lib/firebase', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  collection: (_db: unknown, name: string) => name,
  doc: vi.fn(),
  addDoc: vi.fn(),
  getDocs: vi.fn(),
  deleteDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  Timestamp: { now: () => 'now' },
}));
beforeEach(() => vi.clearAllMocks());
test('maps persisted userId and recipeName and defensively reads incomplete legacy records', async () => {
  vi.mocked(getDocs).mockResolvedValue({
    docs: [
      {
        id: 'plan',
        data: () => ({
          userId: 'owner',
          date: '2026-10-07',
          meal: 'lunch',
          recipeId: 'soup',
          recipeName: 'Soup',
        }),
      },
      { id: 'legacy', data: () => ({ date: '2026-10-07', name: 'Legacy soup' }) },
      { id: 'empty', data: () => ({}) },
    ],
  } as never);
  const items = await listPlanItemsForRange('owner', '2026-10-05', '2026-10-11');
  expect(items[0]).toMatchObject({
    id: 'plan',
    userId: 'owner',
    recipeName: 'Soup',
    recipeId: 'soup',
  });
  expect(items[1]).toMatchObject({ recipeName: 'Legacy soup', recipeId: '', meal: 'snacks' });
  expect(items[2].recipeName).toBe('Untitled recipe');
});
test('writes the original planner_items fields and supports recipes without images', async () => {
  vi.mocked(addDoc).mockResolvedValue({ id: 'plan' } as never);
  const input = {
    userId: 'owner',
    date: '2026-10-07',
    meal: 'lunch' as const,
    recipeId: 'soup',
    recipeName: 'Soup',
  };
  expect(await addPlanItem('owner', input)).toMatchObject({ ...input, id: 'plan' });
  expect(addDoc).toHaveBeenCalledWith('planner_items', {
    ...input,
    recipeImgUrl: null,
    servings: null,
    notes: null,
    createdAt: 'now',
    updatedAt: 'now',
  });
});
