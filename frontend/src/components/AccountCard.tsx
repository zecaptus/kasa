import { useIntl } from 'react-intl';
import { cn } from '../lib/cn';
import type { AccountSummaryDto } from '../services/dashboardApi';

interface Props {
  account: AccountSummaryDto;
}

function VariationBadge({ value }: { value: number }) {
  const intl = useIntl();
  const isPositive = value > 0;
  const isNegative = value < 0;

  const formattedAbs = intl.formatNumber(Math.abs(value), {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  });

  const label = isPositive
    ? intl.formatMessage({ id: 'dashboard.account.variation.positive' }, { amount: formattedAbs })
    : intl.formatMessage({ id: 'dashboard.account.variation.negative' }, { amount: formattedAbs });

  const ariaLabel = isPositive
    ? 'variation positive'
    : isNegative
      ? 'variation négative'
      : 'variation nulle';

  return (
    <span
      title={ariaLabel}
      className={cn('inline-flex items-center gap-1 text-sm font-medium', {
        'text-emerald-600': isPositive,
        'text-red-500': isNegative,
        'text-slate-500': !isPositive && !isNegative,
      })}
    >
      {isPositive && <span aria-hidden>↑</span>}
      {isNegative && <span aria-hidden>↓</span>}
      {label}
    </span>
  );
}

export function AccountCard({ account }: Props) {
  const intl = useIntl();

  const displayLabel =
    account.label.trim() !== ''
      ? account.label
      : intl.formatMessage({ id: 'dashboard.account.default' });

  const formattedBalance = intl.formatNumber(account.balance, {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  });

  return (
    <article
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      aria-label={displayLabel}
    >
      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <h3 className="font-semibold text-slate-800">{displayLabel}</h3>
        <VariationBadge value={account.monthlyVariation} />
      </div>

      {/* Balance */}
      <p
        className={cn('mb-4 text-2xl font-bold tabular-nums', {
          'text-red-500': account.balance < 0,
          'text-slate-900': account.balance >= 0,
        })}
      >
        {formattedBalance}
      </p>

      {/* Recent transactions */}
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
          {intl.formatMessage({ id: 'dashboard.account.recentTitle' })}
        </p>
        {account.recentTransactions.length === 0 ? (
          <p className="text-sm text-slate-400">
            {intl.formatMessage({ id: 'dashboard.account.noTransactions' })}
          </p>
        ) : (
          <ul className="space-y-1">
            {account.recentTransactions.map((tx) => {
              const txAmount = intl.formatNumber(tx.amount, {
                style: 'currency',
                currency: 'EUR',
                minimumFractionDigits: 2,
              });
              return (
                <li key={tx.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate text-slate-600">{tx.label}</span>
                  <span
                    className={cn('shrink-0 tabular-nums', {
                      'text-red-500': tx.direction === 'debit',
                      'text-emerald-600': tx.direction === 'credit',
                    })}
                  >
                    {tx.direction === 'debit' ? '-' : '+'}
                    {txAmount}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </article>
  );
}
