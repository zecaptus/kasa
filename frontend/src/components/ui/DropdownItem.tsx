import type { ReactNode } from 'react';
import { Link } from 'react-router';

const cls =
  'flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 transition-colors w-full text-left';

type DropdownItemProps = {
  icon?: ReactNode;
  children: ReactNode;
  to?: string;
  onClick?: () => void;
  disabled?: boolean;
};

export const DropdownItem = ({ icon, children, to, onClick, disabled }: DropdownItemProps) => {
  if (to !== undefined) {
    return (
      <Link to={to} className={cls}>
        {icon}
        {children}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${cls} disabled:opacity-50`}
    >
      {icon}
      {children}
    </button>
  );
};
