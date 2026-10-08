import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import type { Restaurant } from '@api/models';
import RestaurantGalleryViewer, { RestaurantImagePreview } from './restaurant-gallery.component';
import { restaurantGallery, restaurantImageSource } from './restaurant-images.utils';
const restaurant: Restaurant = {
  id: 'cafe',
  authorId: 'owner',
  name: 'Cafe',
  imageUrl: 'https://example.com/hero.jpg',
  tags: [],
  favorite: false,
  blacklisted: false,
  orderLinks: [],
  createdAt: null,
  updatedAt: null,
  photos: [
    { id: 'hero', url: 'https://example.com/hero.jpg', provider: 'imagekit', fileId: 'file' },
  ],
  dishes: [
    {
      id: 'soup',
      name: 'Soup',
      images: ['https://example.com/soup.jpg'],
      photos: [{ id: 'bowl', url: 'https://example.com/bowl.jpg' }],
    },
  ],
};
test('unified gallery retains source associations without duplicating legacy hero aliases', () => {
  const images = restaurantGallery(restaurant);
  expect(images).toHaveLength(3);
  expect(images[0]).toMatchObject({
    id: 'hero',
    context: 'Cafe',
    dishId: undefined,
    fileId: 'file',
  });
  expect(
    images.slice(1).every((image) => image.context === 'Soup' && image.dishId === 'soup'),
  ).toBe(true);
  expect(new Set(images.map((image) => image.key)).size).toBe(3);
});
test('viewer supports next, previous, keyboard navigation, and close with context', () => {
  const images = restaurantGallery(restaurant);
  const close = vi.fn();
  render(<RestaurantGalleryViewer images={images} selected={images[0].key} close={close} />);
  expect(screen.getByRole('heading', { name: 'Cafe' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Next photo' }));
  expect(screen.getByRole('heading', { name: 'Soup' })).toBeInTheDocument();
  expect(screen.getByText('2 / 3')).toBeInTheDocument();
  fireEvent.keyDown(screen.getByRole('dialog'), { key: 'ArrowRight' });
  expect(screen.getByText('3 / 3')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Previous photo' }));
  fireEvent.keyDown(screen.getByRole('dialog'), { key: 'ArrowLeft' });
  expect(screen.getByText('1 / 3')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Close gallery' }));
  expect(close).toHaveBeenCalled();
});
test('single-image viewer disables navigation and Escape closes the dialog', () => {
  const close = vi.fn();
  const images = restaurantGallery(restaurant).slice(0, 1);
  render(<RestaurantGalleryViewer images={images} selected={images[0].key} close={close} />);
  expect(screen.getByRole('button', { name: 'Next photo' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Previous photo' })).toBeDisabled();
  fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
  expect(close).toHaveBeenCalled();
});
test('broken and unsafe images have stable graceful fallbacks; originals remain unchanged', () => {
  const { rerender } = render(
    <RestaurantImagePreview photo={{ id: 'a', url: 'https://example.com/a' }} alt="Soup" />,
  );
  expect(screen.getByRole('img', { name: 'Soup' })).toHaveAttribute('loading', 'lazy');
  fireEvent.error(screen.getByRole('img', { name: 'Soup' }));
  expect(screen.getByRole('img', { name: 'Soup: image unavailable' })).toBeInTheDocument();
  rerender(<RestaurantImagePreview photo={{ id: 'b', url: 'javascript:alert(1)' }} alt="Cafe" />);
  expect(screen.getByRole('img', { name: 'Cafe: image unavailable' })).toBeInTheDocument();
  expect(restaurantImageSource({ id: 'a', url: 'https://example.com/a' }, 480)).toBe(
    'https://example.com/a',
  );
});
test('an image removed while the viewer is open shows a missing-photo state', () => {
  render(<RestaurantGalleryViewer images={[]} selected="removed" close={vi.fn()} />);
  expect(screen.getByText('This photo is no longer available.')).toBeInTheDocument();
});
