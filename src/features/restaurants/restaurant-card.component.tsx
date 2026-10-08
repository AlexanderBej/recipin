import { useState } from 'react';
import { FiHeart, FiSlash, FiMapPin, FiStar, FiArrowUpRight } from 'react-icons/fi';
import type { Restaurant } from '@api/models';
import { useRestaurants } from './restaurants.provider';
import { restaurantImageSource } from './restaurant-images.utils';

export function RestaurantPhoto({
  restaurant,
  eager = false,
}: {
  restaurant: Restaurant;
  eager?: boolean;
}) {
  const [failedSrc, setFailedSrc] = useState<string>();
  const original = restaurant.imageUrl || restaurant.photos?.[0]?.url;
  const managed = restaurant.photos?.find((photo) => photo.url === original);
  const src = managed ? restaurantImageSource(managed, eager ? 1600 : 480) : original;
  const valid = src && /^(https?:\/\/|\/[^/])/.test(src) && failedSrc !== src;
  return (
    <div className={`restaurant-photo${valid ? '' : ' restaurant-photo--empty'}`}>
      {valid ? (
        <img
          src={src}
          alt={restaurant.name}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          onError={() => setFailedSrc(src)}
        />
      ) : (
        <div className="restaurant-photo__fallback">
          <FiMapPin aria-hidden="true" />
          <span aria-hidden="true">{restaurant.name.slice(0, 1).toLocaleUpperCase()}</span>
        </div>
      )}
    </div>
  );
}

export function RestaurantMetadata({ restaurant }: { restaurant: Restaurant }) {
  return (
    <div className="restaurant-meta">
      {(restaurant.cuisine || restaurant.category) && (
        <span>{[restaurant.cuisine, restaurant.category].filter(Boolean).join(' / ')}</span>
      )}
      {restaurant.rating !== undefined && (
        <span aria-label={`Rating ${restaurant.rating}`}>
          <FiStar aria-hidden="true" />
          {restaurant.rating}
        </span>
      )}
      {restaurant.favorite && (
        <span>
          <FiHeart aria-hidden="true" />
          Favorite
        </span>
      )}
      {restaurant.blacklisted && (
        <span className="restaurant-blacklisted">
          <FiSlash aria-hidden="true" />
          Blacklisted
        </span>
      )}
    </div>
  );
}

export function RestaurantStatusActions({ restaurant }: { restaurant: Restaurant }) {
  const { toggle, pending } = useRestaurants();
  return (
    <div className="restaurant-status-actions">
      <button
        className="restaurant-icon"
        title={restaurant.favorite ? 'Remove favorite' : 'Favorite'}
        aria-label={`${restaurant.favorite ? 'Remove' : 'Add'} ${restaurant.name} ${restaurant.favorite ? 'from' : 'to'} favorites`}
        aria-pressed={restaurant.favorite}
        disabled={pending.includes(restaurant.id)}
        onClick={() => void toggle(restaurant, 'favorite')}
      >
        <FiHeart aria-hidden="true" />
      </button>
      <button
        className="restaurant-icon"
        title={restaurant.blacklisted ? 'Remove from blacklist' : 'Blacklist'}
        aria-label={`${restaurant.blacklisted ? 'Remove' : 'Add'} ${restaurant.name} ${restaurant.blacklisted ? 'from' : 'to'} blacklist`}
        aria-pressed={restaurant.blacklisted}
        disabled={pending.includes(restaurant.id)}
        onClick={() => void toggle(restaurant, 'blacklisted')}
      >
        <FiSlash aria-hidden="true" />
      </button>
    </div>
  );
}

export default function RestaurantCard({
  restaurant,
  variant = 'grid',
}: {
  restaurant: Restaurant;
  variant?: 'grid' | 'list' | 'shelf';
}) {
  const { openRestaurant } = useRestaurants();
  return (
    <article className={`restaurant-card restaurant-card--${variant}`} aria-label={restaurant.name}>
      <button
        className="restaurant-card__open"
        aria-label={`Open ${restaurant.name}`}
        onClick={() => openRestaurant(restaurant.id)}
      >
        <RestaurantPhoto restaurant={restaurant} />
        <div className="restaurant-card__copy">
          <h3>{restaurant.name}</h3>
          <RestaurantMetadata restaurant={restaurant} />
          {variant === 'list' && restaurant.notes && (
            <p className="restaurant-notes-preview">{restaurant.notes}</p>
          )}
        </div>
        <FiArrowUpRight className="restaurant-card__arrow" aria-hidden="true" />
      </button>
      <RestaurantStatusActions restaurant={restaurant} />
    </article>
  );
}
