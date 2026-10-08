import { afterEach, expect, test, vi } from 'vitest';
import { act, fireEvent, renderHook, waitFor } from '@testing-library/react';
import { useScreenWakeLock } from './use-screen-wake-lock';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
function sentinel() {
  return Object.assign(new EventTarget(), {
    released: false,
    type: 'screen',
    release: vi.fn().mockResolvedValue(undefined),
  });
}

test('unsupported browsers can enter and leave without errors', () => {
  vi.stubGlobal('navigator', {});
  const view = renderHook(useScreenWakeLock);
  expect(() => view.unmount()).not.toThrow();
});
test('rejected wake locks do not escape as an unhandled error', async () => {
  const request = vi.fn().mockRejectedValue(new Error('NotAllowedError'));
  vi.stubGlobal('navigator', { wakeLock: { request } });
  const view = renderHook(useScreenWakeLock);
  await waitFor(() => expect(request).toHaveBeenCalledExactlyOnceWith('screen'));
  view.unmount();
});
test('acquires only while visible and releases when leaving', async () => {
  const lock = sentinel();
  const request = vi.fn().mockResolvedValue(lock);
  vi.stubGlobal('navigator', { wakeLock: { request } });
  const view = renderHook(useScreenWakeLock);
  await waitFor(() => expect(request).toHaveBeenCalledWith('screen'));
  await act(async () => {});
  view.unmount();
  expect(lock.release).toHaveBeenCalledTimes(1);
});
test('hiding releases the lock and returning to a visible cooking session reacquires it', async () => {
  const first = sentinel();
  const second = sentinel();
  const request = vi.fn().mockResolvedValueOnce(first).mockResolvedValueOnce(second);
  vi.stubGlobal('navigator', { wakeLock: { request } });
  const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
  const view = renderHook(useScreenWakeLock);
  await act(async () => {});
  visibility.mockReturnValue('hidden');
  fireEvent(document, new Event('visibilitychange'));
  expect(first.release).toHaveBeenCalledTimes(1);
  visibility.mockReturnValue('visible');
  fireEvent(document, new Event('visibilitychange'));
  await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
  await act(async () => {});
  view.unmount();
  expect(second.release).toHaveBeenCalledTimes(1);
});
test('a lock granted after unmount is released immediately', async () => {
  const lock = sentinel();
  let resolve!: (value: unknown) => void;
  const request = vi.fn(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  vi.stubGlobal('navigator', { wakeLock: { request } });
  const view = renderHook(useScreenWakeLock);
  view.unmount();
  await act(async () => {
    resolve(lock);
  });
  expect(lock.release).toHaveBeenCalledTimes(1);
});
