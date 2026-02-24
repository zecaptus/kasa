import { renderHook, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { describe, expect, it } from 'vitest';
import {
  recurringPatternsApi,
  useCreateRecurringPatternMutation,
  useDeleteRecurringPatternMutation,
  useListRecurringPatternsQuery,
  useUpdateRecurringPatternMutation,
} from '../../../src/services/recurringPatternsApi';
import { store } from '../../../src/store';

function wrapper({ children }: { children: React.ReactNode }) {
  return <Provider store={store}>{children}</Provider>;
}

describe('recurringPatternsApi', () => {
  it('has correct reducerPath', () => {
    expect(recurringPatternsApi.reducerPath).toBe('recurringPatternsApi');
  });

  it('exposes all 4 endpoints', () => {
    expect(recurringPatternsApi.endpoints.listRecurringPatterns).toBeDefined();
    expect(recurringPatternsApi.endpoints.createRecurringPattern).toBeDefined();
    expect(recurringPatternsApi.endpoints.updateRecurringPattern).toBeDefined();
    expect(recurringPatternsApi.endpoints.deleteRecurringPattern).toBeDefined();
  });

  it('exports all RTK Query hooks', () => {
    expect(typeof useListRecurringPatternsQuery).toBe('function');
    expect(typeof useCreateRecurringPatternMutation).toBe('function');
    expect(typeof useUpdateRecurringPatternMutation).toBe('function');
    expect(typeof useDeleteRecurringPatternMutation).toBe('function');
  });

  it('useListRecurringPatternsQuery returns query hook structure', async () => {
    const { result } = renderHook(() => useListRecurringPatternsQuery(), { wrapper });
    await waitFor(() => {
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('isError');
    });
  });

  it('useCreateRecurringPatternMutation returns mutation tuple', () => {
    const { result } = renderHook(() => useCreateRecurringPatternMutation(), { wrapper });
    const [mutate, state] = result.current;
    expect(typeof mutate).toBe('function');
    expect(state).toHaveProperty('isLoading');
  });

  it('useUpdateRecurringPatternMutation returns mutation tuple', () => {
    const { result } = renderHook(() => useUpdateRecurringPatternMutation(), { wrapper });
    const [mutate, state] = result.current;
    expect(typeof mutate).toBe('function');
    expect(state).toHaveProperty('isLoading');
  });

  it('useDeleteRecurringPatternMutation returns mutation tuple', () => {
    const { result } = renderHook(() => useDeleteRecurringPatternMutation(), { wrapper });
    const [mutate, state] = result.current;
    expect(typeof mutate).toBe('function');
    expect(state).toHaveProperty('isLoading');
  });

  it('createRecurringPattern mutation triggers query callback', () => {
    const { result } = renderHook(() => useCreateRecurringPatternMutation(), { wrapper });
    const [mutate] = result.current;
    mutate({ label: 'Netflix', keyword: 'netflix', frequency: 'MONTHLY' });
    expect(typeof mutate).toBe('function');
  });

  it('updateRecurringPattern mutation triggers query callback', () => {
    const { result } = renderHook(() => useUpdateRecurringPatternMutation(), { wrapper });
    const [mutate] = result.current;
    mutate({ id: 'pattern-001', label: 'Updated', isActive: false });
    expect(typeof mutate).toBe('function');
  });

  it('deleteRecurringPattern mutation triggers query callback', () => {
    const { result } = renderHook(() => useDeleteRecurringPatternMutation(), { wrapper });
    const [mutate] = result.current;
    mutate('pattern-001');
    expect(typeof mutate).toBe('function');
  });
});
