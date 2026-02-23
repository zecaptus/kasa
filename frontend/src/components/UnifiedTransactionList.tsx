import { useIntl } from 'react-intl';
import { cn } from '../lib/cn';
import type { UnifiedTransactionDto } from '../services/transactionsApi';

interface UnifiedTransactionListProps {
  transactions: UnifiedTransactionDto[];
  onSelect?: (tx: UnifiedTransactionDto) => void;
}

interface TransactionItemProps {
  tx: UnifiedTransactionDto;
  onSelect: ((tx: UnifiedTransactionDto) => void) | undefined;
}

function TransactionItem({ tx, onSelect }: TransactionItemProps) {
  const intl = useIntl();
  const isDebit = tx.direction === 'debit';
  const formattedAmount = intl.formatNumber(Math.abs(tx.amount), {
    style: 'currency',
    currency: 'EUR',
  });
  const sourceId =
    tx.type === 'IMPORTED_TRANSACTION'
      ? 'transactions.source.imported'
      : 'transactions.source.manual';

  return (
    <li
      className={cn('flex items-center gap-3 px-4 py-3', {
        'cursor-pointer hover:bg-slate-50': onSelect !== undefined,
      })}
      onClick={() => onSelect?.(tx)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onSelect?.(tx);
      }}
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-900">{tx.label}</p>
        {tx.detail && <p className="truncate text-xs text-slate-500">{tx.detail}</p>}
        <p className="text-xs text-slate-400">
          {intl.formatDate(tx.date, { day: '2-digit', month: 'short', year: 'numeric' })}
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1">
        <p
          className={cn('text-sm font-semibold tabular-nums', {
            'text-red-600': isDebit,
            'text-green-600': !isDebit,
          })}
        >
          {isDebit ? '-' : '+'}
          {formattedAmount}
        </p>
        <span className="flex items-center gap-1 text-xs text-slate-600">
          <span
            className="inline-block size-2 shrink-0 rounded-full"
            style={{ backgroundColor: tx.category?.color ?? '#94a3b8' }}
          />
          {tx.category?.name ?? intl.formatMessage({ id: 'transactions.category.none' })}
        </span>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
          {intl.formatMessage({ id: sourceId })}
        </span>
      </div>
    </li>
  );
}

export function UnifiedTransactionList({ transactions, onSelect }: UnifiedTransactionListProps) {
  if (transactions.length === 0) {
    return null;
  }

  return (
    <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
      {transactions.map((tx) => (
        <TransactionItem key={tx.id} tx={tx} onSelect={onSelect} />
      ))}
    </ul>
  );
}
