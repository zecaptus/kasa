import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { Provider } from 'react-redux';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TransactionDetail } from '../../../src/components/TransactionDetail';
import enMessages from '../../../src/i18n/en.json';
import type { UnifiedTransactionDto } from '../../../src/services/transactionsApi';
import { store } from '../../../src/store';

const mockUpdateCategory = vi.fn();

vi.mock('../../../src/services/recurringPatternsApi', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../../src/services/recurringPatternsApi')>();
  return {
    ...actual,
    useListRecurringPatternsQuery: () => ({ data: { patterns: [] }, isLoading: false }),
  };
});

vi.mock('../../../src/services/transactionsApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/services/transactionsApi')>();
  return {
    ...actual,
    useUpdateTransactionCategoryMutation: () => [mockUpdateCategory, { isLoading: false }],
    useListCategoriesQuery: () => ({
      data: {
        categories: [
          {
            id: 'cat1',
            name: 'Alimentation',
            slug: 'food',
            color: '#22c55e',
            isSystem: true,
            userId: null,
            createdAt: '',
          },
        ],
      },
      isLoading: false,
    }),
  };
});

const mockTransaction: UnifiedTransactionDto = {
  id: 'tx1',
  type: 'IMPORTED_TRANSACTION',
  date: '2026-01-15',
  label: 'CARTE CARREFOUR',
  detail: 'CARTE CARREFOUR MARKET',
  amount: 42.5,
  direction: 'debit',
  status: 'UNRECONCILED',
  categoryId: 'cat1',
  categorySource: 'AUTO',
  category: {
    id: 'cat1',
    name: 'Alimentation',
    slug: 'food',
    color: '#22c55e',
    isSystem: true,
    userId: null,
    createdAt: '',
  },
};

function renderDetail(transaction: UnifiedTransactionDto | null, onClose = vi.fn()) {
  return render(
    <Provider store={store}>
      <IntlProvider messages={enMessages} locale="en" defaultLocale="en">
        <TransactionDetail transaction={transaction} onClose={onClose} />
      </IntlProvider>
    </Provider>,
  );
}

describe('TransactionDetail', () => {
  beforeEach(() => {
    mockUpdateCategory.mockReset();
  });

  it('renders nothing when transaction is null', () => {
    const { container } = renderDetail(null);
    expect(container.firstChild).toBeNull();
  });

  it('renders transaction label', () => {
    renderDetail(mockTransaction);
    expect(screen.getByText('CARTE CARREFOUR')).toBeDefined();
  });

  it('renders detail text when present', () => {
    renderDetail(mockTransaction);
    expect(screen.getByText('CARTE CARREFOUR MARKET')).toBeDefined();
  });

  it('renders category name', () => {
    renderDetail(mockTransaction);
    expect(screen.getAllByText('Alimentation').length).toBeGreaterThan(0);
  });

  it('renders source badge for imported transaction', () => {
    renderDetail(mockTransaction);
    expect(screen.getByText('Imported')).toBeDefined();
  });

  it('renders source badge for manual expense', () => {
    const manualTx: UnifiedTransactionDto = {
      ...mockTransaction,
      type: 'MANUAL_EXPENSE',
      direction: null,
      status: null,
      detail: null,
    };
    renderDetail(manualTx);
    expect(screen.getByText('Manual')).toBeDefined();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    renderDetail(mockTransaction, onClose);
    const closeBtn = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn();
    renderDetail(mockTransaction, onClose);
    const backdrop = document.querySelector('[aria-hidden="true"]');
    if (backdrop) fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalled();
  });

  it('renders auto-categorized hint when categorySource is AUTO', () => {
    renderDetail(mockTransaction);
    expect(screen.getByText(/auto-categorized/i)).toBeDefined();
  });

  it('does not render hint when categorySource is NONE', () => {
    const tx = { ...mockTransaction, categorySource: 'NONE' as const };
    renderDetail(tx);
    expect(screen.queryByText(/auto-categorized/i)).toBeNull();
  });

  it('renders manually-categorized hint when categorySource is MANUAL', () => {
    const tx = { ...mockTransaction, categorySource: 'MANUAL' as const };
    renderDetail(tx);
    expect(screen.getByText(/manually categorized/i)).toBeDefined();
  });

  it('renders uncategorized when category is null', () => {
    const tx = { ...mockTransaction, category: null, categoryId: null };
    renderDetail(tx);
    expect(screen.getByText('Uncategorized')).toBeDefined();
  });

  it('renders CategoryPicker for category editing', () => {
    renderDetail(mockTransaction);
    // CategoryPicker renders the category name as a button
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('renders status badge for imported transaction', () => {
    renderDetail(mockTransaction);
    expect(screen.getByText('Unreconciled')).toBeDefined();
  });

  it('calls updateCategory when a category button is clicked', async () => {
    renderDetail(mockTransaction);
    const categoryButton = screen.getByRole('button', { name: /alimentation/i });
    fireEvent.click(categoryButton);
    await waitFor(() => {
      expect(mockUpdateCategory).toHaveBeenCalledWith({ id: 'tx1', categoryId: 'cat1' });
    });
  });
});
