import { describe, expect, it } from 'vitest';
import { dashboardApi, useGetDashboardQuery } from '../../../src/services/dashboardApi';

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
});
