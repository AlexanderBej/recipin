import { useEffect, useRef, useState, type FormEvent } from 'react';
import { FiCheck, FiArrowUpRight } from 'react-icons/fi';
import { BottomSheet } from '@shared/ui';
import { normalizedRestaurantName } from './restaurant-collection.utils';
import { useRestaurants } from './restaurants.provider';

export default function RestaurantQuickAdd({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { items, status, add, openRestaurant } = useRestaurants();
  const openAfterSave = useRef(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [warnedName, setWarnedName] = useState('');
  useEffect(() => {
    if (open) {
      openAfterSave.current = false;
      setName('');
      setError('');
      setWarnedName('');
    }
  }, [open]);
  const normalized = normalizedRestaurantName(name);
  const duplicates = items.filter((item) => normalizedRestaurantName(item.name) === normalized);
  const warned = !!normalized && warnedName === normalized && duplicates.length > 0;
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;
    if (!name.trim() || name.trim().length > 160) {
      setError('Enter a name of 1 to 160 characters.');
      return;
    }
    if (duplicates.length && !warned) {
      setWarnedName(normalized);
      setError('');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const item = await add(name);
      onOpenChange(false);
      if (openAfterSave.current) openRestaurant(item.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };
  return (
    <BottomSheet
      open={open}
      onOpenChange={(value) => {
        if (!saving) onOpenChange(value);
      }}
      title="Quick Add"
      className="restaurants-sheet"
      nonDismissable={saving}
    >
      <form onSubmit={submit} noValidate className="restaurant-add-form">
        <label htmlFor="restaurant-name">Restaurant name</label>
        <input
          id="restaurant-name"
          autoFocus
          maxLength={160}
          value={name}
          disabled={saving}
          onChange={(event) => {
            setName(event.target.value);
            setError('');
          }}
          placeholder="A place worth remembering"
          aria-invalid={!!error}
          aria-describedby={error ? 'restaurant-name-error' : undefined}
        />
        {error && (
          <p id="restaurant-name-error" role="alert" className="restaurant-error">
            {error}
          </p>
        )}
        {warned && (
          <div className="restaurant-duplicate" role="status">
            <p>A restaurant with this name is already in your notebook.</p>
            {duplicates.map((item) => (
              <button
                type="button"
                className="restaurant-action"
                disabled={saving}
                key={item.id}
                onClick={() => openRestaurant(item.id)}
              >
                Examine {item.name} <FiArrowUpRight />
              </button>
            ))}
          </div>
        )}
        {status !== 'ready' && (
          <p role="status">
            {status === 'error'
              ? 'Close this sheet and retry loading your notebook.'
              : 'Loading your notebook…'}
          </p>
        )}
        <button
          type="submit"
          className="restaurant-action restaurant-action--primary"
          disabled={saving || status !== 'ready'}
          onClick={() => {
            openAfterSave.current = false;
          }}
        >
          <FiCheck />
          {saving ? 'Saving…' : warned ? 'Create anyway' : 'Save'}
        </button>
        <button
          type="submit"
          className="restaurant-action"
          disabled={saving || status !== 'ready'}
          onClick={() => {
            openAfterSave.current = true;
          }}
        >
          <FiArrowUpRight />
          {warned ? 'Create anyway & Open' : 'Save & Open'}
        </button>
      </form>
    </BottomSheet>
  );
}
