import { combineReducers, configureStore } from '@reduxjs/toolkit';

import authReducer from './auth-store/auth.slice';
import recipesReducer from './recipes-store/recipes.slice';

const rootReducer = combineReducers({
  auth: authReducer,
  recipes: recipesReducer,
});

export const store = configureStore({
  reducer: rootReducer,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
