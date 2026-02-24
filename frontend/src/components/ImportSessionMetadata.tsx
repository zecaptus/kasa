import { useIntl } from 'react-intl';

interface ImportSessionMetadataProps {
  accountNumber?: string | null | undefined;
  exportStartDate?: string | null | undefined;
  exportEndDate?: string | null | undefined;
  balance?: number | null | undefined;
  balanceDate?: string | null | undefined;
  currency?: string | null | undefined;
}

export function ImportSessionMetadata({
  accountNumber,
  exportStartDate,
  exportEndDate,
  balance,
  balanceDate,
  currency,
}: ImportSessionMetadataProps) {
  const intl = useIntl();

  if (!accountNumber && balance === null) return null;

  return (
    <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
        {accountNumber && (
          <div>
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {intl.formatMessage({ id: 'import.session.accountNumber' })}
            </span>
            <p className="mt-0.5 font-mono text-sm text-slate-700 dark:text-slate-200">
              {accountNumber}
            </p>
          </div>
        )}
        {exportStartDate && exportEndDate && (
          <div>
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {intl.formatMessage({ id: 'import.session.exportPeriod' })}
            </span>
            <p className="mt-0.5 text-sm text-slate-700 dark:text-slate-200">
              {intl.formatDate(exportStartDate, {
                day: '2-digit',
                month: 'short',
              })}
              {' - '}
              {intl.formatDate(exportEndDate, {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </p>
          </div>
        )}
        {balance !== null && (
          <div>
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {intl.formatMessage({ id: 'import.session.balance' })}
            </span>
            <p className="mt-0.5 text-base font-semibold text-slate-900 dark:text-slate-50">
              {intl.formatNumber(Number(balance), {
                style: 'currency',
                currency: currency ?? 'EUR',
              })}
              {balanceDate && (
                <span className="ml-2 text-xs font-normal text-slate-500 dark:text-slate-400">
                  {intl.formatMessage(
                    { id: 'import.session.balanceDate' },
                    {
                      date: intl.formatDate(balanceDate, {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      }),
                    },
                  )}
                </span>
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
