import { useIntl } from 'react-intl';
import { cn } from '../lib/cn';
import { useListRecurringPatternsQuery } from '../services/recurringPatternsApi';
import {
  type UnifiedTransactionDto,
  useUpdateTransactionCategoryMutation,
} from '../services/transactionsApi';
import { CategoryPicker } from './CategoryPicker';
import { RecurringPatternPicker } from './RecurringPatternPicker';

interface TransactionDetailProps {
  transaction: UnifiedTransactionDto | null;
  onClose: () => void;
}

const STATUS_I18N: Record<string, string> = {
  UNRECONCILED: 'import.transaction.status.unreconciled',
  RECONCILED: 'import.transaction.status.reconciled',
  IGNORED: 'import.transaction.status.ignored',
};

const STATUS_BADGE: Record<string, string> = {
  RECONCILED: 'bg-green-100 text-green-700',
  UNRECONCILED: 'bg-blue-100 text-blue-700',
  IGNORED: 'bg-slate-100 text-slate-400',
};

function CategorySourceNote({ source }: { source: string }) {
  const intl = useIntl();
  if (source === 'NONE') return null;
  const key =
    source === 'AUTO' ? 'transactions.category.source.auto' : 'transactions.category.source.manual';
  return <p className="text-xs text-slate-400">{intl.formatMessage({ id: key })}</p>;
}

function TransferInfoRow({ transaction }: { transaction: UnifiedTransactionDto }) {
  const intl = useIntl();
  if (transaction.transferPeerAccountLabel === null) return null;
  const label =
    transaction.direction === 'debit'
      ? `→ ${transaction.transferPeerAccountLabel}`
      : `← ${transaction.transferPeerAccountLabel}`;
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-500">
        {intl.formatMessage({ id: 'transactions.transfer.badge' })}
      </span>
      <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
        {label}
      </span>
    </div>
  );
}

export function TransactionDetail({ transaction, onClose }: TransactionDetailProps) {
  const intl = useIntl();
  const [updateCategory, { isLoading }] = useUpdateTransactionCategoryMutation();
  const { data: recurringData } = useListRecurringPatternsQuery();

  if (transaction === null) {
    return null;
  }

  const isDebit = transaction.direction === 'debit';
  const formattedAmount = intl.formatNumber(Math.abs(transaction.amount), {
    style: 'currency',
    currency: 'EUR',
  });
  const formattedDate = intl.formatDate(transaction.date, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const sourceKey =
    transaction.type === 'IMPORTED_TRANSACTION'
      ? 'transactions.source.imported'
      : 'transactions.source.manual';

  const txId = transaction.id;
  function handleCategoryChange(categoryId: string | null) {
    updateCategory({ id: txId, categoryId });
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-white shadow-xl sm:bottom-0 sm:right-0 sm:top-0 sm:left-auto sm:w-96 sm:rounded-none sm:rounded-l-2xl dark:bg-slate-900"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <h2 className="truncate text-base font-semibold text-slate-900 dark:text-slate-100">
            {transaction.label}
          </h2>
          <button
            type="button"
            aria-label="Close"
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          {transaction.detail && (
            <p className="text-sm text-slate-500 dark:text-slate-400">{transaction.detail}</p>
          )}

          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">
              {intl.formatMessage({ id: 'expense.form.date' })}
            </span>
            <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
              {formattedDate}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">
              {intl.formatMessage({ id: 'expense.form.amount' })}
            </span>
            <span
              className={cn('text-sm font-semibold tabular-nums', {
                'text-red-600': isDebit,
                'text-green-600': !isDebit,
              })}
            >
              {isDebit ? '-' : '+'}
              {formattedAmount}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">Source</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
              {intl.formatMessage({ id: sourceKey })}
            </span>
          </div>

          {transaction.type === 'IMPORTED_TRANSACTION' && transaction.status && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Statut</span>
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-xs font-medium',
                  STATUS_BADGE[transaction.status] ?? 'bg-slate-100 text-slate-400',
                )}
              >
                {intl.formatMessage({
                  id: STATUS_I18N[transaction.status] ?? 'import.transaction.status.unreconciled',
                })}
              </span>
            </div>
          )}

          <div className="space-y-2">
            <span className="text-sm text-slate-500">
              {intl.formatMessage({ id: 'expense.form.category' })}
            </span>
            <CategoryPicker
              value={transaction.categoryId}
              onChange={handleCategoryChange}
              disabled={isLoading}
            />
            <CategorySourceNote source={transaction.categorySource} />
          </div>

          <TransferInfoRow transaction={transaction} />

          {transaction.type === 'IMPORTED_TRANSACTION' && (
            <div className="space-y-2">
              <span className="text-sm text-slate-500">
                {intl.formatMessage({ id: 'recurring.link.title' })}
              </span>
              <RecurringPatternPicker
                transactionId={transaction.id}
                currentPatternId={transaction.recurringPatternId}
                patterns={recurringData?.patterns ?? []}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
