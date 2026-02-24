import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface TransactionFilters {
  from: string | undefined;
  to: string | undefined;
  categoryId: string | undefined;
  direction: 'debit' | 'credit' | undefined;
  search: string;
  accountId: string | undefined;
}

export interface TransactionsState {
  filters: TransactionFilters;
}

const initialState: TransactionsState = {
  filters: {
    from: undefined,
    to: undefined,
    categoryId: undefined,
    direction: undefined,
    search: '',
    accountId: undefined,
  },
};

const transactionsSlice = createSlice({
  name: 'transactions',
  initialState,
  reducers: {
    setFilter(state, action: PayloadAction<Partial<TransactionFilters>>) {
      Object.assign(state.filters, action.payload);
    },
    resetFilters(state) {
      state.filters = initialState.filters;
    },
  },
});

export const { setFilter, resetFilters } = transactionsSlice.actions;
export default transactionsSlice.reducer;
