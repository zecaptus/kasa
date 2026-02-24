import { render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { Provider } from 'react-redux';
import { describe, expect, it } from 'vitest';
import { AccountCard } from '../../../src/components/AccountCard';
import enMessages from '../../../src/i18n/en.json';
import type { AccountSummaryDto } from '../../../src/services/dashboardApi';
import { store } from '../../../src/store';

function renderCard(account: AccountSummaryDto) {
  return render(
    <Provider store={store}>
      <IntlProvider messages={enMessages} locale="en" defaultLocale="en">
        <AccountCard account={account} />
      </IntlProvider>
    </Provider>,
  );
}

const baseAccount: AccountSummaryDto = {
  label: 'Compte courant',
  balance: 1250.5,
  monthlyVariation: 200,
  recentTransactions: [
    { id: 'tx1', date: '2026-02-20', label: 'CB MONOPRIX', amount: 45.3, direction: 'debit' },
    { id: 'tx2', date: '2026-02-18', label: 'VIREMENT SALAIRE', amount: 2800, direction: 'credit' },
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

  it('shows upward indicator for positive monthlyVariation', () => {
    renderCard({ ...baseAccount, monthlyVariation: 300 });
    expect(screen.getByText('↑')).toBeDefined();
  });

  it('shows downward indicator for negative monthlyVariation', () => {
    renderCard({ ...baseAccount, monthlyVariation: -150 });
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
});
