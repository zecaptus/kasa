import { type FormEvent, useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import { useUpdateProfileMutation } from '../services/authApi';
import { userLoaded } from '../store/authSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks';

export function ProfilePage() {
  const { formatMessage } = useIntl();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const [updateProfile, { isLoading }] = useUpdateProfileMutation();

  const [name, setName] = useState(user?.name ?? '');
  const [locale, setLocale] = useState<'FR' | 'EN'>(user?.locale ?? 'FR');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setLocale(user.locale);
    }
  }, [user]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!name.trim()) {
      setError(formatMessage({ id: 'account.profile.errors.nameRequired' }));
      return;
    }

    try {
      const updated = await updateProfile({ name, locale }).unwrap();
      dispatch(
        userLoaded({
          id: updated.id,
          email: updated.email,
          name: updated.name,
          locale: updated.locale,
        }),
      );
      setSuccess(true);
    } catch {
      setError(formatMessage({ id: 'account.profile.errors.nameRequired' }));
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-slate-900 dark:text-white">
        {formatMessage({ id: 'account.profile.title' })}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {success && (
          <p className="rounded-lg bg-green-50 p-3 text-center text-sm text-green-600 dark:bg-green-900/20 dark:text-green-400">
            {formatMessage({ id: 'account.profile.success' })}
          </p>
        )}

        {error && (
          <p className="rounded-lg bg-red-50 p-3 text-center text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </p>
        )}

        <div className="space-y-1">
          <label
            htmlFor="email"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            {formatMessage({ id: 'account.profile.email' })}
          </label>
          <input
            id="email"
            type="email"
            value={user?.email ?? ''}
            disabled
            className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-400"
          />
        </div>

        <div className="space-y-1">
          <label
            htmlFor="name"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            {formatMessage({ id: 'account.profile.name' })}
          </label>
          <input
            id="name"
            type="text"
            required
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-kasa-accent focus:ring-2 focus:ring-kasa-accent/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          />
        </div>

        <div className="space-y-1">
          <label
            htmlFor="locale"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            {formatMessage({ id: 'account.profile.locale' })}
          </label>
          <select
            id="locale"
            value={locale}
            onChange={(e) => setLocale(e.target.value as 'FR' | 'EN')}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-kasa-accent focus:ring-2 focus:ring-kasa-accent/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          >
            <option value="FR">{formatMessage({ id: 'account.profile.localeOptions.fr' })}</option>
            <option value="EN">{formatMessage({ id: 'account.profile.localeOptions.en' })}</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-lg bg-kasa-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-kasa-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {formatMessage({ id: 'account.profile.submit' })}
        </button>
      </form>
    </div>
  );
}
