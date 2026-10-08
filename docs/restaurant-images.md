# Restaurant Images

## Configuration

The only new package is `firebase-admin` (server only). No ImageKit SDK or browser
compression dependency is required. Recipes and their models are unchanged.

Public build variable:

- `VITE_IMAGEKIT_URL_ENDPOINT`: the HTTPS delivery endpoint from ImageKit, e.g.
  `https://ik.imagekit.io/your_account`. Used only to generate responsive delivery
  URLs for managed photos. Uploads work without it, using original delivery URLs.

Private Netlify variables, with **Functions** scope:

- `IMAGEKIT_PRIVATE_KEY`: ImageKit private API key with upload, details/read, and
  delete permissions. Prefer a restricted key with only necessary media access.
- `FIREBASE_PROJECT_ID`: the existing Firebase project ID.
- `FIREBASE_SERVICE_ACCOUNT_JSON`: single-line service account JSON for that same
  project. Use a dedicated account with only the permissions needed to verify
  Firebase users/revocation and read Firestore restaurant documents.

Never prefix server credentials with `VITE_`, commit them, put them in
`netlify.toml`, or expose them to frontend code. `.env.example` contains placeholders.
No ImageKit public API key is needed: uploads are proxied, not signed client uploads.

## Local Development

Keep private values in a gitignored `.env` (read by Netlify Dev); existing Firebase
client values can stay in `.env.local`. With Netlify CLI installed, run `netlify dev` from the root
(or `npx netlify-cli dev`). Open `http://localhost:8888`, not Vite's underlying
port. Netlify runs Vite on 5173 and serves the function at
`/.netlify/functions/restaurant-images`. Free occupied ports first. Plain
`npm run dev` still works for the app but cannot perform real uploads.

Netlify deploys `dist` and bundles `netlify/functions/restaurant-images.ts` with
Firebase Admin externalized. Node 22 or newer is required. Existing SPA fallback
in `public/_redirects` remains unchanged. Verify function routing and secrets in a
Deploy Preview before enabling production uploads. No live upload was used in tests.

## Storage and Safety

Legacy `imageUrl` and dish `images: string[]` remain readable and editable.
Optional `photos` arrays on the restaurant/dishes hold each new photo once:
`id`, `url`, and managed `provider`, `fileId`, `filePath`, dimensions, MIME, and size.
The gallery merges those sources, deduplicating aliases within each association.
Image binaries are never stored in Firestore. References preserve original URLs
and metadata for a future export; delivery transformations are generated at render time.

The browser accepts JPEG/PNG/WebP up to 12 MiB, rejects images above 40 megapixels,
resizes to at most 1600px on the longest edge, and re-encodes as JPEG at quality
0.82 (lowered if necessary). Canvas re-encoding removes embedded EXIF metadata;
transparency is flattened onto white. Compressed files must be at most 2 MiB.
HEIC, SVG, GIF, and video are intentionally unsupported.

Each upload/removal carries a Firebase ID token. Firebase Admin verifies its
signature, audience/project, expiry, and revocation. The function reads the
restaurant and independently verifies ownership before any ImageKit operation.
Admin reads bypass Firestore rules, so explicit ownership checks are mandatory;
browser writes still go through existing owner-only Firestore rules.
The server bounds request/file size and checks JPEG/PNG/WebP MIME and magic bytes.
Paths/names are server-generated under `/food-hub/{verifiedUid}/{restaurantId}/`.
No client-chosen user ID, folder, filename, external upload URL, or private key
is accepted. Destructive operations inspect ImageKit's actual file path and recheck
the restaurant owner (if the record still exists) and remaining references before deletion.
After deletion, the actual ImageKit path proves which verified user uploaded the file.
The function scans Restaurant documents for matching file IDs or URLs, including
references in other restaurants/accounts, and fails closed if the check fails. Responses omit secrets.

Replacement uploads first, transactionally saves the new photo second, and only
then deletes the old file after explicit acknowledgment. Failed Firestore saves
retain the uploaded metadata so Retry does not upload another copy. Discarding a
pending uploaded file uses the protected cleanup endpoint. Removal detaches the
reference before deleting the managed file; failed cleanup has an explicit retry.
An external URL is only detached, never deleted remotely.

## Limits

ImageKit delivery URLs are public; Firebase authorization protects upload/manage
operations, not viewing the resulting URL. Do not upload sensitive/private photos.
Cached CDN copies may remain accessible briefly after ImageKit deletion.
Uploads pass through Netlify, so request bandwidth and function duration apply.
Progress measures transfer to Netlify, followed by a processing/saving state.
Thumbnails use a few fixed widths, automatic format, and quality 80; no expensive
AI transforms or eagerly generated variants are used.

There is no cross-service transaction, realtime gallery sync, or orphan sweeper.
Restaurant/dish deletion now cleans managed files after the Firestore operation
succeeds. Failed cleanup is stored locally under a user-scoped key and can be retried
in Settings; a notice also appears in Restaurants. Clearing browser storage removes
these tasks. The queue contains file metadata, never tokens. A lost upload response,
closing during a save, or an uncertain deletion response can still leave an orphan;
manual ImageKit cleanup may be needed. No Recipe image cleanup is performed.
Scanning all Restaurant documents is intentionally simple for a small notebook;
it incurs Firestore reads per cleanup and may need revisiting for a much larger app.
Removal ownership/reference checks reduce races but cannot make ImageKit and
Firestore atomic across concurrent devices. Actual ImageKit credentials, deployed
Firestore permissions, and Netlify function deployment require manual verification.

References: [ImageKit API authentication](https://imagekit.io/docs/api-keys),
[Firebase ID token verification](https://firebase.google.com/docs/auth/admin/verify-id-tokens),
[Netlify Functions](https://docs.netlify.com/build/functions/overview/).
Local environment loading: [Netlify environment variables](https://docs.netlify.com/build/configure-builds/environment-variables/).
