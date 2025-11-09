import { createAsyncThunk } from '@reduxjs/toolkit';

import { store } from '@store/store';

export type StoreStatus = 'idle' | 'loading' | 'ready' | 'error';

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export type ThunkApiConfig = {
  state: RootState;
  dispatch: AppDispatch;
  // strongly-typed rejects are great in reducers:
  rejectValue?: string; // or a richer shape
};

export const createAppAsyncThunk = createAsyncThunk.withTypes<ThunkApiConfig>();
