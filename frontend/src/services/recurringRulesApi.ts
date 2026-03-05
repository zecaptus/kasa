import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from './baseQueryWithReauth';
import { transactionsApi } from './transactionsApi';

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface RecurringRuleDto {
  id: string;
  label: string;
  keyword: string;
  periodMonths: number;
  anchorDate: string;
  amount: number | null;
  isActive: boolean;
  nextOccurrenceDate: string;
  transactionCount: number;
  lastTransactionDate: string | null;
  accountLabel: string | null;
  createdAt: string;
}

export interface PendingMatchDto {
  id: string;
  ruleId: string;
  ruleLabel: string;
  transactionId: string;
  transactionLabel: string;
  transactionDate: string;
  transactionAmount: number | null;
  score: number;
}

export interface CreateRecurringRuleRequest {
  label: string;
  periodMonths: number;
  amount?: number | null;
  anchorDate?: string;
}

export interface CreateRuleFromTransactionRequest {
  transactionId: string;
  label: string;
  periodMonths: number;
}

export interface UpdateRecurringRuleRequest {
  id: string;
  label?: string;
  isActive?: boolean;
  periodMonths?: number;
  amount?: number | null;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const recurringRulesApi = createApi({
  reducerPath: 'recurringRulesApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['RecurringRule', 'PendingMatch'],
  endpoints: (builder) => ({
    listRecurringRules: builder.query<{ rules: RecurringRuleDto[] }, void>({
      query: () => '/recurring-rules',
      providesTags: ['RecurringRule'],
    }),

    createRecurringRule: builder.mutation<RecurringRuleDto, CreateRecurringRuleRequest>({
      query: (body) => ({
        url: '/recurring-rules',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['RecurringRule'],
    }),

    createRuleFromTransaction: builder.mutation<RecurringRuleDto, CreateRuleFromTransactionRequest>(
      {
        query: (body) => ({
          url: '/recurring-rules/from-transaction',
          method: 'POST',
          body,
        }),
        invalidatesTags: ['RecurringRule'],
        async onQueryStarted(_, { dispatch, queryFulfilled }) {
          await queryFulfilled;
          dispatch(transactionsApi.util.invalidateTags(['Transaction']));
        },
      },
    ),

    updateRecurringRule: builder.mutation<RecurringRuleDto, UpdateRecurringRuleRequest>({
      query: ({ id, ...body }) => ({
        url: `/recurring-rules/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['RecurringRule'],
    }),

    deleteRecurringRule: builder.mutation<void, string>({
      query: (id) => ({
        url: `/recurring-rules/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['RecurringRule'],
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        await queryFulfilled;
        dispatch(transactionsApi.util.invalidateTags(['Transaction']));
      },
    }),

    listPendingMatches: builder.query<{ matches: PendingMatchDto[] }, void>({
      query: () => '/recurring-rules/pending',
      providesTags: ['PendingMatch'],
    }),

    confirmPendingMatch: builder.mutation<void, string>({
      query: (matchId) => ({
        url: `/recurring-rules/pending/${matchId}/confirm`,
        method: 'POST',
      }),
      invalidatesTags: ['PendingMatch'],
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        await queryFulfilled;
        dispatch(transactionsApi.util.invalidateTags(['Transaction']));
      },
    }),

    dismissPendingMatch: builder.mutation<void, string>({
      query: (matchId) => ({
        url: `/recurring-rules/pending/${matchId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['PendingMatch'],
    }),
  }),
});

export const {
  useListRecurringRulesQuery,
  useCreateRecurringRuleMutation,
  useCreateRuleFromTransactionMutation,
  useUpdateRecurringRuleMutation,
  useDeleteRecurringRuleMutation,
  useListPendingMatchesQuery,
  useConfirmPendingMatchMutation,
  useDismissPendingMatchMutation,
} = recurringRulesApi;
