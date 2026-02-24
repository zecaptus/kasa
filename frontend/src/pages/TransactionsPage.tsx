import { useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { ExpenseForm } from '../components/ExpenseForm';
import { TransactionDetail } from '../components/TransactionDetail';
import { TransactionFilters } from '../components/TransactionFilters';
import { UnifiedTransactionList } from '../components/UnifiedTransactionList';
import {
  type ListTransactionsParams,
  transactionsApi,
  type UnifiedTransactionDto,
  useListTransactionsQuery,
} from '../services/transactionsApi';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import type { TransactionFilters as Filters } from '../store/transactionsSlice';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildParams(filters: Filters, cursor: string | undefined): ListTransactionsParams {
  const p: ListTransactionsParams = { limit: 50 };
  if (filters.from) p.from = filters.from;
  if (filters.to) p.to = filters.to;
  if (filters.categoryId) p.categoryId = filters.categoryId;
  if (filters.direction) p.direction = filters.direction;
  if (filters.search) p.search = filters.search;
  if (filters.accountId) p.accountId = filters.accountId;
  if (cursor) p.cursor = cursor;
  return p;
}

function filtersKey(f: Filters): string {
  return [f.from, f.to, f.categoryId, f.direction, f.search, f.accountId].join('|');
}

// ─── AddButton ────────────────────────────────────────────────────────────────

function AddButton({ onClick }: { onClick: () => void }) {
  const intl = useIntl();
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-xl bg-kasa-accent px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-kasa-accent-hover active:scale-[0.98]"
    >
      <span className="text-base leading-none">+</span>
      {intl.formatMessage({ id: 'transactions.add' })}
    </button>
  );
}

// ─── LoadMoreButton ───────────────────────────────────────────────────────────

function LoadMoreButton({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  const intl = useIntl();
  return (
    <div className="mt-4 flex justify-center">
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
      >
        {loading ? '…' : intl.formatMessage({ id: 'transactions.loadMore' })}
      </button>
    </div>
  );
}

// ─── ExpenseModal ─────────────────────────────────────────────────────────────

function ExpenseModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-white p-6 shadow-xl sm:inset-0 sm:m-auto sm:h-fit sm:max-w-md sm:rounded-2xl dark:bg-slate-900"
      >
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
        >
          ✕
        </button>
        <ExpenseForm onSuccess={onSuccess} />
      </div>
    </>
  );
}

// ─── TransactionsPage ─────────────────────────────────────────────────────────

export function TransactionsPage() {
  const intl = useIntl();
  const dispatch = useAppDispatch();
  const filters = useAppSelector((state) => state.transactions.filters);

  const [selected, setSelected] = useState<UnifiedTransactionDto | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [extra, setExtra] = useState<UnifiedTransactionDto[]>([]);

  // Reset pagination when filters change
  const prevKey = useRef(filtersKey(filters));
  useEffect(() => {
    const key = filtersKey(filters);
    if (prevKey.current !== key) {
      prevKey.current = key;
      setCursor(undefined);
      setExtra([]);
    }
  }, [filters]);

  const { data, isLoading, isFetching } = useListTransactionsQuery(buildParams(filters, cursor));

  const currentPage = data?.transactions ?? [];
  const allTransactions = [...extra, ...currentPage];

  function handleLoadMore() {
    if (data?.nextCursor && !isFetching) {
      setExtra((prev) => [...prev, ...currentPage]);
      setCursor(data.nextCursor);
    }
  }

  function handleExpenseSuccess() {
    setShowForm(false);
    dispatch(transactionsApi.util.invalidateTags(['Transaction']));
    setCursor(undefined);
    setExtra([]);
  }

  const showSkeleton = isLoading && extra.length === 0;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-kasa-dark dark:text-slate-100">
          {intl.formatMessage({ id: 'transactions.title' })}
        </h1>
        <AddButton onClick={() => setShowForm(true)} />
      </div>

      {/* Filters */}
      <div className="mb-4">
        <TransactionFilters />
      </div>

      {/* Totals */}
      {data?.totals && allTransactions.length > 0 && (
        <div className="mb-3 flex gap-4 text-sm">
          <span className="text-slate-500">
            {intl.formatMessage({ id: 'transactions.totals.debit' })}:{' '}
            <span className="font-semibold text-red-600">
              {intl.formatNumber(data.totals.debit, { style: 'currency', currency: 'EUR' })}
            </span>
          </span>
          <span className="text-slate-500">
            {intl.formatMessage({ id: 'transactions.totals.credit' })}:{' '}
            <span className="font-semibold text-green-600">
              {intl.formatNumber(data.totals.credit, { style: 'currency', currency: 'EUR' })}
            </span>
          </span>
        </div>
      )}

      {/* Loading skeleton */}
      {showSkeleton && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-700" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!showSkeleton && allTransactions.length === 0 && (
        <p className="text-sm text-slate-500">{intl.formatMessage({ id: 'transactions.empty' })}</p>
      )}

      {/* List */}
      <UnifiedTransactionList transactions={allTransactions} onSelect={setSelected} />

      {/* Load more */}
      {data?.nextCursor && <LoadMoreButton onClick={handleLoadMore} loading={isFetching} />}

      {/* Transaction detail panel */}
      <TransactionDetail transaction={selected} onClose={() => setSelected(null)} />

      {/* Add expense modal */}
      {showForm && (
        <ExpenseModal onClose={() => setShowForm(false)} onSuccess={handleExpenseSuccess} />
      )}
    </div>
  );
}
