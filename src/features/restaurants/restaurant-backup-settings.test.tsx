import { beforeEach, expect, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer, { userSignedIn } from '@store/auth-store/auth.slice';
import { strToU8, zipSync } from 'fflate';
import RestaurantBackupSettings from './restaurant-backup-settings.component';
const mocks = vi.hoisted(() => ({ list: vi.fn(), apply: vi.fn() }));
vi.mock('@api/services/restaurants.service', () => ({ listRestaurants: mocks.list }));
vi.mock('@api/services/restaurant-backup.service', async (original) => ({
  ...(await original<typeof import('@api/services/restaurant-backup.service')>()),
  applyRestaurantImport: mocks.apply,
}));
vi.mock('@api/services/restaurant-images.service', () => ({
  retryRestaurantImageCleanup: vi.fn(),
}));
vi.mock('@lib/firebase', () => ({ auth: { currentUser: null } }));
const record = {
  id: 'source',
  authorId: 'foreign',
  name: 'Cafe',
  favorite: true,
  blacklisted: false,
  tags: [],
  dishes: [],
  orderLinks: [],
  createdAt: 1,
  updatedAt: 1,
};
function setup() {
  const store = configureStore({ reducer: { auth: authReducer } });
  store.dispatch(
    userSignedIn({ uid: 'owner', displayName: 'Test', email: null, photoURL: null, createdAt: '' }),
  );
  return render(
    <Provider store={store}>
      <RestaurantBackupSettings />
    </Provider>,
  );
}
async function selectBackup() {
  await waitFor(() => expect(screen.getByRole('button', { name: 'Export ZIP' })).toBeEnabled());
  const bytes = zipSync(
    {
      'manifest.json': strToU8(
        JSON.stringify({
          format: 'food-hub-restaurants',
          version: 1,
          exportedAt: new Date().toISOString(),
          restaurants: [record],
          images: [],
        }),
      ),
    },
    { level: 0 },
  );
  const file = new File([bytes], 'restaurants.zip', { type: 'application/zip' });
  Object.defineProperty(file, 'arrayBuffer', { value: async () => bytes.buffer });
  fireEvent.change(screen.getByLabelText('Import Restaurants ZIP'), { target: { files: [file] } });
  await screen.findByText('Import preview');
}
beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  mocks.list.mockResolvedValue([{ ...record, id: 'existing', authorId: 'owner' }]);
  mocks.apply.mockImplementation(async (_uid, _backup, rows) => rows);
});
test('duplicate preview defaults to Skip and requires confirmation before applying', async () => {
  setup();
  await selectBackup();
  expect(screen.getByLabelText('Import action for Cafe')).toHaveValue('skip');
  expect(screen.getByRole('button', { name: 'Apply import' })).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Import action for Cafe'), {
    target: { value: 'update' },
  });
  fireEvent.click(screen.getByLabelText('Confirm these Restaurant changes'));
  fireEvent.click(screen.getByRole('button', { name: 'Apply import' }));
  await waitFor(() =>
    expect(mocks.apply).toHaveBeenCalledWith(
      'owner',
      expect.anything(),
      expect.arrayContaining([expect.objectContaining({ choice: 'update', targetId: 'existing' })]),
      expect.any(Function),
    ),
  );
});
test('Keep Both allocates a new ID and changing a choice clears prior confirmation', async () => {
  setup();
  await selectBackup();
  fireEvent.click(screen.getByLabelText('Confirm these Restaurant changes'));
  fireEvent.change(screen.getByLabelText('Import action for Cafe'), { target: { value: 'keep' } });
  expect(screen.getByLabelText('Confirm these Restaurant changes')).not.toBeChecked();
  fireEvent.click(screen.getByLabelText('Confirm these Restaurant changes'));
  fireEvent.click(screen.getByRole('button', { name: 'Apply import' }));
  await waitFor(() => expect(mocks.apply).toHaveBeenCalled());
  expect(mocks.apply.mock.calls[0][2][0].targetId).not.toBe('existing');
});
