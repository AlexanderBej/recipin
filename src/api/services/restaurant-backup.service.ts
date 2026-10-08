import type { Restaurant, RestaurantImage } from '@api/models';
import { auth } from '@lib/firebase';
import { editRestaurant, getRestaurant, saveImportedRestaurant } from './restaurants.service';
import {
  prepareRestaurantImage,
  uploadRestaurantImage,
  deleteRestaurantImage,
} from './restaurant-images.service';
import { restaurantGallery } from '../../features/restaurants/restaurant-images.utils';
import { normalizedRestaurantName } from '../../features/restaurants/restaurant-collection.utils';
import type { ParsedBackup, BackupRecord } from '../../features/restaurants/restaurant-backup';
import {
  queueImageCleanup,
  completeImageCleanup,
} from '../../features/restaurants/restaurant-cleanup.queue';

export type ImportChoice = 'skip' | 'update' | 'keep';
export type ImportRow = {
  record: BackupRecord;
  matches: Restaurant[];
  choice: ImportChoice;
  targetId: string;
  saved?: Restaurant;
  restored: string[];
  pendingUpload?: { key: string; photo: RestaurantImage; previous: RestaurantImage };
  error?: string;
  imageErrors: string[];
};
export function previewRestaurantImport(backup: ParsedBackup, existing: Restaurant[]): ImportRow[] {
  return backup.manifest.restaurants.map((record) => {
    const matches = existing.filter(
      (item) => normalizedRestaurantName(item.name) === normalizedRestaurantName(record.name),
    );
    return {
      record,
      matches,
      choice: matches.length ? 'skip' : 'keep',
      targetId: matches[0]?.id ?? crypto.randomUUID(),
      restored: [],
      imageErrors: [],
    };
  });
}
export async function applyRestaurantImport(
  uid: string,
  backup: ParsedBackup,
  rows: ImportRow[],
  progress: (message: string) => void = () => {},
) {
  const results: ImportRow[] = [];
  for (const original of rows) {
    const row: ImportRow = {
      ...original,
      restored: [...original.restored],
      imageErrors: [],
      error: undefined,
    };
    results.push(row);
    if (row.choice === 'skip') continue;
    if (auth.currentUser?.uid !== uid) {
      row.error = 'Your session changed. Sign in again before retrying.';
      continue;
    }
    progress(`Importing ${row.record.name}`);
    try {
      if (!row.saved)
        row.saved = await saveImportedRestaurant(
          uid,
          row.record,
          row.targetId,
          row.choice === 'update'
            ? (row.matches.find((item) => item.id === row.targetId) ??
                (() => {
                  throw new Error('Choose an existing destination.');
                })())
            : undefined,
        );
      else {
        const latest = await getRestaurant(uid, row.saved.id);
        if (!latest)
          throw new Error('The imported restaurant was deleted. Preview the backup again.');
        row.saved = latest;
      }
    } catch (error) {
      row.error = error instanceof Error ? error.message : 'Record could not be saved.';
      continue;
    }
    const assets = backup.manifest.images.filter(
      (photo) => photo.restaurantId === row.record.id && photo.path,
    );
    for (const asset of assets) {
      const key = JSON.stringify([asset.dishId ?? '', asset.photoId]);
      if (row.restored.includes(key)) continue;
      progress(`Restoring ${row.record.name}: ${asset.dishId ? 'dish photo' : 'restaurant photo'}`);
      let uploaded = row.pendingUpload?.key === key ? row.pendingUpload : undefined;
      try {
        if (auth.currentUser?.uid !== uid) throw new Error('Your session changed.');
        if (
          uploaded &&
          restaurantGallery(row.saved!).some(
            (photo) =>
              photo.dishId === asset.dishId &&
              photo.id === uploaded!.photo.id &&
              photo.url === uploaded!.photo.url &&
              photo.fileId === uploaded!.photo.fileId,
          )
        ) {
          row.restored.push(key);
          if (uploaded.photo.fileId) completeImageCleanup(uid, uploaded.photo.fileId);
          row.pendingUpload = undefined;
          try {
            await deleteRestaurantImage(row.saved!.id, uploaded.previous);
          } catch {
            /* Cleanup remains queued. */
          }
          continue;
        }
        const previous =
          uploaded?.previous ??
          restaurantGallery(row.saved!).find(
            (photo) => photo.dishId === asset.dishId && photo.url === asset.url,
          );
        if (!previous) throw new Error('Photo association changed; preview the backup again.');
        if (!uploaded) {
          const bytes = backup.files[asset.path!];
          const file = await prepareRestaurantImage(
            new File([new Uint8Array(bytes)], 'backup-photo', { type: asset.mimeType }),
          );
          const photo = await uploadRestaurantImage(row.saved!.id, file, () => {}, asset.dishId);
          queueImageCleanup(uid, row.saved!.id, photo);
          uploaded = { key, photo, previous };
          row.pendingUpload = uploaded;
        }
        row.saved = await editRestaurant(uid, row.saved!.id, {
          kind: 'photo',
          action: 'replace',
          dishId: asset.dishId,
          previous: uploaded.previous,
          photo: uploaded.photo,
        });
        row.restored.push(key);
        if (uploaded.photo.fileId) completeImageCleanup(uid, uploaded.photo.fileId);
        row.pendingUpload = undefined;
        try {
          await deleteRestaurantImage(row.saved.id, uploaded.previous);
        } catch {
          /* Cleanup is queued separately. */
        }
      } catch (error) {
        row.imageErrors.push(
          `${asset.dishId ?? 'Restaurant'} photo: ${error instanceof Error ? error.message : 'Restore failed.'}`,
        );
        // Keep an uploaded-but-unsaved replacement for retry rather than upload it again.
        if (uploaded) {
          row.pendingUpload = uploaded;
          break;
        }
      }
    }
  }
  return results;
}
