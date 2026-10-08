import { beforeEach, expect, test, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  auth: { currentUser: { getIdToken: vi.fn() } as { getIdToken: ReturnType<typeof vi.fn> } | null },
}));
vi.mock('@lib/firebase', () => ({ auth: mocks.auth }));
import {
  prepareRestaurantImage,
  uploadRestaurantImage,
  deleteRestaurantImage,
  UPLOAD_IMAGE_LIMIT,
} from './restaurant-images.service';
let status = 200;
let result: any;
let sent: Pick<FakeXHR, 'headers' | 'body'>;
class FakeXHR {
  upload = { onprogress: null as any };
  onload: any;
  onerror: any;
  ontimeout: any;
  timeout = 0;
  status = status;
  responseText = JSON.stringify(result);
  headers: Record<string, string> = {};
  body?: FormData;
  open = vi.fn();
  setRequestHeader(name: string, value: string) {
    this.headers[name] = value;
  }
  send(body: FormData) {
    sent = { headers: this.headers, body };
    this.body = body;
    this.upload.onprogress?.({ lengthComputable: true, loaded: 5, total: 10 });
    this.onload?.();
  }
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.currentUser = { getIdToken: vi.fn().mockResolvedValue('firebase-token') };
  status = 200;
  result = {
    id: 'photo',
    provider: 'imagekit',
    fileId: 'file',
    filePath: '/food-hub/owner/cafe/photo.jpg',
    url: 'https://example.com/photo.jpg',
  };
  vi.stubGlobal('XMLHttpRequest', FakeXHR);
});
test('client upload sends only authenticated multipart data, reports progress, and returns metadata', async () => {
  const progress = vi.fn();
  expect(
    await uploadRestaurantImage(
      'cafe',
      new File(['jpeg'], 'photo.jpg', { type: 'image/jpeg' }),
      progress,
      'soup',
    ),
  ).toEqual(result);
  expect(sent.headers).toEqual({ Authorization: 'Bearer firebase-token' });
  expect(sent.body!.get('dishId')).toBe('soup');
  expect(sent.body!.get('restaurantId')).toBe('cafe');
  expect(sent.body!.has('userId')).toBe(false);
  expect(progress.mock.calls).toEqual([[45], [100]]);
});
test('upload rejection retains a useful retryable error and rejects incomplete metadata', async () => {
  status = 401;
  result = { error: 'Sign-in expired' };
  const file = new File(['jpeg'], 'photo.jpg', { type: 'image/jpeg' });
  await expect(uploadRestaurantImage('cafe', file, vi.fn())).rejects.toThrow('Sign-in expired');
  status = 200;
  result = {};
  await expect(uploadRestaurantImage('cafe', file, vi.fn())).rejects.toThrow('incomplete metadata');
});
test('signed-out users and oversized/invalid compressed files cannot upload', async () => {
  await expect(
    uploadRestaurantImage('cafe', new File(['svg'], 'a.svg', { type: 'image/svg+xml' }), vi.fn()),
  ).rejects.toThrow('Invalid compressed');
  await expect(
    uploadRestaurantImage(
      'cafe',
      new File([new Uint8Array(UPLOAD_IMAGE_LIMIT + 1)], 'a.jpg', { type: 'image/jpeg' }),
      vi.fn(),
    ),
  ).rejects.toThrow('Invalid compressed');
  mocks.auth.currentUser = null;
  await expect(
    uploadRestaurantImage('cafe', new File(['jpeg'], 'a.jpg', { type: 'image/jpeg' }), vi.fn()),
  ).rejects.toThrow('sign in');
});
test('preparation rejects unsupported types and oversized originals before decoding', async () => {
  await expect(
    prepareRestaurantImage(new File(['svg'], 'a.svg', { type: 'image/svg+xml' })),
  ).rejects.toThrow('JPEG');
  await expect(
    prepareRestaurantImage(
      new File([new Uint8Array(12 * 1024 * 1024 + 1)], 'a.jpg', { type: 'image/jpeg' }),
    ),
  ).rejects.toThrow('12 MB');
});
test('canvas resizes to 1600px, normalizes JPEG, and releases the temporary object URL', async () => {
  class TestURL extends URL {
    static createObjectURL = vi.fn(() => 'blob:photo');
    static revokeObjectURL = vi.fn();
  }
  vi.stubGlobal('URL', TestURL);
  vi.stubGlobal(
    'Image',
    class {
      src = '';
      naturalWidth = 3200;
      naturalHeight = 2400;
      decode = async () => {};
    },
  );
  const context = { fillStyle: '', fillRect: vi.fn(), drawImage: vi.fn() };
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => context,
    toBlob: (done: (blob: Blob) => void) => done(new Blob(['jpeg'], { type: 'image/jpeg' })),
  };
  const original = document.createElement.bind(document);
  vi.spyOn(document, 'createElement').mockImplementation(((tag: string) =>
    tag === 'canvas' ? canvas : original(tag)) as typeof document.createElement);
  const prepared = await prepareRestaurantImage(new File(['png'], 'a.png', { type: 'image/png' }));
  expect(canvas).toMatchObject({ width: 1600, height: 1200 });
  expect(prepared.type).toBe('image/jpeg');
  expect(TestURL.revokeObjectURL).toHaveBeenCalledWith('blob:photo');
  vi.restoreAllMocks();
});
test('external references never call delete, while managed deletion is authenticated and retryable', async () => {
  const remote = vi
    .fn()
    .mockResolvedValue({ ok: false, json: async () => ({ error: 'Retry cleanup' }) });
  vi.stubGlobal('fetch', remote);
  await deleteRestaurantImage('cafe', { id: 'external', url: 'https://example.com/image' });
  expect(remote).not.toHaveBeenCalled();
  await expect(deleteRestaurantImage('cafe', result)).rejects.toThrow('Retry cleanup');
  expect(remote).toHaveBeenCalledWith(
    '/.netlify/functions/restaurant-images',
    expect.objectContaining({
      method: 'DELETE',
      headers: expect.objectContaining({ Authorization: 'Bearer firebase-token' }),
      body: JSON.stringify({ restaurantId: 'cafe', fileId: 'file' }),
    }),
  );
});
