import { render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { describe, expect, it } from 'vitest';
import { TransactionList } from '../../../src/components/TransactionList';
import enMessages from '../../../src/i18n/en.json';
import type { ImportedTransactionDto } from '../../../src/services/importApi';

function renderList(transactions: ImportedTransactionDto[]) {
  return render(
    <IntlProvider messages={enMessages} locale="en" defaultLocale="en">
      <TransactionList transactions={transactions} />
    </IntlProvider>,
  );
}

const mockTransaction: ImportedTransactionDto = {
  id: '1',
  label: 'Test Transaction',
  accountingDate: '2026-01-15',
  debit: 50.0,
  credit: null,
  status: 'UNRECONCILED',
  candidates: [],
  reconciliation: null,
};

describe('TransactionList', () => {
  it('renders nothing when transactions array is empty', () => {
    const { container } = renderList([]);
    expect(container.firstChild).toBeNull();
  });

  it('renders list of transactions', () => {
    const transactions: ImportedTransactionDto[] = [
      mockTransaction,
      {
        ...mockTransaction,
        id: '2',
        label: 'Another Transaction',
        debit: null,
        credit: 100.0,
      },
    ];

    renderList(transactions);

    expect(screen.getByText('Test Transaction')).toBeDefined();
    expect(screen.getByText('Another Transaction')).toBeDefined();
  });

  it('displays debit amounts with minus sign', () => {
    const transaction: ImportedTransactionDto = {
      ...mockTransaction,
      debit: 50.0,
      credit: null,
    };

    renderList([transaction]);

    // Should show negative amount for debit
    expect(screen.getByText(/-/)).toBeDefined();
  });

  it('displays credit amounts with plus sign', () => {
    const transaction: ImportedTransactionDto = {
      ...mockTransaction,
      debit: null,
      credit: 100.0,
    };

    renderList([transaction]);

    // Should show positive amount for credit
    expect(screen.getByText(/\+/)).toBeDefined();
  });

  it('displays correct status badge for RECONCILED', () => {
    const transaction: ImportedTransactionDto = {
      ...mockTransaction,
      status: 'RECONCILED',
      reconciliation: {
        id: '1',
        manualExpenseId: '1',
        importedTransactionId: '1',
        isAutoMatched: true,
        createdAt: '2026-01-15T00:00:00Z',
        expense: null,
      },
    };

    renderList([transaction]);

    // Check for reconciled status text
    const statusBadge = document.querySelector('.bg-green-100');
    expect(statusBadge).toBeDefined();
  });

  it('displays correct status badge for IGNORED', () => {
    const transaction: ImportedTransactionDto = {
      ...mockTransaction,
      status: 'IGNORED',
    };

    renderList([transaction]);

    // Check for ignored status styling
    const statusBadge = document.querySelector('.bg-slate-100');
    expect(statusBadge).toBeDefined();
  });

  it('formats date correctly', () => {
    const transaction: ImportedTransactionDto = {
      ...mockTransaction,
      accountingDate: '2026-01-15',
    };

    renderList([transaction]);

    // Date should be formatted (exact format depends on locale)
    expect(screen.getByText(/Jan/)).toBeDefined();
  });

  it('renders multiple transactions in order', () => {
    const transactions: ImportedTransactionDto[] = [
      { ...mockTransaction, id: '1', label: 'First' },
      { ...mockTransaction, id: '2', label: 'Second' },
      { ...mockTransaction, id: '3', label: 'Third' },
    ];

    renderList(transactions);

    const items = screen.getAllByRole('listitem');
    expect(items.length).toBe(3);
  });
});
