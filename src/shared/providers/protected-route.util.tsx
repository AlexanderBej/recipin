// import React from 'react';
// import { Navigate, useLocation } from 'react-router-dom';
// import { useSelector } from 'react-redux';

// import { PageSpinner } from '@shared/ui';
// import { selectAuthLoading, selectAuthStatus } from '@store/auth-store';

// interface ProtectedRouteProps {
//   children: React.ReactElement;
// }

// const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
//   const status = useSelector(selectAuthStatus);
//   const authLoading = useSelector(selectAuthLoading);
//   const location = useLocation();

//   if (status === 'idle' || authLoading) {
//     return <PageSpinner />;
//   }

//   // 1) If we know the user is explicitly not logged in, redirect them now
//   if (status !== 'authenticated' && !authLoading) {
//     return <Navigate to="/login" replace state={{ from: location }} />;
//   }

//   // 3) Otherwise, we either are still loading, or the user is allowed.
//   //    In both cases we render the children. If we’re still loading, show a spinner overlay.
//   return <>{children}</>;
// };

// export default ProtectedRoute;

export {};
