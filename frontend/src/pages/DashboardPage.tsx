import { lazy, Suspense } from 'react';
import { useIntl } from 'react-intl';
import { AccountCard } from '../components/AccountCard';
import { DashboardSkeleton } from '../components/DashboardSkeleton';
import { GlobalSummaryCard } from '../components/GlobalSummaryCard';
import { RecurringPatternRow } from '../components/RecurringPatternRow';
import { useGetDashboardQuery } from '../services/dashboardApi';
import { useListPocketsQuery } from '../services/pocketsApi';
import { useListRecurringPatternsQuery } from '../services/recurringPatternsApi';

const LazySpendingChart = lazy(() => import('../components/SpendingChart'));

function ChartFallback() {
  return (
    <div className="animate-pulse rounded-2xl border border-slate-200 bg-slate-200 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-700 h-[calc(theme(spacing.6)*2+theme(spacing.64))]" />
  );
}

export function DashboardPage() {
  const intl = useIntl();
  const { data, isLoading, isError, refetch } = useGetDashboardQuery();
  const { data: pocketsData } = useListPocketsQuery();
  const { data: recurringData } = useListRecurringPatternsQuery();

  const now = new Date();
  const in30Days = new Date(now);
  in30Days.setDate(in30Days.getDate() + 30);

  const upcomingPatterns = (recurringData?.patterns ?? [])
    .filter((p) => {
      if (!p.isActive || !p.nextOccurrenceDate) return false;
      const next = new Date(p.nextOccurrenceDate);
      return next >= now && next <= in30Days;
    })
    .sort((a, b) => {
      if (!a.nextOccurrenceDate) return 1;
      if (!b.nextOccurrenceDate) return -1;
      return a.nextOccurrenceDate.localeCompare(b.nextOccurrenceDate);
    });

  if (isLoading) {
    return (
      <main className="mx-auto max-w-7xl p-4 sm:p-6">
        <DashboardSkeleton />
      </main>
    );
  }

  if (isError || !data) {
    return (
      <main className="mx-auto max-w-7xl p-4 sm:p-6">
        <div
          role="alert"
          className="flex flex-col items-center gap-4 rounded-2xl border border-red-200 bg-red-50 p-10 text-center"
        >
          <p className="text-red-600">{intl.formatMessage({ id: 'dashboard.error.title' })}</p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            {intl.formatMessage({ id: 'dashboard.error.retry' })}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      {/* Global summary */}
      <GlobalSummaryCard summary={data.summary} />

      {/* Per-account cards */}
      {data.accounts.length === 0 ? (
        <p className="text-sm text-slate-400">
          {intl.formatMessage({ id: 'dashboard.noAccounts' })}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {data.accounts.map((account) => (
            <AccountCard
              key={account.accountId}
              account={account}
              pockets={pocketsData?.pockets.filter((p) => p.accountLabel === account.label)}
            />
          ))}
        </div>
      )}

      {/* Spending chart — lazy-loaded */}
      <Suspense fallback={<ChartFallback />}>
        <LazySpendingChart categoryComparison={data.categoryComparison} />
      </Suspense>

      {/* Upcoming recurring charges */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h2 className="mb-4 text-base font-semibold text-slate-800 dark:text-slate-100">
          {intl.formatMessage({ id: 'recurring.upcoming.title' })}
        </h2>
        {upcomingPatterns.length === 0 ? (
          <p className="text-sm text-slate-400">
            {intl.formatMessage({ id: 'recurring.upcoming.empty' })}
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {upcomingPatterns.map((pattern) => (
              <RecurringPatternRow key={pattern.id} pattern={pattern} />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
