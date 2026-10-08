// @vitest-environment node
import { beforeEach, expect, test, vi } from 'vitest';
const verify = vi.hoisted(() => vi.fn());
const get = vi.hoisted(() => vi.fn());
vi.mock('firebase-admin/app', () => ({
  getApps: () => [{ name: 'food-hub-images' }],
  cert: vi.fn(),
  initializeApp: vi.fn(),
}));
vi.mock('firebase-admin/auth', () => ({ getAuth: () => ({ verifyIdToken: verify }) }));
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({ collection: () => ({ doc: () => ({ get }) }) }),
}));
import handler from '../functions/restaurant-images';
beforeEach(() => {
  vi.resetAllMocks();
});
test('Firebase Admin verifies the signed ID token with revocation checking enabled', async () => {
  verify.mockRejectedValue(new Error('auth/id-token-expired'));
  const response = await handler(
    new Request('http://localhost', {
      method: 'POST',
      headers: { Authorization: 'Bearer signed-id-token' },
    }),
  );
  expect(response.status).toBe(401);
  expect(verify).toHaveBeenCalledWith('signed-id-token', true);
  expect(get).not.toHaveBeenCalled();
});
