import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  FiArrowLeft,
  FiArrowDown,
  FiArrowUp,
  FiChevronDown,
  FiExternalLink,
  FiPlus,
  FiStar,
  FiTrash2,
  FiX,
} from 'react-icons/fi';
import type { Restaurant, RestaurantDish, RestaurantOrderLink } from '@api/models';
import type { RestaurantEdit } from '@api/services/restaurants.service';
import { selectAuthUserId } from '@store/auth-store';
import { cleanupRestaurantImages } from '@api/services/restaurant-images.service';
import { BottomSheet } from '@shared/ui';
import { useRestaurants } from '../../features/restaurants/restaurants.provider';
import {
  RestaurantPhoto,
  RestaurantStatusActions,
} from '../../features/restaurants/restaurant-card.component';
import RestaurantInlineText from '../../features/restaurants/restaurant-inline-text.component';
import RestaurantImageManager from '../../features/restaurants/restaurant-image-manager.component';
import {
  externalRestaurantUrl,
  imageReferences,
} from '../../features/restaurants/restaurant-validation.utils';
import './restaurant-detail.styles.scss';

function OrderAction({ links }: { links: RestaurantOrderLink[] }) {
  const valid = links.filter((link) => externalRestaurantUrl(link.url));
  if (!valid.length) return null;
  const orderLink = (link: RestaurantOrderLink) => (
    <a
      className="restaurant-action"
      href={externalRestaurantUrl(link.url)!}
      target="_blank"
      rel="noopener noreferrer"
    >
      Order with {link.label || 'restaurant'} <FiExternalLink />
    </a>
  );
  if (valid.length === 1) return orderLink(valid[0]);
  return (
    <details className="notebook-order">
      <summary className="restaurant-action">
        Order <FiChevronDown />
      </summary>
      <div>
        {valid.map((link, index) => (
          <div key={link.id ?? index}>{orderLink(link)}</div>
        ))}
      </div>
    </details>
  );
}

function AddItem({
  kind,
  save,
}: {
  kind: 'dish' | 'link' | 'tag';
  save: (edit: RestaurantEdit) => Promise<Restaurant>;
}) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const stableId = useRef(crypto.randomUUID());
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;
    if (!name.trim()) {
      setError(kind === 'link' ? 'A service label is required.' : 'A name is required.');
      return;
    }
    if (kind === 'link' && !externalRestaurantUrl(url)) {
      setError('Use a complete http or https ordering URL.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await save(
        kind === 'tag'
          ? { kind: 'tag', tag: name.trim() }
          : kind === 'dish'
            ? {
                kind: 'addDish',
                dish: { id: stableId.current, name: name.trim(), notes: '', images: [] },
              }
            : {
                kind: 'addLink',
                link: { id: stableId.current, label: name.trim(), url: url.trim() },
              },
      );
      setName('');
      setUrl('');
      stableId.current = crypto.randomUUID();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save. Try again.');
    } finally {
      setSaving(false);
    }
  };
  return (
    <form className={`notebook-add notebook-add--${kind}`} onSubmit={submit} noValidate>
      <label>
        {kind === 'link' ? 'Service label' : kind === 'dish' ? 'New dish name' : 'New tag'}
        <input
          value={name}
          disabled={saving}
          maxLength={kind === 'tag' ? 60 : kind === 'link' ? 80 : 160}
          onChange={(event) => setName(event.target.value)}
        />
      </label>
      {kind === 'link' && (
        <label>
          Ordering URL
          <input
            type="url"
            value={url}
            disabled={saving}
            onChange={(event) => setUrl(event.target.value)}
          />
        </label>
      )}
      <button className="restaurant-action" disabled={saving} type="submit">
        <FiPlus />
        {saving ? 'Saving…' : `Add ${kind === 'link' ? 'ordering link' : kind}`}
      </button>
      {error && (
        <p className="restaurant-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

function Dish({
  dish,
  restaurant,
  index,
  count,
  save,
  remove,
}: {
  dish: RestaurantDish;
  restaurant: Restaurant;
  index: number;
  count: number;
  save: (edit: RestaurantEdit) => Promise<Restaurant>;
  remove: () => void;
}) {
  return (
    <section className="notebook-dish" aria-label={dish.name}>
      <div className="notebook-dish__images">
        <RestaurantImageManager restaurant={restaurant} dishId={dish.id} save={save} />
      </div>
      <div className="notebook-dish__body">
        <RestaurantInlineText
          label="Dish name"
          value={dish.name}
          heading="h3"
          maxLength={160}
          save={async (value, expected) =>
            (await save({ kind: 'dish', id: dish.id, field: 'name', value, expected })).dishes.find(
              (item) => item.id === dish.id,
            )!.name
          }
        />
        <RestaurantInlineText
          label="Dish notes"
          value={dish.notes ?? ''}
          multiline
          placeholder="No notes yet"
          save={async (value, expected) =>
            (
              await save({ kind: 'dish', id: dish.id, field: 'notes', value, expected })
            ).dishes.find((item) => item.id === dish.id)?.notes ?? ''
          }
        />
        <RestaurantInlineText
          label="Dish image URLs"
          value={dish.images.join('\n')}
          multiline
          compact
          save={async (value, expected) =>
            (
              await save({
                kind: 'dish',
                id: dish.id,
                field: 'images',
                value: imageReferences(value),
                expected: expected.split('\n').filter(Boolean),
              })
            ).dishes
              .find((item) => item.id === dish.id)
              ?.images.join('\n') ?? ''
          }
        />
        <div className="notebook-dish__tools">
          <button
            className="restaurant-icon"
            disabled={index === 0}
            title="Move dish up"
            aria-label={`Move ${dish.name} up`}
            onClick={() =>
              void save({ kind: 'moveDish', id: dish.id, direction: -1 }).catch(() => {})
            }
          >
            <FiArrowUp />
          </button>
          <button
            className="restaurant-icon"
            disabled={index === count - 1}
            title="Move dish down"
            aria-label={`Move ${dish.name} down`}
            onClick={() =>
              void save({ kind: 'moveDish', id: dish.id, direction: 1 }).catch(() => {})
            }
          >
            <FiArrowDown />
          </button>
          <button
            className="restaurant-icon"
            title="Remove dish"
            aria-label={`Remove ${dish.name}`}
            onClick={remove}
          >
            <FiTrash2 />
          </button>
        </div>
      </div>
    </section>
  );
}

export default function RestaurantDetail() {
  const { id = '' } = useParams();
  const uid = useSelector(selectAuthUserId);
  return <RestaurantNotebook key={`${uid}:${id}`} id={id} />;
}

function RestaurantNotebook({ id }: { id: string }) {
  const uid = useSelector(selectAuthUserId);
  const { read, items, edit, remove, pending, actionError } = useRestaurants();
  const location = useLocation();
  const navigate = useNavigate();
  const [loaded, setLoaded] = useState<Restaurant | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'missing'>('loading');
  const [attempt, setAttempt] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [saveError, setSaveError] = useState('');
  const [confirmation, setConfirmation] = useState<'restaurant' | RestaurantDish | null>(null);
  const [deleting, setDeleting] = useState(false);
  const alive = useRef(true);
  const linkIdentities = useRef<Array<{ key: string; link: RestaurantOrderLink }>>([]);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    let active = true;
    setStatus('loading');
    read(id).then(
      (item) => {
        if (active) {
          setLoaded(item);
          setStatus(item ? 'ready' : 'missing');
        }
      },
      () => {
        if (active) setStatus('error');
      },
    );
    return () => {
      active = false;
    };
  }, [id, read, attempt]);
  const restaurant = items.find((item) => item.id === id) ?? loaded;
  const origin =
    typeof location.state?.restaurantFrom === 'string' &&
    /^\/restaurants(?:\/library)?(?:\?.*)?$/.test(location.state.restaurantFrom)
      ? location.state.restaurantFrom
      : '/restaurants/library';
  const back = () => {
    if (location.state?.restaurantFrom && window.history.length > 1) navigate(-1);
    else navigate(origin, { replace: true });
  };
  const save = async (change: RestaurantEdit) => {
    setSaveError('');
    setFeedback('');
    try {
      const updated = await edit(id, change);
      if (alive.current) {
        setLoaded(updated);
        setFeedback('Saved');
      }
      return updated;
    } catch (cause) {
      if (cause instanceof Error && cause.name === 'RestaurantEditConflict') {
        try {
          const latest = await read(id);
          if (alive.current && latest) setLoaded(latest);
        } catch {}
      }
      if (
        alive.current &&
        (change.kind === 'moveDish' ||
          change.kind === 'removeDish' ||
          change.kind === 'removeLink' ||
          (change.kind === 'tag' && change.remove) ||
          (change.kind === 'field' && change.field === 'rating'))
      )
        setSaveError(cause instanceof Error ? cause.message : 'Could not save. Please try again.');
      throw cause;
    }
  };
  const field =
    (name: 'name' | 'cuisine' | 'category' | 'notes' | 'imageUrl') =>
    async (value: string, expected: string) =>
      (await save({ kind: 'field', field: name, value, expected }))[name] ?? '';
  const confirm = async () => {
    if (!confirmation || deleting) return;
    setDeleting(true);
    setSaveError('');
    try {
      if (confirmation === 'restaurant') {
        await remove(id);
        navigate(origin, { replace: true });
      } else {
        await save({ kind: 'removeDish', id: confirmation.id, expected: confirmation });
        if (uid) await cleanupRestaurantImages(uid, id, confirmation.photos ?? []);
        setConfirmation(null);
      }
    } catch (cause) {
      if (alive.current)
        setSaveError(cause instanceof Error ? cause.message : 'Could not remove. Try again.');
    } finally {
      if (alive.current) setDeleting(false);
    }
  };
  if (status !== 'ready' || !restaurant)
    return (
      <div className="restaurants-page notebook-state">
        <Link to="/restaurants/library" className="restaurant-action">
          <FiArrowLeft />
          Library
        </Link>
        {status === 'loading' ? (
          <p role="status">Loading restaurant…</p>
        ) : status === 'missing' ? (
          <>
            <h1>Restaurant not found</h1>
            <p>This notebook entry is no longer available.</p>
          </>
        ) : (
          <div role="alert">
            <h1>Your restaurant couldn't load.</h1>
            <button className="restaurant-action" onClick={() => setAttempt((value) => value + 1)}>
              Try again
            </button>
          </div>
        )}
      </div>
    );
  // Keep drafts mounted when a legacy link acquires its first stable server ID.
  const used = new Set<string>();
  const linkRows = restaurant.orderLinks.map((link) => {
    const candidates = linkIdentities.current.filter((entry) => !used.has(entry.key));
    const exact = candidates.find(
      (entry) =>
        (link.id && entry.link.id === link.id) ||
        (!link.id &&
          !entry.link.id &&
          entry.link.label === link.label &&
          entry.link.url === link.url),
    );
    const legacy = candidates.filter(
      (entry) => !entry.link.id && (entry.link.label === link.label || entry.link.url === link.url),
    );
    const key =
      exact?.key ?? (legacy.length === 1 ? legacy[0].key : (link.id ?? crypto.randomUUID()));
    used.add(key);
    return { key, link };
  });
  linkIdentities.current = linkRows;
  return (
    <article className="restaurants-page restaurant-notebook">
      <div className="notebook-topbar">
        <button className="restaurant-action" onClick={back}>
          <FiArrowLeft />
          Back
        </button>
        <OrderAction links={restaurant.orderLinks} />
      </div>
      <header
        className={`restaurant-notebook-hero${restaurant.imageUrl || restaurant.photos?.length ? '' : ' restaurant-notebook-hero--plain'}`}
      >
        {(restaurant.imageUrl || !!restaurant.photos?.length) && (
          <RestaurantPhoto restaurant={restaurant} eager />
        )}
        <div className="restaurant-notebook-hero__copy">
          <span className="restaurant-eyebrow">YOUR RESTAURANT NOTEBOOK</span>
          <RestaurantInlineText
            label="Restaurant name"
            heading="h1"
            maxLength={160}
            value={restaurant.name}
            save={field('name')}
          />
          <RestaurantStatusActions restaurant={restaurant} />
          <RestaurantInlineText
            label="Restaurant image URL"
            value={restaurant.imageUrl ?? ''}
            compact
            save={field('imageUrl')}
          />
        </div>
      </header>
      <div className="notebook-metadata">
        <section aria-label="Cuisine">
          <h2>Cuisine</h2>
          <RestaurantInlineText
            label="Cuisine"
            value={restaurant.cuisine ?? ''}
            save={field('cuisine')}
          />
        </section>
        <section aria-label="Category">
          <h2>Category</h2>
          <RestaurantInlineText
            label="Category"
            value={restaurant.category ?? ''}
            save={field('category')}
          />
        </section>
        <section aria-label="Overall rating">
          <h2>
            <FiStar />
            Overall rating
          </h2>
          <div className="notebook-rating">
            <select
              aria-label="Overall rating"
              disabled={pending.includes(id)}
              value={restaurant.rating ?? ''}
              onChange={(event) =>
                void save({
                  kind: 'field',
                  field: 'rating',
                  value: event.target.value === '' ? null : Number(event.target.value),
                  expected: restaurant.rating ?? null,
                }).catch(() => {})
              }
            >
              <option value="">Not rated</option>
              {Array.from({ length: 11 }, (_, i) => i / 2).map((value) => (
                <option value={value} key={value}>
                  {value} / 5
                </option>
              ))}
              {restaurant.rating !== undefined &&
                (restaurant.rating < 0 ||
                  restaurant.rating > 5 ||
                  (restaurant.rating * 2) % 1 !== 0) && (
                  <option value={restaurant.rating}>{restaurant.rating} (existing)</option>
                )}
            </select>
          </div>
        </section>
      </div>
      <section className="notebook-section" aria-label="Photo gallery">
        <h2>Gallery</h2>
        <RestaurantImageManager restaurant={restaurant} unified save={save} />
      </section>
      <section className="notebook-section" aria-label="General notes">
        <h2>Notes</h2>
        <RestaurantInlineText
          label="General notes"
          value={restaurant.notes ?? ''}
          multiline
          placeholder="No notes yet"
          save={field('notes')}
        />
      </section>
      <section className="notebook-section" aria-label="Tags">
        <h2>Tags</h2>
        <div className="notebook-tags">
          {restaurant.tags.map((tag, index) => (
            <span key={`${tag}-${index}`}>
              {tag}
              <button
                className="restaurant-icon"
                title={`Remove ${tag}`}
                aria-label={`Remove tag ${tag}`}
                disabled={pending.includes(id)}
                onClick={() => void save({ kind: 'tag', tag, remove: true }).catch(() => {})}
              >
                <FiX />
              </button>
            </span>
          ))}
        </div>
        <AddItem kind="tag" save={save} />
      </section>
      <section className="notebook-section" aria-label="Ordering links">
        <h2>Ordering links</h2>
        {linkRows.map(({ link, key }) => (
          <div className="notebook-link" key={key}>
            <RestaurantInlineText
              label="Service label"
              value={link.label}
              maxLength={80}
              save={async (value, expected) => {
                const result = await save({
                  kind: 'link',
                  target: link,
                  field: 'label',
                  value,
                  expected,
                });
                return (
                  result.orderLinks.find((entry) =>
                    link.id
                      ? entry.id === link.id
                      : entry.url === link.url && entry.label === value.trim(),
                  )?.label ?? value.trim()
                );
              }}
            />
            <RestaurantInlineText
              label="Ordering URL"
              value={link.url}
              save={async (value, expected) => {
                const result = await save({
                  kind: 'link',
                  target: link,
                  field: 'url',
                  value,
                  expected,
                });
                return (
                  result.orderLinks.find((entry) =>
                    link.id
                      ? entry.id === link.id
                      : entry.label === link.label && entry.url === value.trim(),
                  )?.url ?? value.trim()
                );
              }}
            />
            <button
              className="restaurant-icon"
              title="Remove ordering link"
              aria-label={`Remove ${link.label} ordering link`}
              disabled={pending.includes(id)}
              onClick={() => void save({ kind: 'removeLink', target: link }).catch(() => {})}
            >
              <FiTrash2 />
            </button>
          </div>
        ))}
        <AddItem kind="link" save={save} />
      </section>
      <section className="notebook-section" aria-label="Dishes">
        <h2>Dishes</h2>
        {restaurant.dishes.length ? (
          restaurant.dishes.map((dish, index) => (
            <Dish
              key={dish.id}
              dish={dish}
              restaurant={restaurant}
              index={index}
              count={restaurant.dishes.length}
              save={save}
              remove={() => {
                setSaveError('');
                setConfirmation(dish);
              }}
            />
          ))
        ) : (
          <p className="restaurant-muted">No dishes yet</p>
        )}
        <AddItem kind="dish" save={save} />
      </section>
      <footer className="notebook-history">
        <div>
          {restaurant.createdAt !== null && (
            <p>
              Created{' '}
              <time dateTime={new Date(restaurant.createdAt).toISOString()}>
                {new Date(restaurant.createdAt).toLocaleDateString()}
              </time>
            </p>
          )}
          {restaurant.updatedAt !== null && (
            <p>
              Last updated{' '}
              <time dateTime={new Date(restaurant.updatedAt).toISOString()}>
                {new Date(restaurant.updatedAt).toLocaleDateString()}
              </time>
            </p>
          )}
        </div>
        <button
          className="restaurant-action notebook-delete"
          disabled={pending.includes(id)}
          onClick={() => {
            setSaveError('');
            setConfirmation('restaurant');
          }}
        >
          <FiTrash2 />
          Delete restaurant
        </button>
      </footer>
      <div className="notebook-save-status" aria-live="polite">
        {pending.includes(id) ? 'Saving…' : feedback}
      </div>
      {(saveError || actionError) && (
        <p className="restaurant-error" role="alert">
          {saveError || actionError}
        </p>
      )}
      <BottomSheet
        open={!!confirmation}
        onOpenChange={(open) => {
          if (!open && !deleting) setConfirmation(null);
        }}
        title={confirmation === 'restaurant' ? 'Delete restaurant?' : 'Remove dish?'}
        className="restaurants-sheet"
        nonDismissable={deleting}
      >
        <div className="notebook-confirm">
          <p>
            {confirmation === 'restaurant'
              ? `Permanently delete ${restaurant.name} and its dishes?`
              : `Remove ${typeof confirmation === 'object' && confirmation ? confirmation.name : 'this dish'} and its notes and images?`}
          </p>
          {(confirmation === 'restaurant'
            ? restaurant.photos?.some((photo) => photo.provider === 'imagekit') ||
              restaurant.dishes.some((dish) =>
                dish.photos?.some((photo) => photo.provider === 'imagekit'),
              )
            : typeof confirmation === 'object' &&
              confirmation?.photos?.some((photo) => photo.provider === 'imagekit')) && (
            <p>
              Unreferenced uploaded files will be cleaned up after deletion. Failed cleanup can be
              retried in Settings.
            </p>
          )}
          <div>
            <button
              className="restaurant-action"
              disabled={deleting}
              onClick={() => setConfirmation(null)}
            >
              Cancel
            </button>
            <button
              className="restaurant-action notebook-delete"
              disabled={deleting}
              onClick={() => void confirm()}
            >
              <FiTrash2 />
              {deleting
                ? 'Removing…'
                : confirmation === 'restaurant'
                  ? 'Delete permanently'
                  : 'Remove dish'}
            </button>
          </div>
          {saveError && (
            <p role="alert" className="restaurant-error">
              {saveError}
            </p>
          )}
        </div>
      </BottomSheet>
    </article>
  );
}
