import { useState } from 'react';
import { useIntl } from 'react-intl';
import { cn } from '../lib/cn';
import {
  useCreateCategoryRuleMutation,
  useListCategoriesQuery,
  useUpdateCategoryRuleMutation,
} from '../services/transactionsApi';

interface CategoryRuleFormProps {
  onSuccess?: () => void;
  initialValues?: { keyword: string; categoryId: string };
  ruleId?: string;
}

export function CategoryRuleForm({ onSuccess, initialValues, ruleId }: CategoryRuleFormProps) {
  const intl = useIntl();
  const isUpdateMode = ruleId !== undefined;

  const { data: categoriesData } = useListCategoriesQuery();
  const [createRule, { isLoading: isCreating }] = useCreateCategoryRuleMutation();
  const [updateRule, { isLoading: isUpdating }] = useUpdateCategoryRuleMutation();
  const isLoading = isCreating || isUpdating;

  const [keyword, setKeyword] = useState(initialValues?.keyword ?? '');
  const [categoryId, setCategoryId] = useState(initialValues?.categoryId ?? '');
  const [errors, setErrors] = useState<{ keyword?: string; categoryId?: string }>({});

  const inputCls = (hasError: boolean) =>
    cn(
      'w-full rounded-xl border bg-white px-4 py-2.5 text-sm text-kasa-dark outline-none transition-all placeholder:text-slate-400 dark:bg-slate-900 dark:text-slate-100',
      {
        'border-slate-200 focus:border-kasa-accent focus:ring-2 focus:ring-kasa-accent/15 dark:border-slate-700':
          !hasError,
        'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-200': hasError,
      },
    );

  const categories = categoriesData?.categories ?? [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: { keyword?: string; categoryId?: string } = {};
    if (!keyword.trim()) errs.keyword = intl.formatMessage({ id: 'categories.rules.keyword' });
    if (!categoryId) errs.categoryId = intl.formatMessage({ id: 'categories.rules.category' });
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});

    if (isUpdateMode) {
      await updateRule({ id: ruleId, keyword: keyword.trim(), categoryId });
    } else {
      await createRule({ keyword: keyword.trim(), categoryId });
    }
    onSuccess?.();
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="space-y-1.5">
        <label
          htmlFor="rule-keyword"
          className="block text-sm font-medium text-slate-600 dark:text-slate-400"
        >
          {intl.formatMessage({ id: 'categories.rules.keyword' })}
        </label>
        <input
          id="rule-keyword"
          type="text"
          maxLength={100}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className={inputCls(!!errors.keyword)}
        />
        {errors.keyword && (
          <p className="text-xs text-red-600 dark:text-red-400">{errors.keyword}</p>
        )}
        <p className="text-xs text-slate-400">
          {intl.formatMessage({ id: 'categories.rules.hint' })}
        </p>
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="rule-category"
          className="block text-sm font-medium text-slate-600 dark:text-slate-400"
        >
          {intl.formatMessage({ id: 'categories.rules.category' })}
        </label>
        <select
          id="rule-category"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className={inputCls(!!errors.categoryId)}
        >
          <option value="" disabled>
            —
          </option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
        {errors.categoryId && (
          <p className="text-xs text-red-600 dark:text-red-400">{errors.categoryId}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-xl bg-kasa-accent px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-kasa-accent-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
      >
        {intl.formatMessage({
          id: isUpdateMode ? 'categories.form.submit.update' : 'categories.form.submit.create',
        })}
      </button>
    </form>
  );
}
