import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';
import { describe, expect, it, vi } from 'vitest';
import { UnifiedTransactionList } from '../../../src/components/UnifiedTransactionList';
import enMessages from '../../../src/i18n/en.json';
import type { UnifiedTransactionDto } from '../../../src/services/transactionsApi';

function renderList(
  transactions: UnifiedTransactionDto[],
  onSelect?: (tx: UnifiedTransactionDto) => void,
) {
  return render(
    <IntlProvider messages={enMessages} locale="en" defaultLocale="en">
      <UnifiedTransactionList transactions={transactions} onSelect={onSelect} />
    </IntlProvider>,
  );
}

const mockDebit: UnifiedTransactionDto = {
  id: '1',
  type: 'IMPORTED_TRANSACTION',
  date: '2026-01-15',
  label: 'Supermarket',
  detail: null,
  amount: 42.5,
  direction: 'debit',
  status: null,
  categoryId: null,
  categorySource: 'NONE',
  category: null,
};

const mockCredit: UnifiedTransactionDto = {
  id: '2',
  type: 'MANUAL_EXPENSE',
  date: '2026-01-20',
  label: 'Salary',
  detail: null,
  amount: 2000.0,
  direction: 'credit',
  status: null,
  categoryId: 'cat-1',
  categorySource: 'MANUAL',
  category: {
    id: 'cat-1',
    name: 'Income',
    slug: 'income',
    color: '#22c55e',
    isSystem: true,
    userId: null,
    createdAt: '2026-01-01T00:00:00Z',
  },
};

describe('UnifiedTransactionList', () => {
  it('renders nothing when transactions array is empty', () => {
    const { container } = renderList([]);
    expect(container.firstChild).toBeNull();
  });

  it('renders a list of transactions with both labels visible', () => {
    renderList([mockDebit, mockCredit]);
    expect(screen.getByText('Supermarket')).toBeDefined();
    expect(screen.getByText('Salary')).toBeDefined();
  });

  it('displays minus sign for debit transactions', () => {
    renderList([mockDebit]);
    expect(screen.getByText(/-/)).toBeDefined();
  });

  it('displays plus sign for credit transactions', () => {
    renderList([mockCredit]);
    expect(screen.getByText(/\+/)).toBeDefined();
  });

  it('displays category name when category is set', () => {
    renderList([mockCredit]);
    expect(screen.getByText('Income')).toBeDefined();
  });

  it('displays "Uncategorized" when category is null', () => {
    renderList([mockDebit]);
    expect(screen.getByText('Uncategorized')).toBeDefined();
  });

  it('displays "Imported" source badge for IMPORTED_TRANSACTION type', () => {
    renderList([mockDebit]);
    expect(screen.getByText('Imported')).toBeDefined();
  });

  it('displays "Manual" source badge for MANUAL_EXPENSE type', () => {
    renderList([mockCredit]);
    expect(screen.getByText('Manual')).toBeDefined();
  });

  it('shows detail text when detail is present', () => {
    const txWithDetail: UnifiedTransactionDto = {
      ...mockDebit,
      detail: 'Reference 12345',
    };
    renderList([txWithDetail]);
    expect(screen.getByText('Reference 12345')).toBeDefined();
  });

  it('calls onSelect when a list item is clicked', async () => {
    const onSelect = vi.fn();
    renderList([mockDebit], onSelect);

    const item = screen.getByRole('button');
    await userEvent.click(item);

    expect(onSelect).toHaveBeenCalledOnce();
    expect(onSelect).toHaveBeenCalledWith(mockDebit);
  });
});
