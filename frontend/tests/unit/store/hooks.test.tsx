import { renderHook } from '@testing-library/react';
import { Provider } from 'react-redux';
import { describe, expect, it } from 'vitest';
import { store } from '../../../src/store';
import { useAppDispatch, useAppSelector, useIsApiLoading } from '../../../src/store/hooks';

function wrapper({ children }: { children: React.ReactNode }) {
  return <Provider store={store}>{children}</Provider>;
}

describe('hooks', () => {
  describe('useAppDispatch', () => {
    it('returns dispatch function', () => {
      const { result } = renderHook(() => useAppDispatch(), { wrapper });
      expect(typeof result.current).toBe('function');
    });
  });

  describe('useAppSelector', () => {
    it('selects state from store', () => {
      const { result } = renderHook(() => useAppSelector((state) => state.auth.isAuthenticated), {
        wrapper,
      });
      expect(typeof result.current).toBe('boolean');
    });
  });

  describe('useIsApiLoading', () => {
    it('returns false when no API calls are pending', () => {
      const { result } = renderHook(() => useIsApiLoading(), { wrapper });
      expect(result.current).toBe(false);
    });
  });
});
