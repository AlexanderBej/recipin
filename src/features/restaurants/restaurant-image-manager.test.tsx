import { useState } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import type { Restaurant, RestaurantImage } from '@api/models';
import type { RestaurantEdit } from '@api/services/restaurants.service';
import {
  prepareRestaurantImage,
  uploadRestaurantImage,
  deleteRestaurantImage,
} from '@api/services/restaurant-images.service';
import RestaurantImageManager from './restaurant-image-manager.component';
vi.mock('@api/services/restaurant-images.service', () => ({
  prepareRestaurantImage: vi.fn(),
  uploadRestaurantImage: vi.fn(),
  deleteRestaurantImage: vi.fn(),
}));
const uploaded: RestaurantImage = {
  id: 'new',
  url: 'https://ik.imagekit.io/test/new.jpg',
  provider: 'imagekit',
  fileId: 'new-file',
  filePath: '/food-hub/owner/cafe/new.jpg',
};
const old: RestaurantImage = {
  ...uploaded,
  id: 'old',
  url: 'https://ik.imagekit.io/test/old.jpg',
  fileId: 'old-file',
};
const base: Restaurant = {
  id: 'cafe',
  authorId: 'owner',
  name: 'Cafe',
  tags: [],
  favorite: false,
  blacklisted: false,
  orderLinks: [],
  dishes: [],
  createdAt: 1,
  updatedAt: 2,
};
const save = vi.fn();
beforeEach(() => {
  vi.resetAllMocks();
  class TestURL extends URL {
    static createObjectURL = vi.fn(() => 'blob:preview');
    static revokeObjectURL = vi.fn();
  }
  vi.stubGlobal('URL', TestURL);
  vi.mocked(prepareRestaurantImage).mockImplementation(async (file) => file);
  vi.mocked(uploadRestaurantImage).mockImplementation(async (_id, _file, progress) => {
    progress(50);
    return uploaded;
  });
  vi.mocked(deleteRestaurantImage).mockResolvedValue();
  save.mockResolvedValue(base);
});
function setup(restaurant = base, dishId?: string) {
  function Harness() {
    const [item, setItem] = useState(restaurant);
    const edit = async (change: RestaurantEdit) => {
      await save(change);
      if (change.kind === 'photo') {
        const target = dishId ? item.dishes.find((dish) => dish.id === dishId)! : item;
        const photos = (target.photos ?? []).filter(
          (photo) => change.action === 'add' || photo.id !== change.previous?.id,
        );
        if (change.photo) photos.push(change.photo);
        const next = dishId
          ? {
              ...item,
              dishes: item.dishes.map((dish) => (dish.id === dishId ? { ...dish, photos } : dish)),
            }
          : { ...item, photos };
        setItem(next);
        return next;
      }
      return item;
    };
    return (
      <RestaurantImageManager restaurant={item} dishId={dishId} unified={!dishId} save={edit} />
    );
  }
  render(<Harness />);
}
function select(dish = false) {
  fireEvent.change(screen.getByLabelText(dish ? 'Select dish photo' : 'Select restaurant photo'), {
    target: { files: [new File(['image'], 'photo.jpg', { type: 'image/jpeg' })] },
  });
}
test('device photo selection uploads with progress then attaches metadata to the restaurant', async () => {
  setup();
  select();
  expect(screen.getByAltText('Selected photo preview')).toHaveAttribute('src', 'blob:preview');
  fireEvent.click(screen.getByRole('button', { name: 'Upload & Save' }));
  await screen.findByText('Photo saved');
  expect(save).toHaveBeenCalledWith(
    expect.objectContaining({ kind: 'photo', action: 'add', photo: uploaded }),
  );
  expect(screen.getByRole('button', { name: 'View Cafe photo' })).toBeInTheDocument();
});
test('upload failure can be retried without losing the selected file', async () => {
  vi.mocked(uploadRestaurantImage).mockRejectedValueOnce(new Error('Offline'));
  setup();
  select();
  fireEvent.click(screen.getByRole('button', { name: 'Upload & Save' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Offline');
  expect(save).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Retry photo save' }));
  await screen.findByText('Photo saved');
  expect(prepareRestaurantImage).toHaveBeenCalledOnce();
  expect(uploadRestaurantImage).toHaveBeenCalledTimes(2);
});
test('failed Firestore attachment retries the same upload without deleting the old image', async () => {
  save.mockRejectedValueOnce(new Error('Save failed'));
  setup({ ...base, photos: [old] });
  fireEvent.click(screen.getByRole('button', { name: 'Replace Cafe photo' }));
  select();
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByRole('button', { name: 'Upload & Save' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Save failed');
  expect(deleteRestaurantImage).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'View Cafe photo' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Retry photo save' }));
  await waitFor(() =>
    expect(deleteRestaurantImage).toHaveBeenCalledWith('cafe', expect.objectContaining(old)),
  );
  expect(uploadRestaurantImage).toHaveBeenCalledOnce();
  expect(save.mock.invocationCallOrder[1]).toBeLessThan(
    vi.mocked(deleteRestaurantImage).mock.invocationCallOrder[0],
  );
});
test('replacement requires irreversible-deletion acknowledgment and cleans up only after saving', async () => {
  setup({ ...base, photos: [old] });
  fireEvent.click(screen.getByRole('button', { name: 'Replace Cafe photo' }));
  select();
  expect(screen.getByRole('button', { name: 'Upload & Save' })).toBeDisabled();
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByRole('button', { name: 'Upload & Save' }));
  await waitFor(() =>
    expect(deleteRestaurantImage).toHaveBeenCalledWith('cafe', expect.objectContaining(old)),
  );
  expect(save).toHaveBeenCalledWith(
    expect.objectContaining({
      action: 'replace',
      previous: expect.objectContaining({ fileId: 'old-file' }),
      photo: uploaded,
    }),
  );
});
test('removal confirms and a failed cleanup can be retried without repeating the Firestore removal', async () => {
  vi.mocked(deleteRestaurantImage).mockRejectedValueOnce(new Error('Offline'));
  setup({ ...base, photos: [old] });
  fireEvent.click(screen.getByRole('button', { name: 'Remove Cafe photo' }));
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(save).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Remove Cafe photo' }));
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Remove photo' }));
  await screen.findByRole('button', { name: 'Retry file cleanup' });
  expect(screen.queryByRole('button', { name: 'View Cafe photo' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Retry file cleanup' }));
  await waitFor(() =>
    expect(screen.queryByRole('button', { name: 'Retry file cleanup' })).not.toBeInTheDocument(),
  );
  expect(save).toHaveBeenCalledOnce();
  expect(deleteRestaurantImage).toHaveBeenCalledTimes(2);
});
test('external URL removal only removes the reference; dish uploads keep their association', async () => {
  setup(
    {
      ...base,
      dishes: [
        {
          id: 'soup',
          name: 'Soup',
          images: [],
          photos: [{ id: 'external', url: 'https://example.com/soup' }],
        },
      ],
    },
    'soup',
  );
  fireEvent.click(screen.getByRole('button', { name: 'Remove Soup photo' }));
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Remove photo' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(deleteRestaurantImage).not.toHaveBeenCalled();
  select(true);
  fireEvent.click(screen.getByRole('button', { name: 'Upload & Save' }));
  await screen.findByText('Photo saved');
  expect(uploadRestaurantImage).toHaveBeenCalledWith(
    'cafe',
    expect.any(File),
    expect.any(Function),
    'soup',
  );
  expect(save).toHaveBeenLastCalledWith(
    expect.objectContaining({ dishId: 'soup', photo: uploaded }),
  );
});
