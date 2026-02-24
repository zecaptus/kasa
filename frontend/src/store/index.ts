import { configureStore } from '@reduxjs/toolkit';
import { authApi } from '../services/authApi';
import { bankAccountsApi } from '../services/bankAccountsApi';
import { dashboardApi } from '../services/dashboardApi';
import { importApi } from '../services/importApi';
import { pocketsApi } from '../services/pocketsApi';
import { recurringPatternsApi } from '../services/recurringPatternsApi';
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
    [dashboardApi.reducerPath]: dashboardApi.reducer,
    [pocketsApi.reducerPath]: pocketsApi.reducer,
    [bankAccountsApi.reducerPath]: bankAccountsApi.reducer,
    [recurringPatternsApi.reducerPath]: recurringPatternsApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      authApi.middleware,
      importApi.middleware,
      transactionsApi.middleware,
      dashboardApi.middleware,
      pocketsApi.middleware,
      bankAccountsApi.middleware,
      recurringPatternsApi.middleware,
    ),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
