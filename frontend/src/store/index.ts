import { configureStore } from '@reduxjs/toolkit';
import { authApi } from '../services/authApi';
import { importApi } from '../services/importApi';
import { transactionsApi } from '../services/transactionsApi';
import authReducer from './authSlice';
import importReducer from './importSlice';
import transactionsReducer from './transactionsSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    import: importReducer,
    transactions: transactionsReducer,
    [authApi.reducerPath]: authApi.reducer,
    [importApi.reducerPath]: importApi.reducer,
    [transactionsApi.reducerPath]: transactionsApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      authApi.middleware,
      importApi.middleware,
      transactionsApi.middleware,
    ),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
