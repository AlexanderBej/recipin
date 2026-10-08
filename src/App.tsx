import React, { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useDispatch } from 'react-redux';

import ProtectedRoute from './routes/protected-routes';
import {
  Create,
  Grocery,
  FoodHub,
  Import,
  Layout,
  Library,
  Login,
  Planner,
  Profile,
  RecipeDetails,
  RecipesDiscovery,
  Cooking,
} from '@pages';
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
        <Route index element={<FoodHub />} />
        <Route path="/recipes" element={<RecipesDiscovery />} />
        <Route path="/recipes/library" element={<Library />} />
        <Route path="/library" element={<Navigate to="/recipes/library" replace />} />
        <Route path="/create" element={<Navigate to="/recipes/new" replace />} />
        <Route path="/recipes/new" element={<Create />} />
        <Route path="/recipe/:id/edit" element={<Create />} />
        <Route path="/recipe/:id" element={<RecipeDetails />} />
        <Route path="/recipe/:id/cook" element={<Cooking />} />
        <Route path="/grocery" element={<Grocery />} />
        <Route path="/planner" element={<Planner />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/import" element={<Import />} />
      </Route>
    </Routes>
  );
}

export default App;
