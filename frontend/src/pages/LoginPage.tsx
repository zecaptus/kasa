import { useState } from 'react';
import { useIntl } from 'react-intl';
import { Link, Navigate, useNavigate } from 'react-router';
import { KasaLogo } from '../components/KasaLogo';
import { useLoginMutation } from '../services/authApi';
import { userLoaded } from '../store/authSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks';

export function LoginPage() {
  const { formatMessage } = useIntl();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { isAuthenticated, isInitialized } = useAppSelector((state) => state.auth);
  const [loginMutation, { isLoading }] = useLoginMutation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (isAuthenticated && isInitialized) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
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
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-kasa-light px-4 dark:bg-slate-950">
      {/* Orbes ambiantes décoratives */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 top-1/4 h-80 w-80 rounded-full bg-kasa-primary/[0.04] blur-3xl" />
        <div className="absolute -right-32 bottom-1/3 h-96 w-96 rounded-full bg-kasa-accent/[0.06] blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm space-y-10">
        <div className="flex flex-col items-center">
          <KasaLogo loading={isLoading} className="h-16 w-auto" />
        </div>

        <form onSubmit={handleSubmit} className="animate-[kasa-fade-in_0.5s_ease-out] space-y-5">
          <h1 className="text-center font-display text-3xl font-semibold tracking-tight text-kasa-dark dark:text-slate-100">
            {formatMessage({ id: 'auth.login.title' })}
          </h1>

          {error && (
            <p className="rounded-xl bg-red-50 p-3 text-center text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </p>
          )}

          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-slate-600 dark:text-slate-400"
            >
              {formatMessage({ id: 'auth.login.email' })}
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-kasa-dark outline-none transition-all placeholder:text-slate-400 focus:border-kasa-accent focus:ring-2 focus:ring-kasa-accent/15 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-slate-600 dark:text-slate-400"
            >
              {formatMessage({ id: 'auth.login.password' })}
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-kasa-dark outline-none transition-all placeholder:text-slate-400 focus:border-kasa-accent focus:ring-2 focus:ring-kasa-accent/15 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-kasa-accent px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-kasa-accent-hover hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
          >
            {formatMessage({ id: 'auth.login.submit' })}
          </button>

          <p className="text-center text-sm text-slate-500 dark:text-slate-500">
            <Link
              to="/inscription"
              className="font-medium text-kasa-primary underline decoration-kasa-primary/30 underline-offset-2 transition-colors hover:decoration-kasa-primary dark:text-kasa-accent dark:decoration-kasa-accent/30 dark:hover:decoration-kasa-accent"
            >
              {formatMessage({ id: 'auth.login.registerLink' })}
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
