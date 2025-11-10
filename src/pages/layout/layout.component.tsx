import React from 'react';
import { Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';

import { PageSpinner } from '@shared/ui';
import { BottomTabBar, TopTitleBar } from '@components';
import { selectAppBootState } from '@store/index';

import './layout.styles.scss';

const Layout: React.FC = () => {
  const { booting } = useSelector(selectAppBootState);

  return (
    <div className="main-layout">
      {booting ? (
        <PageSpinner />
      ) : (
        <>
          <TopTitleBar />
          <main className="outlet-container">
            <Outlet />
          </main>
          <BottomTabBar />
        </>
      )}
    </div>
  );
};

export default Layout;
