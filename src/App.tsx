import React, { useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';
import { useDispatch } from 'react-redux';

import ProtectedRoute from './routes/protected-routes';
import { Layout, Library, Login } from '@pages';
import { initApp } from '@shared/providers';
import { AppDispatch } from '@store/store';
import './App.scss';

function App() {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    const unsub = initApp(dispatch);
    return () => unsub();
  }, [dispatch]);
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      {/* <Route
          path="onboarding"
          element={
            <ProtectedRoute>
              <Onboarding />
            </ProtectedRoute>
          }
        />*/}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Library />} />
        {/* <Route path="transactions" element={<Transaction />} />
          <Route path="buckets" element={<BucketsPage />} />
          <Route path="buckets/:type" element={<BucketPage />} />
          <Route path="insights" element={<Insights />} />
          <Route path="history" element={<History />} />
          <Route path="settings" element={<SettingsLayout />}>
            <Route index element={<SettingsShell />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="budget" element={<BudgetPage />} />
            <Route path="app" element={<AppPreferencesPage />} />
          </Route> */}
      </Route>
    </Routes>
  );
}

export default App;
