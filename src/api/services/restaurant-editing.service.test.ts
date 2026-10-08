import { beforeEach, expect, test, vi } from 'vitest';
import {
  editRestaurant,
  deleteRestaurant,
  saveImportedRestaurant,
  restaurantFromData,
} from './restaurants.service';
const mocks = vi.hoisted(() => ({
  auth: { currentUser: { uid: 'owner' } as { uid: string } | null },
  get: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  set: vi.fn(),
}));
vi.mock('@lib/firebase', () => ({ db: {}, auth: mocks.auth }));
vi.mock('firebase/firestore', () => ({
  collection: (_db: unknown, name: string) => name,
  doc: (_col: unknown, id: string) => ({ id }),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  setDoc: vi.fn(),
  serverTimestamp: () => 'server-time',
  Timestamp: { fromMillis: (value: number) => value },
  runTransaction: async (_db: unknown, callback: any) =>
    callback({ get: mocks.get, update: mocks.update, delete: mocks.remove, set: mocks.set }),
}));
let data: any;
beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.currentUser = { uid: 'owner' };
  data = {
    authorId: 'owner',
    name: 'Cafe',
    notes: 'Original',
    favorite: true,
    blacklisted: false,
    tags: ['cozy'],
    custom: { untouched: true },
    dishes: [
      { id: 'soup', name: 'Soup', notes: 'Hot', images: [], future: 'preserve' },
      { id: 'cake', name: 'Cake', images: [] },
    ],
    orderLinks: [{ label: 'Direct', url: 'https://example.com', future: 'preserve' }],
  };
  mocks.get.mockImplementation(async () => ({ exists: () => true, data: () => data }));
  mocks.update.mockImplementation((_ref, patch) => {
    data = { ...data, ...patch };
  });
});
test('field updates patch only the edited field and timestamp, preserving unknown/unrelated data', async () => {
  await editRestaurant('owner', 'cafe', {
    kind: 'field',
    field: 'name',
    value: '  New Cafe  ',
    expected: 'Cafe',
  });
  expect(mocks.update).toHaveBeenCalledWith(
    { id: 'cafe' },
    { name: 'New Cafe', updatedAt: 'server-time' },
  );
  expect(data).toMatchObject({
    notes: 'Original',
    custom: { untouched: true },
    favorite: true,
    blacklisted: false,
  });
});
test('photos attach without replacing unrelated fields or legacy images, and add retry is idempotent', async () => {
  const photo = {
    id: 'new',
    url: 'https://example.com/new',
    provider: 'imagekit' as const,
    fileId: 'file',
    filePath: '/food-hub/owner/cafe/new.jpg',
  };
  data.imageUrl = 'https://example.com/legacy';
  data.photos = [{ id: 'other', url: 'https://example.com/other', future: true }];
  await editRestaurant('owner', 'cafe', { kind: 'photo', action: 'add', photo });
  await editRestaurant('owner', 'cafe', { kind: 'photo', action: 'add', photo });
  expect(data.photos).toEqual([
    { id: 'other', url: 'https://example.com/other', future: true },
    photo,
  ]);
  expect(data.imageUrl).toBe('https://example.com/legacy');
  expect(data.custom).toEqual({ untouched: true });
});
test('legacy dish photo replacement preserves dish IDs, unknown properties, and concurrent photos', async () => {
  const url = 'https://example.com/old';
  data.dishes[0].images = [url, 'https://example.com/keep'];
  data.dishes[0].photos = [
    { id: 'concurrent', url: 'https://example.com/concurrent', future: true },
  ];
  await editRestaurant('owner', 'cafe', {
    kind: 'photo',
    action: 'replace',
    dishId: 'soup',
    previous: { id: `legacy:${url}`, url },
    photo: { id: 'new', url: 'https://example.com/new' },
  });
  expect(data.dishes[0]).toMatchObject({
    id: 'soup',
    future: 'preserve',
    images: ['https://example.com/keep'],
    photos: [{ id: 'concurrent', future: true }, { id: 'new' }],
  });
  expect(data.dishes[1]).toEqual({ id: 'cake', name: 'Cake', images: [] });
});
test('managed photo removal clears a legacy hero alias but retains other managed photos', async () => {
  const photo = {
    id: 'old',
    url: 'https://example.com/old',
    provider: 'imagekit' as const,
    fileId: 'old-file',
    filePath: '/food-hub/owner/cafe/old.jpg',
  };
  data.imageUrl = photo.url;
  data.photos = [photo, { id: 'keep', url: 'https://example.com/keep' }];
  await editRestaurant('owner', 'cafe', { kind: 'photo', action: 'remove', previous: photo });
  expect(data.imageUrl).toBe('');
  expect(data.photos).toEqual([{ id: 'keep', url: 'https://example.com/keep' }]);
});
test('stale photo replacement and missing dishes fail without writing', async () => {
  data.photos = [{ id: 'old', url: 'https://example.com/changed' }];
  await expect(
    editRestaurant('owner', 'cafe', {
      kind: 'photo',
      action: 'replace',
      previous: { id: 'old', url: 'https://example.com/old' },
      photo: { id: 'new', url: 'https://example.com/new' },
    }),
  ).rejects.toMatchObject({ name: 'RestaurantEditConflict' });
  await expect(
    editRestaurant('owner', 'cafe', {
      kind: 'photo',
      action: 'add',
      dishId: 'gone',
      photo: { id: 'new', url: 'https://example.com/new' },
    }),
  ).rejects.toThrow('dish no longer exists');
  expect(mocks.update).not.toHaveBeenCalled();
});
test('same-field concurrent changes conflict without writing, while different-field changes merge', async () => {
  data.notes = 'Remote notes';
  await expect(
    editRestaurant('owner', 'cafe', {
      kind: 'field',
      field: 'notes',
      value: 'Mine',
      expected: 'Original',
    }),
  ).rejects.toMatchObject({ name: 'RestaurantEditConflict' });
  expect(mocks.update).not.toHaveBeenCalled();
  await editRestaurant('owner', 'cafe', {
    kind: 'field',
    field: 'cuisine',
    value: 'Italian',
    expected: '',
  });
  expect(data.notes).toBe('Remote notes');
});
test('optional rating accepts half-stars and clear, but rejects invalid values and blank names', async () => {
  await editRestaurant('owner', 'cafe', {
    kind: 'field',
    field: 'rating',
    value: 4.5,
    expected: null,
  });
  await editRestaurant('owner', 'cafe', {
    kind: 'field',
    field: 'rating',
    value: null,
    expected: 4.5,
  });
  await expect(
    editRestaurant('owner', 'cafe', { kind: 'field', field: 'rating', value: 9, expected: null }),
  ).rejects.toThrow('rating');
  await expect(
    editRestaurant('owner', 'cafe', { kind: 'field', field: 'name', value: ' ', expected: 'Cafe' }),
  ).rejects.toThrow('name');
});
test('tags merge with concurrent tags and case-insensitive duplicate additions do not multiply', async () => {
  data.tags.push('remote');
  await editRestaurant('owner', 'cafe', { kind: 'tag', tag: 'new' });
  await editRestaurant('owner', 'cafe', { kind: 'tag', tag: 'NEW' });
  await editRestaurant('owner', 'cafe', { kind: 'tag', tag: 'cozy', remove: true });
  expect(data.tags).toEqual(['remote', 'new']);
});
test('dish add is idempotent and field edits preserve other dishes and unknown dish properties', async () => {
  const add = { kind: 'addDish' as const, dish: { id: 'bread', name: 'Bread', images: [] } };
  await editRestaurant('owner', 'cafe', add);
  await editRestaurant('owner', 'cafe', add);
  await editRestaurant('owner', 'cafe', {
    kind: 'dish',
    id: 'soup',
    field: 'name',
    value: 'Tomato soup',
    expected: 'Soup',
  });
  expect(data.dishes.map((dish: any) => dish.id)).toEqual(['soup', 'cake', 'bread']);
  expect(data.dishes[0]).toMatchObject({ name: 'Tomato soup', notes: 'Hot', future: 'preserve' });
  await editRestaurant('owner', 'cafe', {
    kind: 'dish',
    id: 'soup',
    field: 'images',
    value: ['https://example.com/soup.jpg'],
    expected: [],
  });
  expect(data.dishes[0].images).toEqual(['https://example.com/soup.jpg']);
});
test('dish reorder merges current additions and removal detects newer dish content', async () => {
  await editRestaurant('owner', 'cafe', { kind: 'moveDish', id: 'cake', direction: -1 });
  expect(data.dishes[0].id).toBe('cake');
  const expected = { id: 'soup', name: 'Soup', notes: 'Hot', images: [] };
  data.dishes[1].notes = 'Changed';
  await expect(
    editRestaurant('owner', 'cafe', { kind: 'removeDish', id: 'soup', expected }),
  ).rejects.toMatchObject({ name: 'RestaurantEditConflict' });
  await editRestaurant('owner', 'cafe', {
    kind: 'removeDish',
    id: 'soup',
    expected: { ...expected, notes: 'Changed' },
  });
  expect(data.dishes.map((dish: any) => dish.id)).toEqual(['cake']);
});
test('links validate protocols, upgrade legacy IDs on edit, and preserve unrelated link fields', async () => {
  const legacy = { label: 'Direct', url: 'https://example.com' };
  await expect(
    editRestaurant('owner', 'cafe', {
      kind: 'link',
      target: legacy,
      field: 'url',
      value: 'javascript:alert(1)',
      expected: legacy.url,
    }),
  ).rejects.toThrow('http');
  await editRestaurant('owner', 'cafe', {
    kind: 'link',
    target: legacy,
    field: 'label',
    value: 'Restaurant',
    expected: 'Direct',
  });
  expect(data.orderLinks[0]).toMatchObject({
    label: 'Restaurant',
    url: legacy.url,
    future: 'preserve',
    id: expect.any(String),
  });
  await editRestaurant('owner', 'cafe', {
    kind: 'addLink',
    link: { id: 'delivery', label: 'Delivery', url: 'https://delivery.example.com' },
  });
  const target = { id: data.orderLinks[0].id, label: 'Restaurant', url: legacy.url };
  data.orderLinks[0].url = 'https://example.com/new';
  await editRestaurant('owner', 'cafe', {
    kind: 'link',
    target,
    field: 'label',
    value: 'Direct order',
    expected: 'Restaurant',
  });
  expect(data.orderLinks[0].url).toBe('https://example.com/new');
  await editRestaurant('owner', 'cafe', {
    kind: 'removeLink',
    target: { ...target, label: 'Direct order', url: 'https://example.com/new' },
  });
  expect(data.orderLinks).toHaveLength(1);
});
test('ambiguous legacy links fail safely instead of selecting an arbitrary record', async () => {
  const target = { label: 'Direct', url: 'https://example.com' };
  data.orderLinks.push({ ...target });
  await expect(
    editRestaurant('owner', 'cafe', { kind: 'removeLink', target }),
  ).rejects.toMatchObject({ name: 'RestaurantEditConflict' });
  expect(mocks.update).not.toHaveBeenCalled();
});
test('image URL edits reject unsafe references and allow clearing without touching other fields', async () => {
  await expect(
    editRestaurant('owner', 'cafe', {
      kind: 'field',
      field: 'imageUrl',
      value: 'data:text/html,bad',
      expected: '',
    }),
  ).rejects.toThrow('http');
  await editRestaurant('owner', 'cafe', {
    kind: 'field',
    field: 'imageUrl',
    value: 'https://example.com/cafe.jpg',
    expected: '',
  });
  await editRestaurant('owner', 'cafe', {
    kind: 'field',
    field: 'imageUrl',
    value: '',
    expected: 'https://example.com/cafe.jpg',
  });
  expect(data.imageUrl).toBe('');
});
test('updates and deletion enforce authenticated ownership and delete only the selected document', async () => {
  data.authorId = 'other';
  await expect(editRestaurant('owner', 'cafe', { kind: 'tag', tag: 'new' })).rejects.toThrow(
    'not in your notebook',
  );
  await expect(deleteRestaurant('owner', 'cafe')).rejects.toThrow('not in your notebook');
  expect(mocks.remove).not.toHaveBeenCalled();
  data.authorId = 'owner';
  await deleteRestaurant('owner', 'cafe');
  expect(mocks.remove).toHaveBeenCalledWith({ id: 'cafe' });
  mocks.auth.currentUser = null;
  await expect(deleteRestaurant('owner', 'cafe')).rejects.toThrow('sign in');
});
test('backup updates retain restaurant ID, unknown fields, unrelated dishes and nested properties', async () => {
  const expected = restaurantFromData('cafe', data);
  const imported = {
    ...expected,
    id: 'foreign-source',
    authorId: 'foreign-owner',
    name: 'Restored',
    dishes: [{ id: 'soup', name: 'Restored soup', images: ['https://example.com/soup.jpg'] }],
    photos: [
      {
        id: 'restored',
        url: 'https://example.com/new.jpg',
        provider: 'imagekit' as const,
        fileId: 'foreign-file',
      },
    ],
  };
  const result = await saveImportedRestaurant('owner', imported, 'cafe', expected);
  expect(result.id).toBe('cafe');
  expect(data).toMatchObject({
    authorId: 'owner',
    name: 'Restored',
    custom: { untouched: true },
    dishes: [{ id: 'soup', name: 'Restored soup', future: 'preserve' }, { id: 'cake' }],
  });
  expect(data.photos).toEqual([{ id: 'restored', url: 'https://example.com/new.jpg' }]);
});
test('backup update rejects a stale preview or another owner without writing', async () => {
  const expected = restaurantFromData('cafe', data);
  data.notes = 'Changed elsewhere';
  await expect(saveImportedRestaurant('owner', expected, 'cafe', expected)).rejects.toThrow(
    'changed since preview',
  );
  data.authorId = 'other';
  await expect(saveImportedRestaurant('owner', expected, 'cafe', expected)).rejects.toThrow(
    'not in your notebook',
  );
  expect(mocks.update).not.toHaveBeenCalled();
});
test('backup creation ignores source ownership, preserves dish IDs and creation time, and refuses ID collisions', async () => {
  const imported = restaurantFromData('source', { ...data, createdAt: 123 });
  mocks.get.mockResolvedValue({ exists: () => false });
  const result = await saveImportedRestaurant('owner', imported, 'new-id');
  expect(result).toMatchObject({
    id: 'new-id',
    authorId: 'owner',
    createdAt: 123,
    dishes: [{ id: 'soup' }, { id: 'cake' }],
  });
  expect(mocks.set).toHaveBeenCalledWith(
    { id: 'new-id' },
    expect.objectContaining({ authorId: 'owner', createdAt: 123 }),
  );
  mocks.get.mockResolvedValue({ exists: () => true, data: () => data });
  await expect(saveImportedRestaurant('owner', imported, 'new-id')).rejects.toThrow(
    'changed since preview',
  );
});
