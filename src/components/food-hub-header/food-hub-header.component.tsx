import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  FiBookOpen,
  FiCalendar,
  FiChevronDown,
  FiGrid,
  FiPlus,
  FiSettings,
  FiShoppingBag,
  FiCompass,
} from 'react-icons/fi';
import './food-hub-header.styles.scss';
import { useRestaurants } from '../../features/restaurants/restaurants.provider';

function RestaurantNavigation() {
  const { quickAdd } = useRestaurants();
  return (
    <div className="hub-recipe-bar hub-restaurant-bar">
      <nav aria-label="Restaurant tools">
        <NavLink to="/restaurants" end>
          <FiCompass aria-hidden="true" />
          <span>Discover</span>
        </NavLink>
        <NavLink to="/restaurants/library">
          <FiBookOpen aria-hidden="true" />
          <span>Library</span>
        </NavLink>
      </nav>
      <button
        className="hub-icon-link"
        onClick={quickAdd}
        aria-label="Quick Add restaurant"
        title="Quick Add"
      >
        <FiPlus aria-hidden="true" />
      </button>
    </div>
  );
}

export default function FoodHubHeader({ world }: { world: 'hub' | 'recipes' | 'restaurants' }) {
  const navigate = useNavigate();
  return (
    <header className="hub-header">
      <div className="hub-header__inner">
        <Link className="hub-brand" to="/">
          Food Hub<span aria-hidden="true">.</span>
        </Link>
        <label className="hub-world-selector">
          <FiGrid aria-hidden="true" />
          <select
            aria-label="World"
            value={world === 'hub' ? '/' : `/${world}`}
            onChange={(event) => navigate(event.target.value)}
          >
            <option value="/">Food Hub</option>
            <option value="/recipes">Recipes</option>
            <option value="/restaurants">Restaurants</option>
          </select>
          <FiChevronDown className="hub-world-selector__chevron" aria-hidden="true" />
        </label>
        <Link
          className="hub-icon-link hub-settings"
          to="/profile"
          aria-label="Settings"
          title="Settings"
        >
          <FiSettings aria-hidden="true" />
        </Link>
      </div>
      {world === 'recipes' && (
        <div className="hub-recipe-bar">
          <nav aria-label="Recipe tools">
            <NavLink to="/recipes" end>
              <FiCompass aria-hidden="true" />
              <span>Discover</span>
            </NavLink>
            <NavLink to="/recipes/library">
              <FiBookOpen aria-hidden="true" />
              <span>Library</span>
            </NavLink>
            <NavLink to="/planner">
              <FiCalendar aria-hidden="true" />
              <span>Planner</span>
            </NavLink>
            <NavLink to="/grocery">
              <FiShoppingBag aria-hidden="true" />
              <span>Groceries</span>
            </NavLink>
          </nav>
          <Link className="hub-icon-link" to="/create" aria-label="New recipe" title="New recipe">
            <FiPlus aria-hidden="true" />
          </Link>
        </div>
      )}
      {world === 'restaurants' && <RestaurantNavigation />}
    </header>
  );
}
