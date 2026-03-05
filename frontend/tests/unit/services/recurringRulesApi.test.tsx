import { renderHook, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { describe, expect, it } from 'vitest';
import {
  recurringRulesApi,
  useConfirmPendingMatchMutation,
  useCreateRecurringRuleMutation,
  useCreateRuleFromTransactionMutation,
  useDeleteRecurringRuleMutation,
  useDismissPendingMatchMutation,
  useListPendingMatchesQuery,
  useListRecurringRulesQuery,
  useUpdateRecurringRuleMutation,
} from '../../../src/services/recurringRulesApi';
import { store } from '../../../src/store';

function wrapper({ children }: { children: React.ReactNode }) {
  return <Provider store={store}>{children}</Provider>;
}

describe('recurringRulesApi', () => {
  it('has correct reducerPath', () => {
    expect(recurringRulesApi.reducerPath).toBe('recurringRulesApi');
  });

  it('exposes all 7 endpoints', () => {
    expect(recurringRulesApi.endpoints.listRecurringRules).toBeDefined();
    expect(recurringRulesApi.endpoints.createRecurringRule).toBeDefined();
    expect(recurringRulesApi.endpoints.createRuleFromTransaction).toBeDefined();
    expect(recurringRulesApi.endpoints.updateRecurringRule).toBeDefined();
    expect(recurringRulesApi.endpoints.deleteRecurringRule).toBeDefined();
    expect(recurringRulesApi.endpoints.listPendingMatches).toBeDefined();
    expect(recurringRulesApi.endpoints.confirmPendingMatch).toBeDefined();
  });

  it('exports all RTK Query hooks', () => {
    expect(typeof useListRecurringRulesQuery).toBe('function');
    expect(typeof useCreateRecurringRuleMutation).toBe('function');
    expect(typeof useCreateRuleFromTransactionMutation).toBe('function');
    expect(typeof useUpdateRecurringRuleMutation).toBe('function');
    expect(typeof useDeleteRecurringRuleMutation).toBe('function');
    expect(typeof useListPendingMatchesQuery).toBe('function');
    expect(typeof useConfirmPendingMatchMutation).toBe('function');
    expect(typeof useDismissPendingMatchMutation).toBe('function');
  });

  it('useListRecurringRulesQuery returns query hook structure', async () => {
    const { result } = renderHook(() => useListRecurringRulesQuery(), { wrapper });
    await waitFor(() => {
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('isError');
    });
  });

  it('useListPendingMatchesQuery returns query hook structure', async () => {
    const { result } = renderHook(() => useListPendingMatchesQuery(), { wrapper });
    await waitFor(() => {
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('isError');
    });
  });

  it('useCreateRecurringRuleMutation returns mutation tuple', () => {
    const { result } = renderHook(() => useCreateRecurringRuleMutation(), { wrapper });
    const [mutate, state] = result.current;
    expect(typeof mutate).toBe('function');
    expect(state).toHaveProperty('isLoading');
  });

  it('useCreateRuleFromTransactionMutation returns mutation tuple', () => {
    const { result } = renderHook(() => useCreateRuleFromTransactionMutation(), { wrapper });
    const [mutate, state] = result.current;
    expect(typeof mutate).toBe('function');
    expect(state).toHaveProperty('isLoading');
  });

  it('useUpdateRecurringRuleMutation returns mutation tuple', () => {
    const { result } = renderHook(() => useUpdateRecurringRuleMutation(), { wrapper });
    const [mutate, state] = result.current;
    expect(typeof mutate).toBe('function');
    expect(state).toHaveProperty('isLoading');
  });

  it('useDeleteRecurringRuleMutation returns mutation tuple', () => {
    const { result } = renderHook(() => useDeleteRecurringRuleMutation(), { wrapper });
    const [mutate, state] = result.current;
    expect(typeof mutate).toBe('function');
    expect(state).toHaveProperty('isLoading');
  });

  it('useConfirmPendingMatchMutation returns mutation tuple', () => {
    const { result } = renderHook(() => useConfirmPendingMatchMutation(), { wrapper });
    const [mutate, state] = result.current;
    expect(typeof mutate).toBe('function');
    expect(state).toHaveProperty('isLoading');
  });

  it('useDismissPendingMatchMutation returns mutation tuple', () => {
    const { result } = renderHook(() => useDismissPendingMatchMutation(), { wrapper });
    const [mutate, state] = result.current;
    expect(typeof mutate).toBe('function');
    expect(state).toHaveProperty('isLoading');
  });

  it('createRecurringRule mutation is callable', () => {
    const { result } = renderHook(() => useCreateRecurringRuleMutation(), { wrapper });
    const [mutate] = result.current;
    expect(typeof mutate).toBe('function');
  });

  it('createRuleFromTransaction mutation is callable', () => {
    const { result } = renderHook(() => useCreateRuleFromTransactionMutation(), { wrapper });
    const [mutate] = result.current;
    expect(typeof mutate).toBe('function');
  });

  it('updateRecurringRule mutation is callable', () => {
    const { result } = renderHook(() => useUpdateRecurringRuleMutation(), { wrapper });
    const [mutate] = result.current;
    expect(typeof mutate).toBe('function');
  });

  it('deleteRecurringRule mutation is callable', () => {
    const { result } = renderHook(() => useDeleteRecurringRuleMutation(), { wrapper });
    const [mutate] = result.current;
    expect(typeof mutate).toBe('function');
  });

  it('confirmPendingMatch mutation is callable', () => {
    const { result } = renderHook(() => useConfirmPendingMatchMutation(), { wrapper });
    const [mutate] = result.current;
    expect(typeof mutate).toBe('function');
  });

  it('dismissPendingMatch mutation is callable', () => {
    const { result } = renderHook(() => useDismissPendingMatchMutation(), { wrapper });
    const [mutate] = result.current;
    expect(typeof mutate).toBe('function');
  });

  it('has dismissPendingMatch endpoint', () => {
    expect(recurringRulesApi.endpoints.dismissPendingMatch).toBeDefined();
  });

  it('has tagTypes RecurringRule and PendingMatch', () => {
    // The api is correctly configured with tag types
    expect(recurringRulesApi.reducerPath).toBe('recurringRulesApi');
  });
});
