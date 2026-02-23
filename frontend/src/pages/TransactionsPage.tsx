import { useState } from 'react';
import { useIntl } from 'react-intl';
import { TransactionDetail } from '../components/TransactionDetail';
import { TransactionFilters } from '../components/TransactionFilters';
import { UnifiedTransactionList } from '../components/UnifiedTransactionList';
import { type UnifiedTransactionDto, useListTransactionsQuery } from '../services/transactionsApi';
import { useAppSelector } from '../store/hooks';

export function TransactionsPage() {
  const intl = useIntl();
  const filters = useAppSelector((state) => state.transactions.filters);
  const [selected, setSelected] = useState<UnifiedTransactionDto | null>(null);

  const queryParams: import('../services/transactionsApi').ListTransactionsParams = { limit: 50 };
  if (filters.from) queryParams.from = filters.from;
  if (filters.to) queryParams.to = filters.to;
  if (filters.categoryId) queryParams.categoryId = filters.categoryId;
  if (filters.direction) queryParams.direction = filters.direction;
  if (filters.search) queryParams.search = filters.search;

  const { data, isLoading } = useListTransactionsQuery(queryParams);

  const transactions = data?.transactions ?? [];
  const totals = data?.totals;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-4 font-display text-2xl font-semibold tracking-tight text-kasa-dark dark:text-slate-100">
        {intl.formatMessage({ id: 'transactions.title' })}
      </h1>

      <div className="mb-4">
        <TransactionFilters />
      </div>

      {totals && transactions.length > 0 && (
        <div className="mb-3 flex gap-4 text-sm">
          <span className="text-slate-500">
            {intl.formatMessage({ id: 'transactions.totals.debit' })}:{' '}
            <span className="font-semibold text-red-600">
              {intl.formatNumber(totals.debit, { style: 'currency', currency: 'EUR' })}
            </span>
          </span>
          <span className="text-slate-500">
            {intl.formatMessage({ id: 'transactions.totals.credit' })}:{' '}
            <span className="font-semibold text-green-600">
              {intl.formatNumber(totals.credit, { style: 'currency', currency: 'EUR' })}
            </span>
          </span>
        </div>
      )}

      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      )}

      {!isLoading && transactions.length === 0 && (
        <p className="text-sm text-slate-500">{intl.formatMessage({ id: 'transactions.empty' })}</p>
      )}

      <UnifiedTransactionList transactions={transactions} onSelect={setSelected} />

      <TransactionDetail transaction={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
