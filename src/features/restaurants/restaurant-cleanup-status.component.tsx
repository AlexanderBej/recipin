import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { imageCleanupTasks } from './restaurant-cleanup.queue';

export default function RestaurantCleanupStatus({ uid }: { uid: string }) {
  const [count, setCount] = useState(() => imageCleanupTasks(uid).length);
  useEffect(() => {
    const update = () => setCount(imageCleanupTasks(uid).length);
    update();
    window.addEventListener('restaurant-cleanup-changed', update);
    return () => window.removeEventListener('restaurant-cleanup-changed', update);
  }, [uid]);
  return count ? (
    <p role="status" className="restaurant-cleanup-notice">
      {count} uploaded {count === 1 ? 'file awaits' : 'files await'} cleanup.{' '}
      <Link to="/profile">Retry in Settings</Link>
    </p>
  ) : null;
}
