import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from './baseQueryWithReauth';

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export type CategorySource = 'NONE' | 'AUTO' | 'AI' | 'MANUAL';
export type TransactionType = 'IMPORTED_TRANSACTION' | 'MANUAL_EXPENSE';

export interface CategoryDto {
  id: string;
  name: string;
  slug: string;
  color: string;
  isSystem: boolean;
  userId: string | null;
  createdAt: string;
}

export interface CategoryRuleDto {
  id: string;
  keyword: string;
  categoryId: string;
  isSystem: boolean;
  userId: string | null;
  createdAt: string;
  categorized?: number;
  transactionCount?: number;
}

export interface TransferLabelRuleDto {
  id: string;
  userId: string | null;
  keyword: string;
  label: string;
  isSystem: boolean;
  createdAt: string;
  transactionCount?: number;
}

export interface UnifiedTransactionDto {
  id: string;
  type: TransactionType;
  date: string;
  label: string;
  detail: string | null;
  amount: number;
  direction: 'debit' | 'credit' | null;
  status: string | null;
  categoryId: string | null;
  categorySource: CategorySource;
  category: CategoryDto | null;
  recurringPatternId: string | null;
  transferPeerId: string | null;
  transferPeerAccountLabel: string | null;
  transferLabel: string | null;
  accountId: string | null;
  accountLabel: string | null;
}

export interface TransactionTotals {
  debit: number;
  credit: number;
}

export interface TransactionsResponse {
  transactions: UnifiedTransactionDto[];
  nextCursor: string | null;
  totals: TransactionTotals;
}

export interface ListTransactionsParams {
  limit?: number;
  cursor?: string;
  from?: string;
  to?: string;
  categoryId?: string;
  direction?: 'debit' | 'credit';
  search?: string;
  accountId?: string;
  transferLabel?: string;
}

export interface RuleSuggestionDto {
  keyword: string;
  matchCount: number;
}

export interface TransferCandidateDto {
  id: string;
  label: string;
  date: string;
  amount: number;
  direction: 'debit' | 'credit';
  accountLabel: string;
  linkedToAccountLabel: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function buildTransactionParams(p: ListTransactionsParams): Record<string, unknown> {
  const params: Record<string, unknown> = { limit: p.limit ?? 50 };
  if (p.cursor) params.cursor = p.cursor;
  if (p.from) params.from = p.from;
  if (p.to) params.to = p.to;
  if (p.categoryId) params.categoryId = p.categoryId;
  if (p.direction) params.direction = p.direction;
  if (p.search) params.search = p.search;
  if (p.accountId) params.accountId = p.accountId;
  if (p.transferLabel) params.transferLabel = p.transferLabel;
  return params;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const transactionsApi = createApi({
  reducerPath: 'transactionsApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Transaction', 'Category', 'CategoryRule', 'TransferLabelRule'],
  endpoints: (builder) => ({
    listTransactions: builder.query<TransactionsResponse, ListTransactionsParams>({
      query: (params: ListTransactionsParams = {}) => ({
        url: '/transactions',
        params: buildTransactionParams(params),
      }),
      providesTags: ['Transaction'],
    }),

    getTransaction: builder.query<UnifiedTransactionDto, string>({
      query: (id) => `/transactions/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Transaction', id }],
    }),

    updateTransactionCategory: builder.mutation<
      UnifiedTransactionDto,
      { id: string; categoryId: string | null }
    >({
      query: ({ id, categoryId }) => ({
        url: `/transactions/${id}/category`,
        method: 'PATCH',
        body: { categoryId },
      }),
      invalidatesTags: ['Transaction'],
    }),

    updateTransactionRecurring: builder.mutation<
      UnifiedTransactionDto,
      { id: string; recurringPatternId: string | null }
    >({
      query: ({ id, recurringPatternId }) => ({
        url: `/transactions/${id}/recurring`,
        method: 'PATCH',
        body: { recurringPatternId },
      }),
      invalidatesTags: ['Transaction'],
    }),

    listCategories: builder.query<{ categories: CategoryDto[] }, void>({
      query: () => '/categories',
      providesTags: ['Category'],
    }),

    createCategory: builder.mutation<CategoryDto, { name: string; color: string }>({
      query: (body) => ({
        url: '/categories',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Category'],
    }),

    updateCategory: builder.mutation<CategoryDto, { id: string; name?: string; color?: string }>({
      query: ({ id, ...body }) => ({
        url: `/categories/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['Category'],
    }),

    deleteCategory: builder.mutation<{ affectedTransactions: number }, string>({
      query: (id) => ({
        url: `/categories/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Category', 'Transaction'],
    }),

    listCategoryRules: builder.query<{ rules: CategoryRuleDto[] }, void>({
      query: () => '/categories/rules',
      providesTags: ['CategoryRule'],
    }),

    createCategoryRule: builder.mutation<CategoryRuleDto, { keyword: string; categoryId: string }>({
      query: (body) => ({
        url: '/categories/rules',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['CategoryRule', 'Transaction'],
    }),

    updateCategoryRule: builder.mutation<
      CategoryRuleDto,
      { id: string; keyword?: string; categoryId?: string }
    >({
      query: ({ id, ...body }) => ({
        url: `/categories/rules/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['CategoryRule', 'Transaction'],
    }),

    deleteCategoryRule: builder.mutation<void, string>({
      query: (id) => ({
        url: `/categories/rules/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['CategoryRule'],
    }),

    recategorizeAll: builder.mutation<{ categorized: number }, void>({
      query: () => ({ url: '/categories/recategorize-all', method: 'POST' }),
      invalidatesTags: ['Transaction', 'CategoryRule'],
    }),

    listRuleSuggestions: builder.query<{ suggestions: RuleSuggestionDto[] }, void>({
      query: () => '/categories/suggestions',
      providesTags: ['CategoryRule'],
    }),

    listTransferCandidates: builder.query<
      { candidates: TransferCandidateDto[] },
      { id: string; accountId: string }
    >({
      query: ({ id, accountId }) => ({
        url: `/transactions/${id}/transfer-candidates`,
        params: { accountId },
      }),
      providesTags: (_result, _error, { id }) => [{ type: 'Transaction', id }],
    }),

    updateTransferPeer: builder.mutation<
      UnifiedTransactionDto,
      { id: string; transferPeerId: string | null }
    >({
      query: ({ id, transferPeerId }) => ({
        url: `/transactions/${id}/transfer-peer`,
        method: 'PATCH',
        body: { transferPeerId },
      }),
      invalidatesTags: ['Transaction'],
    }),

    getAiStatus: builder.query<{ enabled: boolean }, void>({
      query: () => '/categories/ai-status',
    }),

    aiCategorize: builder.mutation<
      { categorized: number; rulesCreated: number; error?: string },
      void
    >({
      query: () => ({ url: '/categories/ai-categorize', method: 'POST' }),
      invalidatesTags: ['Transaction', 'CategoryRule'],
    }),

    listTransferLabelRules: builder.query<{ rules: TransferLabelRuleDto[] }, void>({
      query: () => '/transfer-label-rules',
      providesTags: ['TransferLabelRule'],
    }),

    createTransferLabelRule: builder.mutation<
      TransferLabelRuleDto & { labeled: number },
      { keyword: string; label: string }
    >({
      query: (body) => ({
        url: '/transfer-label-rules',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['TransferLabelRule', 'Transaction'],
    }),

    updateTransferLabelRule: builder.mutation<
      TransferLabelRuleDto & { labeled: number },
      { id: string; keyword?: string; label?: string }
    >({
      query: ({ id, ...body }) => ({
        url: `/transfer-label-rules/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['TransferLabelRule', 'Transaction'],
    }),

    deleteTransferLabelRule: builder.mutation<void, string>({
      query: (id) => ({
        url: `/transfer-label-rules/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['TransferLabelRule'],
    }),

    updateTransferLabel: builder.mutation<
      UnifiedTransactionDto,
      { id: string; label: string | null }
    >({
      query: ({ id, label }) => ({
        url: `/transactions/${id}/transfer-label`,
        method: 'PATCH',
        body: { label },
      }),
      invalidatesTags: ['Transaction'],
    }),
  }),
});

export const {
  useListTransactionsQuery,
  useGetTransactionQuery,
  useUpdateTransactionCategoryMutation,
  useUpdateTransactionRecurringMutation,
  useListCategoriesQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
  useListCategoryRulesQuery,
  useCreateCategoryRuleMutation,
  useUpdateCategoryRuleMutation,
  useDeleteCategoryRuleMutation,
  useRecategorizeAllMutation,
  useListRuleSuggestionsQuery,
  useListTransferCandidatesQuery,
  useUpdateTransferPeerMutation,
  useGetAiStatusQuery,
  useAiCategorizeMutation,
  useListTransferLabelRulesQuery,
  useCreateTransferLabelRuleMutation,
  useUpdateTransferLabelRuleMutation,
  useDeleteTransferLabelRuleMutation,
  useUpdateTransferLabelMutation,
} = transactionsApi;
