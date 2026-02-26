import { fireEvent, render, screen } from '@testing-library/react';
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
    expect(screen.getAllByText('Supermarket')[0]).toBeDefined();
    expect(screen.getAllByText('Salary')[0]).toBeDefined();
  });

  it('displays minus sign for debit transactions', () => {
    renderList([mockDebit]);
    expect(screen.getAllByText(/-/)[0]).toBeDefined();
  });

  it('displays plus sign for credit transactions', () => {
    renderList([mockCredit]);
    expect(screen.getAllByText(/\+/)[0]).toBeDefined();
  });

  it('displays category name when category is set', () => {
    renderList([mockCredit]);
    expect(screen.getAllByText('Income')[0]).toBeDefined();
  });

  it('displays "Uncategorized" when category is null', () => {
    renderList([mockDebit]);
    expect(screen.getAllByText('Uncategorized')[0]).toBeDefined();
  });

  it('displays "Imported" source badge for IMPORTED_TRANSACTION type', () => {
    renderList([mockDebit]);
    expect(screen.getAllByText('Imported')[0]).toBeDefined();
  });

  it('displays "Manual" source badge for MANUAL_EXPENSE type', () => {
    renderList([mockCredit]);
    expect(screen.getAllByText('Manual')[0]).toBeDefined();
  });

  it('shows detail text when detail is present', () => {
    const txWithDetail: UnifiedTransactionDto = {
      ...mockDebit,
      detail: 'Reference 12345',
    };
    renderList([txWithDetail]);
    expect(screen.getAllByText('Reference 12345')[0]).toBeDefined();
  });

  it('calls onSelect when a list item is clicked', async () => {
    const onSelect = vi.fn();
    renderList([mockDebit], onSelect);

    const item = screen.getAllByRole('button')[0];
    await userEvent.click(item);

    expect(onSelect).toHaveBeenCalledOnce();
    expect(onSelect).toHaveBeenCalledWith(mockDebit);
  });

  it('triggers onSelect when Enter is pressed on a transaction item', () => {
    const onSelect = vi.fn();
    renderList([mockDebit], onSelect);
    const items = screen.getAllByRole('button');
    fireEvent.keyDown(items[0], { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledWith(mockDebit);
  });

  it('triggers onSelect when Space is pressed on a transaction item', () => {
    const onSelect = vi.fn();
    renderList([mockDebit], onSelect);
    const items = screen.getAllByRole('button');
    fireEvent.keyDown(items[0], { key: ' ' });
    expect(onSelect).toHaveBeenCalledWith(mockDebit);
  });

  it('renders transfer pair row (debit + credit side by side)', () => {
    const debitTx: UnifiedTransactionDto = {
      ...mockDebit,
      id: 'dt-1',
      transferPeerId: 'ct-1',
      transferPeerAccountLabel: null,
      transferLabel: null,
      accountId: null,
      accountLabel: null,
      recurringPatternId: null,
      label: 'Transfer Out',
    };
    const creditTx: UnifiedTransactionDto = {
      ...mockCredit,
      id: 'ct-1',
      transferPeerId: 'dt-1',
      transferPeerAccountLabel: null,
      transferLabel: null,
      accountId: null,
      accountLabel: null,
      recurringPatternId: null,
      label: 'Transfer In',
      direction: 'credit',
    };
    renderList([debitTx, creditTx]);
    expect(screen.getAllByText('Transfer Out')[0]).toBeDefined();
    expect(screen.getAllByText('Transfer In')[0]).toBeDefined();
  });
});
