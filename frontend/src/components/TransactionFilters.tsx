import { useIntl } from 'react-intl';
import { cn } from '../lib/cn';
import { useListCategoriesQuery } from '../services/transactionsApi';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  resetFilters,
  setFilter,
  type TransactionFilters as TransactionFiltersState,
} from '../store/transactionsSlice';

const inputCls =
  'rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-kasa-dark outline-none transition-all focus:border-kasa-accent focus:ring-2 focus:ring-kasa-accent/15 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700';

export function TransactionFilters() {
  const intl = useIntl();
  const dispatch = useAppDispatch();
  const filters = useAppSelector((state) => state.transactions.filters);
  const { data: categoriesData } = useListCategoriesQuery();
  const categories = categoriesData?.categories ?? [];

  const hasActiveFilters =
    !!filters.from ||
    !!filters.to ||
    !!filters.categoryId ||
    !!filters.direction ||
    !!filters.search;

  function update(patch: Partial<TransactionFiltersState>) {
    dispatch(setFilter(patch));
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Date range */}
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={filters.from ?? ''}
          onChange={(e) => update({ from: e.target.value || undefined })}
          className={cn(inputCls, 'flex-1')}
          aria-label={intl.formatMessage({ id: 'transactions.filter.period' })}
        />
        <span className="text-slate-400">–</span>
        <input
          type="date"
          value={filters.to ?? ''}
          onChange={(e) => update({ to: e.target.value || undefined })}
          className={cn(inputCls, 'flex-1')}
          aria-label={intl.formatMessage({ id: 'transactions.filter.period' })}
        />
      </div>

      {/* Search */}
      <input
        type="search"
        value={filters.search}
        onChange={(e) => update({ search: e.target.value })}
        placeholder={intl.formatMessage({ id: 'transactions.filter.search' })}
        className={inputCls}
      />

      {/* Category + Direction row */}
      <div className="flex gap-2">
        <select
          value={filters.categoryId ?? ''}
          onChange={(e) => update({ categoryId: e.target.value || undefined })}
          className={cn(inputCls, 'flex-1')}
        >
          <option value="">{intl.formatMessage({ id: 'transactions.filter.category' })}</option>
          <option value="none">{intl.formatMessage({ id: 'transactions.category.none' })}</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>

        <select
          value={filters.direction ?? ''}
          onChange={(e) =>
            update({
              direction:
                e.target.value === 'debit' || e.target.value === 'credit'
                  ? e.target.value
                  : undefined,
            })
          }
          className={cn(inputCls, 'w-36')}
        >
          <option value="">
            {intl.formatMessage({ id: 'transactions.filter.direction.all' })}
          </option>
          <option value="debit">
            {intl.formatMessage({ id: 'transactions.filter.direction.debit' })}
          </option>
          <option value="credit">
            {intl.formatMessage({ id: 'transactions.filter.direction.credit' })}
          </option>
        </select>
      </div>

      {/* Reset */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={() => dispatch(resetFilters())}
          className="self-start text-sm font-medium text-kasa-accent hover:underline"
        >
          {intl.formatMessage({ id: 'transactions.filter.reset' })}
        </button>
      )}
    </div>
  );
}
