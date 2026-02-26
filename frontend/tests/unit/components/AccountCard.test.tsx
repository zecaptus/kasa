import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { Provider } from 'react-redux';
import { describe, expect, it, vi } from 'vitest';
import { AccountCard } from '../../../src/components/AccountCard';
import enMessages from '../../../src/i18n/en.json';
import type { AccountSummaryDto } from '../../../src/services/dashboardApi';
import type { PocketSummaryDto } from '../../../src/services/pocketsApi';
import { store } from '../../../src/store';

vi.mock('../../../src/services/bankAccountsApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/services/bankAccountsApi')>();
  return {
    ...actual,
    useRenameBankAccountMutation: () => [vi.fn().mockResolvedValue({}), { isLoading: false }],
    useSetAccountHiddenMutation: () => [vi.fn().mockResolvedValue({}), { isLoading: false }],
  };
});

function renderCard(account: AccountSummaryDto, pockets?: PocketSummaryDto[]) {
  return render(
    <Provider store={store}>
      <IntlProvider messages={enMessages} locale="en" defaultLocale="en">
        <AccountCard account={account} pockets={pockets} />
      </IntlProvider>
    </Provider>,
  );
}

const baseAccount: AccountSummaryDto = {
  accountId: 'acc-001',
  label: 'Compte courant',
  accountNumber: 'FR761234',
  isHidden: false,
  balance: 1250.5,
  rangeVariation: 200,
  currentBalance: null,
  balanceDate: null,
  endOfMonthPrediction: null,
  recentTransactions: [
    {
      id: 'tx1',
      date: '2026-02-20',
      label: 'CB MONOPRIX',
      amount: 45.3,
      direction: 'debit',
      transferPeerAccountLabel: null,
    },
    {
      id: 'tx2',
      date: '2026-02-18',
      label: 'VIREMENT SALAIRE',
      amount: 2800,
      direction: 'credit',
      transferPeerAccountLabel: null,
    },
  ],
};

describe('AccountCard', () => {
  it('renders the account label', () => {
    renderCard(baseAccount);
    expect(screen.getByText('Compte courant')).toBeDefined();
  });

  it('falls back to default label when label is empty string', () => {
    renderCard({ ...baseAccount, label: '' });
    expect(screen.getByText('Main account')).toBeDefined();
  });

  it('shows upward indicator for positive rangeVariation', () => {
    renderCard({ ...baseAccount, rangeVariation: 300 });
    expect(screen.getByText('↑')).toBeDefined();
  });

  it('shows downward indicator for negative rangeVariation', () => {
    renderCard({ ...baseAccount, rangeVariation: -150 });
    expect(screen.getByText('↓')).toBeDefined();
  });

  it('applies red class to negative balance', () => {
    renderCard({ ...baseAccount, balance: -50 });
    const redEl = document.querySelector('.text-red-500');
    expect(redEl).toBeTruthy();
  });

  it('renders recent transactions list', () => {
    renderCard(baseAccount);
    expect(screen.getByText('CB MONOPRIX')).toBeDefined();
    expect(screen.getByText('VIREMENT SALAIRE')).toBeDefined();
  });

  it('shows empty state when recentTransactions is empty', () => {
    renderCard({ ...baseAccount, recentTransactions: [] });
    expect(screen.getByText('No recent transactions')).toBeDefined();
  });

  it('clicking rename button shows rename input', () => {
    renderCard(baseAccount);
    const renameBtn = screen.getByTitle('Rename');
    fireEvent.click(renameBtn);
    expect(document.querySelector('input[maxlength="100"]')).toBeTruthy();
  });

  it('clicking Cancel in rename mode hides the input', () => {
    renderCard(baseAccount);
    fireEvent.click(screen.getByTitle('Rename'));
    fireEvent.click(screen.getByText('Cancel'));
    expect(document.querySelector('input[maxlength="100"]')).toBeNull();
  });

  it('pressing Escape in rename input cancels renaming', () => {
    renderCard(baseAccount);
    fireEvent.click(screen.getByTitle('Rename'));
    const input = document.querySelector('input[maxlength="100"]') as HTMLInputElement;
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(document.querySelector('input[maxlength="100"]')).toBeNull();
  });

  it('pressing Enter in rename input submits', async () => {
    renderCard(baseAccount);
    fireEvent.click(screen.getByTitle('Rename'));
    const input = document.querySelector('input[maxlength="100"]') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'New name' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => {
      expect(document.querySelector('input[maxlength="100"]')).toBeNull();
    });
  });

  it('renders balanceDate when currentBalance and balanceDate are set', () => {
    renderCard({ ...baseAccount, currentBalance: 1500, balanceDate: '2026-01-31' });
    expect(screen.getByText(/Balance as of/i)).toBeDefined();
  });

  it('renders end-of-month prediction when different from currentBalance', () => {
    renderCard({
      ...baseAccount,
      currentBalance: 1500,
      endOfMonthPrediction: 1200,
    });
    expect(screen.getByText('End-of-month forecast:')).toBeDefined();
  });

  it('renders hidden account with reduced opacity', () => {
    renderCard({ ...baseAccount, isHidden: true });
    const article = document.querySelector('article');
    expect(article?.className).toContain('opacity-40');
  });

  it('renders transferPeerAccountLabel on debit transactions', () => {
    renderCard({
      ...baseAccount,
      recentTransactions: [
        {
          id: 'tx3',
          date: '2026-02-10',
          label: 'VIREMENT',
          amount: 100,
          direction: 'debit',
          transferPeerAccountLabel: 'Livret A',
        },
      ],
    });
    expect(screen.getByText(/→ Livret A/)).toBeDefined();
  });

  it('renders transferPeerAccountLabel on credit transactions', () => {
    renderCard({
      ...baseAccount,
      recentTransactions: [
        {
          id: 'tx4',
          date: '2026-02-10',
          label: 'VIREMENT',
          amount: 100,
          direction: 'credit',
          transferPeerAccountLabel: 'Compte courant',
        },
      ],
    });
    expect(screen.getByText(/← Compte courant/)).toBeDefined();
  });

  it('renders pocket cards when pockets are provided', () => {
    const pockets: PocketSummaryDto[] = [
      {
        id: 'pocket-001',
        accountId: 'acc-001',
        name: 'Vacances',
        goalAmount: 1000,
        allocatedAmount: 300,
        progressPct: 30,
        color: '#ff5733',
        createdAt: '2025-01-01T00:00:00.000Z',
      },
    ];
    renderCard(baseAccount, pockets);
    expect(screen.getByText('Vacances')).toBeDefined();
  });
});
