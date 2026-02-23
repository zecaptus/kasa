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
    cn('w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors', {
      'border-slate-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-400': !err,
      'border-red-400 focus:border-red-400 focus:ring-1 focus:ring-red-400': !!err,
    });

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <h2 className="text-base font-medium text-slate-800">
        {intl.formatMessage({ id: 'expense.form.title' })}
      </h2>

      <div>
        <label htmlFor="expense-amount" className="mb-1 block text-xs font-medium text-slate-600">
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
        {errors.amount && <p className="mt-1 text-xs text-red-600">{errors.amount}</p>}
      </div>

      <div>
        <label htmlFor="expense-label" className="mb-1 block text-xs font-medium text-slate-600">
          {intl.formatMessage({ id: 'expense.form.label' })}
        </label>
        <input
          id="expense-label"
          type="text"
          maxLength={255}
          className={inputCls(errors.label)}
          {...field('label')}
        />
        {errors.label && <p className="mt-1 text-xs text-red-600">{errors.label}</p>}
      </div>

      <div>
        <label htmlFor="expense-date" className="mb-1 block text-xs font-medium text-slate-600">
          {intl.formatMessage({ id: 'expense.form.date' })}
        </label>
        <input id="expense-date" type="date" className={inputCls(errors.date)} {...field('date')} />
        {errors.date && <p className="mt-1 text-xs text-red-600">{errors.date}</p>}
      </div>

      <div>
        <label htmlFor="expense-category" className="mb-1 block text-xs font-medium text-slate-600">
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
        {errors.category && <p className="mt-1 text-xs text-red-600">{errors.category}</p>}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
      >
        {intl.formatMessage({ id: 'expense.form.submit' })}
      </button>
    </form>
  );
}
