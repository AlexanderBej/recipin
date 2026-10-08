import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { FiArrowRight, FiShuffle, FiX } from 'react-icons/fi';
import { useRestaurants } from './restaurants.provider';
import { filterRestaurants, randomRestaurant } from './restaurant-collection.utils';
import RestaurantCard from './restaurant-card.component';
import './restaurant-random-picker.styles.scss';

export default function RestaurantRandomPicker() {
  const { items, status, openRestaurant } = useRestaurants();
  const reduced = useReducedMotion();
  const [cuisine, setCuisine] = useState('');
  const [tag, setTag] = useState('');
  const [favorite, setFavorite] = useState(false);
  const [selection, setSelection] = useState({ id: '', turn: 0 });
  const eligible = filterRestaurants(
    items.filter((item) => !item.blacklisted),
    {
      cuisine,
      tag,
      favorite,
    },
  );
  const picked = eligible.find((item) => item.id === selection.id);
  const cuisines = [
    ...new Set(items.flatMap((item) => [item.cuisine, item.category]).filter(Boolean)),
  ].sort();
  const tags = [...new Set(items.flatMap((item) => item.tags))].sort();
  return (
    <section className="restaurant-picker" aria-label="What should I eat?">
      <div className="restaurant-section-heading">
        <div>
          <span className="restaurant-eyebrow">LET CHANCE CHOOSE</span>
          <h2>What should I eat?</h2>
        </div>
        <button
          className="restaurant-action"
          disabled={status !== 'ready' || !eligible.length}
          onClick={() =>
            setSelection({
              id: randomRestaurant(eligible, selection.id)?.id ?? '',
              turn: selection.turn + 1,
            })
          }
        >
          <FiShuffle />
          {picked ? 'Shuffle Again' : 'Choose for me'}
        </button>
      </div>
      <div className="restaurant-picker__filters">
        <label>
          Cuisine
          <select value={cuisine} onChange={(event) => setCuisine(event.target.value)}>
            <option value="">All cuisines</option>
            {cuisines.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tag
          <select value={tag} onChange={(event) => setTag(event.target.value)}>
            <option value="">All tags</option>
            {tags.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={favorite}
            onChange={(event) => setFavorite(event.target.checked)}
          />
          Favorites only
        </label>
        <button
          className="restaurant-action"
          aria-label="Clear filters"
          title="Clear filters"
          onClick={() => {
            setCuisine('');
            setTag('');
            setFavorite(false);
          }}
        >
          <FiX />
        </button>
      </div>
      {status === 'ready' && !eligible.length && (
        <p className="restaurant-muted">
          {!items.length
            ? 'Add a restaurant to let chance choose.'
            : items.every((item) => item.blacklisted)
              ? 'Every saved restaurant is blacklisted. Change a blacklist status in Library to choose again.'
              : 'No restaurants match these filters.'}
        </p>
      )}
      {picked && (
        <div className="restaurant-picker__reveal" aria-live="polite">
          <div className="restaurant-picker__cards">
            {!reduced &&
              [0, 1].map((index) => (
                <motion.div
                  aria-hidden="true"
                  key={`back-${selection.turn}-${index}`}
                  className="restaurant-picker__back"
                  initial={{ rotate: index ? 6 : -6, x: index ? 24 : -24 }}
                  animate={{ rotate: index ? 2 : -2, x: 0 }}
                  transition={{ duration: 0.45 }}
                />
              ))}
            <motion.div
              key={selection.turn}
              initial={reduced ? false : { opacity: 0, rotate: -3, y: 16 }}
              animate={{ opacity: 1, rotate: 0, y: 0 }}
              transition={{ duration: reduced ? 0 : 0.45 }}
            >
              <RestaurantCard restaurant={picked} variant="list" />
            </motion.div>
          </div>
          {eligible.length === 1 && <p className="restaurant-muted">Your only match.</p>}
          <button className="restaurant-action" onClick={() => openRestaurant(picked.id)}>
            Open Restaurant
            <FiArrowRight />
          </button>
        </div>
      )}
    </section>
  );
}
