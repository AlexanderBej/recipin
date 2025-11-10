import React from 'react';
import { NavLink } from 'react-router';
import { useSelector } from 'react-redux';
import clsx from 'clsx';
import { IoMdAdd } from 'react-icons/io';

import { NAV_ITEMS, NavItem } from '../../routes/routes';
import { Button, RecIcon } from '@shared/ui';
import { getCssVar } from '@shared/utils';
import { selectAuthUser } from '@store/auth-store';

import './bottom-tab-bar.styles.scss';

// const placeholderImage = require('../../assets/img_placeholder.png');

const BottomTabBar: React.FC = () => {
  const user = useSelector(selectAuthUser);
  const library = NAV_ITEMS.find((item) => item.key === 'library');
  const grocery = NAV_ITEMS.find((item) => item.key === 'grocery');
  const planner = NAV_ITEMS.find((item) => item.key === 'planner');
  const profile = NAV_ITEMS.find((item) => item.key === 'profile');

  const linkClass = (active: boolean) => {
    return clsx('nav-link', { active: active });
  };

  const getNavItem = (item: NavItem | undefined) => {
    if (!item) return;
    return (
      <li className="nav-item">
        <NavLink className={({ isActive }) => linkClass(isActive)} to={item.path}>
          {item.icon ? (
            <RecIcon
              icon={item.icon}
              size={24}
              className="nav-icon"
              color={getCssVar('--color-primary')}
            />
          ) : (
            <img
              className="user-avatar"
              src={user?.photoURL ?? ''}
              alt={`${user?.displayName}`}
              height={24}
              width={24}
            />
          )}
          <span>{item.shortLabel}</span>
        </NavLink>
      </li>
    );
  };
  return (
    <nav className="bottom-tab-bar">
      <ul className="nav-items">
        {getNavItem(library)}
        {getNavItem(grocery)}

        <li className="fab nav-item">
          <div className="add-recipe-btn-wrapper">
            <Button shape="round" variant="primary">
              <RecIcon icon={IoMdAdd} size={24} color={getCssVar('--color-text-primary')} />
            </Button>
          </div>
        </li>
        {getNavItem(planner)}
        {getNavItem(profile)}
      </ul>
    </nav>
  );
};

export default BottomTabBar;
