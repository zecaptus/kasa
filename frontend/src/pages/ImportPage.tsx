import { useState } from 'react';
import { useIntl } from 'react-intl';
import { CsvDropzone } from '../components/CsvDropzone';
import { ImportSessionMetadata } from '../components/ImportSessionMetadata';
import { ImportSummary } from '../components/ImportSummary';
import { TransactionList } from '../components/TransactionList';
import { inputCls } from '../lib/inputCls';
import { useSetAccountBalanceMutation } from '../services/bankAccountsApi';
import {
  useGetSessionQuery,
  useGetSessionsQuery,
  useUploadCsvMutation,
} from '../services/importApi';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setActiveSession } from '../store/importSlice';

interface BalancePromptProps {
  accountId: string;
  onDone: () => void;
}

function BalancePrompt({ accountId, onDone }: BalancePromptProps) {
  const intl = useIntl();
  const today = new Date().toISOString().split('T')[0] as string;
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today);
  const [setBalance, { isLoading }] = useSetAccountBalanceMutation();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = Number.parseFloat(amount.replace(',', '.'));
    if (!Number.isNaN(value) && date) {
      await setBalance({ id: accountId, balance: value, date });
    }
    onDone();
  }

  return (
    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
      <p className="mb-1 text-sm font-medium text-amber-800 dark:text-amber-300">
        {intl.formatMessage({ id: 'import.balance.prompt.title' })}
      </p>
      <p className="mb-3 text-xs text-amber-700 dark:text-amber-400">
        {intl.formatMessage({ id: 'import.balance.prompt.description' })}
      </p>
      <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-32">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-amber-700 dark:text-amber-400">
              {intl.formatMessage({ id: 'import.balance.prompt.amount' })}
            </span>
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0,00"
              className={inputCls()}
              required
            />
          </label>
        </div>
        <div className="flex-1 min-w-32">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-amber-700 dark:text-amber-400">
              {intl.formatMessage({ id: 'import.balance.prompt.date' })}
            </span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputCls()}
              required
            />
          </label>
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isLoading}
            className="rounded-lg bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
          >
            {intl.formatMessage({ id: 'import.balance.prompt.submit' })}
          </button>
          <button
            type="button"
            onClick={onDone}
            className="rounded-lg px-3 py-2 text-sm text-amber-700 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-900/30"
          >
            {intl.formatMessage({ id: 'import.balance.prompt.skip' })}
          </button>
        </div>
      </form>
    </div>
  );
}

export function ImportPage() {
  const intl = useIntl();
  const dispatch = useAppDispatch();
  const activeSessionId = useAppSelector((s) => s.import.activeSessionId);
  const [pendingBalanceAccountId, setPendingBalanceAccountId] = useState<string | null>(null);

  const [uploadCsv, { isLoading: isUploading, error: uploadError }] = useUploadCsvMutation();
  const { data: sessionsData } = useGetSessionsQuery({});
  const { data: activeSession } = useGetSessionQuery(activeSessionId ?? '', {
    skip: !activeSessionId,
  });

  function getErrorCode(error: unknown): string | null {
    if (!error || typeof error !== 'object') return null;
    const data = (error as { data?: { error?: string } }).data;
    return typeof data?.error === 'string' ? data.error : null;
  }

  function getUploadErrorMessage(error: unknown): string | null {
    if (!error) return null;
    const code = getErrorCode(error);
    if (code === 'FILE_TOO_LARGE')
      return intl.formatMessage({ id: 'import.dropzone.error.tooLarge' });
    if (code === 'INVALID_CSV_FORMAT')
      return intl.formatMessage({ id: 'import.dropzone.error.invalidFormat' });
    return intl.formatMessage({ id: 'import.dropzone.error.generic' });
  }

  async function handleUpload(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const result = await uploadCsv(formData);
    if ('data' in result && result.data) {
      dispatch(setActiveSession(result.data.id));
      if (result.data.balanceMissing && result.data.accountId) {
        setPendingBalanceAccountId(result.data.accountId);
      }
    }
  }

  const errorMessage = getUploadErrorMessage(uploadError);

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 page-title">{intl.formatMessage({ id: 'import.page.title' })}</h1>

      <CsvDropzone onUpload={handleUpload} isUploading={isUploading} error={errorMessage} />

      {pendingBalanceAccountId && (
        <BalancePrompt
          accountId={pendingBalanceAccountId}
          onDone={() => setPendingBalanceAccountId(null)}
        />
      )}

      {activeSession && (
        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              {intl.formatMessage(
                { id: 'import.sessions.importedAt' },
                {
                  date: intl.formatDate(activeSession.importedAt, {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  }),
                },
              )}
            </p>
            {activeSession.newCount !== undefined && (
              <div className="flex gap-2 text-sm">
                <span className="rounded-full bg-green-100 px-2.5 py-0.5 font-medium text-green-700">
                  {intl.formatMessage(
                    { id: 'import.session.new' },
                    { count: activeSession.newCount },
                  )}
                </span>
                {(activeSession.skippedCount ?? 0) > 0 && (
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-medium text-slate-600">
                    {intl.formatMessage(
                      { id: 'import.session.skipped' },
                      { count: activeSession.skippedCount },
                    )}
                  </span>
                )}
              </div>
            )}
          </div>

          <ImportSessionMetadata
            accountNumber={activeSession.accountNumber}
            exportStartDate={activeSession.exportStartDate}
            exportEndDate={activeSession.exportEndDate}
            balance={activeSession.balance}
            balanceDate={activeSession.balanceDate}
            currency={activeSession.currency}
          />

          <ImportSummary counts={activeSession.counts} />

          <div className="mt-4">
            <TransactionList transactions={activeSession.transactions} />
          </div>
        </section>
      )}

      {sessionsData && sessionsData.sessions.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-base font-medium text-slate-700 dark:text-slate-300">
            {intl.formatMessage({ id: 'import.sessions.title' })}
          </h2>
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-700 dark:bg-slate-900">
            {sessionsData.sessions.map((session) => (
              <li key={session.id}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  onClick={() => dispatch(setActiveSession(session.id))}
                >
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
                    {session.filename}
                  </span>
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    {intl.formatDate(session.importedAt, {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {sessionsData?.sessions.length === 0 && !isUploading && (
        <p className="mt-8 text-center text-sm text-slate-400">
          {intl.formatMessage({ id: 'import.sessions.empty' })}
        </p>
      )}
    </main>
  );
}
