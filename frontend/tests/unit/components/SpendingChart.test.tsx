import { render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { describe, expect, it, vi } from 'vitest';
import enMessages from '../../../src/i18n/en.json';
import type { CategoryComparisonDto } from '../../../src/services/dashboardApi';

// Mock recharts to avoid SVG / ResizeObserver issues in jsdom
vi.mock('recharts', () => ({
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  Bar: () => <div data-testid="bar" />,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
}));

// Static import AFTER vi.mock so the mock is applied
import SpendingChart from '../../../src/components/SpendingChart';

function renderChart(categoryComparison: CategoryComparisonDto) {
  return render(
    <IntlProvider messages={enMessages} locale="en" defaultLocale="en">
      <SpendingChart categoryComparison={categoryComparison} />
    </IntlProvider>,
  );
}

const baseData: CategoryComparisonDto = {
  currentMonth: [
    { categoryId: 'cat1', name: 'Alimentation', slug: 'alimentation', color: '#22c55e', amount: 340 },
    { categoryId: 'cat2', name: 'Transport', slug: 'transport', color: '#3b82f6', amount: 210 },
  ],
  previousMonth: [
    { categoryId: 'cat1', name: 'Alimentation', slug: 'alimentation', color: '#22c55e', amount: 290 },
  ],
};

describe('SpendingChart', () => {
  it('renders chart title when data is present', () => {
    renderChart(baseData);
    expect(screen.getByText('Spending by category')).toBeDefined();
  });

  it('renders the bar chart when data is present', () => {
    renderChart(baseData);
    expect(screen.getByTestId('bar-chart')).toBeDefined();
  });

  it('shows empty state message when currentMonth is empty', () => {
    renderChart({ currentMonth: [], previousMonth: [] });
    expect(screen.getByText('No categorised transactions yet.')).toBeDefined();
  });

  it('does NOT render bar chart in empty state', () => {
    renderChart({ currentMonth: [], previousMonth: [] });
    expect(screen.queryByTestId('bar-chart')).toBeNull();
  });

  it('renders chart section wrapper', () => {
    renderChart(baseData);
    const section = document.querySelector('section');
    expect(section).toBeTruthy();
  });
});
