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
  otherLabel: string,
): ChartRow[] {
  const prevMap = new Map(previousMonth.map((c) => [c.slug, c.amount]));
  return currentMonth.map((c) => ({
    name: c.slug === 'other' ? otherLabel : c.name,
    current: c.amount,
    previous: prevMap.get(c.slug) ?? 0,
  }));
}

function SpendingChart({ categoryComparison }: Props) {
  const intl = useIntl();
  const otherLabel = intl.formatMessage({ id: 'dashboard.chart.other' });
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
        className="flex min-h-[200px] items-center justify-center rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <p className="text-sm text-slate-400">{emptyLabel}</p>
      </section>
    );
  }

  const rows = buildChartData(currentMonth, categoryComparison.previousMonth, otherLabel);

  const chartConfig: ChartConfig = {
    current: { label: currentLabel, color: 'hsl(142 76% 36%)' },
    previous: { label: previousLabel, color: 'hsl(217 91% 60%)' },
  };

  return (
    <section
      aria-roledescription="chart"
      aria-label={titleLabel}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <h2 className="mb-4 text-lg font-semibold text-slate-800">{titleLabel}</h2>
      <ChartContainer config={chartConfig} className="h-64 w-full">
        <BarChart data={rows} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11 }}
            tickFormatter={(v: number) =>
              intl.formatNumber(v, { style: 'currency', currency: 'EUR', notation: 'compact' })
            }
          />
          <Tooltip
            formatter={(value: number | undefined, name: string | undefined) => [
              intl.formatNumber(value ?? 0, { style: 'currency', currency: 'EUR' }),
              name === 'current' ? currentLabel : previousLabel,
            ]}
          />
          <Legend
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
