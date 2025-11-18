import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FcGoogle } from 'react-icons/fc';
import { useSelector } from 'react-redux';

import { ensureUserProfile, signInWithGoogle } from '@api/services';
import { Button, RecIcon } from '@shared/ui';
import { selectAuthStatus } from '@store/auth-store';
import { ReactComponent as Logo } from '../../assets/logo.svg';

import './login.styles.scss';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const userStatus = useSelector(selectAuthStatus);

  useEffect(() => {
    if (userStatus === 'authenticated') {
      navigate('/');
    }
  });

  const logGoogleUser = async () => {
    const user = await signInWithGoogle();
    await ensureUserProfile(user);
  };

  return (
    <div className="login-page">
      <Logo className="logo" height={180} />
      <div className="login-container">
        <h2>Login</h2>
        <hr></hr>
        <div className="login-btn-container">
          <Button variant="primary" className="login-btn" onClick={logGoogleUser}>
            <>
              <RecIcon icon={FcGoogle} size={28} />
              <span>Login with Google</span>
            </>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Login;
