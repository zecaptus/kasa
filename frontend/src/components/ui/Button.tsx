import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

type ButtonVariant = 'primary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      className={cn(
        'rounded-xl font-semibold transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100',
        {
          'bg-kasa-accent text-white shadow-sm hover:bg-kasa-accent-hover hover:shadow-md':
            variant === 'primary',
          'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800':
            variant === 'ghost',
          'text-red-500 hover:bg-red-50 dark:hover:bg-red-950': variant === 'danger',
          'px-4 py-3 text-sm': size === 'md',
          'px-2.5 py-1 text-xs': size === 'sm',
        },
        className,
      )}
    >
      {children}
    </button>
  );
}
