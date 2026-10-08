import { zipSync, unzipSync, strToU8, strFromU8 } from 'fflate';
import type { Restaurant, RestaurantImage } from '@api/models';
import { externalRestaurantUrl } from './restaurant-validation.utils';
import { restaurantGallery } from './restaurant-images.utils';

export const ARCHIVE_LIMIT = 64 * 1024 * 1024;
const IMAGE_LIMIT = 12 * 1024 * 1024;
const ENTRY_LIMIT = 512;
export type BackupRecord = Omit<Restaurant, 'authorId'>;
export type BackupImage = {
  restaurantId: string;
  dishId?: string;
  photoId: string;
  url: string;
  path?: string;
  mimeType?: string;
  error?: string;
};
export type RestaurantBackup = {
  format: 'food-hub-restaurants';
  version: 1;
  exportedAt: string;
  restaurants: BackupRecord[];
  images: BackupImage[];
};
export type ParsedBackup = { manifest: RestaurantBackup; files: Record<string, Uint8Array> };
function invalid(message: string): never {
  throw new Error(`Invalid backup: ${message}`);
}
function object(value: unknown): Record<string, any> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid('expected an object.');
  return value as Record<string, any>;
}
function text(value: unknown, max = 20000): string {
  if (typeof value !== 'string' || value.length > max) invalid('invalid or oversized text.');
  return value;
}
function id(value: unknown): string {
  const result = text(value, 128);
  if (!/^[A-Za-z0-9_-]+$/.test(result)) invalid('invalid identifier.');
  return result;
}
function url(value: unknown): string {
  const result = text(value, 2048);
  if (!externalRestaurantUrl(result)) invalid('only complete HTTP(S) URLs are supported.');
  return result;
}
function array(value: unknown, max = 200): any[] {
  if (!Array.isArray(value) || value.length > max) invalid('invalid or oversized list.');
  return value;
}
function unique<T>(items: T[], identifier: (item: T) => string): T[] {
  if (new Set(items.map(identifier)).size !== items.length) invalid('duplicate identifiers.');
  return items;
}
function image(value: unknown): RestaurantImage {
  const data = object(value);
  const result: RestaurantImage = { id: id(data.id), url: url(data.url) };
  if (data.provider !== undefined && data.provider !== 'imagekit')
    invalid('unknown image provider.');
  if (data.provider === 'imagekit') result.provider = 'imagekit';
  if (data.fileId !== undefined) result.fileId = id(data.fileId);
  if (data.filePath !== undefined) result.filePath = text(data.filePath, 2048);
  for (const key of ['width', 'height', 'size'] as const) {
    if (data[key] !== undefined) {
      if (!Number.isFinite(data[key]) || data[key] < 0 || data[key] > 100000000)
        invalid('invalid image dimensions.');
      result[key] = data[key];
    }
  }
  if (data.mimeType !== undefined) result.mimeType = text(data.mimeType, 80);
  return result;
}
export function backupRecord(value: unknown): BackupRecord {
  const data = object(value);
  const result: BackupRecord = {
    id: id(data.id),
    name: text(data.name, 160),
    tags: array(data.tags).map((tag) => text(tag, 60)),
    favorite: data.favorite,
    blacklisted: data.blacklisted,
    dishes: unique(
      array(data.dishes).map((value) => {
        const dish = object(value);
        return {
          id: id(dish.id),
          name: text(dish.name, 160),
          ...(dish.notes !== undefined ? { notes: text(dish.notes) } : {}),
          images: array(dish.images).map(url),
          ...(dish.photos !== undefined
            ? { photos: unique(array(dish.photos).map(image), (photo) => photo.id) }
            : {}),
        };
      }),
      (dish) => dish.id,
    ),
    orderLinks: unique(
      array(data.orderLinks).map((value) => {
        const link = object(value);
        return {
          ...(link.id !== undefined ? { id: id(link.id) } : {}),
          label: text(link.label, 80),
          url: url(link.url),
        };
      }),
      (link) => link.id ?? `${link.label}\n${link.url}`,
    ),
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
  if (
    !result.name.trim() ||
    typeof result.favorite !== 'boolean' ||
    typeof result.blacklisted !== 'boolean'
  )
    invalid('missing name or status.');
  for (const key of ['createdAt', 'updatedAt'] as const) {
    if (
      result[key] !== null &&
      (!Number.isSafeInteger(result[key]) || result[key]! < 0 || result[key]! > 8640000000000000)
    )
      invalid('invalid timestamp.');
  }
  for (const key of ['notes', 'cuisine', 'category'] as const)
    if (data[key] !== undefined) result[key] = text(data[key]);
  if (data.imageUrl) result.imageUrl = url(data.imageUrl);
  if (data.rating !== undefined && data.rating !== null) {
    if (
      typeof data.rating !== 'number' ||
      !Number.isFinite(data.rating) ||
      Math.abs(data.rating) > 100
    )
      invalid('invalid rating.');
    result.rating = data.rating;
  }
  if (data.photos !== undefined)
    result.photos = unique(array(data.photos).map(image), (photo) => photo.id);
  return result;
}
export function imageMime(bytes: Uint8Array): string {
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'image/jpeg';
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value))
    return 'image/png';
  if (strFromU8(bytes.subarray(0, 4)) === 'RIFF' && strFromU8(bytes.subarray(8, 12)) === 'WEBP')
    return 'image/webp';
  invalid('only JPEG, PNG, and WebP binaries are supported.');
}

// Our format uses stored entries: photos are already compressed. Validate ZIP metadata before allocation.
const crcTable = Uint32Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});
function crc32(bytes: Uint8Array) {
  let value = 0xffffffff;
  for (const byte of bytes) value = crcTable[(value ^ byte) & 255] ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
}
function validateZip(bytes: Uint8Array) {
  if (bytes.length < 22 || bytes.length > ARCHIVE_LIMIT)
    invalid('archive must be smaller than 64 MB.');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const u16 = (offset: number) => view.getUint16(offset, true);
  const u32 = (offset: number) => view.getUint32(offset, true);
  let end = bytes.length - 22;
  for (; end >= Math.max(0, bytes.length - 65557); end--) {
    if (u32(end) === 0x06054b50 && end + 22 + u16(end + 20) === bytes.length) break;
  }
  if (end < 0 || u32(end) !== 0x06054b50 || end + 22 + u16(end + 20) !== bytes.length)
    invalid('missing ZIP directory.');
  const count = u16(end + 10),
    length = u32(end + 12),
    start = u32(end + 16);
  if (
    u16(end + 4) ||
    u16(end + 6) ||
    count !== u16(end + 8) ||
    !count ||
    count > ENTRY_LIMIT ||
    start + length !== end
  )
    invalid('unsupported ZIP directory.');
  let offset = start,
    total = 0;
  const names = new Set<string>();
  const ranges: [number, number][] = [];
  for (let index = 0; index < count; index++) {
    if (offset + 46 > end || u32(offset) !== 0x02014b50) invalid('invalid ZIP entry.');
    const flags = u16(offset + 8),
      method = u16(offset + 10),
      packed = u32(offset + 20),
      size = u32(offset + 24);
    const nameLength = u16(offset + 28),
      extra = u16(offset + 30),
      comment = u16(offset + 32),
      local = u32(offset + 42);
    if (
      offset + 46 + nameLength + extra + comment > end ||
      u16(offset + 34) ||
      flags & ~0x800 ||
      method !== 0 ||
      packed !== size
    )
      invalid('only unencrypted, stored ZIP entries are accepted.');
    const nameBytes = bytes.subarray(offset + 46, offset + 46 + nameLength);
    const name = strFromU8(nameBytes);
    if (!/^(manifest\.json|images\/[A-Za-z0-9_-]+\.(jpg|png|webp))$/.test(name) || names.has(name))
      invalid('unsafe or duplicate ZIP path.');
    names.add(name);
    if (!size || size > (name === 'manifest.json' ? 1024 * 1024 : IMAGE_LIMIT))
      invalid('oversized ZIP entry.');
    total += size;
    if (
      total > ARCHIVE_LIMIT ||
      local + 30 > start ||
      u32(local) !== 0x04034b50 ||
      u16(local + 6) !== flags ||
      u16(local + 8) !== method ||
      u32(local + 18) !== packed ||
      u32(local + 22) !== size ||
      u32(local + 14) !== u32(offset + 16)
    )
      invalid('invalid local ZIP header.');
    const localName = u16(local + 26),
      localExtra = u16(local + 28);
    const dataStart = local + 30 + localName + localExtra;
    if (
      dataStart + size > start ||
      strFromU8(bytes.subarray(local + 30, local + 30 + localName)) !== name
    )
      invalid('invalid ZIP boundaries.');
    if (crc32(bytes.subarray(dataStart, dataStart + size)) !== u32(offset + 16))
      invalid('ZIP checksum mismatch.');
    ranges.push([local, dataStart + size]);
    offset += 46 + nameLength + extra + comment;
  }
  ranges.sort((a, b) => a[0] - b[0]);
  if (
    offset !== end ||
    !names.has('manifest.json') ||
    ranges.some((range, index) => index > 0 && range[0] < ranges[index - 1][1])
  )
    invalid('overlapping ZIP entries.');
}
export function parseRestaurantBackup(bytes: Uint8Array): ParsedBackup {
  validateZip(bytes);
  const files = unzipSync(bytes);
  let root: Record<string, any>;
  try {
    root = object(JSON.parse(strFromU8(files['manifest.json'])));
  } catch {
    invalid('manifest is not valid JSON.');
  }
  if (root.format !== 'food-hub-restaurants' || root.version !== 1)
    invalid('unsupported backup format/version.');
  const restaurants = unique(array(root.restaurants, 200).map(backupRecord), (record) => record.id);
  const sources = new Map(
    restaurants.map((record) => [record.id, restaurantGallery({ ...record, authorId: '' })]),
  );
  const paths = new Set(['manifest.json']);
  const images = unique(
    array(root.images, 511).map((value): BackupImage => {
      const data = object(value);
      const result: BackupImage = {
        restaurantId: id(data.restaurantId),
        photoId: text(data.photoId, 2060),
        url: url(data.url),
        ...(data.dishId !== undefined ? { dishId: id(data.dishId) } : {}),
      };
      if (
        !sources
          .get(result.restaurantId)
          ?.some(
            (photo) =>
              photo.id === result.photoId &&
              photo.url === result.url &&
              photo.dishId === result.dishId,
          )
      )
        invalid('image association does not match its record.');
      if (data.path !== undefined) {
        const path = text(data.path, 160);
        if (!/^images\/[A-Za-z0-9_-]+\.(jpg|png|webp)$/.test(path) || !files[path])
          invalid('missing image binary.');
        const mime = imageMime(files[path]);
        if (
          data.mimeType !== mime ||
          !path.endsWith(mime === 'image/jpeg' ? '.jpg' : mime === 'image/png' ? '.png' : '.webp')
        )
          invalid('image MIME mismatch.');
        result.path = path;
        result.mimeType = mime;
        paths.add(path);
      }
      if (data.error !== undefined) result.error = text(data.error, 500);
      return result;
    }),
    (photo) => JSON.stringify([photo.restaurantId, photo.dishId ?? '', photo.photoId]),
  );
  if (Object.keys(files).some((path) => !paths.has(path))) invalid('unreferenced ZIP entries.');
  const expected = [...sources.values()].reduce((count, photos) => count + photos.length, 0);
  if (images.length !== expected) invalid('missing image associations.');
  const exportedAt = text(root.exportedAt, 40);
  if (!Number.isFinite(Date.parse(exportedAt))) invalid('invalid export date.');
  return {
    manifest: { format: 'food-hub-restaurants', version: 1, exportedAt, restaurants, images },
    files,
  };
}

async function downloadImage(url: string): Promise<Uint8Array> {
  const response = await fetch(url, {
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok || !response.body) throw new Error('Image unavailable or blocked by CORS.');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.length;
      if (size > IMAGE_LIMIT) throw new Error('Image exceeds 12 MB.');
      chunks.push(chunk.value);
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  imageMime(bytes);
  return bytes;
}
export async function exportRestaurantBackup(
  items: Restaurant[],
  progress: (message: string) => void = () => {},
) {
  const restaurants = items.map(backupRecord);
  if (restaurants.length > 200) throw new Error('Backups currently support up to 200 restaurants.');
  const manifest: RestaurantBackup = {
    format: 'food-hub-restaurants',
    version: 1,
    exportedAt: new Date().toISOString(),
    restaurants,
    images: [],
  };
  const files: Record<string, Uint8Array> = {};
  const downloaded = new Map<string, { path?: string; mimeType?: string; error?: string }>();
  let total = 0;
  for (const record of restaurants)
    for (const photo of restaurantGallery({ ...record, authorId: '' })) {
      if (manifest.images.length >= ENTRY_LIMIT - 1)
        throw new Error('Backups currently support up to 511 image associations.');
      progress(`Backing up ${record.name}: ${photo.context}`);
      if (!downloaded.has(photo.url)) {
        try {
          const bytes = await downloadImage(photo.url);
          if (total + bytes.length > ARCHIVE_LIMIT - 1024 * 1024)
            throw new Error('Backup image budget reached.');
          const mimeType = imageMime(bytes);
          const path = `images/photo-${downloaded.size}.${mimeType === 'image/jpeg' ? 'jpg' : mimeType === 'image/png' ? 'png' : 'webp'}`;
          files[path] = bytes;
          total += bytes.length;
          downloaded.set(photo.url, { path, mimeType });
        } catch (error) {
          downloaded.set(photo.url, {
            error: error instanceof Error ? error.message.slice(0, 500) : 'Image download failed.',
          });
        }
      }
      manifest.images.push({
        restaurantId: record.id,
        ...(photo.dishId ? { dishId: photo.dishId } : {}),
        photoId: photo.id,
        url: photo.url,
        ...downloaded.get(photo.url),
      });
    }
  files['manifest.json'] = strToU8(JSON.stringify(manifest, null, 2));
  if (files['manifest.json'].length > 1024 * 1024) throw new Error('Backup manifest exceeds 1 MB.');
  const bytes = zipSync(files, { level: 0 });
  parseRestaurantBackup(bytes);
  return { bytes, manifest };
}
