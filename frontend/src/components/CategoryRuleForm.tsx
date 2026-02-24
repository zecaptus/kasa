import { useState } from 'react';
import { useIntl } from 'react-intl';
import { inputCls } from '../lib/inputCls';
import {
  useCreateCategoryRuleMutation,
  useListCategoriesQuery,
  useUpdateCategoryRuleMutation,
} from '../services/transactionsApi';
import { Button } from './ui/Button';

function validateRuleForm(
  keyword: string,
  categoryId: string,
  fmt: (d: { id: string }) => string,
): { keyword?: string; categoryId?: string } {
  const errs: { keyword?: string; categoryId?: string } = {};
  if (!keyword.trim()) errs.keyword = fmt({ id: 'categories.rules.keyword' });
  if (!categoryId) errs.categoryId = fmt({ id: 'categories.rules.category' });
  return errs;
}

interface CategoryRuleFormProps {
  onSuccess?: (categorized?: number) => void;
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

  const categories = categoriesData?.categories ?? [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validateRuleForm(keyword, categoryId, intl.formatMessage);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    const result = isUpdateMode
      ? await updateRule({ id: ruleId, keyword: keyword.trim(), categoryId })
      : await createRule({ keyword: keyword.trim(), categoryId });
    onSuccess?.('data' in result ? result.data?.categorized : undefined);
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

      <Button type="submit" disabled={isLoading} className="w-full">
        {intl.formatMessage({
          id: isUpdateMode ? 'categories.form.submit.update' : 'categories.form.submit.create',
        })}
      </Button>
    </form>
  );
}
