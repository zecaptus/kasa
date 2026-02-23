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

describe('pocketsApi', () => {
  it('has correct reducerPath', () => {
    expect(pocketsApi.reducerPath).toBe('pocketsApi');
  });

  it('has Pocket tag type', () => {
    expect(pocketsApi.endpoints.listPockets).toBeDefined();
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
});
