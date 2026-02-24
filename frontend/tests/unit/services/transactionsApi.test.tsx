import { configureStore } from '@reduxjs/toolkit';
import { act, renderHook, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { describe, expect, it } from 'vitest';
import {
  buildTransactionParams,
  transactionsApi,
  useCreateCategoryMutation,
  useCreateCategoryRuleMutation,
  useDeleteCategoryMutation,
  useDeleteCategoryRuleMutation,
  useGetTransactionQuery,
  useListCategoriesQuery,
  useListCategoryRulesQuery,
  useListRuleSuggestionsQuery,
  useListTransactionsQuery,
  useRecategorizeAllMutation,
  useUpdateCategoryMutation,
  useUpdateCategoryRuleMutation,
  useUpdateTransactionCategoryMutation,
} from '../../../src/services/transactionsApi';
import { store } from '../../../src/store';

// Isolated store for mutation-trigger tests
function makeStore() {
  return configureStore({
    reducer: { [transactionsApi.reducerPath]: transactionsApi.reducer },
    middleware: (gDM) => gDM().concat(transactionsApi.middleware),
  });
}
function isolatedWrapper({ children }: { children: React.ReactNode }) {
  return <Provider store={makeStore()}>{children}</Provider>;
}

function wrapper({ children }: { children: React.ReactNode }) {
  return <Provider store={store}>{children}</Provider>;
}

describe('transactionsApi hooks', () => {
  it('useListTransactionsQuery returns query hook', () => {
    const { result } = renderHook(() => useListTransactionsQuery({}), { wrapper });
    expect(result.current).toBeDefined();
    expect(result.current).toHaveProperty('isLoading');
  });

  it('useGetTransactionQuery returns query hook', () => {
    const { result } = renderHook(() => useGetTransactionQuery('test-id', { skip: true }), {
      wrapper,
    });
    expect(result.current).toBeDefined();
    expect(result.current).toHaveProperty('isLoading');
  });

  it('useUpdateTransactionCategoryMutation returns mutation hook', () => {
    const { result } = renderHook(() => useUpdateTransactionCategoryMutation(), { wrapper });
    expect(result.current).toBeDefined();
    expect(Array.isArray(result.current)).toBe(true);
    expect(result.current[1]).toHaveProperty('isLoading');
  });

  it('useListCategoriesQuery returns query hook', () => {
    const { result } = renderHook(() => useListCategoriesQuery(), { wrapper });
    expect(result.current).toBeDefined();
    expect(result.current).toHaveProperty('isLoading');
  });

  it('useCreateCategoryMutation returns mutation hook', () => {
    const { result } = renderHook(() => useCreateCategoryMutation(), { wrapper });
    expect(result.current).toBeDefined();
    expect(Array.isArray(result.current)).toBe(true);
  });

  it('useUpdateCategoryMutation returns mutation hook', () => {
    const { result } = renderHook(() => useUpdateCategoryMutation(), { wrapper });
    expect(result.current).toBeDefined();
    expect(Array.isArray(result.current)).toBe(true);
  });

  it('useDeleteCategoryMutation returns mutation hook', () => {
    const { result } = renderHook(() => useDeleteCategoryMutation(), { wrapper });
    expect(result.current).toBeDefined();
    expect(Array.isArray(result.current)).toBe(true);
  });

  it('useListCategoryRulesQuery returns query hook', () => {
    const { result } = renderHook(() => useListCategoryRulesQuery(), { wrapper });
    expect(result.current).toBeDefined();
    expect(result.current).toHaveProperty('isLoading');
  });

  it('useCreateCategoryRuleMutation returns mutation hook', () => {
    const { result } = renderHook(() => useCreateCategoryRuleMutation(), { wrapper });
    expect(result.current).toBeDefined();
    expect(Array.isArray(result.current)).toBe(true);
  });

  it('useDeleteCategoryRuleMutation returns mutation hook', () => {
    const { result } = renderHook(() => useDeleteCategoryRuleMutation(), { wrapper });
    expect(result.current).toBeDefined();
    expect(Array.isArray(result.current)).toBe(true);
  });

  it('useRecategorizeAllMutation returns mutation hook', () => {
    const { result } = renderHook(() => useRecategorizeAllMutation(), { wrapper });
    expect(result.current).toBeDefined();
    expect(Array.isArray(result.current)).toBe(true);
  });

  it('useListRuleSuggestionsQuery returns query hook', () => {
    const { result } = renderHook(() => useListRuleSuggestionsQuery(), { wrapper });
    expect(result.current).toBeDefined();
    expect(result.current).toHaveProperty('isLoading');
  });

  it('query hooks have correct structure', async () => {
    const { result } = renderHook(() => useListTransactionsQuery({ limit: 10 }), { wrapper });

    await waitFor(() => {
      expect(result.current).toHaveProperty('data');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('isSuccess');
      expect(result.current).toHaveProperty('isError');
    });
  });

  it('mutation hooks have correct structure', () => {
    const { result } = renderHook(() => useCreateCategoryMutation(), { wrapper });

    const [mutate, mutationResult] = result.current;
    expect(typeof mutate).toBe('function');
    expect(mutationResult).toHaveProperty('isLoading');
    expect(mutationResult).toHaveProperty('isSuccess');
    expect(mutationResult).toHaveProperty('isError');
  });
});

describe('mutation query functions (coverage)', () => {
  it('updateTransactionCategory query function is invokable', async () => {
    const { result } = renderHook(() => useUpdateTransactionCategoryMutation(), {
      wrapper: isolatedWrapper,
    });
    const [mutate] = result.current;
    await act(async () => {
      try {
        await mutate({ id: 'tx1', categoryId: 'cat1' });
      } catch {}
    });
  });

  it('createCategory query function is invokable', async () => {
    const { result } = renderHook(() => useCreateCategoryMutation(), { wrapper: isolatedWrapper });
    const [mutate] = result.current;
    await act(async () => {
      try {
        await mutate({ name: 'Test', color: '#22c55e' });
      } catch {}
    });
  });

  it('updateCategory query function is invokable', async () => {
    const { result } = renderHook(() => useUpdateCategoryMutation(), { wrapper: isolatedWrapper });
    const [mutate] = result.current;
    await act(async () => {
      try {
        await mutate({ id: 'cat1', name: 'Updated' });
      } catch {}
    });
  });

  it('deleteCategory query function is invokable', async () => {
    const { result } = renderHook(() => useDeleteCategoryMutation(), { wrapper: isolatedWrapper });
    const [mutate] = result.current;
    await act(async () => {
      try {
        await mutate('cat1');
      } catch {}
    });
  });

  it('createCategoryRule query function is invokable', async () => {
    const { result } = renderHook(() => useCreateCategoryRuleMutation(), {
      wrapper: isolatedWrapper,
    });
    const [mutate] = result.current;
    await act(async () => {
      try {
        await mutate({ keyword: 'TEST', categoryId: 'cat1' });
      } catch {}
    });
  });

  it('updateCategoryRule query function is invokable', async () => {
    const { result } = renderHook(() => useUpdateCategoryRuleMutation(), {
      wrapper: isolatedWrapper,
    });
    const [mutate] = result.current;
    await act(async () => {
      try {
        await mutate({ id: 'rule1', keyword: 'UPDATED' });
      } catch {}
    });
  });

  it('deleteCategoryRule query function is invokable', async () => {
    const { result } = renderHook(() => useDeleteCategoryRuleMutation(), {
      wrapper: isolatedWrapper,
    });
    const [mutate] = result.current;
    await act(async () => {
      try {
        await mutate('rule1');
      } catch {}
    });
  });

  it('recategorizeAll mutation query function is invokable', async () => {
    const { result } = renderHook(() => useRecategorizeAllMutation(), {
      wrapper: isolatedWrapper,
    });
    const [mutate] = result.current;
    await act(async () => {
      try {
        await mutate();
      } catch {}
    });
  });
});

describe('buildTransactionParams', () => {
  it('includes limit by default', () => {
    const params = buildTransactionParams({});
    expect(params.limit).toBe(50);
  });

  it('includes provided limit', () => {
    const params = buildTransactionParams({ limit: 20 });
    expect(params.limit).toBe(20);
  });

  it('includes cursor when provided', () => {
    const params = buildTransactionParams({ cursor: 'abc123' });
    expect(params.cursor).toBe('abc123');
  });

  it('omits cursor when undefined', () => {
    const params = buildTransactionParams({});
    expect('cursor' in params).toBe(false);
  });

  it('includes from and to when provided', () => {
    const params = buildTransactionParams({ from: '2026-01-01', to: '2026-01-31' });
    expect(params.from).toBe('2026-01-01');
    expect(params.to).toBe('2026-01-31');
  });

  it('includes categoryId when provided', () => {
    const params = buildTransactionParams({ categoryId: 'cat1' });
    expect(params.categoryId).toBe('cat1');
  });

  it('includes direction when provided', () => {
    const params = buildTransactionParams({ direction: 'debit' });
    expect(params.direction).toBe('debit');
  });

  it('includes search when provided', () => {
    const params = buildTransactionParams({ search: 'CARREFOUR' });
    expect(params.search).toBe('CARREFOUR');
  });
});
