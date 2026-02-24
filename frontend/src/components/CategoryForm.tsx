import { useState } from 'react';
import { useIntl } from 'react-intl';
import { cn } from '../lib/cn';
import { inputCls } from '../lib/inputCls';
import { useCreateCategoryMutation, useUpdateCategoryMutation } from '../services/transactionsApi';
import { Button } from './ui/Button';

const PRESET_COLORS = [
  // Reds / pinks
  '#ef4444',
  '#f43f5e',
  '#ec4899',
  '#db2777',
  // Oranges / yellows
  '#f97316',
  '#f59e0b',
  '#eab308',
  '#84cc16',
  // Greens
  '#22c55e',
  '#10b981',
  '#14b8a6',
  '#06b6d4',
  // Blues
  '#3b82f6',
  '#6366f1',
  '#8b5cf6',
  '#a855f7',
  // Purples / neutrals
  '#d946ef',
  '#e879f9',
  '#94a3b8',
  '#64748b',
  // Browns / warm
  '#a16207',
  '#92400e',
  '#78350f',
  '#1e293b',
] as const;

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
        <div className="grid grid-cols-8 gap-1.5">
          {PRESET_COLORS.map((preset) => (
            <button
              key={preset}
              type="button"
              aria-label={preset}
              onClick={() => setColor(preset)}
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-all',
                { 'ring-2 ring-kasa-accent ring-offset-2': color === preset },
              )}
              style={{ backgroundColor: preset }}
            >
              {color === preset && (
                <svg
                  viewBox="0 0 12 12"
                  className="h-3 w-3 text-white"
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
          {/* Custom color picker */}
          <label
            className={cn(
              'flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-dashed border-slate-300 transition-all hover:border-slate-400 dark:border-slate-600 dark:hover:border-slate-500',
              {
                'ring-2 ring-kasa-accent ring-offset-2': !PRESET_COLORS.includes(
                  color as (typeof PRESET_COLORS)[number],
                ),
              },
            )}
            title={intl.formatMessage({ id: 'categories.color.custom' })}
            style={
              !PRESET_COLORS.includes(color as (typeof PRESET_COLORS)[number])
                ? { backgroundColor: color, borderStyle: 'solid', borderColor: 'transparent' }
                : {}
            }
          >
            {PRESET_COLORS.includes(color as (typeof PRESET_COLORS)[number]) && (
              <span className="text-xs text-slate-400" aria-hidden="true">
                +
              </span>
            )}
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="sr-only"
            />
          </label>
        </div>
      </div>

      <Button type="submit" disabled={isLoading} className="w-full">
        {intl.formatMessage({
          id: isUpdateMode ? 'categories.form.submit.update' : 'categories.form.submit.create',
        })}
      </Button>
    </form>
  );
}
