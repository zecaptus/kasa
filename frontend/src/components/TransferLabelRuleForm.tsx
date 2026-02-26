import { useState } from 'react';
import { useIntl } from 'react-intl';
import { inputCls } from '../lib/inputCls';
import {
  useCreateTransferLabelRuleMutation,
  useUpdateTransferLabelRuleMutation,
} from '../services/transactionsApi';
import { Button } from './ui/Button';

function validateTransferLabelRuleForm(
  keyword: string,
  label: string,
  fmt: (d: { id: string }) => string,
): { keyword?: string; label?: string } {
  const errs: { keyword?: string; label?: string } = {};
  if (!keyword.trim()) errs.keyword = fmt({ id: 'transfer.labels.rule.keyword' });
  if (!label.trim()) errs.label = fmt({ id: 'transfer.labels.rule.label' });
  return errs;
}

interface TransferLabelRuleFormProps {
  onSuccess?: (labeled?: number) => void;
  initialValues?: { keyword: string; label: string; amount?: number | null };
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
  const [amount, setAmount] = useState(
    initialValues?.amount != null ? String(initialValues.amount) : '',
  );
  const [errors, setErrors] = useState<{ keyword?: string; label?: string }>({});

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validateTransferLabelRuleForm(keyword, label, intl.formatMessage);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    const parsedAmount = amount.trim() ? Number(amount) : null;
    const result = isUpdateMode
      ? await updateRule({
          id: ruleId,
          keyword: keyword.trim(),
          label: label.trim(),
          amount: parsedAmount,
        })
      : await createRule({ keyword: keyword.trim(), label: label.trim(), amount: parsedAmount });
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

      <div className="space-y-1.5">
        <label
          htmlFor="tlr-amount"
          className="block text-sm font-medium text-slate-600 dark:text-slate-400"
        >
          {intl.formatMessage({ id: 'rule.amount.label' })}
        </label>
        <input
          id="tlr-amount"
          type="number"
          step="0.01"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder={intl.formatMessage({ id: 'rule.amount.placeholder' })}
          className={inputCls()}
        />
      </div>

      <Button type="submit" disabled={isLoading} className="w-full">
        {intl.formatMessage({
          id: isUpdateMode ? 'categories.form.submit.update' : 'categories.form.submit.create',
        })}
      </Button>
    </form>
  );
}
