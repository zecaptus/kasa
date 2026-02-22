import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from './index';

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();

export function useIsApiLoading(): boolean {
  return useAppSelector((state) => {
    const { queries, mutations } = state.authApi;
    for (const key in queries) {
      if (queries[key]?.status === 'pending') return true;
    }
    for (const key in mutations) {
      if (mutations[key]?.status === 'pending') return true;
    }
    return false;
  });
}
