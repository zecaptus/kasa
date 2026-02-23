import { useIntl } from 'react-intl';
import { cn } from '../lib/cn';
import type { ImportedTransactionDto, ReconciliationCandidate } from '../services/importApi';
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

function CandidatesList({
  candidates,
  transactionId,
  onConfirm,
  onDismiss,
}: {
  candidates: ReconciliationCandidate[];
  transactionId: string;
  onConfirm: (transactionId: string, expenseId: string) => void;
  onDismiss: () => void;
}) {
  const intl = useIntl();

  return (
    <div className="mt-3">
      <p className="mb-2 text-sm font-semibold text-slate-600">
        {intl.formatMessage({ id: 'reconciliation.card.candidates.title' })}
      </p>
      <ul className="space-y-1">
        {candidates.map((candidate) => (
          <li
            key={candidate.expense.id}
            className="flex items-center justify-between gap-2 rounded-lg bg-amber-50 px-3 py-2.5"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-800">
                {candidate.expense.label}
              </p>
              <p className="text-sm text-slate-500">
                {intl.formatMessage({
                  id: `reconciliation.card.confidence.${candidate.confidence === 'high' ? 'high' : 'plausible'}`,
                })}
                {' · '}
                {Math.round(candidate.score * 100)}%
              </p>
            </div>
            <button
              type="button"
              className="shrink-0 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
              onClick={() => onConfirm(transactionId, candidate.expense.id)}
            >
              {intl.formatMessage({ id: 'reconciliation.card.candidates.select' })}
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="mt-2 text-sm font-medium text-slate-500 hover:text-slate-700"
        onClick={onDismiss}
      >
        {intl.formatMessage({ id: 'reconciliation.card.candidates.dismiss' })}
      </button>
    </div>
  );
}

function TransactionActions({
  status,
  transactionId,
  reconciliationId,
  onUpdateStatus,
  onUndoReconciliation,
}: {
  status: string;
  transactionId: string;
  reconciliationId: string | null;
  onUpdateStatus: (transactionId: string, status: 'IGNORED' | 'UNRECONCILED') => void;
  onUndoReconciliation: (reconciliationId: string) => void;
}) {
  const intl = useIntl();

  if (status === 'UNRECONCILED') {
    return (
      <button
        type="button"
        className="text-sm font-medium text-slate-500 hover:text-slate-700"
        onClick={() => onUpdateStatus(transactionId, 'IGNORED')}
      >
        {intl.formatMessage({ id: 'reconciliation.action.ignore' })}
      </button>
    );
  }

  if (status === 'IGNORED') {
    return (
      <button
        type="button"
        className="text-sm font-medium text-slate-500 hover:text-slate-700"
        onClick={() => onUpdateStatus(transactionId, 'UNRECONCILED')}
      >
        {intl.formatMessage({ id: 'reconciliation.action.unignore' })}
      </button>
    );
  }

  if (status === 'RECONCILED' && reconciliationId) {
    return (
      <button
        type="button"
        className="text-sm font-medium text-slate-500 hover:text-slate-700"
        onClick={() => onUndoReconciliation(reconciliationId)}
      >
        {intl.formatMessage({ id: 'reconciliation.action.undo' })}
      </button>
    );
  }

  return null;
}

export function ReconciliationCard({ transaction: tx }: ReconciliationCardProps) {
  const intl = useIntl();
  const [confirmReconciliation] = useConfirmReconciliationMutation();
  const [undoReconciliation] = useUndoReconciliationMutation();
  const [updateStatus] = useUpdateTransactionStatusMutation();

  const amount = tx.debit !== null ? -tx.debit : (tx.credit ?? 0);
  const isDebit = tx.debit !== null;

  const handleConfirm = (transactionId: string, expenseId: string) => {
    confirmReconciliation({
      importedTransactionId: transactionId,
      manualExpenseId: expenseId,
    });
  };

  const handleUpdateStatus = (transactionId: string, status: 'IGNORED' | 'UNRECONCILED') => {
    updateStatus({ transactionId, status });
  };

  return (
    <div className="rounded-xl border border-slate-200 p-4">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-900">{tx.label}</p>
          {tx.detail && <p className="mt-0.5 truncate text-xs text-slate-500">{tx.detail}</p>}
          <p className="mt-0.5 text-sm text-slate-500">
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
        <CandidatesList
          candidates={tx.candidates}
          transactionId={tx.id}
          onConfirm={handleConfirm}
          onDismiss={() => handleUpdateStatus(tx.id, 'UNRECONCILED')}
        />
      )}

      {/* Action buttons */}
      <div className="mt-3 flex gap-2">
        <TransactionActions
          status={tx.status}
          transactionId={tx.id}
          reconciliationId={tx.reconciliation?.id ?? null}
          onUpdateStatus={handleUpdateStatus}
          onUndoReconciliation={undoReconciliation}
        />
      </div>
    </div>
  );
}
