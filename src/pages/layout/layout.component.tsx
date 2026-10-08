import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { FiArrowLeft } from 'react-icons/fi';

import { Spinner } from '@shared/ui';
import FoodHubHeader from '../../components/food-hub-header/food-hub-header.component';
import RestaurantsProvider from '../../features/restaurants/restaurants.provider';
import { useHeaderModel } from '@shared/hooks';
import { selectAppBootState } from '@store/index';

import './layout.styles.scss';

const Layout: React.FC = () => {
  const { booting } = useSelector(selectAppBootState);
  const { title, showBack, world } = useHeaderModel();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const isLanding = pathname === '/';
  const isCollection =
    pathname === '/recipes' || pathname === '/recipes/library' || world === 'restaurants';
  const isDetail = /^\/recipe\/[^/]+\/?$/.test(pathname);
  const isEditor = pathname === '/recipes/new' || /^\/recipe\/[^/]+\/edit\/?$/.test(pathname);
  const isCooking = /^\/recipe\/[^/]+\/cook\/?$/.test(pathname);
  const isRecipeTool = pathname === '/planner' || pathname === '/grocery';

  if (isCooking)
    return (
      <div className="food-hub-shell">
        <main className="hub-content hub-content--cooking">
          <Outlet />
        </main>
      </div>
    );

  const shell = (
    <div
      className={`food-hub-shell${world === 'restaurants' ? ' food-hub-shell--restaurants' : ''}`}
    >
      <a className="hub-skip-link" href="#hub-content">
        Skip to content
      </a>
      <FoodHubHeader world={world} />
      <main
        id="hub-content"
        tabIndex={-1}
        className={`hub-content${isLanding ? ' hub-content--landing' : ''}${isCollection || isDetail ? ' hub-content--collection' : ''}`}
      >
        {!isLanding && !isCollection && !isDetail && !isEditor && (
          <div className="hub-page-heading">
            {showBack && (
              <button
                className="hub-icon-link"
                type="button"
                onClick={() => navigate(-1)}
                aria-label="Go back"
                title="Go back"
              >
                <FiArrowLeft aria-hidden="true" />
              </button>
            )}
            <h1>{title}</h1>
          </div>
        )}
        {world === 'recipes' &&
        booting &&
        !isCollection &&
        !isDetail &&
        !isEditor &&
        !isRecipeTool ? (
          <Spinner type="page" />
        ) : (
          <Outlet />
        )}
      </main>
    </div>
  );
  return world === 'restaurants' ? <RestaurantsProvider>{shell}</RestaurantsProvider> : shell;
};

export default Layout;
