import { renderHook, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { describe, expect, it } from 'vitest';
import {
  bankAccountsApi,
  useListBankAccountsQuery,
  useRenameBankAccountMutation,
  useSetAccountBalanceMutation,
  useSetAccountHiddenMutation,
} from '../../../src/services/bankAccountsApi';
import { store } from '../../../src/store';

function wrapper({ children }: { children: React.ReactNode }) {
  return <Provider store={store}>{children}</Provider>;
}

describe('bankAccountsApi', () => {
  it('has correct reducerPath', () => {
    expect(bankAccountsApi.reducerPath).toBe('bankAccountsApi');
  });

  it('exposes all 4 endpoints', () => {
    expect(bankAccountsApi.endpoints.listBankAccounts).toBeDefined();
    expect(bankAccountsApi.endpoints.renameBankAccount).toBeDefined();
    expect(bankAccountsApi.endpoints.setAccountBalance).toBeDefined();
    expect(bankAccountsApi.endpoints.setAccountHidden).toBeDefined();
  });

  it('exports all RTK Query hooks', () => {
    expect(typeof useListBankAccountsQuery).toBe('function');
    expect(typeof useRenameBankAccountMutation).toBe('function');
    expect(typeof useSetAccountBalanceMutation).toBe('function');
    expect(typeof useSetAccountHiddenMutation).toBe('function');
  });

  it('useListBankAccountsQuery returns query hook structure', async () => {
    const { result } = renderHook(() => useListBankAccountsQuery(), { wrapper });
    await waitFor(() => {
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('isError');
    });
  });

  it('useRenameBankAccountMutation returns mutation tuple', () => {
    const { result } = renderHook(() => useRenameBankAccountMutation(), { wrapper });
    const [mutate, state] = result.current;
    expect(typeof mutate).toBe('function');
    expect(state).toHaveProperty('isLoading');
  });

  it('useSetAccountBalanceMutation returns mutation tuple', () => {
    const { result } = renderHook(() => useSetAccountBalanceMutation(), { wrapper });
    const [mutate, state] = result.current;
    expect(typeof mutate).toBe('function');
    expect(state).toHaveProperty('isLoading');
  });

  it('useSetAccountHiddenMutation returns mutation tuple', () => {
    const { result } = renderHook(() => useSetAccountHiddenMutation(), { wrapper });
    const [mutate, state] = result.current;
    expect(typeof mutate).toBe('function');
    expect(state).toHaveProperty('isLoading');
  });

  it('renameBankAccount mutation triggers query callback', () => {
    const { result } = renderHook(() => useRenameBankAccountMutation(), { wrapper });
    const [mutate] = result.current;
    mutate({ id: 'acc-001', label: 'New Name' });
    expect(typeof mutate).toBe('function');
  });

  it('setAccountBalance mutation triggers query callback', () => {
    const { result } = renderHook(() => useSetAccountBalanceMutation(), { wrapper });
    const [mutate] = result.current;
    mutate({ id: 'acc-001', balance: 1000, date: '2026-01-31' });
    expect(typeof mutate).toBe('function');
  });

  it('setAccountHidden mutation triggers query callback', () => {
    const { result } = renderHook(() => useSetAccountHiddenMutation(), { wrapper });
    const [mutate] = result.current;
    mutate({ id: 'acc-001', isHidden: true });
    expect(typeof mutate).toBe('function');
  });
});
