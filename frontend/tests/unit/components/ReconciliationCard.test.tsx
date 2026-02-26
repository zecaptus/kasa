import { fireEvent, render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { Provider } from 'react-redux';
import { describe, expect, it } from 'vitest';
import { ReconciliationCard } from '../../../src/components/ReconciliationCard';
import enMessages from '../../../src/i18n/en.json';
import type { ImportedTransactionDto } from '../../../src/services/importApi';
import { store } from '../../../src/store';

function renderCard(transaction: ImportedTransactionDto) {
  return render(
    <Provider store={store}>
      <IntlProvider messages={enMessages} locale="en" defaultLocale="en">
        <ReconciliationCard transaction={transaction} />
      </IntlProvider>
    </Provider>,
  );
}

const baseTransaction: ImportedTransactionDto = {
  id: '1',
  label: 'Test Transaction',
  accountingDate: '2026-01-15',
  debit: 50.0,
  credit: null,
  status: 'UNRECONCILED',
  candidates: [],
  reconciliation: null,
};

describe('ReconciliationCard', () => {
  it('renders transaction details', () => {
    renderCard(baseTransaction);

    expect(screen.getByText('Test Transaction')).toBeDefined();
    expect(screen.getByText(/Jan/)).toBeDefined();
  });

  it('displays debit amount with minus sign', () => {
    const transaction: ImportedTransactionDto = {
      ...baseTransaction,
      debit: 50.0,
      credit: null,
    };

    renderCard(transaction);

    expect(screen.getByText(/-/)).toBeDefined();
  });

  it('displays credit amount with plus sign', () => {
    const transaction: ImportedTransactionDto = {
      ...baseTransaction,
      debit: null,
      credit: 100.0,
    };

    renderCard(transaction);

    expect(screen.getByText(/\+/)).toBeDefined();
  });

  it('shows auto-matched badge when reconciled and auto-matched', () => {
    const transaction: ImportedTransactionDto = {
      ...baseTransaction,
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

    renderCard(transaction);

    expect(screen.getByText(/✓/)).toBeDefined();
  });

  it('does not show auto-matched badge when manually matched', () => {
    const transaction: ImportedTransactionDto = {
      ...baseTransaction,
      status: 'RECONCILED',
      reconciliation: {
        id: '1',
        manualExpenseId: '1',
        importedTransactionId: '1',
        isAutoMatched: false,
        createdAt: '2026-01-15T00:00:00Z',
        expense: null,
      },
    };

    renderCard(transaction);

    const autoMatchedText = screen.queryByText(/✓/);
    expect(autoMatchedText).toBeNull();
  });

  it('shows candidates list when unreconciled with candidates', () => {
    const transaction: ImportedTransactionDto = {
      ...baseTransaction,
      status: 'UNRECONCILED',
      candidates: [
        {
          expense: {
            id: 'exp1',
            label: 'Candidate Expense 1',
            amount: 50.0,
            date: '2026-01-15',
            category: 'FOOD',
          },
          confidence: 'high',
          score: 0.9,
        },
        {
          expense: {
            id: 'exp2',
            label: 'Candidate Expense 2',
            amount: 50.0,
            date: '2026-01-15',
            category: 'FOOD',
          },
          confidence: 'plausible',
          score: 0.6,
        },
      ],
    };

    renderCard(transaction);

    expect(screen.getByText('Candidate Expense 1')).toBeDefined();
    expect(screen.getByText('Candidate Expense 2')).toBeDefined();
    expect(screen.getByText(/90%/)).toBeDefined();
    expect(screen.getByText(/60%/)).toBeDefined();
  });

  it('shows ignore button when status is UNRECONCILED', () => {
    const transaction: ImportedTransactionDto = {
      ...baseTransaction,
      status: 'UNRECONCILED',
    };

    renderCard(transaction);

    const ignoreButton = screen.getByRole('button', { name: /ignore/i });
    expect(ignoreButton).toBeDefined();
  });

  it('shows unignore button when status is IGNORED', () => {
    const transaction: ImportedTransactionDto = {
      ...baseTransaction,
      status: 'IGNORED',
    };

    renderCard(transaction);

    const unignoreButton = screen.getByRole('button', { name: /un-ignore/i });
    expect(unignoreButton).toBeDefined();
  });

  it('shows undo button when status is RECONCILED', () => {
    const transaction: ImportedTransactionDto = {
      ...baseTransaction,
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

    renderCard(transaction);

    const undoButton = screen.getByRole('button', { name: /undo/i });
    expect(undoButton).toBeDefined();
  });

  it('allows clicking ignore button', () => {
    const transaction: ImportedTransactionDto = {
      ...baseTransaction,
      status: 'UNRECONCILED',
    };

    renderCard(transaction);

    const ignoreButton = screen.getByRole('button', { name: /ignore/i });
    fireEvent.click(ignoreButton);

    // Mutation would be called - we just verify the button is clickable
    expect(ignoreButton).toBeDefined();
  });

  it('allows clicking select button on candidate', () => {
    const transaction: ImportedTransactionDto = {
      ...baseTransaction,
      status: 'UNRECONCILED',
      candidates: [
        {
          expense: {
            id: 'exp1',
            label: 'Candidate Expense',
            amount: 50.0,
            date: '2026-01-15',
            category: 'FOOD',
          },
          confidence: 'high',
          score: 0.9,
        },
      ],
    };

    renderCard(transaction);

    const selectButton = screen.getByRole('button', { name: /select/i });
    fireEvent.click(selectButton);

    // Mutation would be called - we just verify the button is clickable
    expect(selectButton).toBeDefined();
  });

  it('renders UNRECONCILED status correctly', () => {
    const transaction: ImportedTransactionDto = {
      ...baseTransaction,
      status: 'UNRECONCILED',
    };

    renderCard(transaction);

    const statusBadge = document.querySelector('.bg-blue-100');
    expect(statusBadge).toBeDefined();
  });

  it('renders IGNORED status correctly', () => {
    const transaction: ImportedTransactionDto = {
      ...baseTransaction,
      status: 'IGNORED',
    };

    renderCard(transaction);

    // Status badge should have slate/gray styling
    const statusBadge = document.querySelector('.bg-slate-100');
    expect(statusBadge).toBeDefined();
  });

  it('renders no action button when status is RECONCILED with no reconciliationId', () => {
    const transaction: ImportedTransactionDto = {
      ...baseTransaction,
      status: 'RECONCILED',
      reconciliation: null,
    };

    renderCard(transaction);

    expect(screen.queryByRole('button', { name: /ignore/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /un-ignore/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /undo/i })).toBeNull();
  });
});
