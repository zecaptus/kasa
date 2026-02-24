import { cn } from './cn';

/**
 * Shared input/select class builder — consistent styling with dark mode support.
 * Use for all form inputs and selects across the app.
 */
export function inputCls(hasError = false): string {
  return cn(
    'w-full rounded-xl border bg-white px-4 py-2.5 text-sm text-kasa-dark outline-none transition-all placeholder:text-slate-400 dark:bg-slate-900 dark:text-slate-100',
    hasError
      ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-200'
      : 'border-slate-200 focus:border-kasa-accent focus:ring-2 focus:ring-kasa-accent/15 dark:border-slate-700',
  );
}
