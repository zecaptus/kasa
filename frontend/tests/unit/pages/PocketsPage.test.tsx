import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import enMessages from '../../../src/i18n/en.json';
import { PocketsPage } from '../../../src/pages/PocketsPage';
import type { PocketSummaryDto } from '../../../src/services/pocketsApi';
import { store } from '../../../src/store';

const mockPocket: PocketSummaryDto = {
  id: 'p1',
  accountLabel: 'Livret A',
  name: 'Vacances',
  goalAmount: 2000,
  allocatedAmount: 500,
  progressPct: 25,
  color: '#3b82f6',
  createdAt: '2026-01-01T00:00:00.000Z',
};

vi.mock('../../../src/services/pocketsApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/services/pocketsApi')>();
  return {
    ...actual,
    useListPocketsQuery: vi.fn(),
    useDeletePocketMutation: () => [vi.fn().mockResolvedValue({}), { isLoading: false }],
    useCreateMovementMutation: () => [vi.fn(), { isLoading: false }],
    useGetPocketQuery: () => ({ data: undefined, isLoading: true }),
    useDeleteMovementMutation: () => [vi.fn(), { isLoading: false }],
  };
});

vi.mock('../../../src/services/dashboardApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/services/dashboardApi')>();
  return {
    ...actual,
    useGetDashboardQuery: () => ({ data: { accounts: [] } }),
  };
});

const { useListPocketsQuery } = await import('../../../src/services/pocketsApi');
const mockUseListPockets = vi.mocked(useListPocketsQuery);

function renderPage() {
  return render(
    <Provider store={store}>
      <IntlProvider messages={enMessages} locale="en" defaultLocale="en">
        <MemoryRouter>
          <PocketsPage />
        </MemoryRouter>
      </IntlProvider>
    </Provider>,
  );
}

describe('PocketsPage', () => {
  it('shows loading skeleton while loading', () => {
    mockUseListPockets.mockReturnValue({
      isLoading: true,
      isError: false,
      data: undefined,
    } as ReturnType<typeof useListPocketsQuery>);
    renderPage();
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('shows empty state when no pockets', () => {
    mockUseListPockets.mockReturnValue({
      isLoading: false,
      isError: false,
      data: { pockets: [] },
    } as ReturnType<typeof useListPocketsQuery>);
    renderPage();
    expect(screen.getByText('No pockets yet. Create one to start saving.')).toBeDefined();
  });

  it('renders pocket list with one pocket', () => {
    mockUseListPockets.mockReturnValue({
      isLoading: false,
      isError: false,
      data: { pockets: [mockPocket] },
    } as ReturnType<typeof useListPocketsQuery>);
    renderPage();
    expect(screen.getByText('Vacances')).toBeDefined();
  });

  it('shows "New pocket" button', () => {
    mockUseListPockets.mockReturnValue({
      isLoading: false,
      isError: false,
      data: { pockets: [] },
    } as ReturnType<typeof useListPocketsQuery>);
    renderPage();
    expect(screen.getByText('New pocket')).toBeDefined();
  });

  it('opens create form modal when New pocket clicked', async () => {
    mockUseListPockets.mockReturnValue({
      isLoading: false,
      isError: false,
      data: { pockets: [] },
    } as ReturnType<typeof useListPocketsQuery>);
    renderPage();
    await userEvent.click(screen.getByText('New pocket'));
    expect(screen.getByText('Create')).toBeDefined();
  });

  it('shows error state on fetch error', () => {
    mockUseListPockets.mockReturnValue({
      isLoading: false,
      isError: true,
      data: undefined,
    } as ReturnType<typeof useListPocketsQuery>);
    renderPage();
    expect(screen.getByText('Could not load dashboard data.')).toBeDefined();
  });

  it('shows Add movement and Edit buttons for each pocket', () => {
    mockUseListPockets.mockReturnValue({
      isLoading: false,
      isError: false,
      data: { pockets: [mockPocket] },
    } as ReturnType<typeof useListPocketsQuery>);
    renderPage();
    expect(screen.getByText('Add movement')).toBeDefined();
    expect(screen.getByText('Edit')).toBeDefined();
  });
});
