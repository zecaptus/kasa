import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from './baseQueryWithReauth';

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export type RecurrenceFrequency = 'WEEKLY' | 'MONTHLY' | 'ANNUAL';
export type RecurrenceSource = 'AUTO' | 'MANUAL';

export interface RecurringPatternDto {
  id: string;
  label: string;
  keyword: string;
  amount: number | null;
  frequency: RecurrenceFrequency;
  source: RecurrenceSource;
  isActive: boolean;
  nextOccurrenceDate: string | null;
  transactionCount: number;
  lastTransactionDate: string | null;
  transferPeerAccountLabel: string | null;
  createdAt: string;
}

export interface CreateRecurringPatternRequest {
  label: string;
  keyword: string;
  amount?: number | null;
  frequency: RecurrenceFrequency;
}

export interface UpdateRecurringPatternRequest {
  id: string;
  label?: string;
  isActive?: boolean;
  frequency?: RecurrenceFrequency;
  nextOccurrenceDate?: string | null;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const recurringPatternsApi = createApi({
  reducerPath: 'recurringPatternsApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['RecurringPattern'],
  endpoints: (builder) => ({
    listRecurringPatterns: builder.query<{ patterns: RecurringPatternDto[] }, void>({
      query: () => '/recurring-patterns',
      providesTags: ['RecurringPattern'],
    }),

    createRecurringPattern: builder.mutation<RecurringPatternDto, CreateRecurringPatternRequest>({
      query: (body) => ({
        url: '/recurring-patterns',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['RecurringPattern'],
    }),

    updateRecurringPattern: builder.mutation<RecurringPatternDto, UpdateRecurringPatternRequest>({
      query: ({ id, ...body }) => ({
        url: `/recurring-patterns/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['RecurringPattern'],
    }),

    deleteRecurringPattern: builder.mutation<void, string>({
      query: (id) => ({
        url: `/recurring-patterns/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['RecurringPattern'],
    }),
  }),
});

export const {
  useListRecurringPatternsQuery,
  useCreateRecurringPatternMutation,
  useUpdateRecurringPatternMutation,
  useDeleteRecurringPatternMutation,
} = recurringPatternsApi;
