import { FiPlus, FiRefreshCw } from 'react-icons/fi';
import { useRestaurants } from './restaurants.provider';

export default function RestaurantCollectionState() {
  const { status, retry, quickAdd } = useRestaurants();
  if (status === 'loading')
    return (
      <div className="restaurant-loading" role="status" aria-label="Loading your restaurants">
        <div className="restaurant-skeleton" />
        <p>Loading your notebook…</p>
      </div>
    );
  if (status === 'error')
    return (
      <div className="restaurant-empty" role="alert">
        <h2>Your notebook couldn't load.</h2>
        <p>Please try again.</p>
        <button className="restaurant-action" onClick={retry}>
          <FiRefreshCw />
          Try again
        </button>
      </div>
    );
  return (
    <div className="restaurant-empty">
      <h2>Your next good find starts here.</h2>
      <p>A favourite table. A reliable takeaway. Keep them close.</p>
      <button className="restaurant-action restaurant-action--primary" onClick={quickAdd}>
        <FiPlus />
        Add your first restaurant
      </button>
    </div>
  );
}
