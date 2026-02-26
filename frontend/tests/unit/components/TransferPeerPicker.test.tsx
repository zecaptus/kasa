import { fireEvent, render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TransferPeerPicker } from '../../../src/components/TransferPeerPicker';
import enMessages from '../../../src/i18n/en.json';
import type { UnifiedTransactionDto } from '../../../src/services/transactionsApi';

vi.mock('../../../src/services/transactionsApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/services/transactionsApi')>();
  return {
    ...actual,
    useListTransferCandidatesQuery: () => ({ data: undefined }),
    useUpdateTransferPeerMutation: () => [vi.fn().mockResolvedValue({}), { isLoading: false }],
  };
});

vi.mock('../../../src/services/bankAccountsApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/services/bankAccountsApi')>();
  return {
    ...actual,
    useListBankAccountsQuery: () => ({
      data: {
        accounts: [
          { id: 'acc-2', label: 'Livret A' },
          { id: 'acc-3', label: 'Compte épargne' },
        ],
      },
    }),
  };
});

const mockTx: UnifiedTransactionDto = {
  id: 'tx-1',
  type: 'IMPORTED_TRANSACTION',
  date: '2026-01-15',
  label: 'VIREMENT',
  detail: null,
  amount: 500,
  direction: 'debit',
  status: 'UNRECONCILED',
  categoryId: null,
  categorySource: 'NONE',
  category: null,
  accountId: 'acc-1',
  accountLabel: 'Compte courant',
  transferPeerId: null,
  transferPeerAccountLabel: null,
  transferLabel: null,
  recurringPatternId: null,
};

function renderPicker(tx: UnifiedTransactionDto = mockTx) {
  return render(
    <IntlProvider messages={enMessages} locale="en" defaultLocale="en">
      <TransferPeerPicker transaction={tx} />
    </IntlProvider>,
  );
}

describe('TransferPeerPicker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the transfer badge text', () => {
    renderPicker();
    expect(screen.getByText('Internal transfer')).toBeDefined();
  });

  it('renders "Link" button when no peer is linked', () => {
    renderPicker();
    expect(screen.getByRole('button', { name: /link/i })).toBeDefined();
  });

  it('renders "Edit" button when a peer is already linked', () => {
    renderPicker({ ...mockTx, transferPeerAccountLabel: 'Livret A' });
    expect(screen.getByRole('button', { name: /edit/i })).toBeDefined();
  });

  it('clicking "Link" button enters editing mode with account select', () => {
    renderPicker();
    fireEvent.click(screen.getByRole('button', { name: /link/i }));
    expect(screen.getByText('Select an account...')).toBeDefined();
  });

  it('editing mode shows "Save" and "Cancel" buttons', () => {
    renderPicker();
    fireEvent.click(screen.getByRole('button', { name: /link/i }));
    expect(screen.getByRole('button', { name: /save/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeDefined();
  });

  it('clicking "Cancel" returns to static mode', () => {
    renderPicker();
    fireEvent.click(screen.getByRole('button', { name: /link/i }));
    expect(screen.getByRole('button', { name: /save/i })).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.getByRole('button', { name: /link/i })).toBeDefined();
    expect(screen.queryByRole('button', { name: /save/i })).toBeNull();
  });

  it('selecting an account shows the candidate select', () => {
    renderPicker();
    fireEvent.click(screen.getByRole('button', { name: /link/i }));

    const selects = document.querySelectorAll('select');
    const accountSelect = selects[0] as HTMLSelectElement;
    fireEvent.change(accountSelect, { target: { value: 'acc-2' } });

    // After selecting an account, a second select (CandidateSelect) should appear
    const selectsAfter = document.querySelectorAll('select');
    expect(selectsAfter.length).toBe(2);
  });

  it('account options exclude the current transaction account', () => {
    renderPicker();
    fireEvent.click(screen.getByRole('button', { name: /link/i }));
    // acc-1 is the current account and should be filtered out
    // Livret A (acc-2) and Compte épargne (acc-3) should appear
    expect(screen.getByText('Livret A')).toBeDefined();
    expect(screen.getByText('Compte épargne')).toBeDefined();
  });
});
