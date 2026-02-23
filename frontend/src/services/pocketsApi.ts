import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from './baseQueryWithReauth';

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface PocketSummaryDto {
  id: string;
  accountLabel: string;
  name: string;
  goalAmount: number;
  allocatedAmount: number;
  progressPct: number;
  color: string;
  createdAt: string;
}

export interface PocketMovementDto {
  id: string;
  direction: 'ALLOCATION' | 'WITHDRAWAL';
  amount: number;
  note: string | null;
  date: string;
  createdAt: string;
}

export interface PocketDetailDto extends PocketSummaryDto {
  movements: PocketMovementDto[];
  nextCursor: string | null;
}

export interface CreatePocketRequest {
  accountLabel: string;
  name: string;
  goalAmount: number;
  color: string;
}

export interface UpdatePocketRequest {
  id: string;
  name?: string;
  goalAmount?: number;
  color?: string;
}

export interface CreateMovementRequest {
  pocketId: string;
  direction: 'ALLOCATION' | 'WITHDRAWAL';
  amount: number;
  note?: string | undefined;
  date: string;
}

export interface DeleteMovementRequest {
  pocketId: string;
  movementId: string;
}

export interface GetPocketParams {
  id: string;
  limit?: number | undefined;
  cursor?: string | undefined;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const pocketsApi = createApi({
  reducerPath: 'pocketsApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Pocket'],
  endpoints: (builder) => ({
    listPockets: builder.query<{ pockets: PocketSummaryDto[] }, void>({
      query: () => '/pockets',
      providesTags: ['Pocket'],
    }),

    createPocket: builder.mutation<PocketSummaryDto, CreatePocketRequest>({
      query: (body) => ({ url: '/pockets', method: 'POST', body }),
      invalidatesTags: ['Pocket'],
    }),

    getPocket: builder.query<PocketDetailDto, GetPocketParams>({
      query: ({ id, limit = 20, cursor }) => ({
        url: `/pockets/${id}`,
        params: { limit, ...(cursor ? { cursor } : {}) },
      }),
      providesTags: (_result, _error, { id }) => [{ type: 'Pocket', id }],
    }),

    updatePocket: builder.mutation<PocketSummaryDto, UpdatePocketRequest>({
      query: ({ id, ...body }) => ({ url: `/pockets/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['Pocket'],
    }),

    deletePocket: builder.mutation<void, string>({
      query: (id) => ({ url: `/pockets/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Pocket'],
    }),

    createMovement: builder.mutation<PocketSummaryDto, CreateMovementRequest>({
      query: ({ pocketId, ...body }) => ({
        url: `/pockets/${pocketId}/movements`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Pocket'],
    }),

    deleteMovement: builder.mutation<PocketSummaryDto, DeleteMovementRequest>({
      query: ({ pocketId, movementId }) => ({
        url: `/pockets/${pocketId}/movements/${movementId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Pocket'],
    }),
  }),
});

export const {
  useListPocketsQuery,
  useCreatePocketMutation,
  useGetPocketQuery,
  useUpdatePocketMutation,
  useDeletePocketMutation,
  useCreateMovementMutation,
  useDeleteMovementMutation,
} = pocketsApi;
