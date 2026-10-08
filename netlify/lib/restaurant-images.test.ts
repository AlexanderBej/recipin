// @vitest-environment node
import { beforeEach, expect, test, vi } from 'vitest';
import { imageHandler } from './restaurant-images';

const restaurant = vi.fn();
const verifyToken = vi.fn();
const remote = vi.fn<typeof fetch>();
const referenced = vi.fn();
const handler = imageHandler({
  restaurant,
  referenced,
  verifyToken,
  fetch: remote,
  privateKey: () => 'server-only-test-key',
});
const image = {
  fileId: 'file-1',
  filePath: '/food-hub/owner/cafe/photo.jpg',
  url: 'https://ik.imagekit.io/test/photo.jpg',
  width: 1200,
  height: 800,
};
function upload(
  type = 'image/jpeg',
  bytes = new Uint8Array([255, 216, 255, 1]),
  id = 'cafe',
  token = 'valid',
) {
  const form = new FormData();
  form.set('restaurantId', id);
  form.set('file', new File([bytes], '../../unsafe.jpg', { type }));
  return new Request('http://localhost/.netlify/functions/restaurant-images', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
}
const remove = (fileId = 'file-1') =>
  new Request('http://localhost/.netlify/functions/restaurant-images', {
    method: 'DELETE',
    headers: { Authorization: 'Bearer valid', 'Content-Type': 'application/json' },
    body: JSON.stringify({ restaurantId: 'cafe', fileId }),
  });
beforeEach(() => {
  vi.resetAllMocks();
  referenced.mockResolvedValue(false);
  verifyToken.mockResolvedValue({ uid: 'owner' });
  restaurant.mockResolvedValue({ authorId: 'owner', dishes: [{ id: 'soup' }] });
  remote.mockResolvedValue(Response.json(image));
});
test('authenticates before uploading, chooses the user folder and ignores supplied filenames', async () => {
  const result = await handler(upload());
  expect(result.status).toBe(200);
  expect(verifyToken).toHaveBeenCalledWith('valid');
  expect(restaurant).toHaveBeenCalledWith('cafe');
  const [url, init] = remote.mock.calls[0];
  expect(url).toBe('https://upload.imagekit.io/api/v1/files/upload');
  const form = init!.body as FormData;
  expect(form.get('folder')).toBe('/food-hub/owner/cafe/');
  expect(form.get('fileName')).toMatch(/^[a-f0-9-]+\.jpg$/);
  expect(init!.headers).toEqual({
    Authorization: `Basic ${Buffer.from('server-only-test-key:').toString('base64')}`,
  });
  expect(await result.json()).toMatchObject({
    provider: 'imagekit',
    fileId: 'file-1',
    size: 4,
    mimeType: 'image/jpeg',
  });
});
test.each(['expired', 'invalid', 'revoked'])(
  'rejects %s tokens before any ownership or ImageKit request',
  async (reason) => {
    verifyToken.mockRejectedValue(new Error(reason));
    expect((await handler(upload())).status).toBe(401);
    expect(restaurant).not.toHaveBeenCalled();
    expect(remote).not.toHaveBeenCalled();
  },
);
test('missing authentication and another owner cannot authorize uploads or deletion', async () => {
  expect((await handler(new Request('http://localhost', { method: 'POST' }))).status).toBe(401);
  restaurant.mockResolvedValue({ authorId: 'someone-else' });
  expect((await handler(upload())).status).toBe(403);
  expect((await handler(remove())).status).toBe(403);
  expect(remote).not.toHaveBeenCalled();
});
test('rejects bad MIME, spoofed content, oversized files, and unsafe restaurant paths', async () => {
  expect((await handler(upload('image/svg+xml'))).status).toBe(415);
  expect((await handler(upload('image/png'))).status).toBe(415);
  expect((await handler(upload('image/jpeg', new Uint8Array(2 * 1024 * 1024 + 1)))).status).toBe(
    413,
  );
  expect((await handler(upload('image/jpeg', undefined, '../other'))).status).toBe(400);
  expect(remote).not.toHaveBeenCalled();
});
test('ImageKit upload failures produce retryable errors without leaking upstream secrets', async () => {
  remote.mockResolvedValue(Response.json({ message: 'server-only-test-key' }, { status: 500 }));
  const result = await handler(upload());
  expect(result.status).toBe(502);
  expect(await result.text()).not.toContain('server-only-test-key');
});
test('deletion checks the actual ImageKit path, not a client-provided ownership claim', async () => {
  remote.mockResolvedValueOnce(
    Response.json({ ...image, filePath: '/food-hub/someone-else/cafe/photo.jpg' }),
  );
  expect((await handler(remove())).status).toBe(403);
  expect(remote).toHaveBeenCalledTimes(1);
});
test('attached files cannot be cleaned up, including a replacement whose save actually committed', async () => {
  restaurant.mockResolvedValue({ authorId: 'owner', dishes: [{ photos: [{ fileId: 'file-1' }] }] });
  expect((await handler(remove())).status).toBe(409);
  expect(remote).toHaveBeenCalledTimes(1);
});
test('owner-only deletion checks again and is idempotent for already deleted files', async () => {
  remote
    .mockResolvedValueOnce(Response.json(image))
    .mockResolvedValueOnce(new Response(null, { status: 204 }));
  expect((await handler(remove())).status).toBe(200);
  expect(restaurant).toHaveBeenCalledTimes(2);
  expect(remote).toHaveBeenLastCalledWith(
    'https://api.imagekit.io/v1/files/file-1',
    expect.objectContaining({ method: 'DELETE' }),
  );
  remote.mockResolvedValueOnce(new Response(null, { status: 404 }));
  expect((await handler(remove())).status).toBe(200);
});
test('ownership changes during cleanup prevent destructive requests', async () => {
  restaurant
    .mockResolvedValueOnce({ authorId: 'owner' })
    .mockResolvedValueOnce({ authorId: 'other' });
  expect((await handler(remove())).status).toBe(403);
  expect(remote).toHaveBeenCalledTimes(1);
});
test('missing configuration and unsupported methods fail closed', async () => {
  const unconfigured = imageHandler({
    restaurant,
    verifyToken,
    fetch: remote,
    privateKey: () => '',
  });
  expect((await unconfigured(upload())).status).toBe(503);
  expect((await handler(new Request('http://localhost'))).status).toBe(405);
});
test('cleanup after restaurant deletion verifies the stored owner path and all remaining references', async () => {
  restaurant.mockResolvedValue(null);
  expect((await handler(remove())).status).toBe(200);
  expect(referenced).toHaveBeenCalledWith('file-1', image.url);
  remote.mockClear();
  remote.mockResolvedValueOnce(Response.json(image));
  referenced.mockResolvedValue(true);
  expect((await handler(remove())).status).toBe(409);
  expect(remote).toHaveBeenCalledTimes(1);
  remote.mockResolvedValue(Response.json({ ...image, filePath: '/food-hub/other/cafe/photo.jpg' }));
  expect((await handler(remove())).status).toBe(403);
});
