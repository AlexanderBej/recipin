import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiGrid, FiList, FiPlus, FiSearch, FiX } from 'react-icons/fi';
import { useRestaurants } from '../../features/restaurants/restaurants.provider';
import RestaurantCard from '../../features/restaurants/restaurant-card.component';
import RestaurantCollectionState from '../../features/restaurants/restaurant-collection-state.component';
import {
  filterRestaurants,
  type RestaurantSort,
} from '../../features/restaurants/restaurant-collection.utils';

const layoutKey = 'foodhub.restaurants.layout';
export default function RestaurantsLibrary() {
  const { items, status, quickAdd, actionError } = useRestaurants();
  const [params, setParams] = useSearchParams();
  const [layout, setLayout] = useState<'grid' | 'list'>(() => {
    try {
      return localStorage.getItem(layoutKey) === 'list' ? 'list' : 'grid';
    } catch {
      return 'grid';
    }
  });
  const changeLayout = (value: 'grid' | 'list') => {
    setLayout(value);
    try {
      localStorage.setItem(layoutKey, value);
    } catch {}
  };
  const search = params.get('q') ?? '';
  const favorite = params.get('favorites') === '1';
  const blacklisted = params.get('blacklisted') === '1';
  const cuisine = params.get('cuisine') ?? '';
  const tag = params.get('tag') ?? '';
  const sortParam = params.get('sort');
  const sort: RestaurantSort =
    sortParam === 'name' || sortParam === 'rating' || sortParam === 'added' ? sortParam : 'updated';
  const change = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };
  const cuisines = [
    ...new Set(
      items
        .flatMap((item) => [item.cuisine, item.category])
        .filter((value): value is string => !!value),
    ),
  ].sort();
  const tags = [...new Set(items.flatMap((item) => item.tags))].sort();
  const results = filterRestaurants(items, { search, favorite, blacklisted, cuisine, tag, sort });
  return (
    <div className="restaurants-page">
      <div className="restaurant-intro">
        <div>
          <span className="restaurant-eyebrow">YOUR PERSONAL NOTEBOOK</span>
          <h1>Restaurant Library</h1>
        </div>
        <button className="restaurant-action restaurant-action--primary" onClick={quickAdd}>
          <FiPlus />
          Quick Add
        </button>
      </div>
      <div className="restaurant-library-toolbar">
        <div className="restaurant-search" role="search">
          <FiSearch aria-hidden="true" />
          <input
            aria-label="Search restaurants"
            placeholder="Search your notebook"
            value={search}
            onChange={(event) => change('q', event.target.value)}
          />
          {search && (
            <button
              className="restaurant-icon"
              onClick={() => change('q', '')}
              title="Clear search"
              aria-label="Clear search"
            >
              <FiX />
            </button>
          )}
        </div>
        <div className="restaurant-view" aria-label="Library view">
          {(['grid', 'list'] as const).map((value) => (
            <button
              className="restaurant-icon"
              key={value}
              title={`${value === 'grid' ? 'Grid' : 'List'} view`}
              aria-label={`${value === 'grid' ? 'Grid' : 'List'} view`}
              aria-pressed={layout === value}
              onClick={() => changeLayout(value)}
            >
              {value === 'grid' ? <FiGrid /> : <FiList />}
            </button>
          ))}
        </div>
      </div>
      <div className="restaurant-filters">
        <label className="restaurant-check">
          <input
            type="checkbox"
            checked={favorite}
            onChange={(event) => change('favorites', event.target.checked ? '1' : '')}
          />
          Favorites
        </label>
        <label className="restaurant-check">
          <input
            type="checkbox"
            checked={blacklisted}
            onChange={(event) => change('blacklisted', event.target.checked ? '1' : '')}
          />
          Blacklisted
        </label>
        {(cuisines.length > 0 || cuisine) && (
          <label>
            Cuisine / category
            <select value={cuisine} onChange={(event) => change('cuisine', event.target.value)}>
              <option value="">All cuisines</option>
              {cuisines.map((value) => (
                <option key={value}>{value}</option>
              ))}
              {cuisine && !cuisines.includes(cuisine) && <option>{cuisine}</option>}
            </select>
          </label>
        )}
        {(tags.length > 0 || tag) && (
          <label>
            Tag
            <select value={tag} onChange={(event) => change('tag', event.target.value)}>
              <option value="">All tags</option>
              {tags.map((value) => (
                <option key={value}>{value}</option>
              ))}
              {tag && !tags.includes(tag) && <option>{tag}</option>}
            </select>
          </label>
        )}
        <label>
          Sort
          <select value={sort} onChange={(event) => change('sort', event.target.value)}>
            <option value="updated">Recently updated</option>
            <option value="added">Recently added</option>
            <option value="name">Name</option>
            <option value="rating">Rating</option>
          </select>
        </label>
      </div>
      {status !== 'ready' ? (
        <RestaurantCollectionState />
      ) : !items.length ? (
        <RestaurantCollectionState />
      ) : (
        <>
          <p className="restaurant-results" role="status">
            {results.length} of {items.length} restaurants
          </p>
          {results.length ? (
            <div
              className={`restaurant-library restaurant-library--${layout}`}
              aria-label="Restaurant results"
            >
              {results.map((item) => (
                <RestaurantCard restaurant={item} key={item.id} variant={layout} />
              ))}
            </div>
          ) : (
            <div className="restaurant-empty">
              <h2>No matching restaurants</h2>
              <p>Try another search or clear your filters.</p>
              <button
                className="restaurant-action"
                onClick={() => setParams({}, { replace: true })}
              >
                <FiX />
                Clear search and filters
              </button>
            </div>
          )}
        </>
      )}
      {actionError && (
        <p className="restaurant-error" role="alert">
          {actionError}
        </p>
      )}
    </div>
  );
}
