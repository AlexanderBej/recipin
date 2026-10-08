// @vitest-environment node
import { afterEach, expect, test, vi } from 'vitest';
import { strToU8, zipSync } from 'fflate';
import {
  ARCHIVE_LIMIT,
  exportRestaurantBackup,
  parseRestaurantBackup,
  type RestaurantBackup,
} from './restaurant-backup';
import type { Restaurant } from '@api/models';

const record = (): Restaurant => ({
  id: 'cafe',
  authorId: 'secret-owner',
  name: 'Cafe',
  notes: 'Remember this',
  tags: ['cozy'],
  favorite: true,
  blacklisted: false,
  rating: 4.5,
  orderLinks: [{ id: 'direct', label: 'Direct', url: 'https://example.com' }],
  dishes: [{ id: 'soup', name: 'Soup', notes: 'Hot', images: ['https://example.com/soup.jpg'] }],
  imageUrl: 'https://example.com/cafe.jpg',
  createdAt: 100,
  updatedAt: 200,
});
const manifest = (): RestaurantBackup => ({
  format: 'food-hub-restaurants',
  version: 1,
  exportedAt: '2026-10-08T12:00:00.000Z',
  restaurants: [{ ...record(), imageUrl: undefined, dishes: [] }],
  images: [],
});
const zip = (data: unknown, files: Record<string, Uint8Array> = {}, level: 0 | 6 = 0) =>
  zipSync({ 'manifest.json': strToU8(JSON.stringify(data)), ...files }, { level });
afterEach(() => vi.unstubAllGlobals());
test('export preserves all known records, association contexts and portable binaries without owner IDs or credentials', async () => {
  const remote = vi
    .fn()
    .mockImplementation(async () => new Response(new Uint8Array([255, 216, 255, 1])));
  vi.stubGlobal('fetch', remote);
  const result = await exportRestaurantBackup([
    { ...record(), privateKey: 'never-export' } as Restaurant,
  ]);
  const parsed = parseRestaurantBackup(result.bytes);
  expect(parsed.manifest.restaurants[0]).toMatchObject({
    notes: 'Remember this',
    rating: 4.5,
    favorite: true,
    dishes: [{ id: 'soup', notes: 'Hot' }],
  });
  expect(parsed.manifest.images).toMatchObject([
    { restaurantId: 'cafe', photoId: 'legacy:https://example.com/cafe.jpg' },
    { restaurantId: 'cafe', dishId: 'soup', photoId: 'legacy:https://example.com/soup.jpg' },
  ]);
  expect(Object.keys(parsed.files)).toHaveLength(3);
  expect(JSON.stringify(parsed.manifest)).not.toMatch(/secret-owner|never-export|authorId/);
  expect(remote).toHaveBeenCalledWith(
    expect.any(String),
    expect.objectContaining({ credentials: 'omit', referrerPolicy: 'no-referrer' }),
  );
});
test('unavailable images retain original URLs and clear failure reports', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('CORS blocked')));
  const result = await exportRestaurantBackup([record()]);
  const parsed = parseRestaurantBackup(result.bytes);
  expect(parsed.manifest.images).toHaveLength(2);
  expect(
    parsed.manifest.images.every(
      (image) => image.error === 'CORS blocked' && !image.path && image.url.startsWith('https:'),
    ),
  ).toBe(true);
});
test('shared image binaries are stored once without losing restaurant/dish associations', async () => {
  const item = record();
  item.dishes[0].images = [item.imageUrl!];
  const remote = vi
    .fn()
    .mockImplementation(async () => new Response(new Uint8Array([255, 216, 255])));
  vi.stubGlobal('fetch', remote);
  const result = await exportRestaurantBackup([item]);
  expect(remote).toHaveBeenCalledTimes(1);
  expect(result.manifest.images[0].path).toBe(result.manifest.images[1].path);
  expect(parseRestaurantBackup(result.bytes).manifest.images).toHaveLength(2);
});
test.each([
  [
    'unsupported version',
    (data: any) => {
      data.version = 2;
    },
  ],
  [
    'duplicate record IDs',
    (data: any) => {
      data.restaurants.push(data.restaurants[0]);
    },
  ],
  [
    'invalid record ID',
    (data: any) => {
      data.restaurants[0].id = '../other';
    },
  ],
  [
    'unsafe URL',
    (data: any) => {
      data.restaurants[0].imageUrl = 'javascript:alert(1)';
    },
  ],
  [
    'missing status',
    (data: any) => {
      delete data.restaurants[0].favorite;
    },
  ],
  [
    'duplicate dish IDs',
    (data: any) => {
      data.restaurants[0].dishes = [
        { id: 'dish', name: 'Soup', images: [] },
        { id: 'dish', name: 'Other', images: [] },
      ];
    },
  ],
  [
    'oversized text',
    (data: any) => {
      data.restaurants[0].notes = 'a'.repeat(20001);
    },
  ],
  [
    'bad image association',
    (data: any) => {
      data.images = [{ restaurantId: 'cafe', photoId: 'absent', url: 'https://example.com/a.jpg' }];
    },
  ],
])('rejects %s before applying anything', (_reason, change) => {
  const data = manifest();
  change(data);
  expect(() => parseRestaurantBackup(zip(data))).toThrow('Invalid backup');
});
test('rejects traversal, extra files, compressed payloads, entry-count and archive-size bombs', () => {
  expect(() =>
    parseRestaurantBackup(zip(manifest(), { '../escape.jpg': new Uint8Array([1]) })),
  ).toThrow('path');
  expect(() =>
    parseRestaurantBackup(zip(manifest(), { 'images/extra.jpg': new Uint8Array([255, 216, 255]) })),
  ).toThrow('unreferenced');
  expect(() => parseRestaurantBackup(zip(manifest(), {}, 6))).toThrow('stored');
  const bytes = zip(manifest());
  const view = new DataView(bytes.buffer);
  view.setUint16(bytes.length - 12, 65535, true);
  expect(() => parseRestaurantBackup(bytes)).toThrow('directory');
  expect(() => parseRestaurantBackup(new Uint8Array(ARCHIVE_LIMIT + 1))).toThrow('64 MB');
});
test('rejects spoofed image types, missing binaries and missing associations', () => {
  const data = manifest();
  data.restaurants[0].imageUrl = 'https://example.com/photo.jpg';
  data.images = [
    {
      restaurantId: 'cafe',
      photoId: 'legacy:https://example.com/photo.jpg',
      url: 'https://example.com/photo.jpg',
      path: 'images/photo.jpg',
      mimeType: 'image/jpeg',
    },
  ];
  expect(() => parseRestaurantBackup(zip(data))).toThrow('missing image');
  expect(() => parseRestaurantBackup(zip(data, { 'images/photo.jpg': strToU8('<svg/>') }))).toThrow(
    'JPEG',
  );
  data.images = [];
  expect(() => parseRestaurantBackup(zip(data))).toThrow('missing image associations');
});
test('ignores imported ownership and unknown fields rather than trusting them', () => {
  const data = manifest();
  const parsed = parseRestaurantBackup(zip(data));
  expect(parsed.manifest.restaurants[0]).not.toHaveProperty('authorId');
  expect(parsed.manifest.restaurants[0].id).toBe('cafe');
});
test('rejects corrupted entry contents even when ZIP sizes are unchanged', () => {
  const bytes = zip(manifest());
  bytes[30 + 'manifest.json'.length + 2] ^= 1;
  expect(() => parseRestaurantBackup(bytes)).toThrow('checksum mismatch');
});
test('rejects declared image sizes above the per-file limit before extracting bytes', () => {
  const data = manifest();
  const bytes = zip(data, { 'images/photo.jpg': new Uint8Array([255, 216, 255]) });
  const view = new DataView(bytes.buffer);
  const directory = view.getUint32(bytes.length - 6, true);
  const second = directory + 46 + 'manifest.json'.length;
  view.setUint32(second + 20, 13 * 1024 * 1024, true);
  view.setUint32(second + 24, 13 * 1024 * 1024, true);
  expect(() => parseRestaurantBackup(bytes)).toThrow('oversized ZIP entry');
});
