import { beforeEach, expect, test, vi } from 'vitest';
import { getDoc, getDocs, query, where, setDoc, runTransaction } from 'firebase/firestore';
import {
  createRestaurant,
  getRestaurant,
  listRestaurants,
  restaurantFromData,
  updateRestaurantStatus,
} from './restaurants.service';
const mocks = vi.hoisted(() => ({
  auth: { currentUser: { uid: 'owner' } as { uid: string } | null },
  update: vi.fn(),
  get: vi.fn(),
}));
vi.mock('@lib/firebase', () => ({ db: {}, auth: mocks.auth }));
vi.mock('firebase/firestore', () => ({
  collection: (_db: unknown, name: string) => name,
  doc: (_col: unknown, id = 'new-id') => ({ id }),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn((...args) => args),
  where: vi.fn((...args) => args),
  setDoc: vi.fn(),
  serverTimestamp: () => 'server-time',
  runTransaction: vi.fn(async (_db, callback) =>
    callback({ get: mocks.get, update: mocks.update }),
  ),
}));
beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.currentUser = { uid: 'owner' };
  mocks.get.mockResolvedValue({
    exists: () => true,
    data: () => ({
      authorId: 'owner',
      name: 'Cafe',
      favorite: true,
      blacklisted: false,
      notes: 'Keep notes',
      dishes: [{ id: 'dish', name: 'Soup', images: [] }],
    }),
  });
});
test('maps optional and incomplete content defensively with millisecond timestamps', () => {
  expect(restaurantFromData('empty', {})).toMatchObject({
    name: 'Unnamed restaurant',
    tags: [],
    dishes: [],
    orderLinks: [],
    favorite: false,
    blacklisted: false,
    createdAt: null,
  });
  expect(
    restaurantFromData('full', {
      authorId: 'owner',
      name: 'Cafe',
      rating: 4.5,
      createdAt: { toMillis: () => 123 },
      updatedAt: 456,
      tags: ['cozy', null],
      dishes: [{ id: 'stable', name: 'Soup', notes: 'Good', images: ['/soup.jpg'] }, {}],
      orderLinks: [{ label: 'Direct', url: 'https://cafe.example' }, {}],
    }),
  ).toMatchObject({
    rating: 4.5,
    createdAt: 123,
    updatedAt: 456,
    tags: ['cozy'],
    dishes: [{ id: 'stable', name: 'Soup', images: ['/soup.jpg'] }],
    orderLinks: [{ label: 'Direct', url: 'https://cafe.example' }],
  });
});
test('lists only the current owner from restaurants without a card collection or index sorting', async () => {
  vi.mocked(getDocs).mockResolvedValue({
    docs: [
      { id: 'mine', data: () => ({ authorId: 'owner', name: 'Cafe' }) },
      { id: 'other', data: () => ({ authorId: 'other' }) },
    ],
  } as never);
  expect((await listRestaurants('owner')).map((item) => item.id)).toEqual(['mine']);
  expect(where).toHaveBeenCalledWith('authorId', '==', 'owner');
  expect(query).toHaveBeenCalledWith('restaurants', ['authorId', '==', 'owner']);
});
test('creates a name-only restaurant with defaults and server timestamps', async () => {
  const result = await createRestaurant('owner', '  Cafe  ');
  expect(result).toMatchObject({ id: 'new-id', name: 'Cafe', authorId: 'owner' });
  expect(setDoc).toHaveBeenCalledWith(
    { id: 'new-id' },
    {
      authorId: 'owner',
      name: 'Cafe',
      tags: [],
      dishes: [],
      orderLinks: [],
      favorite: false,
      blacklisted: false,
      createdAt: 'server-time',
      updatedAt: 'server-time',
    },
  );
  expect(getDoc).not.toHaveBeenCalled();
});
test('validates names and refuses missing, wrong, or signed-out users before querying/writing', async () => {
  await expect(createRestaurant('owner', ' ')).rejects.toThrow('Enter a name');
  await expect(createRestaurant('owner', 'a'.repeat(161))).rejects.toThrow('Enter a name');
  await expect(listRestaurants('')).rejects.toThrow('sign in');
  await expect(createRestaurant('other', 'Cafe')).rejects.toThrow('sign in');
  mocks.auth.currentUser = null;
  await expect(listRestaurants('owner')).rejects.toThrow('sign in');
  expect(getDocs).not.toHaveBeenCalled();
  expect(setDoc).not.toHaveBeenCalled();
});
test('status changes check ownership and patch only status/timestamp, preserving content and overlap', async () => {
  const updated = await updateRestaurantStatus('owner', 'mine', { blacklisted: true });
  expect(updated).toMatchObject({
    favorite: true,
    blacklisted: true,
    notes: 'Keep notes',
    dishes: [{ id: 'dish', name: 'Soup' }],
  });
  expect(mocks.update).toHaveBeenCalledWith(
    { id: 'mine' },
    { blacklisted: true, updatedAt: 'server-time' },
  );
  expect(runTransaction).toHaveBeenCalledOnce();
  mocks.get.mockResolvedValue({ exists: () => true, data: () => ({ authorId: 'other' }) });
  await expect(updateRestaurantStatus('owner', 'other', { favorite: true })).rejects.toThrow(
    'not in your notebook',
  );
  expect(mocks.update).toHaveBeenCalledTimes(1);
});
test('individual reads refuse other owners and handle missing documents', async () => {
  vi.mocked(getDoc).mockResolvedValue({ exists: () => false } as never);
  expect(await getRestaurant('owner', 'missing')).toBeNull();
  vi.mocked(getDoc).mockResolvedValue({
    exists: () => true,
    data: () => ({ authorId: 'other' }),
  } as never);
  await expect(getRestaurant('owner', 'other')).rejects.toThrow('not in your notebook');
});
