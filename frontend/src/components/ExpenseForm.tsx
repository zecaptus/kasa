import { useState } from 'react';
import { useIntl } from 'react-intl';
import { cn } from '../lib/cn';
import { useCreateExpenseMutation } from '../services/importApi';

const CATEGORIES = ['FOOD', 'TRANSPORT', 'HOUSING', 'HEALTH', 'ENTERTAINMENT', 'OTHER'] as const;
type Category = (typeof CATEGORIES)[number];

interface FormValues {
  amount: string;
  label: string;
  date: string;
  category: Category | '';
}

interface FormErrors {
  amount?: string;
  label?: string;
  date?: string;
  category?: string;
}

export function ExpenseForm() {
  const intl = useIntl();
  const [createExpense, { isLoading }] = useCreateExpenseMutation();
  const [values, setValues] = useState<FormValues>({
    amount: '',
    label: '',
    date: new Date().toISOString().slice(0, 10),
    category: '',
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
    if (!values.category) {
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
      category: values.category as Category,
    });
    setValues({ amount: '', label: '', date: new Date().toISOString().slice(0, 10), category: '' });
  }

  function field(name: keyof FormValues) {
    return {
      value: values[name],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        setValues((v) => ({ ...v, [name]: e.target.value })),
    };
  }

  const inputCls = (err?: string) =>
    cn(
      'w-full rounded-xl border bg-white px-4 py-2.5 text-sm text-kasa-dark outline-none transition-all placeholder:text-slate-400 dark:bg-slate-900 dark:text-slate-100',
      {
        'border-slate-200 focus:border-kasa-accent focus:ring-2 focus:ring-kasa-accent/15 dark:border-slate-700':
          !err,
        'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-200': !!err,
      },
    );

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
          className={inputCls(errors.amount)}
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
          className={inputCls(errors.label)}
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
        <input id="expense-date" type="date" className={inputCls(errors.date)} {...field('date')} />
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
          className={inputCls(errors.category)}
          value={values.category}
          onChange={(e) => setValues((v) => ({ ...v, category: e.target.value as Category | '' }))}
        >
          <option value="" disabled>
            —
          </option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {intl.formatMessage({ id: `expense.category.${cat}` })}
            </option>
          ))}
        </select>
        {errors.category && (
          <p className="text-xs text-red-600 dark:text-red-400">{errors.category}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-xl bg-kasa-accent px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-kasa-accent-hover hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
      >
        {intl.formatMessage({ id: 'expense.form.submit' })}
      </button>
    </form>
  );
}
