import React from 'react';
import { FaChevronLeft } from 'react-icons/fa';
import { useNavigate } from 'react-router';
import { MdFavoriteBorder } from 'react-icons/md';
import { FaRegEdit } from 'react-icons/fa';
import { IoMdSearch } from 'react-icons/io';

import { useHeaderModel } from '@shared/hooks';
import { RecIcon } from '@shared/ui';
import { getCssVar } from '@shared/utils';
import { NavAction } from '../../routes/routes';

import './top-title-bar.styles.scss';

const TopTitleBar: React.FC = () => {
  const navigate = useNavigate();
  const { title, showBack, actions } = useHeaderModel();

  const handleSearch = () => {
    console.log('search clicked');
  };

  const handleFavor = () => {
    console.log('favor clicked');
  };

  const handleEdit = () => {
    console.log('edit clicked');
  };

  const getActionMeta = (action: NavAction) => {
    switch (action) {
      case 'search':
        return { icon: IoMdSearch, action: handleSearch };
      case 'edit':
        return { icon: FaRegEdit, action: handleEdit };
      case 'favor':
        return { icon: MdFavoriteBorder, action: handleFavor };
    }
  };

  return (
    <header className="top-title-bar">
      {showBack && (
        <button onClick={() => navigate(-1)}>
          <RecIcon icon={FaChevronLeft} size={24} color={getCssVar('--color-text-primary')} />
        </button>
      )}
      <h1>{title}</h1>
      {actions && actions.length > 0 && (
        <div className="action-bar">
          {actions.map((action) => {
            const meta = getActionMeta(action);
            return (
              <button className={`action-btn action-btn__${action}`} onClick={meta.action}>
                <RecIcon icon={meta.icon} size={24} color={getCssVar('--color-text-primary')} />
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};

export default TopTitleBar;
