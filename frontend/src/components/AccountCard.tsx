import { useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { cn } from '../lib/cn';
import {
  useRenameBankAccountMutation,
  useSetAccountHiddenMutation,
} from '../services/bankAccountsApi';
import type { AccountSummaryDto } from '../services/dashboardApi';
import type { PocketSummaryDto } from '../services/pocketsApi';
import { PocketCard } from './PocketCard';

interface Props {
  account: AccountSummaryDto;
  pockets?: PocketSummaryDto[] | undefined;
}

function EyeIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className="size-4"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx={12} cy={12} r={3} />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className="size-4"
    >
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1={1} y1={1} x2={23} y2={23} />
    </svg>
  );
}

function BalanceDisplay({ account }: { account: AccountSummaryDto }) {
  const intl = useIntl();

  const showPrediction =
    account.endOfMonthPrediction !== null &&
    account.endOfMonthPrediction !== account.currentBalance;

  if (account.currentBalance !== null) {
    const formatted = intl.formatNumber(account.currentBalance, {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
    });
    return (
      <div className="mb-4">
        <p
          className={cn('text-2xl font-bold tabular-nums', {
            'text-red-500': account.currentBalance < 0,
            'text-slate-900 dark:text-slate-100': account.currentBalance >= 0,
          })}
        >
          {formatted}
        </p>
        {account.balanceDate && (
          <p className="mt-0.5 text-xs text-slate-400">
            {intl.formatMessage(
              { id: 'dashboard.account.balanceAsOf' },
              {
                date: intl.formatDate(account.balanceDate, {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                }),
              },
            )}
          </p>
        )}
        {showPrediction && (
          <p className="mt-1.5 text-xs text-slate-400">
            {intl.formatMessage({ id: 'dashboard.account.prediction.label' })}{' '}
            <span
              className={cn('font-semibold tabular-nums', {
                'text-red-500': (account.endOfMonthPrediction as number) < 0,
                'text-slate-600 dark:text-slate-300': (account.endOfMonthPrediction as number) >= 0,
              })}
            >
              {intl.formatNumber(account.endOfMonthPrediction as number, {
                style: 'currency',
                currency: 'EUR',
                minimumFractionDigits: 2,
              })}
            </span>
          </p>
        )}
      </div>
    );
  }
  const formatted = intl.formatNumber(account.balance, {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  });
  return (
    <p
      className={cn('mb-4 text-2xl font-bold tabular-nums', {
        'text-red-500': account.balance < 0,
        'text-slate-900 dark:text-slate-100': account.balance >= 0,
      })}
    >
      {formatted}
    </p>
  );
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

export function AccountCard({ account, pockets }: Props) {
  const intl = useIntl();
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [rename] = useRenameBankAccountMutation();
  const [setHidden] = useSetAccountHiddenMutation();
  const inputRef = useRef<HTMLInputElement>(null);

  const displayLabel =
    account.label.trim() !== ''
      ? account.label
      : intl.formatMessage({ id: 'dashboard.account.default' });

  function startRenaming() {
    setRenameValue(account.label);
    setIsRenaming(true);
    // Focus the input on the next render tick
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function cancelRenaming() {
    setIsRenaming(false);
  }

  async function saveRename() {
    const trimmed = renameValue.trim();
    if (!trimmed) return;
    await rename({ id: account.accountId, label: trimmed });
    setIsRenaming(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      void saveRename();
    } else if (e.key === 'Escape') {
      cancelRenaming();
    }
  }

  return (
    <article
      className={cn('card p-5 transition-opacity', { 'opacity-40': account.isHidden })}
      aria-label={displayLabel}
    >
      {/* Header */}
      <div className="mb-1 flex items-start justify-between gap-2">
        {isRenaming ? (
          <div className="flex flex-1 items-center gap-2">
            <input
              ref={inputRef}
              className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm outline-none focus:border-kasa-accent focus:ring-2 focus:ring-kasa-accent/15 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={100}
            />
            <button
              type="button"
              className="text-xs text-emerald-600 hover:underline"
              onClick={() => void saveRename()}
            >
              {intl.formatMessage({ id: 'dashboard.account.rename.save' })}
            </button>
            <button
              type="button"
              className="text-xs text-slate-400 hover:underline"
              onClick={cancelRenaming}
            >
              {intl.formatMessage({ id: 'dashboard.account.rename.cancel' })}
            </button>
          </div>
        ) : (
          <div className="flex flex-1 items-center gap-2">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">{displayLabel}</h3>
            <button
              type="button"
              className="text-xs text-slate-400 hover:text-slate-600"
              onClick={startRenaming}
              title={intl.formatMessage({ id: 'dashboard.account.rename.label' })}
            >
              ✎
            </button>
            <button
              type="button"
              className="text-slate-400 hover:text-slate-600"
              onClick={() => void setHidden({ id: account.accountId, isHidden: !account.isHidden })}
              title={intl.formatMessage({
                id: account.isHidden ? 'dashboard.account.show' : 'dashboard.account.hide',
              })}
            >
              {account.isHidden ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
        )}
        {!isRenaming && <VariationBadge value={account.monthlyVariation} />}
      </div>

      {/* Account number */}
      <p className="mb-3 text-xs text-slate-400">
        {intl.formatMessage(
          { id: 'dashboard.account.accountNumber' },
          { number: account.accountNumber },
        )}
      </p>

      {/* Balance */}
      <BalanceDisplay account={account} />

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
                  <div className="min-w-0">
                    <span className="block truncate text-slate-600 dark:text-slate-300">
                      {tx.label}
                    </span>
                    {tx.transferPeerAccountLabel !== null && (
                      <span className="text-xs text-violet-600 dark:text-violet-400">
                        {tx.direction === 'debit'
                          ? `→ ${tx.transferPeerAccountLabel}`
                          : `← ${tx.transferPeerAccountLabel}`}
                      </span>
                    )}
                  </div>
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

      {/* Nested pocket cards */}
      {pockets && pockets.length > 0 && (
        <div className="mt-4 space-y-2">
          {pockets.map((pocket) => (
            <PocketCard key={pocket.id} pocket={pocket} compact />
          ))}
        </div>
      )}
    </article>
  );
}
