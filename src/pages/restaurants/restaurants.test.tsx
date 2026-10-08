import { beforeEach, expect, test, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { Restaurant } from '@api/models';
import authReducer, { userSignedIn, userSignedOut } from '@store/auth-store/auth.slice';
import {
  createRestaurant,
  listRestaurants,
  updateRestaurantStatus,
  getRestaurant,
} from '@api/services/restaurants.service';
import RestaurantsProvider from '../../features/restaurants/restaurants.provider';
import FoodHubHeader from '../../components/food-hub-header/food-hub-header.component';
import RestaurantsDiscovery from './restaurants-discovery.component';
import RestaurantsLibrary from './restaurants-library.component';
import RestaurantDetail from './restaurant-detail.component';
import {
  filterRestaurants,
  normalizedRestaurantName,
  randomRestaurant,
} from '../../features/restaurants/restaurant-collection.utils';

vi.mock('@api/services/restaurants.service', () => ({
  createRestaurant: vi.fn(),
  listRestaurants: vi.fn(),
  updateRestaurantStatus: vi.fn(),
  getRestaurant: vi.fn(),
  editRestaurant: vi.fn(),
  deleteRestaurant: vi.fn(),
}));
const restaurant = (id: string, name: string, changes: Partial<Restaurant> = {}): Restaurant => ({
  id,
  authorId: 'owner',
  name,
  tags: [],
  favorite: false,
  blacklisted: false,
  dishes: [],
  orderLinks: [],
  createdAt: 1,
  updatedAt: 1,
  ...changes,
});
const items = [
  restaurant('cafe', 'Cafe Verde', {
    imageUrl: '/cafe.jpg',
    cuisine: 'Italian',
    notes: 'Excellent patio',
    tags: ['cozy'],
    favorite: true,
    rating: 4.5,
    createdAt: 1,
    updatedAt: 10,
  }),
  restaurant('noodle', 'Noodle House', {
    cuisine: 'Japanese',
    category: 'Takeaway',
    notes: 'Late noodles',
    tags: ['delivery'],
    rating: 3,
    createdAt: 3,
    updatedAt: 5,
  }),
  restaurant('avoid', 'Avoid Me', {
    blacklisted: true,
    cuisine: 'Italian',
    rating: 2,
    createdAt: 2,
    updatedAt: 20,
  }),
];
beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  vi.mocked(listRestaurants).mockResolvedValue(items);
  vi.mocked(getRestaurant).mockImplementation(
    async (_uid, id) => items.find((item) => item.id === id) ?? null,
  );
  vi.mocked(createRestaurant).mockImplementation(async (_uid, name) =>
    restaurant('new', name.trim(), { createdAt: 30, updatedAt: 30 }),
  );
  vi.mocked(updateRestaurantStatus).mockImplementation(async (_uid, id, changes) => ({
    ...items.find((item) => item.id === id)!,
    ...changes,
    updatedAt: 40,
  }));
});
function setup(path = '/restaurants', signedIn = true) {
  const store = configureStore({ reducer: { auth: authReducer } });
  if (signedIn)
    store.dispatch(
      userSignedIn({
        uid: 'owner',
        displayName: 'Test',
        email: null,
        photoURL: null,
        createdAt: '',
      }),
    );
  const view = render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[path]}>
        <RestaurantsProvider>
          <FoodHubHeader world="restaurants" />
          <Routes>
            <Route path="/restaurants" element={<RestaurantsDiscovery />} />
            <Route path="/restaurants/library" element={<RestaurantsLibrary />} />
            <Route path="/restaurant/:id" element={<RestaurantDetail />} />
          </Routes>
        </RestaurantsProvider>
      </MemoryRouter>
    </Provider>,
  );
  return { store, ...view };
}
async function loaded() {
  await waitFor(() =>
    expect(
      screen.queryByRole('status', { name: 'Loading your restaurants' }),
    ).not.toBeInTheDocument(),
  );
}
const results = () => screen.getByLabelText('Restaurant results');
const names = () =>
  within(results())
    .getAllByRole('article')
    .map((item) => item.getAttribute('aria-label'));

test('Discovery prefers a photograph, shows Favorites and accurately sorted Recently Updated', async () => {
  setup();
  const hero = await screen.findByRole('region', { name: 'Rediscover a restaurant' });
  expect(within(hero).getByRole('heading', { name: 'Cafe Verde' })).toBeInTheDocument();
  expect(screen.getByRole('region', { name: 'Favorites' })).toBeInTheDocument();
  expect(
    within(screen.getByRole('region', { name: 'Recently Updated' }))
      .getAllByRole('article')
      .map((node) => node.getAttribute('aria-label')),
  ).toEqual(['Avoid Me', 'Cafe Verde', 'Noodle House']);
  fireEvent.click(screen.getByRole('link', { name: 'Browse All' }));
  expect(screen.getByRole('heading', { name: 'Restaurant Library' })).toBeInTheDocument();
  expect(listRestaurants).toHaveBeenCalledTimes(1);
});
test('empty Discovery strongly exposes name-only Quick Add and hides shelves', async () => {
  vi.mocked(listRestaurants).mockResolvedValue([]);
  setup();
  fireEvent.click(await screen.findByRole('button', { name: 'Add your first restaurant' }));
  const dialog = screen.getByRole('dialog', { name: 'Quick Add' });
  fireEvent.change(within(dialog).getByRole('textbox', { name: 'Restaurant name' }), {
    target: { value: '  New place  ' },
  });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(createRestaurant).toHaveBeenCalledWith('owner', '  New place  ');
  expect(screen.getByRole('region', { name: 'Rediscover a restaurant' })).toHaveTextContent(
    'New place',
  );
  expect(screen.queryByRole('region', { name: 'Favorites' })).not.toBeInTheDocument();
});
test('Quick Add validates whitespace names without writing and reports failed saves', async () => {
  setup();
  await loaded();
  fireEvent.click(screen.getByRole('button', { name: 'Quick Add restaurant' }));
  const dialog = screen.getByRole('dialog', { name: 'Quick Add' });
  fireEvent.change(within(dialog).getByLabelText('Restaurant name'), { target: { value: '  ' } });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
  expect(within(dialog).getByRole('alert')).toHaveTextContent('Enter a name');
  expect(createRestaurant).not.toHaveBeenCalled();
  vi.mocked(createRestaurant).mockRejectedValueOnce(new Error('Offline'));
  fireEvent.change(within(dialog).getByLabelText('Restaurant name'), { target: { value: 'New' } });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
  expect(await within(dialog).findByRole('alert')).toHaveTextContent('Offline');
});
test('normalized duplicates warn, offer examining the existing entry, and allow deliberate override', async () => {
  setup();
  await loaded();
  fireEvent.click(screen.getByRole('button', { name: 'Quick Add' }));
  const dialog = screen.getByRole('dialog', { name: 'Quick Add' });
  fireEvent.change(within(dialog).getByLabelText('Restaurant name'), {
    target: { value: ' cafe   VERDE ' },
  });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
  expect(within(dialog).getByRole('status')).toHaveTextContent('already in your notebook');
  expect(within(dialog).getByRole('button', { name: 'Examine Cafe Verde' })).toBeInTheDocument();
  expect(createRestaurant).not.toHaveBeenCalled();
  fireEvent.click(within(dialog).getByRole('button', { name: 'Create anyway' }));
  await waitFor(() => expect(createRestaurant).toHaveBeenCalledOnce());
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
});
test('a duplicate can be examined without creating anything', async () => {
  setup();
  await loaded();
  fireEvent.click(screen.getByRole('button', { name: 'Quick Add' }));
  fireEvent.change(screen.getByLabelText('Restaurant name'), { target: { value: 'Cafe Verde' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));
  fireEvent.click(screen.getByRole('button', { name: 'Examine Cafe Verde' }));
  expect(await screen.findByRole('heading', { name: 'Cafe Verde', level: 1 })).toBeInTheDocument();
  expect(screen.getByText('Excellent patio')).toBeInTheDocument();
  expect(createRestaurant).not.toHaveBeenCalled();
});
test('loading blocks creation, error permits retry, and failed status writes leave data intact', async () => {
  vi.mocked(listRestaurants).mockRejectedValueOnce(new Error('Denied'));
  setup();
  expect(screen.getByRole('status', { name: 'Loading your restaurants' })).toBeInTheDocument();
  expect(await screen.findByRole('alert')).toHaveTextContent("couldn't load");
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  await screen.findByRole('region', { name: 'Rediscover a restaurant' });
  expect(listRestaurants).toHaveBeenCalledTimes(2);
  vi.mocked(updateRestaurantStatus).mockRejectedValueOnce(new Error('Denied'));
  const favorites = screen.getByRole('region', { name: 'Favorites' });
  fireEvent.click(
    within(favorites).getByRole('button', { name: 'Remove Cafe Verde from favorites' }),
  );
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not save');
  expect(
    within(favorites).getByRole('button', { name: 'Remove Cafe Verde from favorites' }),
  ).toHaveAttribute('aria-pressed', 'true');
});
test('favorite and blacklist are independent, and blacklisted entries remain browseable', async () => {
  setup('/restaurants/library');
  await loaded();
  const cafe = within(results()).getByRole('article', { name: 'Cafe Verde' });
  fireEvent.click(within(cafe).getByRole('button', { name: 'Add Cafe Verde to blacklist' }));
  await waitFor(() =>
    expect(
      within(cafe).getByRole('button', { name: 'Remove Cafe Verde from blacklist' }),
    ).toHaveAttribute('aria-pressed', 'true'),
  );
  expect(
    within(cafe).getByRole('button', { name: 'Remove Cafe Verde from favorites' }),
  ).toHaveAttribute('aria-pressed', 'true');
  expect(updateRestaurantStatus).toHaveBeenCalledWith('owner', 'cafe', { blacklisted: true });
  fireEvent.click(within(cafe).getByRole('button', { name: 'Remove Cafe Verde from favorites' }));
  await waitFor(() =>
    expect(
      within(cafe).getByRole('button', { name: 'Add Cafe Verde to favorites' }),
    ).toHaveAttribute('aria-pressed', 'false'),
  );
});
test('random selections always exclude blacklisted restaurants, support shuffle, and open details', async () => {
  vi.mocked(listRestaurants).mockResolvedValue([items[0], items[2]]);
  setup();
  await loaded();
  fireEvent.click(screen.getByRole('button', { name: 'Choose for me' }));
  const picker = screen.getByRole('region', { name: 'What should I eat?' });
  expect(within(picker).getByRole('article', { name: 'Cafe Verde' })).toBeInTheDocument();
  expect(within(picker).queryByRole('article', { name: 'Avoid Me' })).not.toBeInTheDocument();
  fireEvent.click(within(picker).getByRole('button', { name: 'Shuffle Again' }));
  fireEvent.click(within(picker).getByRole('button', { name: 'Open Cafe Verde' }));
  expect(await screen.findByRole('heading', { name: 'Cafe Verde', level: 1 })).toBeInTheDocument();
});
test('all-blacklisted and empty collections give honest random-picker feedback', async () => {
  vi.mocked(listRestaurants).mockResolvedValue([items[2]]);
  setup();
  await loaded();
  expect(screen.getByRole('button', { name: 'Choose for me' })).toBeDisabled();
  expect(screen.getByText(/Every saved restaurant is blacklisted/)).toBeInTheDocument();
});
test.each(['Cafe', 'Italian', 'patio', 'cozy'])(
  'Library searches supported text with %s',
  async (query) => {
    setup('/restaurants/library');
    await loaded();
    fireEvent.change(screen.getByRole('textbox', { name: 'Search restaurants' }), {
      target: { value: query },
    });
    expect(names()).toContain('Cafe Verde');
    expect(names()).not.toContain('Noodle House');
  },
);
test('Library filters favorites, blacklist, cuisine/category, and tags with a recoverable no-results state', async () => {
  setup('/restaurants/library');
  await loaded();
  fireEvent.click(screen.getByRole('checkbox', { name: 'Favorites' }));
  expect(names()).toEqual(['Cafe Verde']);
  fireEvent.click(screen.getByRole('checkbox', { name: 'Blacklisted' }));
  expect(screen.getByRole('heading', { name: 'No matching restaurants' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Clear search and filters' }));
  fireEvent.change(screen.getByRole('combobox', { name: 'Cuisine / category' }), {
    target: { value: 'Takeaway' },
  });
  expect(names()).toEqual(['Noodle House']);
  fireEvent.change(screen.getByRole('combobox', { name: 'Cuisine / category' }), {
    target: { value: '' },
  });
  fireEvent.change(screen.getByRole('combobox', { name: 'Tag' }), {
    target: { value: 'cozy' },
  });
  expect(names()).toEqual(['Cafe Verde']);
});
test('sorts updated, added, name, and rating without new server queries', async () => {
  setup('/restaurants/library');
  await loaded();
  expect(names()).toEqual(['Avoid Me', 'Cafe Verde', 'Noodle House']);
  fireEvent.change(screen.getByRole('combobox', { name: 'Sort' }), { target: { value: 'added' } });
  expect(names()).toEqual(['Noodle House', 'Avoid Me', 'Cafe Verde']);
  fireEvent.change(screen.getByRole('combobox', { name: 'Sort' }), { target: { value: 'name' } });
  expect(names()).toEqual(['Avoid Me', 'Cafe Verde', 'Noodle House']);
  fireEvent.change(screen.getByRole('combobox', { name: 'Sort' }), { target: { value: 'rating' } });
  expect(names()).toEqual(['Cafe Verde', 'Noodle House', 'Avoid Me']);
  expect(listRestaurants).toHaveBeenCalledOnce();
});
test('Grid/List preference persists separately from Recipes, and List displays notes', async () => {
  localStorage.setItem('foodhub.recipes.layout', 'grid');
  const first = setup('/restaurants/library');
  await loaded();
  fireEvent.click(screen.getByRole('button', { name: 'List view' }));
  expect(within(results()).getByText('Excellent patio')).toBeInTheDocument();
  expect(localStorage.getItem('foodhub.restaurants.layout')).toBe('list');
  expect(localStorage.getItem('foodhub.recipes.layout')).toBe('grid');
  first.unmount();
  setup('/restaurants/library');
  expect(screen.getByRole('button', { name: 'List view' })).toHaveAttribute('aria-pressed', 'true');
});
test('empty Library and no-search-results remain actionable', async () => {
  const first = setup('/restaurants/library');
  await loaded();
  fireEvent.change(screen.getByRole('textbox', { name: 'Search restaurants' }), {
    target: { value: 'missing' },
  });
  expect(screen.getByRole('heading', { name: 'No matching restaurants' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Clear search and filters' }));
  expect(names()).toHaveLength(3);
  first.unmount();
  vi.mocked(listRestaurants).mockResolvedValue([]);
  setup('/restaurants/library');
  expect(
    await screen.findByRole('button', { name: 'Add your first restaurant' }),
  ).toBeInTheDocument();
});
test('missing/broken images show a stable fallback without hiding names', async () => {
  setup('/restaurants/library');
  await loaded();
  fireEvent.error(screen.getByRole('img', { name: 'Cafe Verde' }));
  expect(screen.queryByRole('img', { name: 'Cafe Verde' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Open Cafe Verde' })).toBeInTheDocument();
});
test('signed-out users do not load restaurants, and stale responses cannot leak another owner', async () => {
  const guest = setup('/restaurants', false);
  expect(listRestaurants).not.toHaveBeenCalled();
  guest.unmount();
  let resolve!: (items: Restaurant[]) => void;
  vi.mocked(listRestaurants).mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const { store } = setup();
  act(() => store.dispatch(userSignedOut()));
  await act(async () => resolve(items));
  expect(screen.queryByRole('region', { name: 'Rediscover a restaurant' })).not.toBeInTheDocument();
});
test('name normalization, rating nulls, blacklist exclusion, and shuffle alternatives are deterministic', () => {
  expect(normalizedRestaurantName('  Ｃafe   VERDE ')).toBe('cafe verde');
  expect(
    filterRestaurants([restaurant('unrated', 'A'), ...items], { sort: 'rating' }).at(-1)?.id,
  ).toBe('unrated');
  for (let index = 0; index < 20; index++) expect(randomRestaurant(items)?.blacklisted).toBe(false);
  expect(randomRestaurant([items[2]])).toBeNull();
  expect(randomRestaurant([items[0], items[1]], 'cafe')?.id).toBe('noodle');
});
