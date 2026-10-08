import { Link } from 'react-router-dom';
import { FiArrowRight, FiPlus } from 'react-icons/fi';
import type { Restaurant } from '@api/models';
import { useRestaurants } from '../../features/restaurants/restaurants.provider';
import RestaurantCard, {
  RestaurantMetadata,
  RestaurantPhoto,
} from '../../features/restaurants/restaurant-card.component';
import RestaurantCollectionState from '../../features/restaurants/restaurant-collection-state.component';
import { filterRestaurants } from '../../features/restaurants/restaurant-collection.utils';
import RestaurantRandomPicker from '../../features/restaurants/restaurant-random-picker.component';
import emptyImage from '../../assets/world-restaurants.jpg';

function Shelf({ title, items, to }: { title: string; items: Restaurant[]; to: string }) {
  if (!items.length) return null;
  return (
    <section className="restaurant-shelf" aria-label={title}>
      <div className="restaurant-section-heading">
        <h2>{title}</h2>
        <Link to={to}>
          View all <FiArrowRight />
        </Link>
      </div>
      <div className="restaurant-shelf__track" tabIndex={0} aria-label={`${title} restaurants`}>
        {items.map((item) => (
          <RestaurantCard key={item.id} restaurant={item} variant="shelf" />
        ))}
      </div>
    </section>
  );
}

export default function RestaurantsDiscovery() {
  const { items, status, quickAdd, openRestaurant, actionError } = useRestaurants();
  const recent = filterRestaurants(items, { sort: 'updated' });
  const hero =
    items.find((item) => !item.blacklisted && item.imageUrl) ??
    items.find((item) => !item.blacklisted) ??
    items[0];
  return (
    <div className="restaurants-page">
      <div className="restaurant-intro">
        <div>
          <span className="restaurant-eyebrow">OUT THERE, WORTH REMEMBERING</span>
          <h1>Restaurants</h1>
          <p>Your tables, takeaways, and little discoveries.</p>
        </div>
        <button className="restaurant-action restaurant-action--primary" onClick={quickAdd}>
          <FiPlus />
          Quick Add
        </button>
      </div>
      <div className="restaurant-browse">
        <Link to="/restaurants/library">
          Browse All <FiArrowRight />
        </Link>
        <span>
          {status === 'ready'
            ? `${items.length} saved ${items.length === 1 ? 'restaurant' : 'restaurants'}`
            : ''}
        </span>
      </div>
      {status !== 'ready' ? (
        <RestaurantCollectionState />
      ) : hero ? (
        <>
          <section
            className={`restaurant-hero${hero.imageUrl ? '' : ' restaurant-hero--no-photo'}`}
            aria-label="Rediscover a restaurant"
          >
            <RestaurantPhoto restaurant={hero} eager />
            <div className="restaurant-hero__copy">
              <span className="restaurant-eyebrow">FROM YOUR NOTEBOOK</span>
              <h2>{hero.name}</h2>
              <RestaurantMetadata restaurant={hero} />
              <button
                className="restaurant-action restaurant-action--primary"
                onClick={() => openRestaurant(hero.id)}
              >
                Open notebook entry <FiArrowRight />
              </button>
            </div>
          </section>
          <Shelf
            title="Favorites"
            items={items.filter((item) => item.favorite).slice(0, 8)}
            to="/restaurants/library?favorites=1"
          />
          <Shelf title="Recently Updated" items={recent.slice(0, 8)} to="/restaurants/library" />
        </>
      ) : (
        <section className="restaurant-empty-world">
          <img src={emptyImage} alt="Restaurant tables beneath pendant lights" />
          <RestaurantCollectionState />
        </section>
      )}
      <RestaurantRandomPicker />
      {actionError && (
        <p role="alert" className="restaurant-error">
          {actionError}
        </p>
      )}
    </div>
  );
}
