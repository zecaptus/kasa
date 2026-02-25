import { useState } from 'react';
import { useIntl } from 'react-intl';
import { inputCls } from '../lib/inputCls';
import {
  type UnifiedTransactionDto,
  useCreateTransferLabelRuleMutation,
  useUpdateTransferLabelMutation,
} from '../services/transactionsApi';
import { Button } from './ui/Button';

interface TransferLabelEditorProps {
  transaction: UnifiedTransactionDto;
}

interface StaticRowProps {
  transferLabel: string | null;
  onEdit: () => void;
}

function StaticRow({ transferLabel, onEdit }: StaticRowProps) {
  const intl = useIntl();
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-500">
        {intl.formatMessage({ id: 'transfer.labels.title' })}
      </span>
      <span className="flex items-center gap-2">
        {transferLabel && (
          <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
            {transferLabel}
          </span>
        )}
        <button
          type="button"
          onClick={onEdit}
          className="rounded-lg px-2 py-0.5 text-xs font-medium text-kasa-accent transition-colors hover:bg-kasa-accent/10 dark:hover:bg-kasa-accent/15"
        >
          {intl.formatMessage({
            id: transferLabel ? 'transfer.labels.edit' : 'transfer.labels.set',
          })}
        </button>
      </span>
    </div>
  );
}

interface EditFormProps {
  transaction: UnifiedTransactionDto;
  onCancel: () => void;
}

function EditForm({ transaction, onCancel }: EditFormProps) {
  const intl = useIntl();
  const [labelValue, setLabelValue] = useState(transaction.transferLabel ?? '');
  const [createRule, setCreateRule] = useState(false);
  const [keywordValue, setKeywordValue] = useState(transaction.label);

  const [updateTransferLabel, { isLoading: isSavingLabel }] = useUpdateTransferLabelMutation();
  const [createTransferLabelRule, { isLoading: isCreatingRule }] =
    useCreateTransferLabelRuleMutation();
  const isLoading = isSavingLabel || isCreatingRule;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const trimmedLabel = labelValue.trim() || null;
    await updateTransferLabel({ id: transaction.id, label: trimmedLabel });
    if (createRule && trimmedLabel && keywordValue.trim()) {
      await createTransferLabelRule({
        keyword: keywordValue.trim(),
        label: trimmedLabel,
      });
    }
    onCancel();
  }

  return (
    <form onSubmit={handleSave} noValidate className="space-y-3">
      <span className="text-sm text-slate-500">
        {intl.formatMessage({ id: 'transfer.labels.title' })}
      </span>

      <input
        type="text"
        maxLength={100}
        placeholder={intl.formatMessage({ id: 'transfer.labels.label.placeholder' })}
        value={labelValue}
        onChange={(e) => setLabelValue(e.target.value)}
        className={inputCls(false)}
      />

      <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
        <input
          type="checkbox"
          checked={createRule}
          onChange={(e) => setCreateRule(e.target.checked)}
          className="rounded border-slate-300"
        />
        {intl.formatMessage({ id: 'transfer.labels.create.rule' })}
      </label>

      {createRule && (
        <input
          type="text"
          maxLength={100}
          placeholder={intl.formatMessage({ id: 'transfer.labels.keyword.placeholder' })}
          value={keywordValue}
          onChange={(e) => setKeywordValue(e.target.value)}
          className={inputCls(false)}
        />
      )}

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isLoading}>
          {intl.formatMessage({ id: 'categories.form.submit.update' })}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          {intl.formatMessage({ id: 'recurring.edit.cancel' })}
        </Button>
      </div>
    </form>
  );
}

export function TransferLabelEditor({ transaction }: TransferLabelEditorProps) {
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing) {
    return <EditForm transaction={transaction} onCancel={() => setIsEditing(false)} />;
  }

  return <StaticRow transferLabel={transaction.transferLabel} onEdit={() => setIsEditing(true)} />;
}
