import { useState } from 'react';
import { useIntl } from 'react-intl';
import { inputCls } from '../lib/inputCls';
import {
  type RecurringRuleDto,
  useCreateRuleFromTransactionMutation,
} from '../services/recurringRulesApi';
import { useUpdateTransactionRecurringMutation } from '../services/transactionsApi';
import { Button } from './ui/Button';

const PERIOD_OPTIONS = [1, 2, 3, 6, 12] as const;
const CREATE_SENTINEL = '__create__';

// ─── CreateRuleForm ───────────────────────────────────────────────────────────

interface CreateRuleFormProps {
  transactionId: string;
  defaultLabel: string;
  onDone: () => void;
}

function CreateRuleForm({ transactionId, defaultLabel, onDone }: CreateRuleFormProps) {
  const intl = useIntl();
  const [createRule] = useCreateRuleFromTransactionMutation();
  const [label, setLabel] = useState(defaultLabel);
  const [periodMonths, setPeriodMonths] = useState<number>(1);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim()) return;
    setSaving(true);
    try {
      await createRule({ transactionId, label: label.trim(), periodMonths }).unwrap();
      onDone();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-2 rounded-xl border border-slate-100 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-900/60"
    >
      <input
        type="text"
        placeholder={intl.formatMessage({ id: 'recurring.link.label' })}
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        className={inputCls()}
        maxLength={100}
      />
      <select
        value={periodMonths}
        onChange={(e) => setPeriodMonths(Number(e.target.value))}
        className={inputCls()}
        aria-label={intl.formatMessage({ id: 'recurring.link.period' })}
      >
        {PERIOD_OPTIONS.map((p) => (
          <option key={p} value={p}>
            {intl.formatMessage({ id: `recurring.period.${p}` })}
          </option>
        ))}
      </select>
      <div className="flex gap-2">
        <Button type="submit" disabled={saving} className="flex-1" size="sm">
          {intl.formatMessage({ id: 'recurring.link.submit' })}
        </Button>
        <Button type="button" onClick={onDone} variant="ghost" size="sm">
          {intl.formatMessage({ id: 'recurring.edit.cancel' })}
        </Button>
      </div>
    </form>
  );
}

// ─── RecurringRulePicker ──────────────────────────────────────────────────────

interface RecurringRulePickerProps {
  transactionId: string;
  transactionLabel: string;
  currentRuleId: string | null;
  rules: RecurringRuleDto[];
}

export function RecurringRulePicker({
  transactionId,
  transactionLabel,
  currentRuleId,
  rules,
}: RecurringRulePickerProps) {
  const intl = useIntl();
  const [linkRecurring, { isLoading }] = useUpdateTransactionRecurringMutation();
  const [showCreate, setShowCreate] = useState(false);

  async function handleChange(value: string) {
    if (value === CREATE_SENTINEL) {
      setShowCreate(true);
      return;
    }
    setShowCreate(false);
    await linkRecurring({ id: transactionId, recurringRuleId: value || null });
  }

  const selectValue = showCreate ? CREATE_SENTINEL : (currentRuleId ?? '');

  return (
    <div className="space-y-2">
      <select
        value={selectValue}
        onChange={(e) => handleChange(e.target.value)}
        disabled={isLoading}
        className={inputCls()}
      >
        <option value="">{intl.formatMessage({ id: 'recurring.link.none' })}</option>
        {rules.map((r) => (
          <option key={r.id} value={r.id}>
            {r.label}
          </option>
        ))}
        <option value={CREATE_SENTINEL}>
          {intl.formatMessage({ id: 'recurring.link.createFrom' })}
        </option>
      </select>
      {showCreate && (
        <CreateRuleForm
          transactionId={transactionId}
          defaultLabel={transactionLabel}
          onDone={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}
