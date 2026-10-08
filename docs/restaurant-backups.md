# Restaurant Backups and Cleanup

Settings (`/profile`) has a Restaurants data section. The existing Recipe bulk
import is unchanged. The only Phase 2.4 dependency is `fflate` for ZIP reading/writing.
No new credentials, collections, rules, or background service are introduced.

## Format

Version 1 uses `manifest.json` and `images/photo-N.jpg|png|webp`. Entries are stored
without ZIP compression because photos are already compressed. Do not recompress
the archive: import intentionally rejects compressed/encrypted/ZIP64/multipart ZIPs.
This prevents decompression bombs without a complex streaming extraction service.

The manifest identifies `food-hub-restaurants`, version, export time, known Restaurant
fields, nested dishes, and image associations (`restaurantId`, optional `dishId`,
`photoId`, original `url`, optional binary `path`, MIME, download error).
Managed metadata is exported for identification, but imported files get new ownership
and fresh ImageKit metadata. Original owner IDs and unknown fields are not exported;
an explicit schema whitelist avoids accidentally exporting secrets.

Binaries are deduplicated by original URL in the archive. Associations are not
deduplicated across dishes/restaurants. Export fetches images in the browser without
authentication headers, cookies, or referrer. CORS, unavailable URLs, size/type limits,
and timeouts are reported; the original reference always remains in the manifest.
Backups contain personal notes and public image URLs; store them privately.

Limits: 64 MiB archive/declared total, 512 entries, 1 MiB manifest, 12 MiB per image,
200 restaurants, 511 photo associations, 200 items per nested list, 20,000-character
notes, 160-character names. ZIP paths, local/central headers, boundaries, checksums,
duplicate IDs/paths, HTTP(S) references, image signatures/types and associations are
checked before applying anything. Only this application's own version-1 format is supported.

## Import

Preview normalizes names (Unicode NFKC, whitespace, case). Existing matches default
to Skip; each row can Update Existing or Keep Both. Multiple existing matches have
an explicit destination selector. Duplicate names within the backup are flagged;
they are not silently combined. If two rows update the same destination, the second
stale preview is rejected. Confirm changes before applying them.

New records get new IDs and the signed-in UID; stable dish IDs and creation times
are retained. Updates keep their existing restaurant ID/creation time and check
the original preview snapshot in a Firestore transaction. Supplied text/status fields
are replaced; unrelated root properties and nested dishes/links/photos remain.
Photos merge by URL, avoiding reuse of imported foreign managed-file credentials.
Missing optional fields do not clear existing values. Review the preview carefully.

Binary images are resized and uploaded through the existing Firebase-token-protected
Netlify function after their record exists. Original remote references are never
fetched during import; only ZIP image bytes are uploaded. Restoration replaces the
matching source association, then cleans up the old managed file if unreferenced.
Failed restores retain the record and original URL and appear in the report.

Retry failed items retains successful record and image steps while the preview is
open. Uploaded-but-unsaved metadata is retained for retry and also queued for safe
cleanup if the preview is abandoned. Reloading loses the in-memory import journal;
re-preview to detect already saved records before trying again. An uncertain record
write response may need re-preview rather than automatic retry. Never expect an
all-or-nothing transaction across Firebase and ImageKit.

## Cleanup

Successful photo/dish/restaurant changes detach references first. Cleanup only deletes
managed files with a verified Firebase token, an actual ImageKit path belonging to
that UID/restaurant, and no matching file ID/URL in any remaining Restaurant record.
Failures survive browser reload in a UID-scoped localStorage queue; Settings offers
explicit retry. External URL images are never remotely deleted.

No scheduler, sweeping service, or cross-device retry synchronization is added.
Cross-service races and lost upload responses cannot be eliminated. ImageKit CDN
copies may outlive deletion. A queued file still referenced anywhere is deliberately
not deleted. Clearing localStorage clears retry tasks. Deployment requires the same
Phase 2.3 private credentials, with Firestore Restaurant collection read access for
the reference scan; verify those permissions in a Netlify Deploy Preview.

Automated/browser verification uses mocked services only, never live fixture writes.

## Phase 2.4 File Inventory

New files:

- `src/features/restaurants/restaurant-random-picker.component.tsx`
- `src/features/restaurants/restaurant-random-picker.styles.scss`
- `src/features/restaurants/restaurant-random-picker.test.tsx`
- `src/features/restaurants/restaurant-backup.ts`
- `src/features/restaurants/restaurant-backup.test.ts`
- `src/features/restaurants/restaurant-backup-settings.component.tsx`
- `src/features/restaurants/restaurant-backup-settings.styles.scss`
- `src/features/restaurants/restaurant-backup-settings.test.tsx`
- `src/features/restaurants/restaurant-cleanup.queue.ts`
- `src/features/restaurants/restaurant-cleanup.queue.test.ts`
- `src/features/restaurants/restaurant-cleanup-status.component.tsx`
- `src/api/services/restaurant-backup.service.ts`
- `src/api/services/restaurant-backup.service.test.ts`
- `docs/restaurant-backups.md`

Updated files (existing Phase 2.1-2.3 work preserved):

- `src/features/restaurants/restaurants.provider.tsx`
- `src/api/services/restaurants.service.ts`
- `src/api/services/restaurant-editing.service.test.ts`
- `src/api/services/restaurant-images.service.ts`
- `src/pages/restaurants/restaurants-discovery.component.tsx`
- `src/pages/restaurants/restaurant-detail.component.tsx`
- `src/pages/restaurants/restaurant-detail.test.tsx`
- `src/pages/profile/profile.component.tsx`
- `netlify/lib/restaurant-images.ts`
- `netlify/lib/restaurant-images.test.ts`
- `netlify/functions/restaurant-images.ts`
- `docs/restaurant-images.md`
- `package.json`
- `package-lock.json`
