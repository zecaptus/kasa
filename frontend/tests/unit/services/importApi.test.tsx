import { renderHook, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { describe, expect, it } from 'vitest';
import {
  useConfirmReconciliationMutation,
  useCreateExpenseMutation,
  useDeleteExpenseMutation,
  useGetExpensesQuery,
  useGetSessionQuery,
  useGetSessionsQuery,
  useUndoReconciliationMutation,
  useUpdateTransactionStatusMutation,
  useUploadCsvMutation,
} from '../../../src/services/importApi';
import { store } from '../../../src/store';

function wrapper({ children }: { children: React.ReactNode }) {
  return <Provider store={store}>{children}</Provider>;
}

describe('importApi hooks', () => {
  it('useUploadCsvMutation returns mutation hook', () => {
    const { result } = renderHook(() => useUploadCsvMutation(), { wrapper });
    expect(result.current).toBeDefined();
    expect(Array.isArray(result.current)).toBe(true);
  });

  it('useGetSessionsQuery returns query hook', () => {
    const { result } = renderHook(() => useGetSessionsQuery({}), { wrapper });
    expect(result.current).toBeDefined();
    expect(result.current).toHaveProperty('isLoading');
  });

  it('useGetSessionQuery returns query hook', () => {
    const { result } = renderHook(() => useGetSessionQuery('test-id', { skip: true }), { wrapper });
    expect(result.current).toBeDefined();
    expect(result.current).toHaveProperty('isLoading');
  });

  it('useUpdateTransactionStatusMutation returns mutation hook', () => {
    const { result } = renderHook(() => useUpdateTransactionStatusMutation(), { wrapper });
    expect(result.current).toBeDefined();
    expect(Array.isArray(result.current)).toBe(true);
  });

  it('useGetExpensesQuery returns query hook', () => {
    const { result } = renderHook(() => useGetExpensesQuery({}), { wrapper });
    expect(result.current).toBeDefined();
    expect(result.current).toHaveProperty('isLoading');
  });

  it('useCreateExpenseMutation returns mutation hook', () => {
    const { result } = renderHook(() => useCreateExpenseMutation(), { wrapper });
    expect(result.current).toBeDefined();
    expect(Array.isArray(result.current)).toBe(true);
  });

  it('useDeleteExpenseMutation returns mutation hook', () => {
    const { result } = renderHook(() => useDeleteExpenseMutation(), { wrapper });
    expect(result.current).toBeDefined();
    expect(Array.isArray(result.current)).toBe(true);
  });

  it('useConfirmReconciliationMutation returns mutation hook', () => {
    const { result } = renderHook(() => useConfirmReconciliationMutation(), { wrapper });
    expect(result.current).toBeDefined();
    expect(Array.isArray(result.current)).toBe(true);
  });

  it('useUndoReconciliationMutation returns mutation hook', () => {
    const { result } = renderHook(() => useUndoReconciliationMutation(), { wrapper });
    expect(result.current).toBeDefined();
    expect(Array.isArray(result.current)).toBe(true);
  });

  it('query hooks have correct structure', async () => {
    const { result } = renderHook(() => useGetSessionsQuery({ limit: 10 }), { wrapper });

    await waitFor(() => {
      expect(result.current).toHaveProperty('data');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('isSuccess');
      expect(result.current).toHaveProperty('isError');
    });
  });

  it('mutation hooks have correct structure', () => {
    const { result } = renderHook(() => useCreateExpenseMutation(), { wrapper });

    const [mutate, mutationResult] = result.current;
    expect(typeof mutate).toBe('function');
    expect(mutationResult).toHaveProperty('isLoading');
    expect(mutationResult).toHaveProperty('isSuccess');
    expect(mutationResult).toHaveProperty('isError');
  });
});
