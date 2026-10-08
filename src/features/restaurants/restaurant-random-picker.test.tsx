import { beforeEach, expect, test, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import RestaurantRandomPicker from './restaurant-random-picker.component';
import type { Restaurant } from '@api/models';
const mocks = vi.hoisted(() => ({ reduced: false, open: vi.fn(), items: [] as Restaurant[] }));
vi.mock('./restaurants.provider', () => ({
  useRestaurants: () => ({ items: mocks.items, status: 'ready', openRestaurant: mocks.open }),
}));
vi.mock('./restaurant-card.component', () => ({
  default: ({ restaurant }: { restaurant: Restaurant }) => (
    <article aria-label={restaurant.name}>{restaurant.name}</article>
  ),
}));
vi.mock('framer-motion', async (original) => ({
  ...(await original<typeof import('framer-motion')>()),
  useReducedMotion: () => mocks.reduced,
}));
const item = (id: string, changes: Partial<Restaurant> = {}): Restaurant => ({
  id,
  authorId: 'owner',
  name: id,
  tags: ['cozy'],
  cuisine: 'Italian',
  favorite: true,
  blacklisted: false,
  dishes: [],
  orderLinks: [],
  createdAt: 1,
  updatedAt: 1,
  ...changes,
});
beforeEach(() => {
  mocks.reduced = false;
  mocks.open.mockClear();
  mocks.items = [
    item('first'),
    item('second'),
    item('blocked', { blacklisted: true }),
    item('other', { cuisine: 'Japanese', favorite: false, tags: ['delivery'] }),
  ];
});
test('cuisine/tag/favorite filters are applied before selection and blacklist always wins', () => {
  render(<RestaurantRandomPicker />);
  fireEvent.change(screen.getByLabelText('Cuisine'), { target: { value: 'Italian' } });
  fireEvent.change(screen.getByLabelText('Tag'), { target: { value: 'cozy' } });
  fireEvent.click(screen.getByLabelText('Favorites only'));
  fireEvent.click(screen.getByRole('button', { name: 'Choose for me' }));
  expect(screen.queryByRole('article', { name: 'blocked' })).not.toBeInTheDocument();
  expect(screen.queryByRole('article', { name: 'other' })).not.toBeInTheDocument();
  const picked = screen.getByRole('article').textContent;
  fireEvent.click(screen.getByRole('button', { name: 'Shuffle Again' }));
  expect(screen.getByRole('article').textContent).not.toBe(picked);
  fireEvent.click(screen.getByRole('button', { name: 'Open Restaurant' }));
  expect(mocks.open).toHaveBeenCalledWith(screen.getByRole('article').textContent);
});
test('changing filters hides out-of-filter selection and clear resets all controls', () => {
  mocks.items = [item('first')];
  render(<RestaurantRandomPicker />);
  fireEvent.click(screen.getByRole('button', { name: 'Choose for me' }));
  expect(screen.getByText('Your only match.')).toBeInTheDocument();
  fireEvent.click(screen.getByLabelText('Favorites only'));
  fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
  expect(screen.getByLabelText('Favorites only')).not.toBeChecked();
});
test('zero matches disables selection and filters cannot include blacklisted entries', () => {
  mocks.items = [item('blocked', { blacklisted: true })];
  render(<RestaurantRandomPicker />);
  expect(screen.getByRole('button', { name: 'Choose for me' })).toBeDisabled();
  expect(screen.getByText(/Every saved restaurant is blacklisted/)).toBeInTheDocument();
});
test('reduced motion omits shuffled backs and initial reveal transforms', () => {
  mocks.reduced = true;
  const { container } = render(<RestaurantRandomPicker />);
  fireEvent.click(screen.getByRole('button', { name: 'Choose for me' }));
  expect(container.querySelector('.restaurant-picker__back')).toBeNull();
  expect(
    within(screen.getByRole('region')).getByRole('article').parentElement?.style.transform,
  ).toBe('none');
});
test('a new active filter removes an out-of-filter selection and one remaining match remains selectable', () => {
  render(<RestaurantRandomPicker />);
  fireEvent.change(screen.getByLabelText('Cuisine'), { target: { value: 'Italian' } });
  fireEvent.click(screen.getByRole('button', { name: 'Choose for me' }));
  fireEvent.change(screen.getByLabelText('Cuisine'), { target: { value: 'Japanese' } });
  expect(screen.queryByRole('article')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Choose for me' }));
  expect(screen.getByRole('article')).toHaveTextContent('other');
  fireEvent.click(screen.getByLabelText('Favorites only'));
  expect(screen.getByRole('button', { name: 'Choose for me' })).toBeDisabled();
  expect(screen.getByText('No restaurants match these filters.')).toBeInTheDocument();
});
