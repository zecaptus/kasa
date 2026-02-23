import { useState } from 'react';
import { useIntl } from 'react-intl';
import { cn } from '../lib/cn';
import { useGetDashboardQuery } from '../services/dashboardApi';
import type { PocketSummaryDto } from '../services/pocketsApi';
import { useCreatePocketMutation, useUpdatePocketMutation } from '../services/pocketsApi';

const PALETTE = ['#22c55e', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#94a3b8'];

interface Props {
  initialValues?: PocketSummaryDto | undefined;
  onSuccess: () => void;
  onCancel: () => void;
}

function validatePocketForm(
  name: string,
  goalAmount: string,
  accountLabel: string,
  isEdit: boolean,
  formatMessage: (d: { id: string }) => string,
): Record<string, string> {
  const errs: Record<string, string> = {};
  if (!name.trim()) errs.name = formatMessage({ id: 'pockets.name' });
  const goal = parseFloat(goalAmount);
  if (!goalAmount || Number.isNaN(goal) || goal <= 0) {
    errs.goalAmount = formatMessage({ id: 'pockets.goal' });
  }
  if (!accountLabel && !isEdit) errs.accountLabel = formatMessage({ id: 'pockets.account' });
  return errs;
}

function usePocketFormState(
  initialValues: PocketSummaryDto | undefined,
  accounts: { label: string }[],
) {
  const [name, setName] = useState(initialValues?.name ?? '');
  const [goalAmount, setGoalAmount] = useState(
    initialValues ? String(initialValues.goalAmount) : '',
  );
  const [color, setColor] = useState(initialValues?.color ?? PALETTE[0] ?? '#22c55e');
  const [accountLabel, setAccountLabel] = useState(
    initialValues?.accountLabel ?? accounts[0]?.label ?? '',
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  return {
    name,
    setName,
    goalAmount,
    setGoalAmount,
    color,
    setColor,
    accountLabel,
    setAccountLabel,
    errors,
    setErrors,
  };
}

export function PocketForm({ initialValues, onSuccess, onCancel }: Props) {
  const intl = useIntl();
  const isEdit = !!initialValues;

  const { data: dashboardData } = useGetDashboardQuery();
  const accounts = dashboardData?.accounts ?? [];

  const {
    name,
    setName,
    goalAmount,
    setGoalAmount,
    color,
    setColor,
    accountLabel,
    setAccountLabel,
    errors,
    setErrors,
  } = usePocketFormState(initialValues, accounts);

  const [createPocket, { isLoading: isCreating }] = useCreatePocketMutation();
  const [updatePocket, { isLoading: isUpdating }] = useUpdatePocketMutation();
  const isLoading = isCreating || isUpdating;

  async function submitForm() {
    if (isEdit && initialValues) {
      await updatePocket({
        id: initialValues.id,
        name: name.trim(),
        goalAmount: parseFloat(goalAmount),
        color,
      }).unwrap();
    } else {
      await createPocket({
        accountLabel,
        name: name.trim(),
        goalAmount: parseFloat(goalAmount),
        color,
      }).unwrap();
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validatePocketForm(name, goalAmount, accountLabel, isEdit, intl.formatMessage);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    try {
      await submitForm();
      onSuccess();
    } catch {
      // Server errors surfaced via RTK Query error state in parent
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
      {/* Account selector — only for creation */}
      {!isEdit && (
        <div className="flex flex-col gap-1">
          <label htmlFor="pocket-account" className="text-sm font-medium text-slate-700">
            {intl.formatMessage({ id: 'pockets.account' })}
          </label>
          {accounts.length === 0 ? (
            <p className="text-sm text-slate-400">
              {intl.formatMessage({ id: 'pockets.noAccounts' })}
            </p>
          ) : (
            <select
              id="pocket-account"
              value={accountLabel}
              onChange={(e) => setAccountLabel(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {accounts.map((a) => (
                <option key={a.label} value={a.label}>
                  {a.label || intl.formatMessage({ id: 'dashboard.account.default' })}
                </option>
              ))}
            </select>
          )}
          {errors.accountLabel && <p className="text-xs text-red-500">{errors.accountLabel}</p>}
        </div>
      )}

      {/* Name */}
      <div className="flex flex-col gap-1">
        <label htmlFor="pocket-name" className="text-sm font-medium text-slate-700">
          {intl.formatMessage({ id: 'pockets.name' })}
        </label>
        <input
          id="pocket-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
      </div>

      {/* Goal amount */}
      <div className="flex flex-col gap-1">
        <label htmlFor="pocket-goal" className="text-sm font-medium text-slate-700">
          {intl.formatMessage({ id: 'pockets.goal' })} (€)
        </label>
        <input
          id="pocket-goal"
          type="number"
          min="0.01"
          step="0.01"
          value={goalAmount}
          onChange={(e) => setGoalAmount(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {errors.goalAmount && <p className="text-xs text-red-500">{errors.goalAmount}</p>}
      </div>

      {/* Colour palette */}
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-slate-700">
          {intl.formatMessage({ id: 'pockets.color' })}
        </span>
        <div className="flex gap-2">
          {PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={c}
              onClick={() => setColor(c)}
              className={cn('h-7 w-7 rounded-full border-2 transition-transform', {
                'border-slate-900 scale-110': color === c,
                'border-transparent': color !== c,
              })}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
        >
          {intl.formatMessage({ id: 'reconciliation.action.undo' })}
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isEdit
            ? intl.formatMessage({ id: 'pockets.form.submit.update' })
            : intl.formatMessage({ id: 'pockets.form.submit.create' })}
        </button>
      </div>
    </form>
  );
}
