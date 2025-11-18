import { JSX } from 'react';
import { useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';

import { selectAuthLoading, selectAuthStatus, selectAuthUser } from '@store/auth-store';
import { Spinner } from '@shared/ui';

export default function ProtectedRoute({ children }: { children: JSX.Element }) {
  const user = useSelector(selectAuthUser);
  const authLoading = useSelector(selectAuthLoading);
  const status = useSelector(selectAuthStatus);
  const location = useLocation();

  if (status === 'idle' || authLoading) {
    return <Spinner type="page" />;
  }

  if (status !== 'authenticated' && !user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children;
}
