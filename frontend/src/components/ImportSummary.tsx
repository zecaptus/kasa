import { useIntl } from 'react-intl';
import { cn } from '../lib/cn';
import type { ReconciliationCounts } from '../services/importApi';

interface ImportSummaryProps {
  counts: ReconciliationCounts;
}

interface CountItem {
  labelId: string;
  value: number;
  color: string;
}

export function ImportSummary({ counts }: ImportSummaryProps) {
  const intl = useIntl();

  const items: CountItem[] = [
    {
      labelId: 'import.summary.total',
      value: counts.total,
      color: 'bg-slate-100 text-slate-700',
    },
    {
      labelId: 'import.summary.reconciled',
      value: counts.reconciled,
      color: 'bg-green-100 text-green-700',
    },
    {
      labelId: 'import.summary.awaitingReview',
      value: counts.awaitingReview,
      color: 'bg-amber-100 text-amber-700',
    },
    {
      labelId: 'import.summary.unreconciled',
      value: counts.unreconciled,
      color: 'bg-blue-100 text-blue-700',
    },
    {
      labelId: 'import.summary.ignored',
      value: counts.ignored,
      color: 'bg-slate-100 text-slate-400',
    },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item.labelId}
          className={cn('rounded-full px-3 py-1 text-xs font-medium', item.color)}
        >
          {intl.formatMessage({ id: item.labelId }, { count: item.value })}
        </span>
      ))}
    </div>
  );
}
