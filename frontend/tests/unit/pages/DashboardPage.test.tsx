import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import enMessages from '../../../src/i18n/en.json';
import { DashboardPage } from '../../../src/pages/DashboardPage';
import type { DashboardResponseDto } from '../../../src/services/dashboardApi';
import { store } from '../../../src/store';

const mockData: DashboardResponseDto = {
  summary: {
    totalBalance: 4250.5,
    monthlySpending: 850,
    monthlyIncome: 2800,
    netCashFlow: 1950,
  },
  accounts: [
    {
      accountId: 'acc-001',
      accountNumber: 'FR761234',
      label: 'Compte courant',
      isHidden: false,
      balance: 1250.5,
      rangeVariation: 200,
      currentBalance: null,
      balanceDate: null,
      endOfMonthPrediction: null,
      recentTransactions: [],
    },
  ],
  categoryComparison: {
    currentMonth: [],
    previousMonth: [],
  },
};

vi.mock('../../../src/services/dashboardApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/services/dashboardApi')>();
  return {
    ...actual,
    useGetDashboardQuery: vi.fn(),
  };
});

vi.mock('../../../src/components/SpendingChart', () => ({
  default: () => <div data-testid="spending-chart" />,
}));

const { useGetDashboardQuery } = await import('../../../src/services/dashboardApi');
const mockUseGetDashboard = vi.mocked(useGetDashboardQuery);

function renderPage() {
  return render(
    <Provider store={store}>
      <IntlProvider messages={enMessages} locale="en" defaultLocale="en">
        <MemoryRouter>
          <DashboardPage />
        </MemoryRouter>
      </IntlProvider>
    </Provider>,
  );
}

describe('DashboardPage', () => {
  it('renders skeleton while loading', () => {
    mockUseGetDashboard.mockReturnValue({
      isLoading: true,
      isError: false,
      data: undefined,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useGetDashboardQuery>);

    renderPage();
    expect(document.querySelector('[aria-busy="true"]')).toBeTruthy();
  });

  it('renders error state with retry button when isError is true', async () => {
    const mockRefetch = vi.fn();
    mockUseGetDashboard.mockReturnValue({
      isLoading: false,
      isError: true,
      data: undefined,
      refetch: mockRefetch,
    } as unknown as ReturnType<typeof useGetDashboardQuery>);

    renderPage();
    expect(screen.getByText('Could not load dashboard data.')).toBeDefined();
    const retryButton = screen.getByRole('button', { name: /try again/i });
    expect(retryButton).toBeDefined();

    await userEvent.click(retryButton);
    expect(mockRefetch).toHaveBeenCalledOnce();
  });

  it('renders dashboard content when data is loaded', () => {
    mockUseGetDashboard.mockReturnValue({
      isLoading: false,
      isError: false,
      data: mockData,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useGetDashboardQuery>);

    renderPage();
    expect(screen.getByText('Dashboard')).toBeDefined();
    expect(screen.getByText('Compte courant')).toBeDefined();
  });

  it('renders empty accounts message when accounts array is empty', () => {
    mockUseGetDashboard.mockReturnValue({
      isLoading: false,
      isError: false,
      data: { ...mockData, accounts: [] },
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useGetDashboardQuery>);

    renderPage();
    expect(
      screen.getByText('No accounts found. Import a bank statement to get started.'),
    ).toBeDefined();
  });

  it('does not expose stack traces in error state', () => {
    mockUseGetDashboard.mockReturnValue({
      isLoading: false,
      isError: true,
      data: undefined,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useGetDashboardQuery>);

    renderPage();
    expect(screen.queryByText(/Error:/)).toBeNull();
    expect(screen.queryByText(/at \w/)).toBeNull();
  });
});
