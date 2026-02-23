import { lazy, Suspense } from 'react';
import { useIntl } from 'react-intl';
import { AccountCard } from '../components/AccountCard';
import { DashboardSkeleton } from '../components/DashboardSkeleton';
import { GlobalSummaryCard } from '../components/GlobalSummaryCard';
import { useGetDashboardQuery } from '../services/dashboardApi';

const LazySpendingChart = lazy(() => import('../components/SpendingChart'));

function ChartFallback() {
  return (
    <div className="animate-pulse rounded-2xl border border-slate-200 bg-slate-200 p-6 shadow-sm h-[calc(theme(spacing.6)*2+theme(spacing.64))]" />
  );
}

export function DashboardPage() {
  const intl = useIntl();
  const { data, isLoading, isError, refetch } = useGetDashboardQuery();

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
            <AccountCard key={account.label || 'default'} account={account} />
          ))}
        </div>
      )}

      {/* Spending chart — lazy-loaded */}
      <Suspense fallback={<ChartFallback />}>
        <LazySpendingChart categoryComparison={data.categoryComparison} />
      </Suspense>
    </main>
  );
}
