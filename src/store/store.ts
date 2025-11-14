import { combineReducers, configureStore } from '@reduxjs/toolkit';
import {
  persistReducer,
  persistStore,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import storage from 'redux-persist/lib/storage';

import authReducer from './auth-store/auth.slice';
import recipesReducer from './recipes-store/recipes.slice';
import groceryReducer from './grocery-store/grocery.slice';
import plannerReducer from './planner-store/planner.slice';

const rootReducer = combineReducers({
  auth: authReducer,
  recipes: recipesReducer,
  planner: plannerReducer,
  grocery: groceryReducer,
});

const persistedReducer = persistReducer(
  { key: 'root', storage, whitelist: ['planner', 'grocery'] },
  rootReducer,
);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
        // Optional: if you still store non-serializable stuff, you can also ignore paths:
        // ignoredActionPaths: ['meta.arg', 'payload.timestamp'],
        // ignoredPaths: ['recipes.items.*.createdAt', 'recipes.items.*.updatedAt'],
      },
    }),
});
export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
