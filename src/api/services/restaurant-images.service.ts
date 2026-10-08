import { auth } from '@lib/firebase';
import type { RestaurantImage } from '@api/models';
import {
  queueImageCleanup,
  completeImageCleanup,
  imageCleanupTasks,
} from '../../features/restaurants/restaurant-cleanup.queue';

const endpoint = '/.netlify/functions/restaurant-images';
export const ORIGINAL_IMAGE_LIMIT = 12 * 1024 * 1024;
export const UPLOAD_IMAGE_LIMIT = 2 * 1024 * 1024;
const allowed = ['image/jpeg', 'image/png', 'image/webp'];

export async function prepareRestaurantImage(file: File): Promise<File> {
  if (!allowed.includes(file.type)) throw new Error('Choose a JPEG, PNG, or WebP image.');
  if (!file.size || file.size > ORIGINAL_IMAGE_LIMIT)
    throw new Error('Choose an image smaller than 12 MB.');
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    if (
      !image.naturalWidth ||
      !image.naturalHeight ||
      image.naturalWidth * image.naturalHeight > 40000000
    )
      throw new Error('This image is too large to resize safely.');
    const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Image resizing is not supported in this browser.');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.82, 0.7, 0.58]) {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', quality),
      );
      if (blob && blob.size <= UPLOAD_IMAGE_LIMIT)
        return new File([blob], 'photo.jpg', { type: 'image/jpeg' });
    }
    throw new Error('Could not compress this image below 2 MB. Choose a smaller image.');
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function token() {
  if (!auth.currentUser) throw new Error('Please sign in again.');
  return auth.currentUser.getIdToken();
}

export async function uploadRestaurantImage(
  restaurantId: string,
  file: File,
  progress: (value: number) => void,
  dishId?: string,
): Promise<RestaurantImage> {
  if (!allowed.includes(file.type) || !file.size || file.size > UPLOAD_IMAGE_LIMIT)
    throw new Error('Invalid compressed image.');
  const authorization = await token();
  const form = new FormData();
  form.set('restaurantId', restaurantId);
  if (dishId) form.set('dishId', dishId);
  form.set('file', file);
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('POST', endpoint);
    request.setRequestHeader('Authorization', `Bearer ${authorization}`);
    request.timeout = 60000;
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) progress(Math.round((event.loaded / event.total) * 90));
    };
    request.onerror = request.ontimeout = () =>
      reject(new Error('Upload interrupted. Please try again.'));
    request.onload = () => {
      try {
        const result = JSON.parse(request.responseText);
        if (request.status < 200 || request.status >= 300)
          throw new Error(result.error ?? 'Upload failed.');
        if (
          result.provider !== 'imagekit' ||
          !result.fileId ||
          !result.filePath ||
          !result.id ||
          !result.url
        )
          throw new Error('Upload returned incomplete metadata.');
        progress(100);
        resolve(result);
      } catch (error) {
        reject(error instanceof Error ? error : new Error('Upload failed.'));
      }
    };
    request.send(form);
  });
}

export async function deleteRestaurantImage(restaurantId: string, image: RestaurantImage) {
  if (image.provider !== 'imagekit' || !image.fileId) return;
  const authorization = await token();
  const uid = auth.currentUser?.uid;
  if (uid) queueImageCleanup(uid, restaurantId, image);
  const response = await fetch(endpoint, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${authorization}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ restaurantId, fileId: image.fileId }),
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result.error ?? 'File cleanup failed. Please retry.');
  }
  if (uid) completeImageCleanup(uid, image.fileId);
}

export async function cleanupRestaurantImages(
  uid: string,
  restaurantId: string,
  images: RestaurantImage[],
) {
  for (const image of images) queueImageCleanup(uid, restaurantId, image);
  if (auth.currentUser?.uid !== uid) return;
  for (const image of images) {
    try {
      await deleteRestaurantImage(restaurantId, image);
    } catch {
      /* Pending tasks remain available in Settings. */
    }
  }
}
export async function retryRestaurantImageCleanup(uid: string) {
  if (auth.currentUser?.uid !== uid) throw new Error('Please sign in again.');
  for (const task of imageCleanupTasks(uid)) {
    if (auth.currentUser?.uid !== uid) break;
    try {
      await deleteRestaurantImage(task.restaurantId, task.image);
    } catch {
      /* Keep failed tasks for another retry. */
    }
  }
  return imageCleanupTasks(uid).length;
}
