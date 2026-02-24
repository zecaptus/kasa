import { renderHook, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { describe, expect, it } from 'vitest';
import { dashboardApi, useGetDashboardQuery } from '../../../src/services/dashboardApi';
import { store } from '../../../src/store';

function wrapper({ children }: { children: React.ReactNode }) {
  return <Provider store={store}>{children}</Provider>;
}

describe('dashboardApi', () => {
  it('has correct reducerPath', () => {
    expect(dashboardApi.reducerPath).toBe('dashboardApi');
  });

  it('exposes getDashboard query endpoint', () => {
    expect(dashboardApi.endpoints.getDashboard).toBeDefined();
  });

  it('getDashboard endpoint has initiate and select methods', () => {
    expect(dashboardApi.endpoints.getDashboard.initiate).toBeDefined();
    expect(dashboardApi.endpoints.getDashboard.select).toBeDefined();
  });

  it('exports useGetDashboardQuery hook', () => {
    expect(typeof useGetDashboardQuery).toBe('function');
  });

  it('useGetDashboardQuery returns query hook structure', async () => {
    const { result } = renderHook(() => useGetDashboardQuery(), { wrapper });
    await waitFor(() => {
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('isError');
    });
  });
});
