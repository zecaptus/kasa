import { useIntl } from 'react-intl';
import { Bar, BarChart, CartesianGrid, Legend, Tooltip, XAxis, YAxis } from 'recharts';
import type { CategoryComparisonDto, CategorySpendingDto } from '../services/dashboardApi';
import type { ChartConfig } from './ui/chart';
import { ChartContainer } from './ui/chart';

interface Props {
  categoryComparison: CategoryComparisonDto;
}

interface ChartRow {
  name: string;
  current: number;
  previous: number;
}

function buildChartData(
  currentMonth: CategorySpendingDto[],
  previousMonth: CategorySpendingDto[],
  labelMap: Record<string, string>,
): ChartRow[] {
  const prevMap = new Map(previousMonth.map((c) => [c.slug, c.amount]));
  return currentMonth.map((c) => ({
    name: labelMap[c.slug] ?? c.name,
    current: c.amount,
    previous: prevMap.get(c.slug) ?? 0,
  }));
}

function SpendingChart({ categoryComparison }: Props) {
  const intl = useIntl();
  const slugLabels: Record<string, string> = {
    __aggregate_other__: intl.formatMessage({ id: 'dashboard.chart.other' }),
    uncategorized: intl.formatMessage({ id: 'transactions.category.none' }),
  };
  const currentLabel = intl.formatMessage({ id: 'dashboard.chart.currentMonth' });
  const previousLabel = intl.formatMessage({ id: 'dashboard.chart.previousMonth' });
  const titleLabel = intl.formatMessage({ id: 'dashboard.chart.title' });
  const emptyLabel = intl.formatMessage({ id: 'dashboard.chart.empty' });

  const { currentMonth } = categoryComparison;

  if (currentMonth.length === 0) {
    return (
      <section
        aria-roledescription="chart"
        aria-label={titleLabel}
        className="card flex min-h-[200px] items-center justify-center p-6"
      >
        <p className="text-sm text-slate-400">{emptyLabel}</p>
      </section>
    );
  }

  const rows = buildChartData(currentMonth, categoryComparison.previousMonth, slugLabels);

  const chartConfig: ChartConfig = {
    current: { label: currentLabel, color: 'hsl(142 76% 36%)' },
    previous: { label: previousLabel, color: 'hsl(217 91% 60%)' },
  };

  const tooltipStyle = {
    backgroundColor: 'var(--chart-tooltip-bg)',
    border: '1px solid var(--chart-tooltip-border)',
    borderRadius: '0.75rem',
    color: 'var(--chart-tooltip-text)',
  };

  return (
    <section aria-roledescription="chart" aria-label={titleLabel} className="card p-6">
      <h2 className="mb-4 section-title">{titleLabel}</h2>
      <ChartContainer config={chartConfig} className="h-64 w-full">
        <BarChart data={rows} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--chart-grid)" />
          <XAxis
            dataKey="name"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: 'var(--chart-tick)' }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: 'var(--chart-tick)' }}
            tickFormatter={(v: number) =>
              intl.formatNumber(v, { style: 'currency', currency: 'EUR', notation: 'compact' })
            }
          />
          <Tooltip
            cursor={{ fill: '#64748b', fillOpacity: 0.15 }}
            contentStyle={tooltipStyle}
            formatter={(value: number | undefined, name: string | undefined) => [
              intl.formatNumber(value ?? 0, { style: 'currency', currency: 'EUR' }),
              name === 'current' ? currentLabel : previousLabel,
            ]}
          />
          <Legend
            wrapperStyle={{ color: 'var(--chart-tick)' }}
            formatter={(value: string) => (value === 'current' ? currentLabel : previousLabel)}
          />
          <Bar dataKey="current" fill="var(--color-current)" radius={[4, 4, 0, 0]} />
          <Bar dataKey="previous" fill="var(--color-previous)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ChartContainer>
    </section>
  );
}

export default SpendingChart;
