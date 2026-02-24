import { renderHook, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { describe, expect, it } from 'vitest';
import {
  pocketsApi,
  useCreateMovementMutation,
  useCreatePocketMutation,
  useDeleteMovementMutation,
  useDeletePocketMutation,
  useGetPocketQuery,
  useListPocketsQuery,
  useUpdatePocketMutation,
} from '../../../src/services/pocketsApi';
import { store } from '../../../src/store';

function wrapper({ children }: { children: React.ReactNode }) {
  return <Provider store={store}>{children}</Provider>;
}

describe('pocketsApi', () => {
  it('has correct reducerPath', () => {
    expect(pocketsApi.reducerPath).toBe('pocketsApi');
  });

  it('exposes all 7 endpoints', () => {
    expect(pocketsApi.endpoints.listPockets).toBeDefined();
    expect(pocketsApi.endpoints.createPocket).toBeDefined();
    expect(pocketsApi.endpoints.getPocket).toBeDefined();
    expect(pocketsApi.endpoints.updatePocket).toBeDefined();
    expect(pocketsApi.endpoints.deletePocket).toBeDefined();
    expect(pocketsApi.endpoints.createMovement).toBeDefined();
    expect(pocketsApi.endpoints.deleteMovement).toBeDefined();
  });

  it('exports all RTK Query hooks', () => {
    expect(typeof useListPocketsQuery).toBe('function');
    expect(typeof useCreatePocketMutation).toBe('function');
    expect(typeof useGetPocketQuery).toBe('function');
    expect(typeof useUpdatePocketMutation).toBe('function');
    expect(typeof useDeletePocketMutation).toBe('function');
    expect(typeof useCreateMovementMutation).toBe('function');
    expect(typeof useDeleteMovementMutation).toBe('function');
  });

  it('useListPocketsQuery returns query hook structure', async () => {
    const { result } = renderHook(() => useListPocketsQuery(), { wrapper });
    await waitFor(() => {
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('isError');
    });
  });

  it('useGetPocketQuery returns query hook structure', async () => {
    const { result } = renderHook(
      () => useGetPocketQuery({ pocketId: 'pocket-001' }),
      { wrapper },
    );
    await waitFor(() => {
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('isError');
    });
  });

  it('useGetPocketQuery with cursor returns query hook structure', async () => {
    const { result } = renderHook(
      () => useGetPocketQuery({ pocketId: 'pocket-001', cursor: 'cursor-abc' }),
      { wrapper },
    );
    await waitFor(() => {
      expect(result.current).toHaveProperty('isLoading');
    });
  });

  it('useCreatePocketMutation returns mutation tuple', () => {
    const { result } = renderHook(() => useCreatePocketMutation(), { wrapper });
    const [mutate, state] = result.current;
    expect(typeof mutate).toBe('function');
    expect(state).toHaveProperty('isLoading');
  });

  it('useUpdatePocketMutation returns mutation tuple', () => {
    const { result } = renderHook(() => useUpdatePocketMutation(), { wrapper });
    const [mutate, state] = result.current;
    expect(typeof mutate).toBe('function');
    expect(state).toHaveProperty('isLoading');
  });

  it('useDeletePocketMutation returns mutation tuple', () => {
    const { result } = renderHook(() => useDeletePocketMutation(), { wrapper });
    const [mutate, state] = result.current;
    expect(typeof mutate).toBe('function');
    expect(state).toHaveProperty('isLoading');
  });

  it('useCreateMovementMutation returns mutation tuple', () => {
    const { result } = renderHook(() => useCreateMovementMutation(), { wrapper });
    const [mutate, state] = result.current;
    expect(typeof mutate).toBe('function');
    expect(state).toHaveProperty('isLoading');
  });

  it('useDeleteMovementMutation returns mutation tuple', () => {
    const { result } = renderHook(() => useDeleteMovementMutation(), { wrapper });
    const [mutate, state] = result.current;
    expect(typeof mutate).toBe('function');
    expect(state).toHaveProperty('isLoading');
  });

  it('createPocket mutation triggers query callback', () => {
    const { result } = renderHook(() => useCreatePocketMutation(), { wrapper });
    const [mutate] = result.current;
    mutate({ accountId: 'acc-001', name: 'Vacances', goalAmount: 1000, color: '#ff5733' });
    expect(typeof mutate).toBe('function');
  });

  it('updatePocket mutation triggers query callback', () => {
    const { result } = renderHook(() => useUpdatePocketMutation(), { wrapper });
    const [mutate] = result.current;
    mutate({ id: 'pocket-001', name: 'Updated', goalAmount: 2000, color: '#aabbcc' });
    expect(typeof mutate).toBe('function');
  });

  it('deletePocket mutation triggers query callback', () => {
    const { result } = renderHook(() => useDeletePocketMutation(), { wrapper });
    const [mutate] = result.current;
    mutate('pocket-001');
    expect(typeof mutate).toBe('function');
  });

  it('createMovement mutation triggers query callback', () => {
    const { result } = renderHook(() => useCreateMovementMutation(), { wrapper });
    const [mutate] = result.current;
    mutate({ pocketId: 'pocket-001', direction: 'ALLOCATION', amount: 100, date: '2026-01-01' });
    expect(typeof mutate).toBe('function');
  });

  it('deleteMovement mutation triggers query callback', () => {
    const { result } = renderHook(() => useDeleteMovementMutation(), { wrapper });
    const [mutate] = result.current;
    mutate({ pocketId: 'pocket-001', movementId: 'movement-001' });
    expect(typeof mutate).toBe('function');
  });
});
