import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import type { Restaurant } from '@api/models';
import { selectAuthUserId } from '@store/auth-store';
import {
  listRestaurants,
  createRestaurant,
  updateRestaurantStatus,
  editRestaurant,
  deleteRestaurant,
  getRestaurant,
  type RestaurantEdit,
} from '@api/services/restaurants.service';
import RestaurantQuickAdd from './restaurant-quick-add.component';
import { cleanupRestaurantImages } from '@api/services/restaurant-images.service';
import RestaurantCleanupStatus from './restaurant-cleanup-status.component';
import { queueImageCleanup } from './restaurant-cleanup.queue';
import './restaurants.styles.scss';

type Collection = { ownerId: string; items: Restaurant[]; status: 'loading' | 'ready' | 'error' };
type RestaurantsContextValue = {
  items: Restaurant[];
  status: Collection['status'];
  retry: () => void;
  quickAdd: () => void;
  openRestaurant: (id: string) => void;
  sync: (item: Restaurant) => void;
  edit: (id: string, edit: RestaurantEdit) => Promise<Restaurant>;
  remove: (id: string) => Promise<void>;
  read: (id: string) => Promise<Restaurant | null>;
  add: (name: string) => Promise<Restaurant>;
  toggle: (item: Restaurant, field: 'favorite' | 'blacklisted') => Promise<void>;
  pending: string[];
  actionError: string;
};
const RestaurantsContext = createContext<RestaurantsContextValue | null>(null);
export function useRestaurants() {
  const value = useContext(RestaurantsContext);
  if (!value) throw new Error('Restaurants needs its world provider.');
  return value;
}

export default function RestaurantsProvider({ children }: { children: ReactNode }) {
  const uid = useSelector(selectAuthUserId);
  const navigate = useNavigate();
  const location = useLocation();
  const currentUid = useRef(uid);
  currentUid.current = uid;
  const request = useRef(0);
  const busy = useRef(new Set<string>());
  const queues = useRef(new Map<string, Promise<unknown>>());
  const touched = useRef(new Set<string>());
  const [collection, setCollection] = useState<Collection>({
    ownerId: '',
    items: [],
    status: 'loading',
  });
  const [attempt, setAttempt] = useState(0);
  const [adding, setAdding] = useState(false);
  const [pending, setPending] = useState<string[]>([]);
  const [actionError, setActionError] = useState('');
  useEffect(() => {
    const token = ++request.current;
    setAdding(false);
    setActionError('');
    busy.current.clear();
    queues.current.clear();
    touched.current.clear();
    setPending([]);
    setCollection({ ownerId: uid ?? '', items: [], status: 'loading' });
    if (uid)
      listRestaurants(uid).then(
        (items) => {
          if (request.current === token)
            setCollection((current) => ({
              ownerId: uid,
              items: [
                ...current.items.filter((item) => touched.current.has(item.id)),
                ...items.filter((item) => item.authorId === uid && !touched.current.has(item.id)),
              ],
              status: 'ready',
            }));
        },
        () => {
          if (request.current === token)
            setCollection((current) => ({ ...current, ownerId: uid, status: 'error' }));
        },
      );
    return () => {
      request.current = token + 1;
    };
  }, [uid, attempt]);
  const items = collection.ownerId === uid ? collection.items : [];
  const status = collection.ownerId === uid ? collection.status : 'loading';
  const openRestaurant = (id: string) => {
    setAdding(false);
    const from = location.pathname.startsWith('/restaurant/')
      ? location.state?.restaurantFrom
      : location.pathname + location.search;
    navigate(`/restaurant/${id}`, { state: { restaurantFrom: from } });
  };
  const sync = useCallback((item: Restaurant) => {
    if (item.authorId !== currentUid.current) return;
    touched.current.add(item.id);
    setCollection((current) => ({
      ...current,
      ownerId: item.authorId,
      items: [item, ...current.items.filter((entry) => entry.id !== item.id)],
    }));
  }, []);
  const read = useCallback(
    async (id: string) => {
      if (!uid) throw new Error('Please sign in again.');
      await queues.current.get(id)?.catch(() => {});
      if (currentUid.current !== uid) throw new Error('Your session changed.');
      const token = request.current;
      const item = await getRestaurant(uid, id);
      if (currentUid.current !== uid || request.current !== token)
        throw new Error('Your session changed.');
      if (item) sync(item);
      return item;
    },
    [uid, sync],
  );
  const write = async <T,>(id: string, task: () => Promise<T>): Promise<T> => {
    if (!uid) throw new Error('Please sign in again.');
    const token = request.current;
    const previous = queues.current.get(id) ?? Promise.resolve();
    const operation = previous
      .catch(() => {})
      .then(async () => {
        if (currentUid.current !== uid || request.current !== token)
          throw new Error('Your session changed.');
        return task();
      });
    queues.current.set(id, operation);
    busy.current.add(id);
    setPending([...busy.current]);
    try {
      return await operation;
    } finally {
      if (request.current === token && queues.current.get(id) === operation) {
        queues.current.delete(id);
        busy.current.delete(id);
        setPending([...busy.current]);
      }
    }
  };
  const edit = (id: string, change: RestaurantEdit) =>
    write(id, async () => {
      const token = request.current;
      const updated = await editRestaurant(uid!, id, change);
      if (currentUid.current !== uid || request.current !== token)
        throw new Error('Your session changed.');
      sync(updated);
      return updated;
    });
  const remove = (id: string) =>
    write(id, async () => {
      const token = request.current;
      const deleted = await deleteRestaurant(uid!, id);
      const snapshot = deleted ?? items.find((item) => item.id === id && item.authorId === uid);
      const photos = snapshot
        ? [...(snapshot.photos ?? []), ...snapshot.dishes.flatMap((dish) => dish.photos ?? [])]
        : [];
      for (const photo of photos) queueImageCleanup(uid!, id, photo);
      if (currentUid.current !== uid || request.current !== token)
        throw new Error('Your session changed.');
      touched.current.add(id);
      setCollection((current) => ({
        ...current,
        items: current.items.filter((item) => item.id !== id),
      }));
      await cleanupRestaurantImages(uid!, id, photos);
    });
  const add = async (name: string) => {
    if (!uid || status !== 'ready') throw new Error('Wait for your notebook to load.');
    const token = request.current;
    const item = await createRestaurant(uid, name);
    if (currentUid.current !== uid || request.current !== token)
      throw new Error('Your session changed.');
    sync(item);
    return item;
  };
  const toggle = async (item: Restaurant, field: 'favorite' | 'blacklisted') => {
    if (!uid || item.authorId !== uid || busy.current.has(item.id)) return;
    const token = request.current;
    setActionError('');
    try {
      await write(item.id, async () => {
        const updated = await updateRestaurantStatus(uid, item.id, { [field]: !item[field] });
        if (currentUid.current === uid && request.current === token) sync(updated);
      });
    } catch {
      if (currentUid.current === uid && request.current === token)
        setActionError('Could not save this change. Please try again.');
    }
  };
  return (
    <RestaurantsContext.Provider
      value={{
        items,
        status,
        retry: () => setAttempt((value) => value + 1),
        quickAdd: () => setAdding(true),
        openRestaurant,
        sync,
        edit,
        remove,
        read,
        add,
        toggle,
        pending,
        actionError,
      }}
    >
      {children}
      {uid && <RestaurantCleanupStatus uid={uid} />}
      <RestaurantQuickAdd open={adding} onOpenChange={setAdding} />
    </RestaurantsContext.Provider>
  );
}
