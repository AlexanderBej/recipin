import { randomUUID } from 'node:crypto';

const MAX_FILE = 2 * 1024 * 1024;
const MAX_BODY = MAX_FILE + 64 * 1024;
class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
type Dependencies = {
  verifyToken: (token: string) => Promise<{ uid: string }>;
  restaurant: (id: string) => Promise<Record<string, any> | null>;
  referenced?: (fileId: string, url: string) => Promise<boolean>;
  fetch: typeof fetch;
  privateKey: () => string;
};
const safeId = (id: unknown): id is string =>
  typeof id === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(id);
const response = (value: unknown, status = 200) =>
  Response.json(value, {
    status,
    headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  });
async function body(request: Request) {
  if (Number(request.headers.get('content-length')) > MAX_BODY)
    throw new HttpError(413, 'Image is too large.');
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, 'Missing request body.');
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    length += chunk.value.byteLength;
    if (length > MAX_BODY) {
      await reader.cancel();
      throw new HttpError(413, 'Image is too large.');
    }
    chunks.push(chunk.value);
  }
  return Buffer.concat(chunks);
}
function sniff(bytes: Buffer, type: string) {
  return type === 'image/jpeg'
    ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
    : type === 'image/png'
      ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : type === 'image/webp'
        ? bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP'
        : false;
}
export function references(data: Record<string, any>, fileId: string, url: string) {
  if (data.imageUrl === url || data.dishes?.some((dish: any) => dish.images?.includes(url)))
    return true;
  return [
    ...(Array.isArray(data.photos) ? data.photos : []),
    ...(Array.isArray(data.dishes)
      ? data.dishes.flatMap((dish: any) => (Array.isArray(dish?.photos) ? dish.photos : []))
      : []),
  ].some((photo) => photo?.fileId === fileId || photo?.url === url);
}

export function imageHandler(deps: Dependencies) {
  return async (request: Request): Promise<Response> => {
    try {
      if (!['POST', 'DELETE'].includes(request.method))
        return response({ error: 'Method not allowed.' }, 405);
      const token = request.headers.get('authorization')?.match(/^Bearer ([^\s]+)$/)?.[1];
      if (!token) throw new HttpError(401, 'Please sign in again.');
      let uid: string;
      try {
        ({ uid } = await deps.verifyToken(token));
      } catch {
        throw new HttpError(401, 'Your sign-in expired. Please sign in again.');
      }
      if (!safeId(uid)) throw new HttpError(403, 'Unsupported account identifier.');
      const bytes = await body(request);
      let fields: FormData | Record<string, any>;
      try {
        fields =
          request.method === 'POST'
            ? await new Response(bytes, {
                headers: { 'Content-Type': request.headers.get('content-type') ?? '' },
              }).formData()
            : JSON.parse(bytes.toString('utf8'));
      } catch {
        throw new HttpError(400, 'Invalid request.');
      }
      const id = fields instanceof FormData ? fields.get('restaurantId') : fields.restaurantId;
      if (!safeId(id)) throw new HttpError(400, 'Invalid restaurant identifier.');
      const data = await deps.restaurant(id);
      if ((request.method === 'POST' && !data) || (data && data.authorId !== uid))
        throw new HttpError(403, 'This restaurant is not in your notebook.');
      const key = deps.privateKey();
      if (!key) throw new HttpError(503, 'Image uploads are not configured.');
      const headers = { Authorization: `Basic ${Buffer.from(`${key}:`).toString('base64')}` };
      const folder = `/food-hub/${uid}/${id}/`;
      const api = (url: string, init: RequestInit = {}) =>
        deps.fetch(url, { ...init, headers, signal: AbortSignal.timeout(20000) });
      if (request.method === 'DELETE') {
        const fileId = (fields as Record<string, any>).fileId;
        if (!safeId(fileId)) throw new HttpError(400, 'Invalid file identifier.');
        const details = await api(`https://api.imagekit.io/v1/files/${fileId}/details`);
        if (details.status === 404) return response({ removed: true });
        if (!details.ok) throw new HttpError(502, 'Could not verify the stored image. Try again.');
        const file = await details.json();
        if (
          typeof file.filePath !== 'string' ||
          !file.filePath.startsWith(folder) ||
          file.filePath.slice(folder.length).includes('/')
        )
          throw new HttpError(403, 'This image is not yours to delete.');
        // A failed client save may actually have committed. Never delete an attached replacement.
        const latest = await deps.restaurant(id);
        if (latest && latest.authorId !== uid)
          throw new HttpError(403, 'This restaurant is not in your notebook.');
        if (
          (latest && references(latest, fileId, file.url)) ||
          !deps.referenced ||
          (await deps.referenced(fileId, file.url))
        )
          throw new HttpError(409, 'Remove this photo from the notebook before deleting its file.');
        const result = await api(`https://api.imagekit.io/v1/files/${fileId}`, {
          method: 'DELETE',
        });
        if (!result.ok && result.status !== 404)
          throw new HttpError(
            502,
            'Photo removed from the notebook, but file cleanup failed. Retry cleanup.',
          );
        return response({ removed: true });
      }
      const form = fields as FormData;
      const dishId = form.get('dishId');
      if (dishId && (!safeId(dishId) || !data!.dishes?.some((dish: any) => dish.id === dishId)))
        throw new HttpError(400, 'Dish not found.');
      const file = form.get('file');
      if (!file || typeof file === 'string' || file.size < 1 || file.size > MAX_FILE)
        throw new HttpError(413, 'Choose an image no larger than 2 MB after resizing.');
      const content = Buffer.from(await file.arrayBuffer());
      if (!sniff(content, file.type))
        throw new HttpError(415, 'Choose a JPEG, PNG, or WebP image.');
      const upload = new FormData();
      const extension =
        file.type === 'image/jpeg' ? 'jpg' : file.type === 'image/png' ? 'png' : 'webp';
      upload.set('file', file, `photo.${extension}`);
      upload.set('fileName', `${randomUUID()}.${extension}`);
      upload.set('folder', folder);
      upload.set('useUniqueFileName', 'true');
      const result = await api('https://upload.imagekit.io/api/v1/files/upload', {
        method: 'POST',
        body: upload,
      });
      if (!result.ok) throw new HttpError(502, 'Upload failed. Please try again.');
      const image = await result.json();
      if (
        !safeId(image.fileId) ||
        typeof image.filePath !== 'string' ||
        !image.filePath.startsWith(folder) ||
        !/^https:\/\//.test(image.url)
      )
        throw new HttpError(502, 'ImageKit returned incomplete image metadata.');
      return response({
        id: randomUUID(),
        provider: 'imagekit',
        url: image.url,
        fileId: image.fileId,
        filePath: image.filePath,
        width: image.width,
        height: image.height,
        size: file.size,
        mimeType: file.type,
      });
    } catch (error) {
      return response(
        {
          error:
            error instanceof HttpError
              ? error.message
              : 'Image service unavailable. Please try again.',
        },
        error instanceof HttpError ? error.status : 503,
      );
    }
  };
}
