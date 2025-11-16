import { JSX } from 'react';
import { useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';

import { selectAuthStatus, selectAuthUser } from '@store/auth-store';

export default function ProtectedRoute({ children }: { children: JSX.Element }) {
  const user = useSelector(selectAuthUser);
  const status = useSelector(selectAuthStatus);
  const location = useLocation();
  if (status !== 'authenticated' && !user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children;
}
