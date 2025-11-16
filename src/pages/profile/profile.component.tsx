import React, { useState } from 'react';
import { useSelector } from 'react-redux';

import { selectAuthUser, selectAuthUserId } from '@store/auth-store';

import './profile.styles.scss';
import { NavLink } from 'react-router';

const Profile: React.FC = () => {
  const user = useSelector(selectAuthUser);

  return (
    <div className="profile-page">
      <img
        className="user-avatar"
        src={user?.photoURL ?? ''}
        alt={`${user?.displayName}`}
        height={100}
        width={100}
      />
      <h2>{user?.displayName}</h2>

      <div className="user-actions">
        <NavLink to={'/import'}>Bulk Import</NavLink>
      </div>
    </div>
  );
};

export default Profile;
