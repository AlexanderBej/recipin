import React, { useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';
import { useDispatch } from 'react-redux';

import ProtectedRoute from './routes/protected-routes';
import { Create, Grocery, Layout, Library, Login, Planner, RecipeDetails } from '@pages';
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
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Library />} />
        <Route path="/create" element={<Create />} />
        <Route path="/recipe/:id" element={<RecipeDetails />} />
        <Route path="/grocery" element={<Grocery />} />
        <Route path="/planner" element={<Planner />} />
      </Route>
    </Routes>
  );
}

export default App;
