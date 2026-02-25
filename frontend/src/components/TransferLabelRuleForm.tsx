import { useState } from 'react';
import { useIntl } from 'react-intl';
import { inputCls } from '../lib/inputCls';
import {
  useCreateTransferLabelRuleMutation,
  useUpdateTransferLabelRuleMutation,
} from '../services/transactionsApi';
import { Button } from './ui/Button';

interface TransferLabelRuleFormProps {
  onSuccess?: (labeled?: number) => void;
  initialValues?: { keyword: string; label: string };
  ruleId?: string;
}

export function TransferLabelRuleForm({
  onSuccess,
  initialValues,
  ruleId,
}: TransferLabelRuleFormProps) {
  const intl = useIntl();
  const isUpdateMode = ruleId !== undefined;

  const [createRule, { isLoading: isCreating }] = useCreateTransferLabelRuleMutation();
  const [updateRule, { isLoading: isUpdating }] = useUpdateTransferLabelRuleMutation();
  const isLoading = isCreating || isUpdating;

  const [keyword, setKeyword] = useState(initialValues?.keyword ?? '');
  const [label, setLabel] = useState(initialValues?.label ?? '');
  const [errors, setErrors] = useState<{ keyword?: string; label?: string }>({});

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: { keyword?: string; label?: string } = {};
    if (!keyword.trim()) errs.keyword = intl.formatMessage({ id: 'transfer.labels.rule.keyword' });
    if (!label.trim()) errs.label = intl.formatMessage({ id: 'transfer.labels.rule.label' });
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    const result = isUpdateMode
      ? await updateRule({ id: ruleId, keyword: keyword.trim(), label: label.trim() })
      : await createRule({ keyword: keyword.trim(), label: label.trim() });
    onSuccess?.('data' in result ? result.data?.labeled : undefined);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="space-y-1.5">
        <label
          htmlFor="tlr-keyword"
          className="block text-sm font-medium text-slate-600 dark:text-slate-400"
        >
          {intl.formatMessage({ id: 'transfer.labels.rule.keyword' })}
        </label>
        <input
          id="tlr-keyword"
          type="text"
          maxLength={100}
          placeholder={intl.formatMessage({ id: 'transfer.labels.keyword.placeholder' })}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className={inputCls(!!errors.keyword)}
        />
        {errors.keyword && (
          <p className="text-xs text-red-600 dark:text-red-400">{errors.keyword}</p>
        )}
        <p className="text-xs text-slate-400">
          {intl.formatMessage({ id: 'transfer.labels.rule.hint' })}
        </p>
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="tlr-label"
          className="block text-sm font-medium text-slate-600 dark:text-slate-400"
        >
          {intl.formatMessage({ id: 'transfer.labels.rule.label' })}
        </label>
        <input
          id="tlr-label"
          type="text"
          maxLength={100}
          placeholder={intl.formatMessage({ id: 'transfer.labels.label.placeholder' })}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className={inputCls(!!errors.label)}
        />
        {errors.label && <p className="text-xs text-red-600 dark:text-red-400">{errors.label}</p>}
      </div>

      <Button type="submit" disabled={isLoading} className="w-full">
        {intl.formatMessage({
          id: isUpdateMode ? 'categories.form.submit.update' : 'categories.form.submit.create',
        })}
      </Button>
    </form>
  );
}
