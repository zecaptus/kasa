import { useCallback, useState } from 'react';
import { useIntl } from 'react-intl';
import { PocketCard } from '../components/PocketCard';
import { PocketForm } from '../components/PocketForm';
import { Button } from '../components/ui/Button';
import { inputCls } from '../lib/inputCls';
import type { PocketSummaryDto } from '../services/pocketsApi';
import {
  useCreateMovementMutation,
  useDeleteMovementMutation,
  useDeletePocketMutation,
  useGetPocketQuery,
  useListPocketsQuery,
} from '../services/pocketsApi';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatMovementError(
  err: unknown,
  formatMessage: (d: { id: string }, values?: Record<string, string>) => string,
  formatNumber: (n: number, opts: Record<string, unknown>) => string,
): string | null {
  const e = err as { data?: { error?: string; headroom?: number; available?: number } };
  const currency = { style: 'currency', currency: 'EUR' };
  if (e.data?.error === 'INSUFFICIENT_HEADROOM') {
    const amount = formatNumber(e.data.headroom ?? 0, currency);
    return formatMessage({ id: 'pockets.error.insufficientHeadroom' }, { amount });
  }
  if (e.data?.error === 'INSUFFICIENT_POCKET_FUNDS') {
    const amount = formatNumber(e.data.available ?? 0, currency);
    return formatMessage({ id: 'pockets.error.insufficientFunds' }, { amount });
  }
  return null;
}

// ─── Movement form ────────────────────────────────────────────────────────────

interface MovementFormProps {
  pocket: PocketSummaryDto;
  onClose: () => void;
}

function MovementForm({ pocket, onClose }: MovementFormProps) {
  const intl = useIntl();
  const [direction, setDirection] = useState<'ALLOCATION' | 'WITHDRAWAL'>('ALLOCATION');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0] ?? '');
  const [apiError, setApiError] = useState<string | null>(null);

  const [createMovement, { isLoading }] = useCreateMovementMutation();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setApiError(null);
    const amt = parseFloat(amount);
    if (!amount || Number.isNaN(amt) || amt <= 0) return;

    try {
      await createMovement({
        pocketId: pocket.id,
        direction,
        amount: amt,
        note: note.trim() || undefined,
        date,
      }).unwrap();
      onClose();
    } catch (err: unknown) {
      const msg = formatMovementError(err, intl.formatMessage, intl.formatNumber);
      if (msg) setApiError(msg);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-3">
      {/* Direction toggle */}
      <div className="flex gap-2">
        {(['ALLOCATION', 'WITHDRAWAL'] as const).map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDirection(d)}
            className={`flex-1 rounded-xl py-2 text-sm font-semibold transition-colors ${
              direction === d
                ? 'bg-kasa-accent text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            {intl.formatMessage({
              id:
                d === 'ALLOCATION' ? 'pockets.movement.allocation' : 'pockets.movement.withdrawal',
            })}
          </button>
        ))}
      </div>

      {/* Amount */}
      <div className="flex flex-col gap-1">
        <label
          htmlFor="movement-amount"
          className="text-sm font-medium text-slate-600 dark:text-slate-400"
        >
          {intl.formatMessage({ id: 'pockets.movement.amount' })} (€)
        </label>
        <input
          id="movement-amount"
          type="number"
          min="0.01"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className={inputCls()}
        />
      </div>

      {/* Date */}
      <div className="flex flex-col gap-1">
        <label
          htmlFor="movement-date"
          className="text-sm font-medium text-slate-600 dark:text-slate-400"
        >
          {intl.formatMessage({ id: 'pockets.movement.date' })}
        </label>
        <input
          id="movement-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className={inputCls()}
        />
      </div>

      {/* Note */}
      <div className="flex flex-col gap-1">
        <label
          htmlFor="movement-note"
          className="text-sm font-medium text-slate-600 dark:text-slate-400"
        >
          {intl.formatMessage({ id: 'pockets.movement.note' })}
        </label>
        <input
          id="movement-note"
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className={inputCls()}
        />
      </div>

      {/* API error */}
      {apiError && <p className="text-sm text-red-500">{apiError}</p>}

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" type="button" onClick={onClose}>
          {intl.formatMessage({ id: 'reconciliation.action.undo' })}
        </Button>
        <Button type="submit" disabled={isLoading}>
          {intl.formatMessage({ id: 'pockets.form.submit.create' })}
        </Button>
      </div>
    </form>
  );
}

// ─── Pocket detail (history) ──────────────────────────────────────────────────

interface MovementRowProps {
  movement: import('../services/pocketsApi').PocketMovementDto;
  onDelete: () => void;
  deleteLabel: string;
}

function MovementRow({ movement: m, onDelete, deleteLabel }: MovementRowProps) {
  const intl = useIntl();
  const isAlloc = m.direction === 'ALLOCATION';
  const colorClass = isAlloc ? 'text-emerald-600' : 'text-red-500';
  return (
    <li className="flex items-center justify-between gap-2 text-sm">
      <div className="flex items-center gap-2">
        <span className={colorClass}>{isAlloc ? '↑' : '↓'}</span>
        <span className="text-slate-600">{m.date}</span>
        {m.note && <span className="text-slate-400 text-xs">{m.note}</span>}
      </div>
      <div className="flex items-center gap-2">
        <span className={`tabular-nums font-medium ${colorClass}`}>
          {isAlloc ? '+' : '-'}
          {intl.formatNumber(m.amount, { style: 'currency', currency: 'EUR' })}
        </span>
        <button
          type="button"
          onClick={onDelete}
          className="text-xs text-slate-300 hover:text-red-400"
          aria-label={deleteLabel}
        >
          ✕
        </button>
      </div>
    </li>
  );
}

interface PocketDetailViewProps {
  pocketId: string;
  onClose: () => void;
}

function PocketDetailView({ pocketId, onClose }: PocketDetailViewProps) {
  const intl = useIntl();
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const { data, isLoading } = useGetPocketQuery({ id: pocketId, limit: 20, cursor });
  const [deleteMovement] = useDeleteMovementMutation();

  if (isLoading || !data) return <p className="text-sm text-slate-400">Chargement…</p>;

  const deleteLabel = intl.formatMessage({ id: 'pockets.movement.delete' });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">{data.name}</h3>
        <button
          type="button"
          onClick={onClose}
          className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
        >
          ✕
        </button>
      </div>

      {data.movements.length === 0 ? (
        <p className="text-sm text-slate-400">
          {intl.formatMessage({ id: 'pockets.movement.empty' })}
        </p>
      ) : (
        <ul className="space-y-2">
          {data.movements.map((m) => (
            <MovementRow
              key={m.id}
              movement={m}
              onDelete={() => void deleteMovement({ pocketId, movementId: m.id })}
              deleteLabel={deleteLabel}
            />
          ))}
        </ul>
      )}

      {data.nextCursor && (
        <button
          type="button"
          onClick={() => setCursor(data.nextCursor ?? undefined)}
          className="text-sm font-medium text-kasa-accent hover:underline"
        >
          {intl.formatMessage({ id: 'import.sessions.title' })}…
        </button>
      )}
    </div>
  );
}

// ─── PocketListItem ───────────────────────────────────────────────────────────

interface PocketListItemProps {
  pocket: PocketSummaryDto;
  onMovement: (p: PocketSummaryDto) => void;
  onEdit: (p: PocketSummaryDto) => void;
  onDelete: (p: PocketSummaryDto) => void;
  onHistory: (id: string) => void;
}

function PocketListItem({ pocket, onMovement, onEdit, onDelete, onHistory }: PocketListItemProps) {
  const intl = useIntl();
  return (
    <li>
      <PocketCard pocket={pocket} onAddMovement={onMovement} onEdit={onEdit} onDelete={onDelete} />
      <button
        type="button"
        onClick={() => onHistory(pocket.id)}
        className="mt-1 text-xs text-slate-400 hover:text-kasa-accent dark:hover:text-kasa-accent"
      >
        {intl.formatMessage({ id: 'transactions.title' })} →
      </button>
    </li>
  );
}

// ─── PocketsPage ──────────────────────────────────────────────────────────────

type Modal =
  | { type: 'create' }
  | { type: 'edit'; pocket: PocketSummaryDto }
  | { type: 'movement'; pocket: PocketSummaryDto }
  | { type: 'history'; pocketId: string }
  | { type: 'delete'; pocket: PocketSummaryDto };

export function PocketsPage() {
  const intl = useIntl();
  const { data, isLoading, isError } = useListPocketsQuery();
  const [deletePocket] = useDeletePocketMutation();
  const [modal, setModal] = useState<Modal | null>(null);

  const closeModal = useCallback(() => setModal(null), []);

  const handleDelete = useCallback(
    async (pocket: PocketSummaryDto) => {
      const confirmed = window.confirm(
        intl.formatMessage({ id: 'pockets.delete.confirm' }, { name: pocket.name }),
      );
      if (!confirmed) return;
      await deletePocket(pocket.id);
    },
    [deletePocket, intl],
  );

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <h1 className="page-title">{intl.formatMessage({ id: 'pockets.title' })}</h1>
        <Button onClick={() => setModal({ type: 'create' })}>
          {intl.formatMessage({ id: 'pockets.create' })}
        </Button>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
            {(modal.type === 'create' || modal.type === 'edit') && (
              <PocketForm
                initialValues={modal.type === 'edit' ? modal.pocket : undefined}
                onSuccess={closeModal}
                onCancel={closeModal}
              />
            )}
            {modal.type === 'movement' && (
              <MovementForm pocket={modal.pocket} onClose={closeModal} />
            )}
            {modal.type === 'history' && (
              <PocketDetailView pocketId={modal.pocketId} onClose={closeModal} />
            )}
          </div>
        </div>
      )}

      {/* Content */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
          ))}
        </div>
      )}

      {isError && (
        <p className="text-sm text-red-500">
          {intl.formatMessage({ id: 'dashboard.error.title' })}
        </p>
      )}

      {!isLoading && !isError && data?.pockets.length === 0 && (
        <p className="text-sm text-slate-400">{intl.formatMessage({ id: 'pockets.empty' })}</p>
      )}

      {!isLoading && data && data.pockets.length > 0 && (
        <ul className="space-y-3">
          {data.pockets.map((pocket) => (
            <PocketListItem
              key={pocket.id}
              pocket={pocket}
              onMovement={(p) => setModal({ type: 'movement', pocket: p })}
              onEdit={(p) => setModal({ type: 'edit', pocket: p })}
              onDelete={(p) => void handleDelete(p)}
              onHistory={(id) => setModal({ type: 'history', pocketId: id })}
            />
          ))}
        </ul>
      )}
    </main>
  );
}
