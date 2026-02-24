import { useState } from 'react';
import { useIntl } from 'react-intl';
import { inputCls } from '../lib/inputCls';
import { useCreateExpenseMutation } from '../services/importApi';
import { useListCategoriesQuery } from '../services/transactionsApi';
import { Button } from './ui/Button';

interface FormValues {
  amount: string;
  label: string;
  date: string;
  categoryId: string;
}

interface FormErrors {
  amount?: string;
  label?: string;
  date?: string;
  category?: string;
}

interface ExpenseFormProps {
  onSuccess?: () => void;
}

export function ExpenseForm({ onSuccess }: ExpenseFormProps) {
  const intl = useIntl();
  const [createExpense, { isLoading }] = useCreateExpenseMutation();
  const { data: categoriesData } = useListCategoriesQuery();
  const categories = categoriesData?.categories ?? [];
  const [values, setValues] = useState<FormValues>({
    amount: '',
    label: '',
    date: new Date().toISOString().slice(0, 10),
    categoryId: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});

  function validate(): FormErrors {
    const errs: FormErrors = {};
    const amount = parseFloat(values.amount);
    if (!values.amount || Number.isNaN(amount) || amount <= 0) {
      errs.amount = intl.formatMessage({ id: 'expense.form.errors.amount' });
    }
    if (!values.label.trim()) {
      errs.label = intl.formatMessage({ id: 'expense.form.errors.label' });
    }
    if (!values.date) {
      errs.date = intl.formatMessage({ id: 'expense.form.errors.date' });
    }
    if (!values.categoryId) {
      errs.category = intl.formatMessage({ id: 'expense.form.errors.category' });
    }
    return errs;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    await createExpense({
      amount: parseFloat(values.amount),
      label: values.label.trim(),
      date: values.date,
      categoryId: values.categoryId,
    });
    setValues({
      amount: '',
      label: '',
      date: new Date().toISOString().slice(0, 10),
      categoryId: '',
    });
    onSuccess?.();
  }

  function field(name: keyof FormValues) {
    return {
      value: values[name],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        setValues((v) => ({ ...v, [name]: e.target.value })),
    };
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <h2 className="text-center font-display text-2xl font-semibold tracking-tight text-kasa-dark dark:text-slate-100">
        {intl.formatMessage({ id: 'expense.form.title' })}
      </h2>

      <div className="space-y-1.5">
        <label
          htmlFor="expense-amount"
          className="block text-sm font-medium text-slate-600 dark:text-slate-400"
        >
          {intl.formatMessage({ id: 'expense.form.amount' })}
        </label>
        <input
          id="expense-amount"
          type="number"
          min="0.01"
          step="0.01"
          className={inputCls(!!errors.amount)}
          {...field('amount')}
        />
        {errors.amount && <p className="text-xs text-red-600 dark:text-red-400">{errors.amount}</p>}
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="expense-label"
          className="block text-sm font-medium text-slate-600 dark:text-slate-400"
        >
          {intl.formatMessage({ id: 'expense.form.label' })}
        </label>
        <input
          id="expense-label"
          type="text"
          maxLength={255}
          className={inputCls(!!errors.label)}
          {...field('label')}
        />
        {errors.label && <p className="text-xs text-red-600 dark:text-red-400">{errors.label}</p>}
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="expense-date"
          className="block text-sm font-medium text-slate-600 dark:text-slate-400"
        >
          {intl.formatMessage({ id: 'expense.form.date' })}
        </label>
        <input
          id="expense-date"
          type="date"
          className={inputCls(!!errors.date)}
          {...field('date')}
        />
        {errors.date && <p className="text-xs text-red-600 dark:text-red-400">{errors.date}</p>}
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="expense-category"
          className="block text-sm font-medium text-slate-600 dark:text-slate-400"
        >
          {intl.formatMessage({ id: 'expense.form.category' })}
        </label>
        <select
          id="expense-category"
          className={inputCls(!!errors.category)}
          value={values.categoryId}
          onChange={(e) => setValues((v) => ({ ...v, categoryId: e.target.value }))}
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
        {errors.category && (
          <p className="text-xs text-red-600 dark:text-red-400">{errors.category}</p>
        )}
      </div>

      <Button type="submit" disabled={isLoading} className="w-full">
        {intl.formatMessage({ id: 'expense.form.submit' })}
      </Button>
    </form>
  );
}
