import { useIntl } from 'react-intl';
import { ExpenseForm } from '../components/ExpenseForm';
import { useGetExpensesQuery } from '../services/importApi';

export function ReconciliationPage() {
  const intl = useIntl();
  const { data: expensesData } = useGetExpensesQuery({});

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">
        {intl.formatMessage({ id: 'reconciliation.page.title' })}
      </h1>

      <section className="rounded-xl border border-slate-200 p-4">
        <ExpenseForm />
      </section>

      {expensesData && expensesData.expenses.length === 0 && (
        <p className="mt-8 text-center text-sm text-slate-400">
          {intl.formatMessage({ id: 'expense.list.empty' })}
        </p>
      )}

      {expensesData && expensesData.expenses.length > 0 && (
        <section className="mt-8">
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            {expensesData.expenses.map((expense) => (
              <li key={expense.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">{expense.label}</p>
                  <p className="text-xs text-slate-400">
                    {intl.formatDate(expense.date, {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                    {' · '}
                    {expense.categoryId ?? ''}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold tabular-nums text-slate-800">
                  -{intl.formatNumber(expense.amount, { style: 'currency', currency: 'EUR' })}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
