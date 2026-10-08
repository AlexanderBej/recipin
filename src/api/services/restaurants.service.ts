import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  setDoc,
  serverTimestamp,
  runTransaction,
  Timestamp,
  type DocumentData,
} from 'firebase/firestore';
import { auth, db } from '@lib/firebase';
import type { Restaurant, RestaurantDish, RestaurantOrderLink, RestaurantImage } from '@api/models';
import { externalRestaurantUrl } from '../../features/restaurants/restaurant-validation.utils';
import { backupRecord, type BackupRecord } from '../../features/restaurants/restaurant-backup';

const restaurantsCol = collection(db, 'restaurants');
const optionalText = (value: unknown) => (typeof value === 'string' ? value : undefined);
const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
const photos = (value: unknown): RestaurantImage[] | undefined =>
  Array.isArray(value)
    ? value
        .filter((item) => typeof item?.id === 'string' && typeof item?.url === 'string')
        .map((item) => ({
          id: item.id,
          url: item.url,
          ...(item.provider === 'imagekit' ? { provider: 'imagekit' as const } : {}),
          ...(typeof item.fileId === 'string' ? { fileId: item.fileId } : {}),
          ...(typeof item.filePath === 'string' ? { filePath: item.filePath } : {}),
          ...Object.fromEntries(
            ['width', 'height', 'size']
              .filter((key) => typeof item[key] === 'number')
              .map((key) => [key, item[key]]),
          ),
          ...(typeof item.mimeType === 'string' ? { mimeType: item.mimeType } : {}),
        }))
    : undefined;
const millis = (value: any): number | null => {
  const result = typeof value?.toMillis === 'function' ? value.toMillis() : value;
  return typeof result === 'number' && Number.isFinite(result) ? result : null;
};

function requireOwner(uid: string) {
  if (!uid || auth.currentUser?.uid !== uid) throw new Error('Please sign in again.');
}

export function restaurantFromData(id: string, data: DocumentData): Restaurant {
  return {
    id,
    authorId: optionalText(data.authorId) ?? '',
    name: optionalText(data.name)?.trim() || 'Unnamed restaurant',
    imageUrl: optionalText(data.imageUrl),
    ...(photos(data.photos) ? { photos: photos(data.photos) } : {}),
    cuisine: optionalText(data.cuisine),
    category: optionalText(data.category),
    rating:
      typeof data.rating === 'number' && Number.isFinite(data.rating) ? data.rating : undefined,
    notes: optionalText(data.notes),
    tags: strings(data.tags),
    favorite: data.favorite === true,
    blacklisted: data.blacklisted === true,
    orderLinks: Array.isArray(data.orderLinks)
      ? data.orderLinks
          .filter((link) => typeof link?.label === 'string' && typeof link?.url === 'string')
          .map((link) => ({
            ...(typeof link.id === 'string' ? { id: link.id } : {}),
            label: link.label,
            url: link.url,
          }))
      : [],
    dishes: Array.isArray(data.dishes)
      ? data.dishes
          .filter((dish) => typeof dish?.id === 'string' && typeof dish?.name === 'string')
          .map((dish) => ({
            id: dish.id,
            name: dish.name,
            notes: optionalText(dish.notes),
            images: strings(dish.images),
            ...(photos(dish.photos) ? { photos: photos(dish.photos) } : {}),
          }))
      : [],
    createdAt: millis(data.createdAt),
    updatedAt: millis(data.updatedAt),
  };
}

type TextField = 'name' | 'cuisine' | 'category' | 'notes' | 'imageUrl';
export type RestaurantEdit =
  | {
      kind: 'photo';
      dishId?: string;
      action: 'add' | 'remove' | 'replace';
      previous?: RestaurantImage;
      photo?: RestaurantImage;
    }
  | {
      kind: 'field';
      field: TextField | 'rating';
      value: string | number | null;
      expected: string | number | null;
    }
  | { kind: 'tag'; tag: string; remove?: boolean }
  | { kind: 'addDish'; dish: RestaurantDish }
  | {
      kind: 'dish';
      id: string;
      field: 'name' | 'notes' | 'images';
      value: string | string[];
      expected: string | string[];
    }
  | { kind: 'removeDish'; id: string; expected: RestaurantDish }
  | { kind: 'moveDish'; id: string; direction: -1 | 1 }
  | { kind: 'addLink'; link: RestaurantOrderLink & { id: string } }
  | {
      kind: 'link';
      target: RestaurantOrderLink;
      field: 'label' | 'url';
      value: string;
      expected: string;
    }
  | { kind: 'removeLink'; target: RestaurantOrderLink };

const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
function conflict() {
  const error = new Error(
    'This value changed elsewhere. Keep your text, or use the latest value before editing again.',
  );
  error.name = 'RestaurantEditConflict';
  return error;
}
function text(value: unknown, required = false, max = 20000) {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim()))
    throw new Error(required ? 'A name is required.' : 'This text is too long.');
  return required ? value.trim() : value;
}
function imageUrl(value: unknown) {
  const result = text(value).trim();
  if (result && !externalRestaurantUrl(result))
    throw new Error('Use a complete http or https image URL.');
  return result;
}
function validateLink(link: RestaurantOrderLink) {
  text(link.label, true, 80);
  if (!externalRestaurantUrl(link.url))
    throw new Error('Use a complete http or https ordering URL.');
}
function findLink(links: DocumentData[], target: RestaurantOrderLink) {
  const matches = links
    .map((link, index) => ({ link, index }))
    .filter(({ link }) =>
      target.id ? link?.id === target.id : link?.label === target.label && link?.url === target.url,
    );
  if (matches.length !== 1) throw conflict();
  return matches[0].index;
}

// Operations target one field/item. Arrays are merged against the transaction's latest snapshot.
export async function editRestaurant(
  uid: string,
  id: string,
  edit: RestaurantEdit,
): Promise<Restaurant> {
  requireOwner(uid);
  const legacyLinkId = crypto.randomUUID();
  return runTransaction(db, async (transaction) => {
    requireOwner(uid);
    const ref = doc(restaurantsCol, id);
    const snap = await transaction.get(ref);
    if (!snap.exists()) throw new Error('This restaurant no longer exists.');
    const data = snap.data();
    if (data.authorId !== uid) throw new Error('This restaurant is not in your notebook.');
    const current = restaurantFromData(id, data);
    const patch: DocumentData = {};
    if (edit.kind === 'photo') {
      const dishes: DocumentData[] = Array.isArray(data.dishes) ? [...data.dishes] : [];
      const index = edit.dishId ? dishes.findIndex((dish) => dish?.id === edit.dishId) : -1;
      if (edit.dishId && index < 0) throw new Error('This dish no longer exists.');
      const target = edit.dishId ? dishes[index] : data;
      const currentPhotos: DocumentData[] = Array.isArray(target.photos) ? [...target.photos] : [];
      if (edit.action !== 'add') {
        const previous = edit.previous;
        if (!previous) throw new Error('Select a photo.');
        const existing = currentPhotos.find((photo) => photo?.id === previous.id);
        const legacy =
          previous.id === `legacy:${previous.url}` &&
          (edit.dishId
            ? strings(target.images).includes(previous.url)
            : target.imageUrl === previous.url);
        if (
          existing ? existing.url !== previous.url || existing.fileId !== previous.fileId : !legacy
        )
          throw conflict();
        if (existing) currentPhotos.splice(currentPhotos.indexOf(existing), 1);
      }
      if (edit.action !== 'remove') {
        if (!edit.photo || !edit.photo.id || !externalRestaurantUrl(edit.photo.url))
          throw new Error('Invalid photo.');
        if (edit.photo.provider === 'imagekit' && (!edit.photo.fileId || !edit.photo.filePath))
          throw new Error('Missing upload metadata.');
        if (!currentPhotos.some((photo) => photo?.id === edit.photo!.id))
          currentPhotos.push({ ...edit.photo });
      }
      const imagePatch: DocumentData = { photos: currentPhotos };
      if (edit.action !== 'add' && edit.previous) {
        if (edit.dishId)
          imagePatch.images = (Array.isArray(target.images) ? target.images : []).filter(
            (url: unknown) => url !== edit.previous!.url,
          );
        else if (data.imageUrl === edit.previous.url)
          imagePatch.imageUrl = edit.action === 'replace' ? edit.photo!.url : '';
      }
      if (!edit.dishId && edit.action === 'add' && !data.imageUrl)
        imagePatch.imageUrl = edit.photo!.url;
      if (edit.dishId) {
        dishes[index] = { ...target, ...imagePatch };
        patch.dishes = dishes;
      } else Object.assign(patch, imagePatch);
    } else if (edit.kind === 'field') {
      if (!['name', 'cuisine', 'category', 'notes', 'imageUrl', 'rating'].includes(edit.field))
        throw new Error('Unsupported field.');
      const existing = current[edit.field] ?? (edit.field === 'rating' ? null : '');
      if (!equal(existing, edit.expected)) throw conflict();
      if (edit.field === 'rating') {
        if (
          edit.value !== null &&
          (typeof edit.value !== 'number' ||
            !Number.isFinite(edit.value) ||
            edit.value < 0 ||
            edit.value > 5 ||
            (edit.value * 2) % 1 !== 0)
        )
          throw new Error('Choose a rating from 0 to 5 in half-star steps.');
        patch.rating = edit.value;
      } else
        patch[edit.field] =
          edit.field === 'imageUrl'
            ? imageUrl(edit.value)
            : text(edit.value, edit.field === 'name', edit.field === 'name' ? 160 : 20000);
    } else if (edit.kind === 'tag') {
      const tag = text(edit.tag, true, 60);
      const tags: unknown[] = Array.isArray(data.tags) ? data.tags : [];
      patch.tags = edit.remove
        ? tags.filter((item) => item !== tag)
        : tags.some(
              (item) =>
                typeof item === 'string' && item.toLocaleLowerCase() === tag.toLocaleLowerCase(),
            )
          ? tags
          : [...tags, tag];
    } else if (
      edit.kind === 'addDish' ||
      edit.kind === 'dish' ||
      edit.kind === 'removeDish' ||
      edit.kind === 'moveDish'
    ) {
      const dishes: DocumentData[] = Array.isArray(data.dishes) ? [...data.dishes] : [];
      if (edit.kind === 'addDish') {
        if (!edit.dish.id) throw new Error('Dish ID is required.');
        if (!dishes.some((dish) => dish?.id === edit.dish.id))
          dishes.push({
            id: edit.dish.id,
            name: text(edit.dish.name, true, 160),
            notes: text(edit.dish.notes ?? ''),
            images: edit.dish.images.map(imageUrl).filter(Boolean),
          });
      } else {
        const index = dishes.findIndex((dish) => dish?.id === edit.id);
        if (index < 0) throw new Error('This dish no longer exists.');
        const dish = dishes[index];
        if (edit.kind === 'dish') {
          if (!['name', 'notes', 'images'].includes(edit.field))
            throw new Error('Unsupported dish field.');
          const existing =
            edit.field === 'images' ? strings(dish.images) : (optionalText(dish[edit.field]) ?? '');
          if (!equal(existing, edit.expected)) throw conflict();
          const value =
            edit.field === 'images'
              ? Array.isArray(edit.value)
                ? edit.value.map(imageUrl).filter(Boolean)
                : (() => {
                    throw new Error('Invalid image references.');
                  })()
              : text(edit.value, edit.field === 'name', edit.field === 'name' ? 160 : 20000);
          dishes[index] = { ...dish, [edit.field]: value };
        } else if (edit.kind === 'removeDish') {
          const visible = current.dishes.find((entry) => entry.id === edit.id);
          if (!equal(visible, edit.expected)) throw conflict();
          dishes.splice(index, 1);
        } else {
          const next = index + edit.direction;
          if (next >= 0 && next < dishes.length)
            [dishes[index], dishes[next]] = [dishes[next], dishes[index]];
        }
      }
      patch.dishes = dishes;
    } else {
      const links: DocumentData[] = Array.isArray(data.orderLinks) ? [...data.orderLinks] : [];
      if (edit.kind === 'addLink') {
        validateLink(edit.link);
        if (!links.some((link) => link?.id === edit.link.id))
          links.push({
            id: edit.link.id,
            label: edit.link.label.trim(),
            url: edit.link.url.trim(),
          });
      } else {
        const index = findLink(links, edit.target);
        const link = links[index];
        if (edit.kind === 'removeLink') {
          if (link.label !== edit.target.label || link.url !== edit.target.url) throw conflict();
          links.splice(index, 1);
        } else {
          if (link[edit.field] !== edit.expected) throw conflict();
          const next = {
            ...link,
            id: link.id ?? legacyLinkId,
            [edit.field]: edit.value.trim(),
          } as RestaurantOrderLink;
          validateLink(next);
          links[index] = next;
        }
      }
      patch.orderLinks = links;
    }
    transaction.update(ref, { ...patch, updatedAt: serverTimestamp() });
    return restaurantFromData(id, { ...data, ...patch, updatedAt: Date.now() });
  });
}

export async function deleteRestaurant(uid: string, id: string): Promise<Restaurant | undefined> {
  requireOwner(uid);
  return runTransaction(db, async (transaction) => {
    requireOwner(uid);
    const ref = doc(restaurantsCol, id);
    const snap = await transaction.get(ref);
    if (!snap.exists()) return;
    if (snap.data().authorId !== uid) throw new Error('This restaurant is not in your notebook.');
    transaction.delete(ref);
    return restaurantFromData(id, snap.data());
  });
}

export async function listRestaurants(uid: string): Promise<Restaurant[]> {
  requireOwner(uid);
  const snap = await getDocs(query(restaurantsCol, where('authorId', '==', uid)));
  return snap.docs
    .map((item) => restaurantFromData(item.id, item.data()))
    .filter((item) => item.authorId === uid);
}

export async function getRestaurant(uid: string, id: string): Promise<Restaurant | null> {
  requireOwner(uid);
  const snap = await getDoc(doc(restaurantsCol, id));
  if (!snap.exists()) return null;
  if (snap.data().authorId !== uid) throw new Error('This restaurant is not in your notebook.');
  return restaurantFromData(snap.id, snap.data());
}

export async function createRestaurant(uid: string, name: string): Promise<Restaurant> {
  requireOwner(uid);
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 160) throw new Error('Enter a name of 1 to 160 characters.');
  const ref = doc(restaurantsCol);
  const fields = {
    authorId: uid,
    name: trimmed,
    tags: [],
    favorite: false,
    blacklisted: false,
    orderLinks: [],
    dishes: [],
  };
  await setDoc(ref, {
    ...fields,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  // No post-write read that could turn a committed creation into a retry/duplicate.
  const now = Date.now();
  return restaurantFromData(ref.id, { ...fields, createdAt: now, updatedAt: now });
}

export async function updateRestaurantStatus(
  uid: string,
  id: string,
  changes: Partial<Pick<Restaurant, 'favorite' | 'blacklisted'>>,
): Promise<Restaurant> {
  requireOwner(uid);
  const patch: DocumentData = {};
  for (const field of ['favorite', 'blacklisted'] as const) {
    if (typeof changes[field] === 'boolean') patch[field] = changes[field];
  }
  return runTransaction(db, async (transaction) => {
    requireOwner(uid);
    const ref = doc(restaurantsCol, id);
    const snap = await transaction.get(ref);
    if (!snap.exists()) throw new Error('This restaurant no longer exists.');
    const data = snap.data();
    if (data.authorId !== uid) throw new Error('This restaurant is not in your notebook.');
    transaction.update(ref, { ...patch, updatedAt: serverTimestamp() });
    return restaurantFromData(id, { ...data, ...patch, updatedAt: Date.now() });
  });
}

// Import updates preserve unknown fields and existing nested items, and reject stale previews.
export async function saveImportedRestaurant(
  uid: string,
  imported: BackupRecord,
  id: string,
  expected?: Restaurant,
): Promise<Restaurant> {
  requireOwner(uid);
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(id)) throw new Error('Invalid destination identifier.');
  const record = backupRecord(imported);
  const mergePhotos = (existing: DocumentData[] = [], incoming: RestaurantImage[] = []) => {
    const result = [...existing];
    for (const photo of incoming) {
      if (result.some((item) => item.url === photo.url)) continue;
      result.push({
        id: result.some((item) => item.id === photo.id) ? crypto.randomUUID() : photo.id,
        url: photo.url,
      });
    }
    return result;
  };
  return runTransaction(db, async (transaction) => {
    requireOwner(uid);
    const ref = doc(restaurantsCol, id);
    const snap = await transaction.get(ref);
    const data = snap.exists() ? snap.data() : {};
    if (snap.exists() && data.authorId !== uid)
      throw new Error('This restaurant is not in your notebook.');
    if (expected ? !snap.exists() || !equal(restaurantFromData(id, data), expected) : snap.exists())
      throw new Error(
        'This destination changed since preview. Reload the backup preview before importing.',
      );
    const { createdAt } = record;
    const fields: DocumentData = { ...record };
    delete fields.id;
    delete fields.createdAt;
    delete fields.updatedAt;
    const patch: DocumentData = { ...fields, authorId: uid };
    patch.photos = mergePhotos(Array.isArray(data.photos) ? data.photos : [], record.photos);
    if (
      data.imageUrl &&
      data.imageUrl !== record.imageUrl &&
      !patch.photos.some((photo: RestaurantImage) => photo.url === data.imageUrl)
    )
      patch.photos.push({ id: crypto.randomUUID(), url: data.imageUrl });
    const dishes: DocumentData[] = Array.isArray(data.dishes) ? [...data.dishes] : [];
    for (const dish of record.dishes) {
      const index = dishes.findIndex((entry) => entry.id === dish.id);
      const existing = index < 0 ? {} : dishes[index];
      const next = {
        ...existing,
        ...dish,
        images: [
          ...new Set([...(Array.isArray(existing.images) ? existing.images : []), ...dish.images]),
        ],
        photos: mergePhotos(existing.photos, dish.photos),
      };
      if (index < 0) dishes.push(next);
      else dishes[index] = next;
    }
    patch.dishes = dishes;
    const links: DocumentData[] = Array.isArray(data.orderLinks) ? [...data.orderLinks] : [];
    for (const link of record.orderLinks) {
      const index = links.findIndex((entry) =>
        link.id ? entry.id === link.id : entry.label === link.label && entry.url === link.url,
      );
      if (index < 0) links.push(link);
      else links[index] = { ...links[index], ...link };
    }
    patch.orderLinks = links;
    if (!snap.exists())
      patch.createdAt = createdAt === null ? serverTimestamp() : Timestamp.fromMillis(createdAt);
    patch.updatedAt = serverTimestamp();
    if (snap.exists()) transaction.update(ref, patch);
    else transaction.set(ref, patch);
    return restaurantFromData(id, {
      ...data,
      ...patch,
      createdAt: snap.exists() ? data.createdAt : (createdAt ?? Date.now()),
      updatedAt: Date.now(),
    });
  });
}
