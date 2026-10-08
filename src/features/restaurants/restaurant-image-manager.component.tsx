import { useEffect, useRef, useState } from 'react';
import { FiUpload, FiRefreshCw, FiTrash2, FiX } from 'react-icons/fi';
import type { Restaurant, RestaurantImage } from '@api/models';
import type { RestaurantEdit } from '@api/services/restaurants.service';
import {
  prepareRestaurantImage,
  uploadRestaurantImage,
  deleteRestaurantImage,
} from '@api/services/restaurant-images.service';
import { BottomSheet } from '@shared/ui';
import { restaurantGallery, type GalleryImage } from './restaurant-images.utils';
import RestaurantGalleryViewer, { RestaurantImagePreview } from './restaurant-gallery.component';
import './restaurant-images.styles.scss';

export default function RestaurantImageManager({
  restaurant,
  dishId,
  unified = false,
  save,
}: {
  restaurant: Restaurant;
  dishId?: string;
  unified?: boolean;
  save: (edit: RestaurantEdit) => Promise<Restaurant>;
}) {
  const images = restaurantGallery(restaurant);
  const visible = unified ? images : images.filter((image) => image.dishId === dishId);
  const [selected, setSelected] = useState<string | null>(null);
  const [choice, setChoice] = useState<{ file: File; previous?: GalleryImage } | null>(null);
  const [preview, setPreview] = useState('');
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<
    'idle' | 'resizing' | 'uploading' | 'saving' | 'done' | 'error'
  >('idle');
  const [error, setError] = useState('');
  const [remove, setRemove] = useState<GalleryImage | null>(null);
  const [removing, setRemoving] = useState(false);
  const [cleanup, setCleanup] = useState<RestaurantImage[]>([]);
  const [cleaning, setCleaning] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [discard, setDiscard] = useState(false);
  const prepared = useRef<File | null>(null);
  const uploaded = useRef<RestaurantImage | null>(null);
  const replacement = useRef<GalleryImage | undefined>(undefined);
  const input = useRef<HTMLInputElement>(null);
  const active = useRef(true);
  const busy = ['resizing', 'uploading', 'saving'].includes(phase) || removing || cleaning;
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  useEffect(() => {
    if (!choice) {
      setPreview('');
      return;
    }
    const url = URL.createObjectURL(choice.file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [choice]);
  const clean = async (photo: RestaurantImage) => {
    if (photo.provider !== 'imagekit') return;
    try {
      await deleteRestaurantImage(restaurant.id, photo);
    } catch {
      if (active.current) {
        setCleanup((items) => [...items.filter((item) => item.fileId !== photo.fileId), photo]);
        setError('Notebook saved. Stored file cleanup failed; retry cleanup below.');
      }
    }
  };
  const upload = async () => {
    if (!choice || busy || (choice.previous?.provider === 'imagekit' && !acknowledged)) return;
    setError('');
    try {
      if (!prepared.current) {
        setPhase('resizing');
        prepared.current = await prepareRestaurantImage(choice.file);
      }
      if (!uploaded.current) {
        setPhase('uploading');
        uploaded.current = await uploadRestaurantImage(
          restaurant.id,
          prepared.current,
          (value) => {
            if (active.current) setProgress(value);
          },
          choice.previous?.dishId ?? dishId,
        );
      }
      if (!active.current) {
        await deleteRestaurantImage(restaurant.id, uploaded.current).catch(() => {});
        return;
      }
      setPhase('saving');
      const previous = choice.previous;
      await save({
        kind: 'photo',
        action: previous ? 'replace' : 'add',
        dishId: previous?.dishId ?? dishId,
        previous,
        photo: uploaded.current,
      });
      uploaded.current = null;
      prepared.current = null;
      setChoice(null);
      setPhase('done');
      if (previous) await clean(previous);
    } catch (cause) {
      if (active.current) {
        setPhase('error');
        setError(cause instanceof Error ? cause.message : 'Could not save this photo. Try again.');
      }
    }
  };
  const cancel = async () => {
    if (busy) return;
    setCleaning(true);
    try {
      if (uploaded.current) await deleteRestaurantImage(restaurant.id, uploaded.current);
      uploaded.current = null;
      prepared.current = null;
      setChoice(null);
      setPhase('idle');
      setError('');
      setDiscard(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not discard the upload. Try again.');
    } finally {
      setCleaning(false);
    }
  };
  const confirmRemove = async () => {
    if (!remove || removing) return;
    setRemoving(true);
    setError('');
    try {
      await save({ kind: 'photo', action: 'remove', dishId: remove.dishId, previous: remove });
      setRemove(null);
      await clean(remove);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not remove this photo.');
    } finally {
      setRemoving(false);
    }
  };
  return (
    <div
      className={`restaurant-image-manager${unified ? ' restaurant-image-manager--unified' : ''}`}
    >
      <div className="restaurant-gallery-grid">
        {visible.map((photo) => (
          <figure key={photo.key}>
            <button
              className="restaurant-gallery-open"
              aria-label={`View ${photo.context} photo`}
              onClick={() => setSelected(photo.key)}
            >
              <RestaurantImagePreview photo={photo} alt={photo.context} />
            </button>
            <figcaption>
              <span>{unified ? photo.context : ''}</span>
              <div>
                <button
                  className="restaurant-icon"
                  disabled={busy || !!choice}
                  aria-label={`Replace ${photo.context} photo`}
                  title="Replace photo"
                  onClick={() => {
                    replacement.current = photo;
                    input.current?.click();
                  }}
                >
                  <FiRefreshCw />
                </button>
                <button
                  className="restaurant-icon"
                  disabled={busy || !!choice}
                  aria-label={`Remove ${photo.context} photo`}
                  title="Remove photo"
                  onClick={() => setRemove(photo)}
                >
                  <FiTrash2 />
                </button>
              </div>
            </figcaption>
          </figure>
        ))}
      </div>
      <input
        className="restaurant-image-input"
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        aria-label={dishId ? 'Select dish photo' : 'Select restaurant photo'}
        disabled={busy || !!choice}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            prepared.current = null;
            uploaded.current = null;
            setChoice({ file, previous: replacement.current });
            setAcknowledged(false);
            setPhase('idle');
            setProgress(0);
            setError('');
          }
          event.target.value = '';
        }}
      />
      {!choice && (
        <button
          className="restaurant-action"
          disabled={busy}
          onClick={() => {
            replacement.current = undefined;
            input.current?.click();
          }}
        >
          <FiUpload />
          {dishId ? 'Add dish photo' : 'Add photo'}
        </button>
      )}
      {choice && (
        <div className="restaurant-upload">
          {preview && <img src={preview} alt="Selected photo preview" />}
          <p>{choice.previous ? `Replace ${choice.previous.context} photo` : 'New photo'}</p>
          {choice.previous?.provider === 'imagekit' && (
            <label className="restaurant-replace-confirm">
              <input
                type="checkbox"
                checked={acknowledged}
                disabled={busy}
                onChange={(event) => setAcknowledged(event.target.checked)}
              />
              Permanently delete the previous uploaded photo after the replacement is saved.
            </label>
          )}
          <div>
            <button
              className="restaurant-action"
              disabled={busy || (choice.previous?.provider === 'imagekit' && !acknowledged)}
              onClick={() => void upload()}
            >
              <FiUpload />
              {phase === 'error' ? 'Retry photo save' : 'Upload & Save'}
            </button>
            <button
              className="restaurant-icon"
              title="Discard selected photo"
              aria-label="Discard selected photo"
              disabled={busy}
              onClick={() => {
                if (uploaded.current) setDiscard(true);
                else void cancel();
              }}
            >
              <FiX />
            </button>
          </div>
        </div>
      )}
      <p role="status" className="restaurant-upload-status">
        {phase === 'resizing'
          ? 'Resizing photo…'
          : phase === 'uploading'
            ? progress < 90
              ? `Uploading ${progress}%`
              : 'Processing photo…'
            : phase === 'saving'
              ? 'Saving photo…'
              : phase === 'done'
                ? 'Photo saved'
                : ''}
      </p>
      {phase === 'uploading' && (
        <progress aria-label="Photo upload progress" max={100} value={progress} />
      )}
      {error && (
        <p role="alert" className="restaurant-error">
          {error}
        </p>
      )}
      {!!cleanup.length && (
        <button
          className="restaurant-action"
          disabled={busy}
          onClick={async () => {
            setCleaning(true);
            setError('');
            const failed: RestaurantImage[] = [];
            for (const photo of cleanup) {
              try {
                await deleteRestaurantImage(restaurant.id, photo);
              } catch {
                failed.push(photo);
              }
            }
            setCleanup(failed);
            if (failed.length) setError('File cleanup failed. Try again.');
            setCleaning(false);
          }}
        >
          <FiRefreshCw />
          Retry file cleanup
        </button>
      )}
      <RestaurantGalleryViewer
        images={images}
        selected={selected}
        close={() => setSelected(null)}
      />
      <BottomSheet
        open={discard}
        onOpenChange={(open) => {
          if (!cleaning) setDiscard(open);
        }}
        nonDismissable={cleaning}
        title="Discard uploaded photo?"
        className="restaurants-sheet"
      >
        <div className="notebook-confirm">
          <p>Permanently delete this unsaved uploaded photo? This cannot be undone.</p>
          <div>
            <button
              className="restaurant-action"
              disabled={cleaning}
              onClick={() => setDiscard(false)}
            >
              Cancel
            </button>
            <button
              className="restaurant-action notebook-delete"
              disabled={cleaning}
              onClick={() => void cancel()}
            >
              <FiTrash2 />
              Discard upload
            </button>
          </div>
          {error && (
            <p className="restaurant-error" role="alert">
              {error}
            </p>
          )}
        </div>
      </BottomSheet>
      <BottomSheet
        open={!!remove}
        onOpenChange={(open) => {
          if (!open && !removing) setRemove(null);
        }}
        nonDismissable={removing}
        title="Remove photo?"
        className="restaurants-sheet"
      >
        <div className="notebook-confirm">
          <p>
            {remove?.provider === 'imagekit'
              ? 'Permanently delete this uploaded photo? This cannot be undone.'
              : 'Remove this external photo reference? The original image will not be deleted.'}
          </p>
          <div>
            <button
              className="restaurant-action"
              disabled={removing}
              onClick={() => setRemove(null)}
            >
              Cancel
            </button>
            <button
              className="restaurant-action notebook-delete"
              disabled={removing}
              onClick={() => void confirmRemove()}
            >
              <FiTrash2 />
              Remove photo
            </button>
          </div>
          {error && (
            <p className="restaurant-error" role="alert">
              {error}
            </p>
          )}
        </div>
      </BottomSheet>
    </div>
  );
}
