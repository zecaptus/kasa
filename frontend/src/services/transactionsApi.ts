import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from './baseQueryWithReauth';

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export type CategorySource = 'NONE' | 'AUTO' | 'MANUAL';
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
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildTransactionParams(p: ListTransactionsParams): Record<string, unknown> {
  const params: Record<string, unknown> = { limit: p.limit ?? 50 };
  if (p.cursor) params.cursor = p.cursor;
  if (p.from) params.from = p.from;
  if (p.to) params.to = p.to;
  if (p.categoryId) params.categoryId = p.categoryId;
  if (p.direction) params.direction = p.direction;
  if (p.search) params.search = p.search;
  return params;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const transactionsApi = createApi({
  reducerPath: 'transactionsApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Transaction', 'Category', 'CategoryRule'],
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
      invalidatesTags: ['CategoryRule'],
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
      invalidatesTags: ['CategoryRule'],
    }),

    deleteCategoryRule: builder.mutation<void, string>({
      query: (id) => ({
        url: `/categories/rules/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['CategoryRule'],
    }),
  }),
});

export const {
  useListTransactionsQuery,
  useGetTransactionQuery,
  useUpdateTransactionCategoryMutation,
  useListCategoriesQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
  useListCategoryRulesQuery,
  useCreateCategoryRuleMutation,
  useUpdateCategoryRuleMutation,
  useDeleteCategoryRuleMutation,
} = transactionsApi;
