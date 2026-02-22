import { type FormEvent, useState } from 'react';
import { useIntl } from 'react-intl';
import { Link, useNavigate } from 'react-router';
import { KasaLogo } from '../components/KasaLogo';
import { useLoginMutation } from '../services/authApi';
import { userLoaded } from '../store/authSlice';
import { useAppDispatch } from '../store/hooks';

export function LoginPage() {
  const { formatMessage } = useIntl();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [loginMutation, { isLoading }] = useLoginMutation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    try {
      const user = await loginMutation({ email, password }).unwrap();
      dispatch(
        userLoaded({
          id: user.id,
          email: user.email,
          name: user.name,
          locale: user.locale,
        }),
      );
      navigate('/', { replace: true });
    } catch (err) {
      const apiError = err as { status?: number; data?: { message?: string } };
      if (apiError.status === 429) {
        setError(formatMessage({ id: 'auth.login.errors.lockedRetry' }, { minutes: '15' }));
      } else {
        setError(formatMessage({ id: 'auth.login.errors.invalidCredentials' }));
      }
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 dark:bg-slate-900">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center gap-2">
          <KasaLogo loading={isLoading} className="h-16 w-auto" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <h1 className="text-center text-2xl font-bold text-slate-900 dark:text-white">
            {formatMessage({ id: 'auth.login.title' })}
          </h1>

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
              {formatMessage({ id: 'auth.login.email' })}
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-kasa-accent focus:ring-2 focus:ring-kasa-accent/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              {formatMessage({ id: 'auth.login.password' })}
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-kasa-accent focus:ring-2 focus:ring-kasa-accent/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-kasa-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-kasa-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {formatMessage({ id: 'auth.login.submit' })}
          </button>

          <p className="text-center text-sm text-slate-600 dark:text-slate-400">
            <Link to="/inscription" className="font-medium text-kasa-accent hover:underline">
              {formatMessage({ id: 'auth.login.registerLink' })}
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
