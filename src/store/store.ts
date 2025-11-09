import {
  combineReducers,
  configureStore,
  createListenerMiddleware,
  isAnyOf,
} from '@reduxjs/toolkit';

import authReducer from './auth-store/auth.slice';
import recipesReducer from './recipes-store/recipes.slice';

// const lm = createListenerMiddleware();

// lm.startListening({
//   matcher: isAnyOf(userSignedOut),
//   effect: async (_, api) => {
//     api.dispatch(cleanupListeners());
//     api.dispatch(resetHistory());
//     api.dispatch(resetTxnFilters());
//     localStorage.removeItem('month');
//   },
// });

const rootReducer = combineReducers({
  auth: authReducer,
  recipes: recipesReducer,
});

export const store = configureStore({
  reducer: rootReducer,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
