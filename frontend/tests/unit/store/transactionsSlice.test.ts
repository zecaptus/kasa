import { describe, expect, it } from 'vitest';
import transactionsReducer, {
  resetFilters,
  setFilter,
  type TransactionFilters,
} from '../../../src/store/transactionsSlice';

describe('transactionsSlice', () => {
  const initialState = {
    filters: {
      from: undefined,
      to: undefined,
      categoryId: undefined,
      direction: undefined,
      search: '',
    },
  };

  it('initial state has empty filters', () => {
    const state = transactionsReducer(undefined, { type: '@@INIT' });
    expect(state).toEqual(initialState);
  });

  it('setFilter updates a single filter field', () => {
    const state = transactionsReducer(initialState, setFilter({ search: 'grocery' }));
    expect(state.filters.search).toBe('grocery');
  });

  it('setFilter can set direction', () => {
    const state = transactionsReducer(initialState, setFilter({ direction: 'debit' }));
    expect(state.filters.direction).toBe('debit');
  });

  it('resetFilters resets all fields to initial state', () => {
    const modifiedState = {
      filters: {
        from: '2026-01-01',
        to: '2026-01-31',
        categoryId: 'cat-123',
        direction: 'credit' as const,
        search: 'salary',
      },
    };
    const state = transactionsReducer(modifiedState, resetFilters());
    expect(state).toEqual(initialState);
  });

  it('setFilter with multiple fields updates all', () => {
    const patch: Partial<TransactionFilters> = {
      from: '2026-02-01',
      to: '2026-02-28',
      search: 'market',
    };
    const state = transactionsReducer(initialState, setFilter(patch));
    expect(state.filters.from).toBe('2026-02-01');
    expect(state.filters.to).toBe('2026-02-28');
    expect(state.filters.search).toBe('market');
  });
});
