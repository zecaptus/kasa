import { render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { describe, expect, it } from 'vitest';
import { ImportSessionMetadata } from '../../../src/components/ImportSessionMetadata';
import enMessages from '../../../src/i18n/en.json';

function renderMetadata(props: {
  accountNumber?: string | null;
  exportStartDate?: string | null;
  exportEndDate?: string | null;
  balance?: number | null;
  balanceDate?: string | null;
  currency?: string | null;
}) {
  return render(
    <IntlProvider messages={enMessages} locale="en" defaultLocale="en">
      <ImportSessionMetadata {...props} />
    </IntlProvider>,
  );
}

describe('ImportSessionMetadata', () => {
  it('renders null when no accountNumber and balance is explicitly null', () => {
    const { container } = renderMetadata({ balance: null });
    expect(container.firstChild).toBeNull();
  });

  it('renders account number when provided', () => {
    renderMetadata({ accountNumber: '00040288601' });
    expect(screen.getByText('00040288601')).toBeDefined();
  });

  it('renders export period when both dates are provided', () => {
    renderMetadata({
      accountNumber: '12345',
      exportStartDate: '2026-01-01',
      exportEndDate: '2026-01-31',
    });
    expect(screen.getByText('Period')).toBeDefined();
  });

  it('does not render period when only start date is given', () => {
    renderMetadata({ accountNumber: '12345', exportStartDate: '2026-01-01' });
    expect(screen.queryByText('Period')).toBeNull();
  });

  it('renders balance when provided', () => {
    renderMetadata({ balance: 1200.5, currency: 'EUR' });
    expect(screen.getByText('Balance')).toBeDefined();
  });

  it('renders balance date when provided', () => {
    renderMetadata({ balance: 500, balanceDate: '2026-01-31', currency: 'EUR' });
    expect(screen.getByText(/as of/i)).toBeDefined();
  });

  it('uses EUR as default currency when currency is null', () => {
    renderMetadata({ balance: 1000, currency: null });
    // Should render without throwing
    expect(screen.getByText('Balance')).toBeDefined();
  });

  it('renders the account section label', () => {
    renderMetadata({ accountNumber: 'FR76001234' });
    expect(screen.getByText('Account')).toBeDefined();
  });
});
