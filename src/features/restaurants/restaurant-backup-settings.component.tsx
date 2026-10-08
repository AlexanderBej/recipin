import { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { FiDownload, FiUpload, FiRefreshCw, FiX } from 'react-icons/fi';
import { selectAuthUserId } from '@store/auth-store';
import type { Restaurant } from '@api/models';
import { listRestaurants } from '@api/services/restaurants.service';
import {
  applyRestaurantImport,
  previewRestaurantImport,
  type ImportRow,
  type ImportChoice,
} from '@api/services/restaurant-backup.service';
import { retryRestaurantImageCleanup } from '@api/services/restaurant-images.service';
import { imageCleanupTasks } from './restaurant-cleanup.queue';
import {
  ARCHIVE_LIMIT,
  exportRestaurantBackup,
  parseRestaurantBackup,
  type ParsedBackup,
} from './restaurant-backup';
import { normalizedRestaurantName } from './restaurant-collection.utils';
import './restaurant-backup-settings.styles.scss';

export default function RestaurantBackupSettings() {
  const uid = useSelector(selectAuthUserId);
  return uid ? <BackupSettings key={uid} uid={uid} /> : null;
}
function BackupSettings({ uid }: { uid: string }) {
  const alive = useRef(true);
  const [items, setItems] = useState<Restaurant[] | null>(null);
  const [backup, setBackup] = useState<ParsedBackup | null>(null);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [applied, setApplied] = useState(false);
  const [report, setReport] = useState<string[]>([]);
  const [pending, setPending] = useState(() => imageCleanupTasks(uid).length);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    let active = true;
    setItems(null);
    listRestaurants(uid).then(
      (value) => {
        if (active) {
          setItems(value);
          setError('');
        }
      },
      () => {
        if (active) setError('Could not load Restaurants. Retry before backing up or importing.');
      },
    );
    return () => {
      active = false;
    };
  }, [uid, attempt]);
  useEffect(() => {
    const update = () => setPending(imageCleanupTasks(uid).length);
    window.addEventListener('restaurant-cleanup-changed', update);
    return () => window.removeEventListener('restaurant-cleanup-changed', update);
  }, [uid]);
  const progress = (value: string) => {
    if (alive.current) setMessage(value);
  };
  const run = async (task: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await task();
    } catch (cause) {
      if (alive.current)
        setError(cause instanceof Error ? cause.message : 'Could not complete this action.');
    } finally {
      if (alive.current) setBusy(false);
    }
  };
  const download = () =>
    run(async () => {
      if (!items) return;
      const result = await exportRestaurantBackup(items, progress);
      if (!alive.current) return;
      const url = URL.createObjectURL(
        new Blob([new Uint8Array(result.bytes)], { type: 'application/zip' }),
      );
      const link = document.createElement('a');
      link.href = url;
      link.download = `food-hub-restaurants-${new Date().toISOString().slice(0, 10)}.zip`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      const failures = result.manifest.images.filter((image) => image.error);
      setReport(
        failures.map(
          (image) =>
            `${items.find((item) => item.id === image.restaurantId)?.name}: ${image.dishId ?? 'Restaurant'} photo - ${image.error} Original URL retained.`,
        ),
      );
      setMessage(
        `Backup downloaded: ${items.length} restaurants, ${result.manifest.images.length - failures.length} image associations backed up, ${failures.length} unavailable.`,
      );
    });
  const preview = (file: File) =>
    run(async () => {
      if (!items) return;
      if (!file.size || file.size > ARCHIVE_LIMIT)
        throw new Error('Choose a Food Hub ZIP smaller than 64 MB.');
      const parsed = parseRestaurantBackup(new Uint8Array(await file.arrayBuffer()));
      if (!alive.current) return;
      setBackup(parsed);
      setRows(previewRestaurantImport(parsed, items));
      setApplied(false);
      setConfirmed(false);
      setReport(
        parsed.manifest.images
          .filter((image) => !image.path)
          .map(
            (image) =>
              `${parsed.manifest.restaurants.find((record) => record.id === image.restaurantId)?.name}: ${image.dishId ?? 'Restaurant'} photo has no binary (${image.error ?? 'URL only'}). Original URL retained.`,
          ),
      );
      setMessage(
        `Preview: ${parsed.manifest.restaurants.length} restaurants. No changes have been applied.`,
      );
    });
  const change = (index: number, choice: ImportChoice, target?: string) => {
    setConfirmed(false);
    setRows((current) =>
      current.map((row, position) =>
        position === index
          ? {
              ...row,
              choice,
              targetId: target ?? (choice === 'update' ? row.matches[0].id : crypto.randomUUID()),
            }
          : row,
      ),
    );
  };
  const apply = () =>
    run(async () => {
      if (!backup || (!applied && !confirmed)) return;
      const result = await applyRestaurantImport(uid, backup, rows, progress);
      if (!alive.current) return;
      setRows(result);
      setApplied(true);
      const newCount = result.filter((row) => row.saved && row.choice === 'keep').length;
      const updated = result.filter((row) => row.saved && row.choice === 'update').length;
      const skipped = result.filter((row) => row.choice === 'skip').length;
      const failures = result.flatMap((row) => [
        ...(row.error ? [`${row.record.name}: ${row.error}`] : []),
        ...row.imageErrors.map((error) => `${row.record.name}: ${error}`),
      ]);
      const urlOnly = backup.manifest.images.filter((image) => !image.path);
      setReport([
        ...failures,
        ...urlOnly.map(
          (image) =>
            `${backup.manifest.restaurants.find((record) => record.id === image.restaurantId)?.name}: photo has no backup binary; original URL retained.`,
        ),
      ]);
      setMessage(
        `${newCount} new, ${updated} updated, ${skipped} skipped. ${failures.length} failures, ${urlOnly.length} URL-only photos. Saved records are retained.`,
      );
      setAttempt((value) => value + 1);
    });
  const needsRetry = rows.some((row) => row.error || row.imageErrors.length);
  return (
    <section className="restaurant-backup-settings" aria-label="Restaurants data">
      <h2>Restaurants data</h2>
      <div className="restaurant-backup-settings__actions">
        <button disabled={busy || !items} onClick={download}>
          <FiDownload />
          Export ZIP
        </button>
        <label className={busy || !items ? 'is-disabled' : ''}>
          <FiUpload />
          Import ZIP
          <input
            aria-label="Import Restaurants ZIP"
            type="file"
            accept=".zip,application/zip"
            disabled={busy || !items}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (file) void preview(file);
            }}
          />
        </label>
        {!items && !busy && (
          <button onClick={() => setAttempt((value) => value + 1)}>
            <FiRefreshCw />
            Reload
          </button>
        )}
      </div>
      <p className="restaurant-backup-settings__note">
        Up to 200 restaurants and 511 photo associations per backup. Unavailable photos retain their
        original URLs.
      </p>
      {backup && (
        <div className="restaurant-backup-settings__preview">
          <div className="restaurant-backup-settings__heading">
            <h3>Import preview</h3>
            <button
              aria-label="Close import preview"
              title="Close import preview"
              disabled={busy || rows.some((row) => row.pendingUpload)}
              onClick={() => {
                setBackup(null);
                setRows([]);
              }}
            >
              <FiX />
            </button>
          </div>
          {rows.map((row, index) => (
            <div className="restaurant-backup-settings__row" key={row.record.id}>
              <div>
                <strong>{row.record.name}</strong>
                <small>
                  {row.record.dishes.length} dishes ·{' '}
                  {
                    backup.manifest.images.filter((image) => image.restaurantId === row.record.id)
                      .length
                  }{' '}
                  photos{row.matches.length ? ` · ${row.matches.length} existing name matches` : ''}
                  {rows.some(
                    (other, position) =>
                      position !== index &&
                      normalizedRestaurantName(other.record.name) ===
                        normalizedRestaurantName(row.record.name),
                  )
                    ? ' · repeated name in backup'
                    : ''}
                  {row.saved ? ' · Saved' : ''}
                </small>
              </div>
              <label>
                Action
                <select
                  aria-label={`Import action for ${row.record.name}`}
                  disabled={busy || applied}
                  value={row.choice}
                  onChange={(event) => change(index, event.target.value as ImportChoice)}
                >
                  <option value="skip">Skip</option>
                  {row.matches.length > 0 && <option value="update">Update Existing</option>}
                  <option value="keep">{row.matches.length ? 'Keep Both' : 'Add New'}</option>
                </select>
              </label>
              {row.choice === 'update' && row.matches.length > 1 && (
                <label>
                  Destination
                  <select
                    disabled={busy || applied}
                    value={row.targetId}
                    onChange={(event) => change(index, 'update', event.target.value)}
                  >
                    {row.matches.map((match) => (
                      <option value={match.id} key={match.id}>
                        {match.name} ({match.id})
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          ))}
          <p className="restaurant-backup-settings__note">
            Updates replace supplied text and status fields, merge dishes and photos, and retain
            unrelated existing fields. Photos are uploaded to your account; failed restorations
            retain original URLs.
          </p>
          {!applied && (
            <label className="restaurant-backup-settings__confirm">
              <input
                type="checkbox"
                checked={confirmed}
                disabled={busy}
                onChange={(event) => setConfirmed(event.target.checked)}
              />
              Confirm these Restaurant changes
            </label>
          )}
          {(!applied || needsRetry) && (
            <button disabled={busy || (!applied && !confirmed)} onClick={apply}>
              {applied ? <FiRefreshCw /> : <FiUpload />}
              {applied ? 'Retry failed items' : 'Apply import'}
            </button>
          )}
        </div>
      )}
      {pending > 0 && (
        <div role="status" className="restaurant-backup-settings__cleanup">
          <p>
            {pending} uploaded {pending === 1 ? 'file awaits' : 'files await'} cleanup. Restaurant
            changes are already saved.
          </p>
          <button
            disabled={busy}
            onClick={() =>
              run(async () => {
                const count = await retryRestaurantImageCleanup(uid);
                if (alive.current)
                  setMessage(
                    count
                      ? `${count} files still await cleanup. They may still be referenced, or the image service is unavailable.`
                      : 'File cleanup complete.',
                  );
              })
            }
          >
            <FiRefreshCw />
            Retry image cleanup
          </button>
        </div>
      )}
      {message && <p role="status">{message}</p>}
      {error && <p role="alert">{error}</p>}
      {report.length > 0 && (
        <details open>
          <summary>Backup / restore report ({report.length})</summary>
          <ul>
            {report.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
