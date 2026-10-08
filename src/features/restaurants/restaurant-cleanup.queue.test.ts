import { beforeEach, expect, test, vi } from 'vitest';
import { imageCleanupTasks, queueImageCleanup } from './restaurant-cleanup.queue';
import {
  cleanupRestaurantImages,
  retryRestaurantImageCleanup,
} from '@api/services/restaurant-images.service';
const mocks = vi.hoisted(() => ({
  auth: {
    currentUser: { uid: 'owner', getIdToken: vi.fn() } as {
      uid: string;
      getIdToken: () => Promise<string>;
    } | null,
  },
}));
vi.mock('@lib/firebase', () => ({ auth: mocks.auth }));
const photo = {
  id: 'photo',
  url: 'https://example.com/image.jpg',
  provider: 'imagekit' as const,
  fileId: 'file',
  filePath: '/food-hub/owner/cafe/image.jpg',
};
beforeEach(() => {
  localStorage.clear();
  mocks.auth.currentUser = {
    uid: 'owner',
    getIdToken: vi.fn().mockResolvedValue('verified-token'),
  };
});
test('external images are never deleted and managed cleanup is deduplicated and user scoped', () => {
  queueImageCleanup('owner', 'cafe', { id: 'external', url: 'https://example.com/a.jpg' });
  queueImageCleanup('owner', 'cafe', photo);
  queueImageCleanup('owner', 'cafe', photo);
  expect(imageCleanupTasks('owner')).toHaveLength(1);
  expect(imageCleanupTasks('other')).toEqual([]);
});
test('failed restaurant/dish cleanup persists and explicit retry clears successful tasks', async () => {
  const remote = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(Response.json({ error: 'Service down' }, { status: 503 }))
    .mockResolvedValueOnce(Response.json({ removed: true }));
  await cleanupRestaurantImages('owner', 'cafe', [photo]);
  expect(imageCleanupTasks('owner')).toHaveLength(1);
  expect(localStorage.getItem('food-hub:restaurant-cleanup:owner')).toContain('file');
  expect(await retryRestaurantImageCleanup('owner')).toBe(0);
  expect(remote).toHaveBeenCalledWith(
    expect.any(String),
    expect.objectContaining({
      method: 'DELETE',
      body: JSON.stringify({ restaurantId: 'cafe', fileId: 'file' }),
    }),
  );
  remote.mockRestore();
});
test('signed-out cleanup remains queued and cannot be retried as another user', async () => {
  const remote = vi.spyOn(globalThis, 'fetch');
  mocks.auth.currentUser = null;
  await cleanupRestaurantImages('owner', 'cafe', [photo]);
  expect(imageCleanupTasks('owner')).toHaveLength(1);
  await expect(retryRestaurantImageCleanup('owner')).rejects.toThrow('sign in');
  expect(remote).not.toHaveBeenCalled();
  remote.mockRestore();
});
