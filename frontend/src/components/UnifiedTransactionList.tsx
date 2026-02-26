import { Sparkles } from 'lucide-react';
import type { KeyboardEvent } from 'react';
import { useIntl } from 'react-intl';
import { cn } from '../lib/cn';
import type { CategorySource, UnifiedTransactionDto } from '../services/transactionsApi';

// ─── Types ────────────────────────────────────────────────────────────────────

interface UnifiedTransactionListProps {
  transactions: UnifiedTransactionDto[];
  onSelect?: (tx: UnifiedTransactionDto) => void;
}

type TransactionRow =
  | { type: 'single'; tx: UnifiedTransactionDto }
  | { type: 'transfer'; debit: UnifiedTransactionDto; credit: UnifiedTransactionDto };

type OnSelect = (tx: UnifiedTransactionDto) => void;

// ─── Row builder ──────────────────────────────────────────────────────────────

function processTransferPair(
  tx: UnifiedTransactionDto,
  placed: Set<string>,
  byId: Map<string, UnifiedTransactionDto>,
): TransactionRow | null {
  const peer = tx.transferPeerId ? byId.get(tx.transferPeerId) : undefined;
  if (!peer || placed.has(peer.id)) return null;
  placed.add(peer.id);
  const debit = tx.direction === 'debit' ? tx : peer;
  const credit = tx.direction === 'debit' ? peer : tx;
  return { type: 'transfer', debit, credit };
}

function buildRows(transactions: UnifiedTransactionDto[]): TransactionRow[] {
  const byId = new Map(transactions.map((tx) => [tx.id, tx]));
  const placed = new Set<string>();
  const rows: TransactionRow[] = [];
  for (const tx of transactions) {
    if (placed.has(tx.id)) continue;
    placed.add(tx.id);
    rows.push(processTransferPair(tx, placed, byId) ?? { type: 'single', tx });
  }
  return rows;
}

// ─── Column helpers ───────────────────────────────────────────────────────────

function leftCellTx(row: TransactionRow): UnifiedTransactionDto | null {
  if (row.type === 'transfer') return row.debit;
  return row.tx.direction !== 'credit' ? row.tx : null;
}

function rightCellTx(row: TransactionRow): UnifiedTransactionDto | null {
  if (row.type === 'transfer') return row.credit;
  return row.tx.direction === 'credit' ? row.tx : null;
}

// ─── Badge helpers ────────────────────────────────────────────────────────────

function AiBadge({ categorySource }: { categorySource: CategorySource }) {
  const intl = useIntl();
  if (categorySource !== 'AI') return null;
  return (
    <span
      title={intl.formatMessage({ id: 'categories.ai.badge' })}
      className="inline-flex items-center"
    >
      <Sparkles className="size-3.5 text-violet-500" />
    </span>
  );
}

function TransactionBadges({ tx }: { tx: UnifiedTransactionDto }) {
  const intl = useIntl();
  const sourceId =
    tx.type === 'IMPORTED_TRANSACTION'
      ? 'transactions.source.imported'
      : 'transactions.source.manual';
  return (
    <div className="flex flex-wrap items-center gap-1">
      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
        {intl.formatMessage({ id: sourceId })}
      </span>
      {tx.recurringPatternId !== null && (
        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
          {intl.formatMessage({ id: 'recurring.badge' })}
        </span>
      )}
      {(() => {
        const peerLabel = tx.transferPeerAccountLabel ?? tx.transferLabel;
        return peerLabel !== null ? (
          <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
            {tx.direction === 'debit' ? `→ ${peerLabel}` : `← ${peerLabel}`}
          </span>
        ) : null;
      })()}
    </div>
  );
}

// ─── Shared cell ──────────────────────────────────────────────────────────────

function TxCell({ tx, onSelect }: { tx: UnifiedTransactionDto; onSelect: OnSelect | undefined }) {
  const intl = useIntl();
  const isDebit = tx.direction !== 'credit';
  const formattedAmount = intl.formatNumber(Math.abs(tx.amount), {
    style: 'currency',
    currency: 'EUR',
  });

  const interactiveProps = onSelect
    ? {
        onClick: () => onSelect(tx),
        onKeyDown: (e: KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') onSelect(tx);
        },
        role: 'button' as const,
        tabIndex: 0,
      }
    : {};

  return (
    <div
      {...interactiveProps}
      className={cn('flex h-full items-center gap-3 px-4 py-3', {
        'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50': onSelect !== undefined,
      })}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
          {tx.label}
        </p>
        {tx.detail && (
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">{tx.detail}</p>
        )}
        <p className="text-xs text-slate-400">
          {intl.formatDate(tx.date, { day: '2-digit', month: 'short', year: 'numeric' })}
          {tx.accountLabel && (
            <span className="before:mx-1 before:content-['·']">{tx.accountLabel}</span>
          )}
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
        <span className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
          <span
            className="inline-block size-2 shrink-0 rounded-full"
            style={{ backgroundColor: tx.category?.color ?? '#94a3b8' }}
          />
          {tx.category?.name ?? intl.formatMessage({ id: 'transactions.category.none' })}
          <AiBadge categorySource={tx.categorySource} />
        </span>
        <TransactionBadges tx={tx} />
      </div>
    </div>
  );
}

// ─── Mobile: single column ────────────────────────────────────────────────────

function SingleColumnList({
  rows,
  onSelect,
}: {
  rows: TransactionRow[];
  onSelect: OnSelect | undefined;
}) {
  return (
    <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 lg:hidden dark:divide-slate-800 dark:border-slate-700 dark:bg-slate-900">
      {rows.map((row) =>
        row.type === 'transfer' ? (
          <li key={row.debit.id} className="divide-y divide-slate-100 dark:divide-slate-800">
            <TxCell tx={row.debit} onSelect={onSelect} />
            <TxCell tx={row.credit} onSelect={onSelect} />
          </li>
        ) : (
          <li key={row.tx.id}>
            <TxCell tx={row.tx} onSelect={onSelect} />
          </li>
        ),
      )}
    </ul>
  );
}

// ─── Desktop: two columns ─────────────────────────────────────────────────────

function TwoColumnList({
  rows,
  onSelect,
}: {
  rows: TransactionRow[];
  onSelect: OnSelect | undefined;
}) {
  return (
    <div className="hidden overflow-hidden rounded-xl border border-slate-200 lg:block dark:border-slate-700 dark:bg-slate-900">
      {rows.map((row) => {
        const key = row.type === 'transfer' ? row.debit.id : row.tx.id;
        const left = leftCellTx(row);
        const right = rightCellTx(row);
        return (
          <div
            key={key}
            className="grid grid-cols-2 divide-x divide-slate-100 border-b border-slate-100 last:border-b-0 dark:divide-slate-800 dark:border-slate-800"
          >
            {left ? <TxCell tx={left} onSelect={onSelect} /> : <div className="px-4 py-3" />}
            {right ? <TxCell tx={right} onSelect={onSelect} /> : <div className="px-4 py-3" />}
          </div>
        );
      })}
    </div>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

export function UnifiedTransactionList({ transactions, onSelect }: UnifiedTransactionListProps) {
  if (transactions.length === 0) return null;
  const rows = buildRows(transactions);
  return (
    <>
      <SingleColumnList rows={rows} onSelect={onSelect} />
      <TwoColumnList rows={rows} onSelect={onSelect} />
    </>
  );
}
