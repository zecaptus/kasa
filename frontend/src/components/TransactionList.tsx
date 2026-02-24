import { useIntl } from 'react-intl';
import { cn } from '../lib/cn';
import type { ImportedTransactionDto, ReconciliationStatus } from '../services/importApi';

interface TransactionListProps {
  transactions: ImportedTransactionDto[];
}

const STATUS_STYLES: Record<ReconciliationStatus, string> = {
  UNRECONCILED: 'bg-blue-100 text-blue-700',
  RECONCILED: 'bg-green-100 text-green-700',
  IGNORED: 'bg-slate-100 text-slate-400',
};

const STATUS_I18N: Record<ReconciliationStatus, string> = {
  UNRECONCILED: 'import.transaction.status.unreconciled',
  RECONCILED: 'import.transaction.status.reconciled',
  IGNORED: 'import.transaction.status.ignored',
};

export function TransactionList({ transactions }: TransactionListProps) {
  const intl = useIntl();

  if (transactions.length === 0) {
    return null;
  }

  return (
    <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-700 dark:bg-slate-900">
      {transactions.map((tx) => {
        const amount = tx.debit !== null ? -tx.debit : (tx.credit ?? 0);
        const isDebit = tx.debit !== null;

        return (
          <li key={tx.id} className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                {tx.label}
              </p>
              {tx.detail && (
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">{tx.detail}</p>
              )}
              <p className="text-xs text-slate-400">
                {intl.formatDate(tx.accountingDate, {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
            </div>

            <p
              className={cn('shrink-0 text-sm font-semibold tabular-nums', {
                'text-slate-800 dark:text-slate-200': isDebit,
                'text-green-600': !isDebit,
              })}
            >
              {isDebit ? '-' : '+'}
              {intl.formatNumber(Math.abs(amount), {
                style: 'currency',
                currency: 'EUR',
              })}
            </p>

            <span
              className={cn(
                'shrink-0 rounded-full px-2 py-0.5 text-xs font-medium',
                STATUS_STYLES[tx.status],
              )}
            >
              {intl.formatMessage({ id: STATUS_I18N[tx.status] })}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
