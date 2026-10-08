import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { Restaurant } from '@api/models';
import {
  getRestaurant,
  listRestaurants,
  editRestaurant,
  updateRestaurantStatus,
  deleteRestaurant,
  createRestaurant,
} from '@api/services/restaurants.service';
import authReducer, { userSignedIn } from '@store/auth-store/auth.slice';
import RestaurantsProvider from '../../features/restaurants/restaurants.provider';
import RestaurantDetail from './restaurant-detail.component';
import { cleanupRestaurantImages } from '@api/services/restaurant-images.service';
import RestaurantsLibrary from './restaurants-library.component';
import {
  externalRestaurantUrl,
  imageReferences,
} from '../../features/restaurants/restaurant-validation.utils';

vi.mock('@api/services/restaurants.service', () => ({
  getRestaurant: vi.fn(),
  listRestaurants: vi.fn(),
  editRestaurant: vi.fn(),
  updateRestaurantStatus: vi.fn(),
  deleteRestaurant: vi.fn(),
  createRestaurant: vi.fn(),
}));
vi.mock('@api/services/restaurant-images.service', async (original) => ({
  ...(await original<typeof import('@api/services/restaurant-images.service')>()),
  cleanupRestaurantImages: vi.fn().mockResolvedValue(undefined),
}));
let record: Restaurant;
const base = (): Restaurant => ({
  id: 'cafe',
  authorId: 'owner',
  name: 'Cafe Verde',
  cuisine: 'Italian',
  notes: 'A good table.',
  tags: ['cozy'],
  favorite: false,
  blacklisted: false,
  dishes: [{ id: 'soup', name: 'Soup', notes: 'Good', images: [] }],
  orderLinks: [],
  createdAt: 1000,
  updatedAt: 2000,
});
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(cleanupRestaurantImages).mockResolvedValue(undefined);
  localStorage.clear();
  record = base();
  vi.mocked(getRestaurant).mockImplementation(async () => structuredClone(record));
  vi.mocked(listRestaurants).mockImplementation(async () => [structuredClone(record)]);
  vi.mocked(createRestaurant).mockImplementation(async (_uid, name) => {
    record = { ...base(), id: 'new', name: name.trim() };
    return structuredClone(record);
  });
  vi.mocked(deleteRestaurant).mockResolvedValue(undefined);
  vi.mocked(updateRestaurantStatus).mockImplementation(async (_uid, _id, changes) => {
    record = { ...record, ...changes };
    return structuredClone(record);
  });
  vi.mocked(editRestaurant).mockImplementation(async (_uid, _id, change) => {
    if (change.kind === 'field') {
      if (change.field === 'name' && !String(change.value).trim())
        throw new Error('A name is required.');
      if (
        change.field === 'imageUrl' &&
        change.value &&
        !externalRestaurantUrl(String(change.value))
      )
        throw new Error('Use a complete http or https image URL.');
      record = {
        ...record,
        [change.field]:
          change.value === null
            ? undefined
            : typeof change.value === 'string' && change.field === 'name'
              ? change.value.trim()
              : change.value,
      };
    }
    if (change.kind === 'tag')
      record.tags = change.remove
        ? record.tags.filter((tag) => tag !== change.tag)
        : [...record.tags, change.tag];
    if (change.kind === 'addDish') record.dishes = [...record.dishes, change.dish];
    if (change.kind === 'dish')
      record.dishes = record.dishes.map((dish) =>
        dish.id === change.id ? { ...dish, [change.field]: change.value } : dish,
      );
    if (change.kind === 'removeDish')
      record.dishes = record.dishes.filter((dish) => dish.id !== change.id);
    if (change.kind === 'moveDish') {
      const index = record.dishes.findIndex((dish) => dish.id === change.id);
      const next = index + change.direction;
      [record.dishes[index], record.dishes[next]] = [record.dishes[next], record.dishes[index]];
    }
    if (change.kind === 'addLink') record.orderLinks = [...record.orderLinks, change.link];
    if (change.kind === 'link') {
      if (change.field === 'url' && !externalRestaurantUrl(change.value))
        throw new Error('Use a complete http or https ordering URL.');
      record.orderLinks = record.orderLinks.map((link) =>
        (
          change.target.id
            ? link.id === change.target.id
            : link.label === change.target.label && link.url === change.target.url
        )
          ? { ...link, id: link.id ?? 'upgraded-link', [change.field]: change.value }
          : link,
      );
    }
    if (change.kind === 'removeLink')
      record.orderLinks = record.orderLinks.filter((link) => link.id !== change.target.id);
    record.updatedAt = 3000;
    return structuredClone(record);
  });
});
function setup(path = '/restaurant/cafe') {
  const store = configureStore({ reducer: { auth: authReducer } });
  store.dispatch(
    userSignedIn({ uid: 'owner', displayName: null, email: null, photoURL: null, createdAt: '' }),
  );
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[path]}>
        <RestaurantsProvider>
          <Routes>
            <Route path="/restaurant/:id" element={<RestaurantDetail />} />
            <Route path="/restaurants/library" element={<RestaurantsLibrary />} />
          </Routes>
        </RestaurantsProvider>
      </MemoryRouter>
    </Provider>,
  );
}
async function loaded() {
  await screen.findByRole('heading', { name: record.name, level: 1 });
}
async function changeField(label: string, value: string, blur = false, root = screen) {
  fireEvent.click(root.getByRole('button', { name: `Edit ${label.toLowerCase()}` }));
  const input = root.getByRole('textbox', { name: label });
  fireEvent.change(input, { target: { value } });
  if (blur) fireEvent.blur(input);
  else fireEvent.click(root.getByRole('button', { name: `Save ${label.toLowerCase()}` }));
  await waitFor(() => expect(editRestaurant).toHaveBeenCalled());
  await waitFor(() => expect(root.queryAllByText('Saving…')).toHaveLength(0));
}
test('direct details load independently with dates, notes, and nested dishes', async () => {
  setup();
  expect(screen.getByRole('status')).toHaveTextContent('Loading restaurant');
  await loaded();
  expect(getRestaurant).toHaveBeenCalledWith('owner', 'cafe');
  expect(screen.getByRole('region', { name: 'General notes' })).toHaveTextContent('A good table.');
  expect(screen.getByRole('region', { name: 'Soup' })).toBeInTheDocument();
  expect(screen.getByText(/Created/)).toBeInTheDocument();
  expect(screen.getByText(/Last updated/)).toBeInTheDocument();
});
test('name-only records expose optional editing without a fake Order action', async () => {
  record = {
    ...base(),
    cuisine: undefined,
    notes: undefined,
    dishes: [],
    tags: [],
    createdAt: null,
    updatedAt: null,
  };
  setup();
  await loaded();
  expect(screen.getByText('No notes yet')).toBeInTheDocument();
  expect(screen.getByText('No dishes yet')).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /Order with/ })).not.toBeInTheDocument();
});
test('not-found and failed direct reads offer safe return and retry', async () => {
  vi.mocked(getRestaurant).mockResolvedValueOnce(null);
  const first = setup('/restaurant/missing');
  expect(await screen.findByRole('heading', { name: 'Restaurant not found' })).toBeInTheDocument();
  first.unmount();
  vi.mocked(getRestaurant).mockRejectedValueOnce(new Error('Denied'));
  setup();
  expect(await screen.findByRole('alert')).toHaveTextContent("couldn't load");
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  await loaded();
});
test('rename saves a narrow field edit and optional text saves on blur', async () => {
  setup();
  await loaded();
  await changeField('Restaurant name', 'New Cafe');
  expect(editRestaurant).toHaveBeenCalledWith('owner', 'cafe', {
    kind: 'field',
    field: 'name',
    value: 'New Cafe',
    expected: 'Cafe Verde',
  });
  await changeField('Cuisine', 'French', true);
  expect(record.cuisine).toBe('French');
  await changeField('General notes', 'New notes\nSecond line', true);
  expect(record.notes).toBe('New notes\nSecond line');
});
test('save failure preserves text and Retry save succeeds without reopening the field', async () => {
  vi.mocked(editRestaurant).mockRejectedValueOnce(new Error('Offline'));
  setup();
  await loaded();
  fireEvent.click(screen.getByRole('button', { name: 'Edit general notes' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'General notes' }), {
    target: { value: 'Unsaved notes' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save general notes' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Offline');
  expect(screen.getByRole('textbox', { name: 'General notes' })).toHaveValue('Unsaved notes');
  fireEvent.click(screen.getByRole('button', { name: 'Retry save' }));
  await waitFor(() => expect(record.notes).toBe('Unsaved notes'));
});
test('empty rename is rejected without losing the invalid draft', async () => {
  setup();
  await loaded();
  await changeField('Restaurant name', ' ');
  expect(screen.getByRole('alert')).toHaveTextContent('name is required');
  expect(screen.getByLabelText('Restaurant name')).toHaveValue(' ');
});
test('a late text save cannot overwrite newer input and queued blur saves the latest text', async () => {
  let resolve!: (item: Restaurant) => void;
  vi.mocked(editRestaurant).mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  setup();
  await loaded();
  fireEvent.click(screen.getByRole('button', { name: 'Edit general notes' }));
  const input = screen.getByRole('textbox', { name: 'General notes' });
  fireEvent.change(input, { target: { value: 'First' } });
  fireEvent.blur(input);
  await waitFor(() => expect(editRestaurant).toHaveBeenCalledOnce());
  fireEvent.change(input, { target: { value: 'Newer' } });
  fireEvent.blur(input);
  await act(async () => {
    record = { ...record, notes: 'First' };
    resolve(structuredClone(record));
  });
  await waitFor(() => expect(record.notes).toBe('Newer'));
  expect(input).toHaveValue('Newer');
  expect(editRestaurant).toHaveBeenLastCalledWith('owner', 'cafe', {
    kind: 'field',
    field: 'notes',
    value: 'Newer',
    expected: 'First',
  });
});
test('concurrent same-field conflict retains the draft and fetches the latest value for explicit reset', async () => {
  const error = new Error('This value changed elsewhere.');
  error.name = 'RestaurantEditConflict';
  vi.mocked(editRestaurant).mockImplementationOnce(async () => {
    record.notes = 'Remote';
    throw error;
  });
  setup();
  await loaded();
  await changeField('General notes', 'Mine');
  expect(screen.getByRole('textbox', { name: 'General notes' })).toHaveValue('Mine');
  fireEvent.click(screen.getByRole('button', { name: 'Use latest general notes' }));
  expect(screen.getByText('Remote')).toBeInTheDocument();
});
test('rating saves immediately and can be cleared; favorite and blacklist remain independent', async () => {
  setup();
  await loaded();
  fireEvent.change(screen.getByRole('combobox', { name: 'Overall rating' }), {
    target: { value: '4.5' },
  });
  await waitFor(() => expect(record.rating).toBe(4.5));
  fireEvent.change(screen.getByRole('combobox', { name: 'Overall rating' }), {
    target: { value: '' },
  });
  await waitFor(() => expect(record.rating).toBeUndefined());
  fireEvent.click(screen.getByRole('button', { name: 'Add Cafe Verde to favorites' }));
  await waitFor(() => expect(record.favorite).toBe(true));
  fireEvent.click(screen.getByRole('button', { name: 'Add Cafe Verde to blacklist' }));
  await waitFor(() => expect(record.blacklisted).toBe(true));
  expect(record.favorite).toBe(true);
});
test('tags add and remove without replacing the entire metadata document', async () => {
  setup();
  await loaded();
  fireEvent.change(screen.getByLabelText('New tag'), { target: { value: 'garden' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add tag' }));
  await waitFor(() => expect(record.tags).toContain('garden'));
  fireEvent.click(screen.getByRole('button', { name: 'Remove tag cozy' }));
  await waitFor(() => expect(record.tags).toEqual(['garden']));
});
test('dishes add with stable IDs, rename, edit notes, reorder, and require confirmed removal', async () => {
  setup();
  await loaded();
  fireEvent.change(screen.getByLabelText('New dish name'), { target: { value: 'Bread' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add dish' }));
  const bread = await screen.findByRole('region', { name: 'Bread' });
  const stableId = record.dishes[1].id;
  await changeField('Dish name', 'Sourdough', false, within(bread) as typeof screen);
  expect(record.dishes[1].id).toBe(stableId);
  await changeField(
    'Dish notes',
    'Crisp crust',
    false,
    within(screen.getByRole('region', { name: 'Sourdough' })) as typeof screen,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Move Sourdough up' }));
  await waitFor(() => expect(record.dishes[0].id).toBe(stableId));
  fireEvent.click(screen.getByRole('button', { name: 'Remove Sourdough' }));
  const dialog = screen.getByRole('dialog', { name: 'Remove dish?' });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
  expect(record.dishes).toHaveLength(2);
  fireEvent.click(screen.getByRole('button', { name: 'Remove Sourdough' }));
  fireEvent.click(
    within(screen.getByRole('dialog', { name: 'Remove dish?' })).getByRole('button', {
      name: 'Remove dish',
    }),
  );
  await waitFor(() => expect(record.dishes).toHaveLength(1));
});
test('ordering links validate URLs and adapt from hidden to direct button to provider dropdown', async () => {
  setup();
  await loaded();
  fireEvent.change(screen.getByLabelText('Service label'), { target: { value: 'Direct' } });
  fireEvent.change(screen.getByLabelText('Ordering URL'), {
    target: { value: 'javascript:alert(1)' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Add ordering link' }));
  expect(screen.getByRole('alert')).toHaveTextContent('http');
  expect(editRestaurant).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('Ordering URL'), {
    target: { value: 'https://example.com' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Add ordering link' }));
  const direct = await screen.findByRole('link', { name: 'Order with Direct' });
  expect(direct).toHaveAttribute('target', '_blank');
  expect(direct).toHaveAttribute('rel', 'noopener noreferrer');
  fireEvent.change(screen.getByLabelText('Service label'), { target: { value: 'Delivery' } });
  fireEvent.change(screen.getByLabelText('Ordering URL'), {
    target: { value: 'https://delivery.example.com' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Add ordering link' }));
  await waitFor(() => expect(record.orderLinks).toHaveLength(2));
  expect(screen.getByText('Order', { selector: 'summary' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Remove Delivery ordering link' }));
  await waitFor(() => expect(record.orderLinks).toHaveLength(1));
});
test('editing a legacy link keeps another link-field draft mounted when its stable ID is assigned', async () => {
  record.orderLinks = [{ label: 'Direct', url: 'https://example.com' }];
  setup();
  await loaded();
  fireEvent.click(screen.getByRole('button', { name: 'Edit ordering url' }));
  fireEvent.change(screen.getAllByLabelText('Ordering URL')[0], {
    target: { value: 'https://mine.example.com' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Edit service label' }));
  fireEvent.change(screen.getAllByLabelText('Service label')[0], {
    target: { value: 'Restaurant' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save service label' }));
  await waitFor(() => expect(record.orderLinks[0].id).toBe('upgraded-link'));
  expect(screen.getAllByLabelText('Ordering URL')[0]).toHaveValue('https://mine.example.com');
});
test('restaurant and dish external URLs preview safely with fallbacks', async () => {
  setup();
  await loaded();
  await changeField('Restaurant image URL', 'https://example.com/cafe.jpg');
  const photo = screen.getAllByRole('img', { name: 'Cafe Verde' })[0];
  fireEvent.error(photo);
  expect(screen.getAllByRole('img', { name: 'Cafe Verde' })).toHaveLength(1);
  const soup = screen.getByRole('region', { name: 'Soup' });
  await changeField(
    'Dish image URLs',
    'https://example.com/soup.jpg\nhttps://example.com/bowl.jpg',
    false,
    within(soup) as typeof screen,
  );
  expect(within(soup).getAllByRole('img', { name: 'Soup' })).toHaveLength(2);
  expect(imageReferences('https://example.com/a\nhttps://example.com/a')).toEqual([
    'https://example.com/a',
  ]);
  expect(externalRestaurantUrl('https://user:pass@example.com')).toBeNull();
});
test('deletion confirms, retries errors, removes the cached entry, and returns to Library', async () => {
  vi.mocked(deleteRestaurant).mockRejectedValueOnce(new Error('Offline'));
  setup();
  await loaded();
  fireEvent.click(screen.getByRole('button', { name: 'Delete restaurant' }));
  const dialog = screen.getByRole('dialog', { name: 'Delete restaurant?' });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
  expect(deleteRestaurant).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Delete restaurant' }));
  fireEvent.click(screen.getByRole('button', { name: 'Delete permanently' }));
  expect(await within(screen.getByRole('dialog')).findByRole('alert')).toHaveTextContent('Offline');
  fireEvent.click(screen.getByRole('button', { name: 'Delete permanently' }));
  expect(await screen.findByRole('heading', { name: 'Restaurant Library' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Open Cafe Verde' })).not.toBeInTheDocument();
  expect(deleteRestaurant).toHaveBeenLastCalledWith('owner', 'cafe');
});
test('Quick Add Save & Open navigates to the new detail route', async () => {
  setup('/restaurants/library');
  await screen.findByRole('button', { name: 'Open Cafe Verde' });
  fireEvent.click(screen.getByRole('button', { name: 'Quick Add' }));
  fireEvent.change(screen.getByLabelText('Restaurant name'), { target: { value: 'New place' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save & Open' }));
  expect(await screen.findByRole('heading', { name: 'New place', level: 1 })).toBeInTheDocument();
  expect(getRestaurant).toHaveBeenLastCalledWith('owner', 'new');
});
test('a late collection read cannot overwrite an already saved detail edit', async () => {
  const original = structuredClone(record);
  let resolve!: (items: Restaurant[]) => void;
  vi.mocked(listRestaurants).mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  setup();
  await loaded();
  await changeField('Restaurant name', 'New Cafe');
  await act(async () => {
    resolve([original]);
  });
  fireEvent.click(screen.getByRole('button', { name: 'Use latest restaurant name' }));
  expect(screen.getByRole('heading', { name: 'New Cafe', level: 1 })).toBeInTheDocument();
});
test('a late collection read cannot resurrect a deleted restaurant', async () => {
  const original = structuredClone(record);
  let resolve!: (items: Restaurant[]) => void;
  vi.mocked(listRestaurants).mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  setup();
  await loaded();
  fireEvent.click(screen.getByRole('button', { name: 'Delete restaurant' }));
  fireEvent.click(screen.getByRole('button', { name: 'Delete permanently' }));
  await screen.findByRole('heading', { name: 'Restaurant Library' });
  await act(async () => {
    resolve([original]);
  });
  expect(screen.queryByRole('button', { name: 'Open Cafe Verde' })).not.toBeInTheDocument();
});
test('back navigation preserves Library search and view state', async () => {
  setup('/restaurants/library?q=Cafe');
  const card = await screen.findByRole('button', { name: 'Open Cafe Verde' });
  fireEvent.click(card);
  await loaded();
  fireEvent.click(screen.getByRole('button', { name: 'Back' }));
  expect(screen.getByRole('textbox', { name: 'Search restaurants' })).toHaveValue('Cafe');
});
test('restaurant deletion cleans its authoritative photo snapshot only after the record is deleted', async () => {
  const photo = {
    id: 'room',
    url: 'https://example.com/room.jpg',
    provider: 'imagekit' as const,
    fileId: 'room-file',
    filePath: '/food-hub/owner/cafe/room.jpg',
  };
  record.photos = [photo];
  record.dishes[0].photos = [{ ...photo, id: 'dish', fileId: 'dish-file' }];
  vi.mocked(deleteRestaurant).mockResolvedValue(record);
  setup();
  await loaded();
  fireEvent.click(screen.getByRole('button', { name: 'Delete restaurant' }));
  fireEvent.click(screen.getByRole('button', { name: 'Delete permanently' }));
  await waitFor(() =>
    expect(cleanupRestaurantImages).toHaveBeenCalledWith('owner', 'cafe', [
      photo,
      record.dishes[0].photos![0],
    ]),
  );
  expect(vi.mocked(cleanupRestaurantImages).mock.invocationCallOrder[0]).toBeGreaterThan(
    vi.mocked(deleteRestaurant).mock.invocationCallOrder[0],
  );
});
test('dish cleanup runs after successful removal and never when the Firestore update fails', async () => {
  const photo = {
    id: 'dish',
    url: 'https://example.com/soup.jpg',
    provider: 'imagekit' as const,
    fileId: 'dish-file',
  };
  record.dishes[0].photos = [photo];
  setup();
  await loaded();
  vi.mocked(editRestaurant).mockRejectedValueOnce(new Error('Offline'));
  fireEvent.click(screen.getByRole('button', { name: 'Remove Soup' }));
  fireEvent.click(
    within(screen.getByRole('dialog', { name: 'Remove dish?' })).getByRole('button', {
      name: 'Remove dish',
    }),
  );
  expect(
    await within(screen.getByRole('dialog', { name: 'Remove dish?' })).findByRole('alert'),
  ).toHaveTextContent('Offline');
  expect(cleanupRestaurantImages).not.toHaveBeenCalled();
  fireEvent.click(
    within(screen.getByRole('dialog', { name: 'Remove dish?' })).getByRole('button', {
      name: 'Remove dish',
    }),
  );
  await waitFor(() =>
    expect(cleanupRestaurantImages).toHaveBeenCalledWith('owner', 'cafe', [photo]),
  );
});
