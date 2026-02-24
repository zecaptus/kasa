import { useState } from 'react';
import { useIntl } from 'react-intl';
import { cn } from '../lib/cn';
import { inputCls } from '../lib/inputCls';
import { useListBankAccountsQuery } from '../services/bankAccountsApi';
import { useListCategoriesQuery } from '../services/transactionsApi';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  resetFilters,
  setFilter,
  type TransactionFilters as TransactionFiltersState,
} from '../store/transactionsSlice';

// ─── Chevron icon ──────────────────────────────────────────────────────────────

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className={cn('size-3 shrink-0 transition-transform duration-150', open && 'rotate-180')}
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path d="M2 4l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Filter icon ──────────────────────────────────────────────────────────────

function FilterIcon() {
  return (
    <svg
      className="size-3.5 shrink-0"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path d="M2 4h12M4 8h8M6 12h4" strokeLinecap="round" />
    </svg>
  );
}

// ─── AdvancedFilters ──────────────────────────────────────────────────────────

interface AdvancedFiltersProps {
  filters: TransactionFiltersState;
  categories: { id: string; name: string }[];
  accounts: { id: string; label: string; accountNumber: string }[];
  hasAnyActive: boolean;
  update: (patch: Partial<TransactionFiltersState>) => void;
  onReset: () => void;
}

function parseDirection(value: string): 'debit' | 'credit' | undefined {
  return value === 'debit' || value === 'credit' ? value : undefined;
}

function AdvancedFilters({
  filters,
  categories,
  accounts,
  hasAnyActive,
  update,
  onReset,
}: AdvancedFiltersProps) {
  const intl = useIntl();
  return (
    <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-900/60">
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={filters.from ?? ''}
          onChange={(e) => update({ from: e.target.value || undefined })}
          className={cn(inputCls(), 'flex-1')}
          aria-label={intl.formatMessage({ id: 'transactions.filter.period' })}
        />
        <span className="shrink-0 text-slate-400">–</span>
        <input
          type="date"
          value={filters.to ?? ''}
          onChange={(e) => update({ to: e.target.value || undefined })}
          className={cn(inputCls(), 'flex-1')}
          aria-label={intl.formatMessage({ id: 'transactions.filter.period' })}
        />
      </div>

      {accounts.length > 0 && (
        <select
          value={filters.accountId ?? ''}
          onChange={(e) => update({ accountId: e.target.value || undefined })}
          className={inputCls()}
        >
          <option value="">{intl.formatMessage({ id: 'transactions.filter.account' })}</option>
          {accounts.map((acc) => (
            <option key={acc.id} value={acc.id}>
              {acc.label || acc.accountNumber}
            </option>
          ))}
        </select>
      )}

      <div className="flex gap-2">
        <select
          value={filters.categoryId ?? ''}
          onChange={(e) => update({ categoryId: e.target.value || undefined })}
          className={cn(inputCls(), 'flex-1')}
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
          onChange={(e) => update({ direction: parseDirection(e.target.value) })}
          className={cn(inputCls(), 'w-36')}
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

      {hasAnyActive && (
        <button
          type="button"
          onClick={onReset}
          className="text-sm font-medium text-kasa-accent hover:underline"
        >
          {intl.formatMessage({ id: 'transactions.filter.reset' })}
        </button>
      )}
    </div>
  );
}

// ─── TransactionFilters ───────────────────────────────────────────────────────

export function TransactionFilters() {
  const intl = useIntl();
  const dispatch = useAppDispatch();
  const filters = useAppSelector((state) => state.transactions.filters);
  const { data: categoriesData } = useListCategoriesQuery();
  const { data: accountsData } = useListBankAccountsQuery();
  const categories = categoriesData?.categories ?? [];
  const accounts = accountsData?.accounts ?? [];

  const advancedCount = [
    filters.from,
    filters.to,
    filters.categoryId,
    filters.direction,
    filters.accountId,
  ].filter(Boolean).length;

  const [open, setOpen] = useState(advancedCount > 0);

  const hasAnyActive = advancedCount > 0 || !!filters.search;

  function update(patch: Partial<TransactionFiltersState>) {
    dispatch(setFilter(patch));
  }

  const toggleBtnCls = cn(
    'flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition-colors',
    open || advancedCount > 0
      ? 'border-kasa-accent bg-kasa-accent/5 text-kasa-accent'
      : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:border-slate-700 dark:text-slate-400 dark:hover:text-slate-300',
  );

  return (
    <div className="space-y-2">
      {/* Row: search + toggle */}
      <div className="flex gap-2">
        <input
          type="search"
          value={filters.search}
          onChange={(e) => update({ search: e.target.value })}
          placeholder={intl.formatMessage({ id: 'transactions.filter.search' })}
          className={cn(inputCls(), 'flex-1')}
        />
        <button type="button" onClick={() => setOpen((v) => !v)} className={toggleBtnCls}>
          <FilterIcon />
          {intl.formatMessage({ id: 'transactions.filters.title' })}
          {advancedCount > 0 && (
            <span className="flex size-4 items-center justify-center rounded-full bg-kasa-accent text-[10px] font-bold text-white">
              {advancedCount}
            </span>
          )}
          <Chevron open={open} />
        </button>
      </div>

      {/* Collapsible advanced filters */}
      {open && (
        <AdvancedFilters
          filters={filters}
          categories={categories}
          accounts={accounts}
          hasAnyActive={hasAnyActive}
          update={update}
          onReset={() => dispatch(resetFilters())}
        />
      )}
    </div>
  );
}
