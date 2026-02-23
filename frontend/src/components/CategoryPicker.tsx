import { useIntl } from 'react-intl';
import { cn } from '../lib/cn';
import { type CategoryDto, useListCategoriesQuery } from '../services/transactionsApi';

interface CategoryPickerProps {
  value: string | null;
  onChange: (categoryId: string | null) => void;
  disabled?: boolean;
}

export function CategoryPicker({ value, onChange, disabled }: CategoryPickerProps) {
  const intl = useIntl();
  const { data, isLoading } = useListCategoriesQuery();

  if (isLoading) {
    return <div className="h-9 animate-pulse rounded-xl bg-slate-100" />;
  }

  const categories = data?.categories ?? [];

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(null)}
        className={cn(
          'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all',
          {
            'border-slate-300 bg-slate-100 text-slate-600': value !== null,
            'border-slate-500 bg-slate-200 text-slate-800 ring-1 ring-slate-400': value === null,
          },
        )}
      >
        <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
        {intl.formatMessage({ id: 'transactions.category.none' })}
      </button>
      {categories.map((cat: CategoryDto) => (
        <button
          key={cat.id}
          type="button"
          disabled={disabled}
          onClick={() => onChange(cat.id)}
          className={cn(
            'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all',
            {
              'border-slate-200 bg-white text-slate-700 hover:border-slate-300': value !== cat.id,
              'border-transparent text-white ring-1 ring-offset-1': value === cat.id,
            },
          )}
          style={value === cat.id ? { backgroundColor: cat.color } : {}}
        >
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
          {cat.name}
        </button>
      ))}
    </div>
  );
}
