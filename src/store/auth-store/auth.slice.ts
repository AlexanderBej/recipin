import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { MinimalUser } from '@api/models';
// import { updateUserDisplayName } from '@api/services';
// import { createAppAsyncThunk } from '@api/types';

interface AuthState {
  user: null | MinimalUser;
  loading: boolean;
  status: 'idle' | 'authenticated' | 'unauthenticated';
  error: string | undefined;
}

const initialState: AuthState = {
  user: null,
  loading: false,
  status: 'idle',
  error: undefined,
};

// export const updateDisplayNameThunk = createAppAsyncThunk<
//   UserProfile | null,
//   { uid: string; displayName: string }
// >('auth/updateDisplayName', async ({ uid, displayName }, { rejectWithValue }) => {
//   try {
//     const profile = await updateUserDisplayName(uid, displayName);
//     return profile;
//   } catch (error) {
//     return rejectWithValue(error);
//   }
// });

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    userSignedIn(state, action: PayloadAction<MinimalUser>) {
      state.status = 'authenticated';
      state.user = action.payload;
      state.loading = false;
    },
    userSignedOut(state) {
      state.status = 'unauthenticated';
      state.user = null;
      state.loading = false;
    },
    setAuthLoading(state) {
      state.loading = true;
    },
  },
  // extraReducers: (builder) => {
  //   builder
  //     .addCase(updateDisplayNameThunk.pending, (s) => {
  //       s.loading = true;
  //       s.error = undefined;
  //     })
  //     .addCase(updateDisplayNameThunk.fulfilled, (s, { payload }) => {
  //       s.loading = false;
  //       if (s.user) s.user.displayName = payload?.displayName ?? '';
  //     })
  //     .addCase(updateDisplayNameThunk.rejected, (s, a) => {
  //       s.loading = false;
  //       s.error = a.error.message;
  //     });
  // },
});

export const { userSignedIn, userSignedOut, setAuthLoading } = authSlice.actions;
export default authSlice.reducer;
