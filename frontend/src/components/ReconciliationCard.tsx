import { useIntl } from 'react-intl';
import { cn } from '../lib/cn';
import type { ImportedTransactionDto } from '../services/importApi';
import {
  useConfirmReconciliationMutation,
  useUndoReconciliationMutation,
  useUpdateTransactionStatusMutation,
} from '../services/importApi';

interface ReconciliationCardProps {
  transaction: ImportedTransactionDto;
}

const STATUS_BADGE: Record<string, string> = {
  RECONCILED: 'bg-green-100 text-green-700',
  UNRECONCILED: 'bg-blue-100 text-blue-700',
  IGNORED: 'bg-slate-100 text-slate-400',
};

const STATUS_I18N: Record<string, string> = {
  RECONCILED: 'import.transaction.status.reconciled',
  UNRECONCILED: 'import.transaction.status.unreconciled',
  IGNORED: 'import.transaction.status.ignored',
};

export function ReconciliationCard({ transaction: tx }: ReconciliationCardProps) {
  const intl = useIntl();
  const [confirmReconciliation] = useConfirmReconciliationMutation();
  const [undoReconciliation] = useUndoReconciliationMutation();
  const [updateStatus] = useUpdateTransactionStatusMutation();

  const amount = tx.debit !== null ? -tx.debit : (tx.credit ?? 0);
  const isDebit = tx.debit !== null;

  return (
    <div className="rounded-xl border border-slate-200 p-4">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-900">{tx.label}</p>
          <p className="mt-0.5 text-xs text-slate-400">
            {intl.formatDate(tx.accountingDate, {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <p
            className={cn('text-sm font-semibold tabular-nums', {
              'text-slate-800': isDebit,
              'text-green-600': !isDebit,
            })}
          >
            {isDebit ? '-' : '+'}
            {intl.formatNumber(Math.abs(amount), { style: 'currency', currency: 'EUR' })}
          </p>
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-xs font-medium',
              STATUS_BADGE[tx.status] ?? 'bg-slate-100 text-slate-400',
            )}
          >
            {intl.formatMessage({
              id: STATUS_I18N[tx.status] ?? 'import.transaction.status.unreconciled',
            })}
          </span>
        </div>
      </div>

      {/* Auto-matched badge */}
      {tx.status === 'RECONCILED' && tx.reconciliation?.isAutoMatched && (
        <p className="mt-2 text-xs text-green-600">
          ✓ {intl.formatMessage({ id: 'reconciliation.card.autoMatched' })}
        </p>
      )}

      {/* Candidates list (ambiguous matches) */}
      {tx.status === 'UNRECONCILED' && tx.candidates && tx.candidates.length > 0 && (
        <div className="mt-3">
          <p className="mb-2 text-xs font-medium text-slate-500">
            {intl.formatMessage({ id: 'reconciliation.card.candidates.title' })}
          </p>
          <ul className="space-y-1">
            {tx.candidates.map((candidate) => (
              <li
                key={candidate.expense.id}
                className="flex items-center justify-between gap-2 rounded-lg bg-amber-50 px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-slate-800">
                    {candidate.expense.label}
                  </p>
                  <p className="text-xs text-slate-400">
                    {intl.formatMessage({
                      id: `reconciliation.card.confidence.${candidate.confidence === 'high' ? 'high' : 'plausible'}`,
                    })}
                    {' · '}
                    {Math.round(candidate.score * 100)}%
                  </p>
                </div>
                <button
                  type="button"
                  className="shrink-0 rounded-md bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700"
                  onClick={() =>
                    confirmReconciliation({
                      importedTransactionId: tx.id,
                      manualExpenseId: candidate.expense.id,
                    })
                  }
                >
                  {intl.formatMessage({ id: 'reconciliation.card.candidates.select' })}
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="mt-2 text-xs text-slate-400 hover:text-slate-600"
            onClick={() => updateStatus({ transactionId: tx.id, status: 'UNRECONCILED' })}
          >
            {intl.formatMessage({ id: 'reconciliation.card.candidates.dismiss' })}
          </button>
        </div>
      )}

      {/* Action buttons */}
      <div className="mt-3 flex gap-2">
        {tx.status === 'UNRECONCILED' && (
          <button
            type="button"
            className="text-xs text-slate-400 hover:text-slate-600"
            onClick={() => updateStatus({ transactionId: tx.id, status: 'IGNORED' })}
          >
            {intl.formatMessage({ id: 'reconciliation.action.ignore' })}
          </button>
        )}
        {tx.status === 'IGNORED' && (
          <button
            type="button"
            className="text-xs text-slate-400 hover:text-slate-600"
            onClick={() => updateStatus({ transactionId: tx.id, status: 'UNRECONCILED' })}
          >
            {intl.formatMessage({ id: 'reconciliation.action.unignore' })}
          </button>
        )}
        {tx.status === 'RECONCILED' &&
          tx.reconciliation &&
          (() => {
            const reconciliationId = tx.reconciliation.id;
            return (
              <button
                type="button"
                className="text-xs text-slate-400 hover:text-slate-600"
                onClick={() => undoReconciliation(reconciliationId)}
              >
                {intl.formatMessage({ id: 'reconciliation.action.undo' })}
              </button>
            );
          })()}
      </div>
    </div>
  );
}
