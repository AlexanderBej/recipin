import type { RestaurantImage } from '@api/models';

export type ImageCleanupTask = { restaurantId: string; image: RestaurantImage };
const memory = new Map<string, ImageCleanupTask[]>();
const storageUnavailable = new Set<string>();
const key = (uid: string) => `food-hub:restaurant-cleanup:${uid}`;
export function imageCleanupTasks(uid: string): ImageCleanupTask[] {
  if (!uid) return [];
  if (storageUnavailable.has(uid)) return memory.get(uid) ?? [];
  try {
    const value = JSON.parse(localStorage.getItem(key(uid)) ?? '[]');
    return Array.isArray(value)
      ? value.filter(
          (task) => task?.restaurantId && task.image?.provider === 'imagekit' && task.image?.fileId,
        )
      : [];
  } catch {
    return memory.get(uid) ?? [];
  }
}
function write(uid: string, tasks: ImageCleanupTask[]) {
  memory.set(uid, tasks);
  try {
    localStorage.setItem(key(uid), JSON.stringify(tasks));
    storageUnavailable.delete(uid);
  } catch {
    storageUnavailable.add(uid);
    /* Retry survives this session when storage is unavailable. */
  }
  window.dispatchEvent(new Event('restaurant-cleanup-changed'));
}
export function queueImageCleanup(uid: string, restaurantId: string, image: RestaurantImage) {
  if (!uid || image.provider !== 'imagekit' || !image.fileId) return;
  const tasks = imageCleanupTasks(uid);
  if (!tasks.some((task) => task.image.fileId === image.fileId))
    write(uid, [...tasks, { restaurantId, image }]);
}
export function completeImageCleanup(uid: string, fileId: string) {
  write(
    uid,
    imageCleanupTasks(uid).filter((task) => task.image.fileId !== fileId),
  );
}
