import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from './index';

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();

function hasActivePending(slice: {
  queries: Record<string, { status: string } | undefined>;
  mutations: Record<string, { status: string } | undefined>;
}): boolean {
  for (const key in slice.queries) {
    if (slice.queries[key]?.status === 'pending') return true;
  }
  for (const key in slice.mutations) {
    if (slice.mutations[key]?.status === 'pending') return true;
  }
  return false;
}

export function useIsApiLoading(): boolean {
  return useAppSelector(
    (state) =>
      hasActivePending(state.authApi) ||
      hasActivePending(state.importApi) ||
      hasActivePending(state.transactionsApi) ||
      hasActivePending(state.dashboardApi) ||
      hasActivePending(state.pocketsApi) ||
      hasActivePending(state.bankAccountsApi) ||
      hasActivePending(state.recurringPatternsApi),
  );
}
