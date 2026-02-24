import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from './baseQueryWithReauth';
import { dashboardApi } from './dashboardApi';

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface BankAccountDto {
  id: string;
  accountNumber: string;
  label: string;
  isHidden: boolean;
  currentBalance: number | null;
  currency: string | null;
  createdAt: string;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const bankAccountsApi = createApi({
  reducerPath: 'bankAccountsApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['BankAccount'],
  endpoints: (builder) => ({
    listBankAccounts: builder.query<{ accounts: BankAccountDto[] }, void>({
      query: () => '/bank-accounts',
      providesTags: [{ type: 'BankAccount', id: 'LIST' }],
    }),
    renameBankAccount: builder.mutation<BankAccountDto, { id: string; label: string }>({
      query: ({ id, label }) => ({
        url: `/bank-accounts/${id}`,
        method: 'PATCH',
        body: { label },
      }),
      invalidatesTags: [{ type: 'BankAccount', id: 'LIST' }],
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        await queryFulfilled;
        dispatch(dashboardApi.util.invalidateTags(['Dashboard']));
      },
    }),
    setAccountBalance: builder.mutation<
      BankAccountDto,
      { id: string; balance: number; date: string }
    >({
      query: ({ id, balance, date }) => ({
        url: `/bank-accounts/${id}/balance`,
        method: 'PATCH',
        body: { balance, date },
      }),
      invalidatesTags: [{ type: 'BankAccount', id: 'LIST' }],
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        await queryFulfilled;
        dispatch(dashboardApi.util.invalidateTags(['Dashboard']));
      },
    }),
    setAccountHidden: builder.mutation<BankAccountDto, { id: string; isHidden: boolean }>({
      query: ({ id, isHidden }) => ({
        url: `/bank-accounts/${id}/hidden`,
        method: 'PATCH',
        body: { isHidden },
      }),
      invalidatesTags: [{ type: 'BankAccount', id: 'LIST' }],
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        await queryFulfilled;
        dispatch(dashboardApi.util.invalidateTags(['Dashboard']));
      },
    }),
  }),
});

export const {
  useListBankAccountsQuery,
  useRenameBankAccountMutation,
  useSetAccountBalanceMutation,
  useSetAccountHiddenMutation,
} = bankAccountsApi;
