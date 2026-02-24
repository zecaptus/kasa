import { useState } from 'react';
import { useIntl } from 'react-intl';
import { inputCls } from '../lib/inputCls';
import {
  type RecurrenceFrequency,
  type RecurringPatternDto,
  useCreateRecurringPatternMutation,
} from '../services/recurringPatternsApi';
import { useUpdateTransactionRecurringMutation } from '../services/transactionsApi';
import { Button } from './ui/Button';

const CREATE_SENTINEL = '__create__';

// ─── CreatePatternForm ────────────────────────────────────────────────────────

interface CreatePatternFormProps {
  transactionId: string;
  onDone: () => void;
}

function CreatePatternForm({ transactionId, onDone }: CreatePatternFormProps) {
  const intl = useIntl();
  const [createPattern] = useCreateRecurringPatternMutation();
  const [linkRecurring] = useUpdateTransactionRecurringMutation();
  const [label, setLabel] = useState('');
  const [keyword, setKeyword] = useState('');
  const [frequency, setFrequency] = useState<RecurrenceFrequency>('MONTHLY');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim() || !keyword.trim()) return;
    setSaving(true);
    try {
      const pattern = await createPattern({
        label: label.trim(),
        keyword: keyword.trim(),
        frequency,
      }).unwrap();
      await linkRecurring({ id: transactionId, recurringPatternId: pattern.id }).unwrap();
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
      <input
        type="text"
        placeholder={intl.formatMessage({ id: 'recurring.link.keyword' })}
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
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

// ─── RecurringPatternPicker ───────────────────────────────────────────────────

interface RecurringPatternPickerProps {
  transactionId: string;
  currentPatternId: string | null;
  patterns: RecurringPatternDto[];
}

export function RecurringPatternPicker({
  transactionId,
  currentPatternId,
  patterns,
}: RecurringPatternPickerProps) {
  const intl = useIntl();
  const [linkRecurring, { isLoading }] = useUpdateTransactionRecurringMutation();
  const [showCreate, setShowCreate] = useState(false);

  async function handleChange(value: string) {
    if (value === CREATE_SENTINEL) {
      setShowCreate(true);
      return;
    }
    setShowCreate(false);
    await linkRecurring({ id: transactionId, recurringPatternId: value || null });
  }

  const selectValue = showCreate ? CREATE_SENTINEL : (currentPatternId ?? '');

  return (
    <div className="space-y-2">
      <select
        value={selectValue}
        onChange={(e) => handleChange(e.target.value)}
        disabled={isLoading}
        className={inputCls()}
      >
        <option value="">{intl.formatMessage({ id: 'recurring.link.none' })}</option>
        {patterns.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
        <option value={CREATE_SENTINEL}>
          {intl.formatMessage({ id: 'recurring.link.create' })}
        </option>
      </select>
      {showCreate && (
        <CreatePatternForm transactionId={transactionId} onDone={() => setShowCreate(false)} />
      )}
    </div>
  );
}
