import React from 'react';
import { useSelector } from 'react-redux';
import { NavLink } from 'react-router';

import { selectAuthUser } from '@store/auth-store';

import './profile.styles.scss';

const Profile: React.FC = () => {
  const user = useSelector(selectAuthUser);

  return (
    <div className="profile-page">
      <img
        className="user-avatar"
        src={user?.photoURL ?? ''}
        alt={`${user?.displayName}`}
        height={150}
        width={150}
      />
      <h2 className="my-name">{user?.displayName}</h2>

      <div className="user-actions">
        <div className="import">
          <NavLink to={'/import'} className="import-link">
            Bulk Import
          </NavLink>
        </div>
      </div>
    </div>
  );
};

export default Profile;
