import { useState } from 'react';
import { useIntl } from 'react-intl';
import { cn } from '../lib/cn';
import { useCreateCategoryMutation, useUpdateCategoryMutation } from '../services/transactionsApi';

const PRESET_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#94a3b8'] as const;

interface CategoryFormProps {
  onSuccess?: () => void;
  initialValues?: { name: string; color: string };
  categoryId?: string;
}

export function CategoryForm({ onSuccess, initialValues, categoryId }: CategoryFormProps) {
  const intl = useIntl();
  const isUpdateMode = categoryId !== undefined;

  const [createCategory, { isLoading: isCreating }] = useCreateCategoryMutation();
  const [updateCategory, { isLoading: isUpdating }] = useUpdateCategoryMutation();
  const isLoading = isCreating || isUpdating;

  const [name, setName] = useState(initialValues?.name ?? '');
  const [color, setColor] = useState(initialValues?.color ?? PRESET_COLORS[0]);
  const [nameError, setNameError] = useState('');

  const inputCls = (hasError: boolean) =>
    cn(
      'w-full rounded-xl border bg-white px-4 py-2.5 text-sm text-kasa-dark outline-none transition-all placeholder:text-slate-400 dark:bg-slate-900 dark:text-slate-100',
      {
        'border-slate-200 focus:border-kasa-accent focus:ring-2 focus:ring-kasa-accent/15 dark:border-slate-700':
          !hasError,
        'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-200': hasError,
      },
    );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setNameError(intl.formatMessage({ id: 'categories.name' }));
      return;
    }
    setNameError('');

    if (isUpdateMode) {
      await updateCategory({ id: categoryId, name: name.trim(), color });
    } else {
      await createCategory({ name: name.trim(), color });
    }
    onSuccess?.();
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="space-y-1.5">
        <label
          htmlFor="cat-name"
          className="block text-sm font-medium text-slate-600 dark:text-slate-400"
        >
          {intl.formatMessage({ id: 'categories.name' })}
        </label>
        <input
          id="cat-name"
          type="text"
          maxLength={100}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputCls(!!nameError)}
        />
        {nameError && <p className="text-xs text-red-600 dark:text-red-400">{nameError}</p>}
      </div>

      <div className="space-y-1.5">
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
          {intl.formatMessage({ id: 'categories.color' })}
        </p>
        <div className="flex gap-2">
          {PRESET_COLORS.map((preset) => (
            <button
              key={preset}
              type="button"
              aria-label={preset}
              onClick={() => setColor(preset)}
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all',
                { 'ring-2 ring-kasa-accent ring-offset-2': color === preset },
              )}
              style={{ backgroundColor: preset }}
            >
              {color === preset && (
                <svg
                  viewBox="0 0 12 12"
                  className="h-3.5 w-3.5 text-white"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  aria-hidden="true"
                  strokeLinejoin="round"
                >
                  <polyline points="1.5,6.5 4.5,9.5 10.5,2.5" />
                </svg>
              )}
            </button>
          ))}
        </div>
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
