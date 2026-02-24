import { useState } from 'react';
import { useIntl } from 'react-intl';
import { inputCls } from '../lib/inputCls';
import {
  type RecurrenceFrequency,
  type RecurringPatternDto,
  useDeleteRecurringPatternMutation,
  useUpdateRecurringPatternMutation,
} from '../services/recurringPatternsApi';
import { Button } from './ui/Button';

function PencilIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
    >
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

// ─── EditForm ─────────────────────────────────────────────────────────────────

interface EditFormProps {
  pattern: RecurringPatternDto;
  onDone: () => void;
}

function EditForm({ pattern, onDone }: EditFormProps) {
  const intl = useIntl();
  const [update, { isLoading }] = useUpdateRecurringPatternMutation();
  const [label, setLabel] = useState(pattern.label);
  const [frequency, setFrequency] = useState<RecurrenceFrequency>(pattern.frequency);
  const [nextDate, setNextDate] = useState(pattern.nextOccurrenceDate ?? '');
  const [isActive, setIsActive] = useState(pattern.isActive);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await update({
      id: pattern.id,
      label,
      frequency,
      isActive,
      nextOccurrenceDate: nextDate || null,
    });
    onDone();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-2 space-y-2 rounded-xl border border-slate-100 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-900/60"
    >
      <input
        type="text"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder={intl.formatMessage({ id: 'recurring.edit.label' })}
        className={inputCls()}
        maxLength={100}
      />
      <select
        value={frequency}
        onChange={(e) => setFrequency(e.target.value as RecurrenceFrequency)}
        className={inputCls()}
      >
        <option value="WEEKLY">{intl.formatMessage({ id: 'recurring.frequency.weekly' })}</option>
        <option value="MONTHLY">{intl.formatMessage({ id: 'recurring.frequency.monthly' })}</option>
        <option value="ANNUAL">{intl.formatMessage({ id: 'recurring.frequency.annual' })}</option>
      </select>
      <input
        type="date"
        value={nextDate}
        onChange={(e) => setNextDate(e.target.value)}
        className={inputCls()}
        aria-label={intl.formatMessage({ id: 'recurring.edit.nextDate' })}
      />
      <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="rounded"
        />
        {intl.formatMessage({ id: 'recurring.edit.active' })}
      </label>
      <div className="flex gap-2">
        <Button type="submit" disabled={isLoading} size="sm" className="flex-1">
          {intl.formatMessage({ id: 'recurring.edit.save' })}
        </Button>
        <Button type="button" onClick={onDone} variant="ghost" size="sm">
          {intl.formatMessage({ id: 'recurring.edit.cancel' })}
        </Button>
      </div>
    </form>
  );
}

// ─── RecurringPatternRow ──────────────────────────────────────────────────────

interface RecurringPatternRowProps {
  pattern: RecurringPatternDto;
}

export function RecurringPatternRow({ pattern }: RecurringPatternRowProps) {
  const intl = useIntl();
  const [deletePattern, { isLoading: isDeleting }] = useDeleteRecurringPatternMutation();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (confirmDelete) {
    return (
      <li className="py-3">
        <p className="mb-2 text-sm text-slate-600 dark:text-slate-400">
          {intl.formatMessage({ id: 'recurring.delete.confirm' })}
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="danger"
            size="sm"
            disabled={isDeleting}
            onClick={() => deletePattern(pattern.id)}
          >
            {intl.formatMessage({ id: 'recurring.delete' })}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
            {intl.formatMessage({ id: 'recurring.edit.cancel' })}
          </Button>
        </div>
      </li>
    );
  }

  return (
    <li className="py-3">
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
            {pattern.label}
          </p>
          {pattern.transferPeerAccountLabel !== null && (
            <p className="text-xs text-violet-600 dark:text-violet-400">
              → {pattern.transferPeerAccountLabel}
            </p>
          )}
          <p className="text-xs text-slate-400">
            {intl.formatMessage({
              id: `recurring.frequency.${pattern.frequency.toLowerCase()}`,
            })}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <div className="flex flex-col items-end gap-1">
            {pattern.amount !== null && (
              <p className="text-sm font-semibold tabular-nums text-red-600">
                -{intl.formatNumber(pattern.amount, { style: 'currency', currency: 'EUR' })}
              </p>
            )}
            {pattern.nextOccurrenceDate && (
              <p className="text-xs text-slate-500">
                {intl.formatMessage(
                  { id: 'recurring.next' },
                  {
                    date: intl.formatDate(pattern.nextOccurrenceDate, {
                      day: '2-digit',
                      month: 'short',
                    }),
                  },
                )}
              </p>
            )}
          </div>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setEditing((v) => !v)}
              title={intl.formatMessage({ id: 'recurring.edit' })}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            >
              <PencilIcon />
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              title={intl.formatMessage({ id: 'recurring.delete' })}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950 dark:hover:text-red-400"
            >
              <TrashIcon />
            </button>
          </div>
        </div>
      </div>
      {editing && <EditForm pattern={pattern} onDone={() => setEditing(false)} />}
    </li>
  );
}
