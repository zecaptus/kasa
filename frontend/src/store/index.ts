import { configureStore } from '@reduxjs/toolkit';
import { authApi } from '../services/authApi';
import { importApi } from '../services/importApi';
import authReducer from './authSlice';
import importReducer from './importSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    import: importReducer,
    [authApi.reducerPath]: authApi.reducer,
    [importApi.reducerPath]: importApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(authApi.middleware, importApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
