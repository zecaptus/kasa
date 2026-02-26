import { render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { describe, expect, it } from 'vitest';
import { GlobalSummaryCard } from '../../../src/components/GlobalSummaryCard';
import enMessages from '../../../src/i18n/en.json';
import type { DashboardSummaryDto } from '../../../src/services/dashboardApi';

function renderCard(summary: DashboardSummaryDto) {
  return render(
    <IntlProvider messages={enMessages} locale="en" defaultLocale="en">
      <GlobalSummaryCard summary={summary} />
    </IntlProvider>,
  );
}

const baseSummary: DashboardSummaryDto = {
  totalBalance: 4250.5,
  monthlySpending: 850,
  monthlyIncome: 2800,
  netCashFlow: 1950,
};

describe('GlobalSummaryCard', () => {
  it('renders the dashboard title', () => {
    renderCard(baseSummary);
    expect(screen.getByText('Dashboard')).toBeDefined();
  });

  it('renders all four metric labels', () => {
    renderCard(baseSummary);
    expect(screen.getByText('Total balance')).toBeDefined();
    expect(screen.getByText('Income')).toBeDefined();
    expect(screen.getByText('Spending')).toBeDefined();
    expect(screen.getByText('Net cash flow')).toBeDefined();
  });

  it('applies green class to positive netCashFlow', () => {
    renderCard({ ...baseSummary, netCashFlow: 500 });
    const spans = document.querySelectorAll('.text-emerald-600');
    expect(spans.length).toBeGreaterThan(0);
  });

  it('applies red class to negative netCashFlow', () => {
    renderCard({ ...baseSummary, netCashFlow: -100 });
    const spans = document.querySelectorAll('.text-red-500');
    expect(spans.length).toBeGreaterThan(0);
  });

  it('renders without errors when all values are zero', () => {
    expect(() =>
      renderCard({ totalBalance: 0, monthlySpending: 0, monthlyIncome: 0, netCashFlow: 0 }),
    ).not.toThrow();
  });

  it('has accessible region landmark', () => {
    renderCard(baseSummary);
    expect(screen.getByRole('region')).toBeDefined();
  });
});
