import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface UserInfo {
  id: string;
  email: string;
  name: string;
  locale: 'FR' | 'EN';
}

export interface AuthState {
  user: UserInfo | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isInitialized: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    userLoaded(state, action: PayloadAction<UserInfo>) {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.isInitialized = true;
    },
    loggedOut(state) {
      state.user = null;
      state.isAuthenticated = false;
      state.isInitialized = true;
    },
    initialized(state) {
      state.isInitialized = true;
    },
  },
});

export const { userLoaded, loggedOut, initialized } = authSlice.actions;
export type { UserInfo };
export default authSlice.reducer;
