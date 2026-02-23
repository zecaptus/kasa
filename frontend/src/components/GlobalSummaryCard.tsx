import { useIntl } from 'react-intl';
import { cn } from '../lib/cn';
import type { DashboardSummaryDto } from '../services/dashboardApi';

interface Props {
  summary: DashboardSummaryDto;
}

interface MetricProps {
  labelId: string;
  value: number;
  highlightPositive?: boolean;
}

function Metric({ labelId, value, highlightPositive = false }: MetricProps) {
  const intl = useIntl();
  const formatted = intl.formatNumber(value, {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  });

  const isPositive = value > 0;
  const isNegative = value < 0;

  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm text-slate-500">{intl.formatMessage({ id: labelId })}</span>
      <span
        className={cn('text-xl font-semibold tabular-nums', {
          'text-emerald-600': highlightPositive && isPositive,
          'text-red-500': highlightPositive && isNegative,
          'text-slate-800': !highlightPositive || (!isPositive && !isNegative),
        })}
      >
        {formatted}
      </span>
    </div>
  );
}

export function GlobalSummaryCard({ summary }: Props) {
  const intl = useIntl();

  return (
    <section
      aria-label={intl.formatMessage({ id: 'dashboard.title' })}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <h2 className="mb-4 text-lg font-semibold text-slate-800">
        {intl.formatMessage({ id: 'dashboard.title' })}
      </h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Metric labelId="dashboard.summary.totalBalance" value={summary.totalBalance} />
        <Metric labelId="dashboard.summary.monthlyIncome" value={summary.monthlyIncome} />
        <Metric labelId="dashboard.summary.monthlySpending" value={summary.monthlySpending} />
        <Metric
          labelId="dashboard.summary.netCashFlow"
          value={summary.netCashFlow}
          highlightPositive
        />
      </div>
    </section>
  );
}
