import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from './baseQueryWithReauth';

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface RecentTransactionDto {
  id: string;
  date: string; // YYYY-MM-DD
  label: string;
  amount: number;
  direction: 'debit' | 'credit';
  transferPeerAccountLabel: string | null;
}

export interface AccountSummaryDto {
  accountId: string;
  label: string;
  accountNumber: string;
  isHidden: boolean;
  balance: number;
  monthlyVariation: number;
  currentBalance: number | null;
  balanceDate: string | null;
  endOfMonthPrediction: number | null;
  recentTransactions: RecentTransactionDto[];
}

export interface DashboardSummaryDto {
  totalBalance: number;
  monthlySpending: number;
  monthlyIncome: number;
  netCashFlow: number;
}

export interface CategorySpendingDto {
  categoryId: string | null;
  name: string;
  slug: string;
  color: string;
  amount: number;
}

export interface CategoryComparisonDto {
  currentMonth: CategorySpendingDto[];
  previousMonth: CategorySpendingDto[];
}

export interface DashboardResponseDto {
  summary: DashboardSummaryDto;
  accounts: AccountSummaryDto[];
  categoryComparison: CategoryComparisonDto;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const dashboardApi = createApi({
  reducerPath: 'dashboardApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Dashboard'],
  endpoints: (builder) => ({
    getDashboard: builder.query<DashboardResponseDto, void>({
      query: () => '/dashboard',
      keepUnusedDataFor: 60,
      providesTags: ['Dashboard'],
    }),
  }),
});

export const { useGetDashboardQuery } = dashboardApi;
