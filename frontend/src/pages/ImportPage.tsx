import { useIntl } from 'react-intl';
import { CsvDropzone } from '../components/CsvDropzone';
import { ImportSummary } from '../components/ImportSummary';
import { TransactionList } from '../components/TransactionList';
import {
  useGetSessionQuery,
  useGetSessionsQuery,
  useUploadCsvMutation,
} from '../services/importApi';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setActiveSession } from '../store/importSlice';

export function ImportPage() {
  const intl = useIntl();
  const dispatch = useAppDispatch();
  const activeSessionId = useAppSelector((s) => s.import.activeSessionId);

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
    }
  }

  const errorMessage = getUploadErrorMessage(uploadError);

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">
        {intl.formatMessage({ id: 'import.page.title' })}
      </h1>

      <CsvDropzone onUpload={handleUpload} isUploading={isUploading} error={errorMessage} />

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

          <ImportSummary counts={activeSession.counts} />

          <div className="mt-4">
            <TransactionList transactions={activeSession.transactions} />
          </div>
        </section>
      )}

      {sessionsData && sessionsData.sessions.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-base font-medium text-slate-700">
            {intl.formatMessage({ id: 'import.sessions.title' })}
          </h2>
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            {sessionsData.sessions.map((session) => (
              <li key={session.id}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-50"
                  onClick={() => dispatch(setActiveSession(session.id))}
                >
                  <span className="text-sm font-medium text-slate-800">{session.filename}</span>
                  <span className="text-sm text-slate-500">
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
