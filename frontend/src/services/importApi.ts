import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from './baseQueryWithReauth';

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export type ReconciliationStatus = 'UNRECONCILED' | 'RECONCILED' | 'IGNORED';

export interface ReconciliationCounts {
  total: number;
  reconciled: number;
  awaitingReview: number;
  unreconciled: number;
  ignored: number;
}

export interface ReconciliationDto {
  id: string;
  importedTransactionId: string;
  manualExpenseId: string;
  confidenceScore: number;
  isAutoMatched: boolean;
  reconciledAt: string;
}

export interface ReconciliationCandidate {
  expense: ManualExpenseDto;
  score: number;
  confidence: 'high' | 'plausible' | 'weak';
}

export interface ImportedTransactionDto {
  id: string;
  sessionId: string;
  accountingDate: string;
  valueDate: string | null;
  label: string;
  detail: string | null;
  debit: number | null;
  credit: number | null;
  status: ReconciliationStatus;
  reconciliation: ReconciliationDto | null;
  candidates?: ReconciliationCandidate[];
}

export interface ImportSessionSummary {
  id: string;
  filename: string;
  importedAt: string;
  counts: ReconciliationCounts;
}

export interface ImportSessionDetail extends ImportSessionSummary {
  transactions: ImportedTransactionDto[];
  newCount?: number;
  skippedCount?: number;
  accountId?: string;
  accountNumber?: string | null;
  exportStartDate?: string | null;
  exportEndDate?: string | null;
  transactionCount?: number | null;
  balanceDate?: string | null;
  balance?: number | null;
  currency?: string | null;
  balanceMissing?: boolean;
}

export interface ManualExpenseDto {
  id: string;
  amount: number;
  label: string;
  date: string;
  categoryId: string | null;
  createdAt: string;
  reconciliation: ReconciliationDto | null;
}

export interface ReconciliationResults {
  autoReconciled: ReconciliationDto[];
  awaitingReview: ImportedTransactionDto[];
}

export interface CreateExpenseRequest {
  amount: number;
  label: string;
  date: string;
  categoryId: string;
}

export interface SessionsResponse {
  sessions: ImportSessionSummary[];
  nextCursor: string | null;
}

export interface ExpensesResponse {
  expenses: ManualExpenseDto[];
  nextCursor: string | null;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const importApi = createApi({
  reducerPath: 'importApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['ImportSession', 'ManualExpense', 'ImportedTransaction'],
  endpoints: (builder) => ({
    uploadCsv: builder.mutation<ImportSessionDetail, FormData>({
      query: (formData) => ({
        url: '/import/csv',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: ['ImportSession'],
    }),

    getSessions: builder.query<SessionsResponse, { limit?: number; cursor?: string }>({
      query: ({ limit = 20, cursor } = {}) => ({
        url: '/import/sessions',
        params: { limit, ...(cursor ? { cursor } : {}) },
      }),
      providesTags: ['ImportSession'],
    }),

    getSession: builder.query<ImportSessionDetail, string>({
      query: (sessionId) => `/import/sessions/${sessionId}`,
      providesTags: (_result, _error, id) => [{ type: 'ImportSession', id }],
    }),

    updateTransactionStatus: builder.mutation<
      ImportedTransactionDto,
      { transactionId: string; status: 'IGNORED' | 'UNRECONCILED' }
    >({
      query: ({ transactionId, status }) => ({
        url: `/import/transactions/${transactionId}`,
        method: 'PATCH',
        body: { status },
      }),
      invalidatesTags: ['ImportSession', 'ImportedTransaction'],
    }),

    getExpenses: builder.query<
      ExpensesResponse,
      { limit?: number; cursor?: string; from?: string; to?: string; category?: string }
    >({
      query: ({ limit = 50, cursor, from, to, category } = {}) => ({
        url: '/expenses',
        params: {
          limit,
          ...(cursor ? { cursor } : {}),
          ...(from ? { from } : {}),
          ...(to ? { to } : {}),
          ...(category ? { category } : {}),
        },
      }),
      providesTags: ['ManualExpense'],
    }),

    createExpense: builder.mutation<
      { expense: ManualExpenseDto; reconciliationResults: ReconciliationResults },
      CreateExpenseRequest
    >({
      query: (body) => ({
        url: '/expenses',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['ManualExpense', 'ImportSession', 'ImportedTransaction'],
    }),

    deleteExpense: builder.mutation<void, string>({
      query: (expenseId) => ({
        url: `/expenses/${expenseId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['ManualExpense', 'ImportSession', 'ImportedTransaction'],
    }),

    confirmReconciliation: builder.mutation<
      ReconciliationDto,
      { importedTransactionId: string; manualExpenseId: string }
    >({
      query: (body) => ({
        url: '/expenses/reconciliation/confirm',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['ImportSession', 'ManualExpense', 'ImportedTransaction'],
    }),

    undoReconciliation: builder.mutation<void, string>({
      query: (reconciliationId) => ({
        url: `/expenses/reconciliation/${reconciliationId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['ImportSession', 'ManualExpense', 'ImportedTransaction'],
    }),
  }),
});

export const {
  useUploadCsvMutation,
  useGetSessionsQuery,
  useGetSessionQuery,
  useUpdateTransactionStatusMutation,
  useGetExpensesQuery,
  useCreateExpenseMutation,
  useDeleteExpenseMutation,
  useConfirmReconciliationMutation,
  useUndoReconciliationMutation,
} = importApi;
