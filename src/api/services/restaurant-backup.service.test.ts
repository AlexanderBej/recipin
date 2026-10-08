import { beforeEach, expect, test, vi } from 'vitest';
import type { Restaurant } from '@api/models';
import { applyRestaurantImport, previewRestaurantImport } from './restaurant-backup.service';
import type { ParsedBackup } from '../../features/restaurants/restaurant-backup';
const mocks = vi.hoisted(() => ({
  auth: { currentUser: { uid: 'owner' } as { uid: string } | null },
  save: vi.fn(),
  get: vi.fn(),
  edit: vi.fn(),
  prepare: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
}));
vi.mock('@lib/firebase', () => ({ auth: mocks.auth }));
vi.mock('./restaurants.service', () => ({
  saveImportedRestaurant: mocks.save,
  getRestaurant: mocks.get,
  editRestaurant: mocks.edit,
}));
vi.mock('./restaurant-images.service', () => ({
  prepareRestaurantImage: mocks.prepare,
  uploadRestaurantImage: mocks.upload,
  deleteRestaurantImage: mocks.remove,
}));
const item = (id = 'source'): Restaurant => ({
  id,
  authorId: 'foreign',
  name: '  Cafe Verde  ',
  favorite: true,
  blacklisted: false,
  tags: [],
  orderLinks: [],
  dishes: [],
  createdAt: 1,
  updatedAt: 1,
  photos: [
    {
      id: 'photo',
      url: 'https://example.com/photo.jpg',
      provider: 'imagekit',
      fileId: 'old',
      filePath: '/food-hub/foreign/source/photo.jpg',
    },
  ],
});
const backup = (): ParsedBackup => ({
  manifest: {
    format: 'food-hub-restaurants',
    version: 1,
    exportedAt: new Date().toISOString(),
    restaurants: [item()],
    images: [
      {
        restaurantId: 'source',
        photoId: 'photo',
        url: 'https://example.com/photo.jpg',
        path: 'images/photo.jpg',
        mimeType: 'image/jpeg',
      },
    ],
  },
  files: { 'images/photo.jpg': new Uint8Array([255, 216, 255]) },
});
beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  mocks.auth.currentUser = { uid: 'owner' };
  mocks.save.mockImplementation(async (uid, record, id) => ({
    ...record,
    id,
    authorId: uid,
    photos: record.photos.map((photo: any) => ({ id: photo.id, url: photo.url })),
  }));
  mocks.get.mockImplementation(async (_uid, id) => ({ ...item(id), authorId: 'owner' }));
  mocks.prepare.mockImplementation(async (file) => file);
  mocks.upload.mockResolvedValue({
    id: 'new-photo',
    provider: 'imagekit',
    fileId: 'new-file',
    filePath: '/food-hub/owner/dest/new.jpg',
    url: 'https://example.com/new.jpg',
  });
  mocks.edit.mockImplementation(async (_uid, id, change) => ({
    ...item(id),
    authorId: 'owner',
    photos: [change.photo],
  }));
  mocks.remove.mockResolvedValue(undefined);
});
test('normalized duplicate preview defaults to Skip and offers all matching destinations', () => {
  const rows = previewRestaurantImport(backup(), [
    { ...item('one'), name: 'cafe   verde' },
    { ...item('two'), name: 'CAFE VERDE' },
  ]);
  expect(rows[0]).toMatchObject({ choice: 'skip', targetId: 'one' });
  expect(rows[0].matches).toHaveLength(2);
});
test('Skip writes nothing; Keep Both allocates a destination and uses current ownership', async () => {
  const data = backup();
  const rows = previewRestaurantImport(data, [item('existing')]);
  await applyRestaurantImport('owner', data, rows);
  expect(mocks.save).not.toHaveBeenCalled();
  rows[0].choice = 'keep';
  rows[0].targetId = 'new-id';
  const result = await applyRestaurantImport('owner', data, rows);
  expect(mocks.save).toHaveBeenCalledWith('owner', expect.anything(), 'new-id', undefined);
  expect(result[0].saved?.authorId).toBe('owner');
  expect(result[0].restored).toHaveLength(1);
});
test('Update Existing passes the original preview snapshot and preserves destination ID', async () => {
  const existing = { ...item('existing'), authorId: 'owner' };
  const data = backup();
  const rows = previewRestaurantImport(data, [existing]);
  rows[0].choice = 'update';
  const result = await applyRestaurantImport('owner', data, rows);
  expect(mocks.save).toHaveBeenCalledWith('owner', expect.anything(), 'existing', existing);
  expect(result[0].saved?.id).toBe('existing');
});
test('failed image restoration retains the saved record and external reference; retry does not recreate it', async () => {
  mocks.upload.mockRejectedValueOnce(new Error('Image service unavailable'));
  const data = backup();
  const rows = previewRestaurantImport(data, []);
  const first = await applyRestaurantImport('owner', data, rows);
  expect(first[0].saved?.photos?.[0].url).toBe('https://example.com/photo.jpg');
  expect(first[0].imageErrors[0]).toContain('unavailable');
  const second = await applyRestaurantImport('owner', data, first);
  expect(mocks.save).toHaveBeenCalledTimes(1);
  expect(second[0].imageErrors).toEqual([]);
  expect(second[0].restored).toHaveLength(1);
});
test('upload success followed by save failure retains uploaded metadata for retry without another upload', async () => {
  mocks.edit.mockRejectedValueOnce(new Error('Firestore interrupted'));
  const data = backup();
  const first = await applyRestaurantImport('owner', data, previewRestaurantImport(data, []));
  expect(first[0].pendingUpload?.photo.fileId).toBe('new-file');
  expect(mocks.remove).not.toHaveBeenCalled();
  const second = await applyRestaurantImport('owner', data, first);
  expect(mocks.upload).toHaveBeenCalledTimes(1);
  expect(second[0].pendingUpload).toBeUndefined();
  expect(second[0].imageErrors).toEqual([]);
});
test('partial record failure does not roll back earlier successes or stop later records', async () => {
  const data = backup();
  data.manifest.restaurants.push(item('other'));
  mocks.save.mockRejectedValueOnce(new Error('Permission denied'));
  const result = await applyRestaurantImport('owner', data, previewRestaurantImport(data, []));
  expect(result[0].error).toBe('Permission denied');
  expect(result[1].saved).toBeDefined();
});
test('signed-out or changed sessions never save imported records', async () => {
  mocks.auth.currentUser = null;
  const data = backup();
  const result = await applyRestaurantImport('owner', data, previewRestaurantImport(data, []));
  expect(result[0].error).toContain('session changed');
  expect(mocks.save).not.toHaveBeenCalled();
});
test('retry recognizes a replacement that actually committed despite a lost response', async () => {
  mocks.edit.mockRejectedValueOnce(new Error('Lost response'));
  const data = backup();
  const first = await applyRestaurantImport('owner', data, previewRestaurantImport(data, []));
  const photo = first[0].pendingUpload!.photo;
  mocks.get.mockResolvedValue({ ...first[0].saved, photos: [photo] });
  const second = await applyRestaurantImport('owner', data, first);
  expect(second[0].restored).toHaveLength(1);
  expect(second[0].pendingUpload).toBeUndefined();
  expect(second[0].imageErrors).toEqual([]);
  expect(mocks.upload).toHaveBeenCalledTimes(1);
  expect(mocks.edit).toHaveBeenCalledTimes(1);
});
