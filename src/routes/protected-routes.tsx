import { JSX } from 'react';
import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import { RootState } from '@store/store';

export default function ProtectedRoute({ children }: { children: JSX.Element }) {
  const user = useSelector((s: RootState) => s.auth.user);
  if (!user) return <Navigate to="/login" replace />;
  return children;
}
