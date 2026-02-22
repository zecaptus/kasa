import { useIntl } from 'react-intl';
import { Link, useNavigate } from 'react-router';
import { useLogoutMutation } from '../services/authApi';
import { loggedOut } from '../store/authSlice';
import { useAppDispatch, useAppSelector, useIsApiLoading } from '../store/hooks';
import { KasaLogo } from './KasaLogo';

export function NavBar() {
  const { formatMessage } = useIntl();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const isApiLoading = useIsApiLoading();
  const [logoutMutation, { isLoading }] = useLogoutMutation();

  async function handleLogout() {
    try {
      await logoutMutation().unwrap();
    } catch {
      // Even if API fails, clear local state
    }
    dispatch(loggedOut());
    navigate('/connexion', { replace: true });
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200/60 bg-white/80 px-4 py-3 backdrop-blur-xl dark:border-slate-800/60 dark:bg-slate-950/80">
      <div className="mx-auto flex max-w-4xl items-center justify-between">
        <Link to="/" aria-label={formatMessage({ id: 'nav.home' })}>
          <KasaLogo loading={isApiLoading} className="h-8 w-auto" />
        </Link>

        {user && (
          <div className="flex items-center gap-3">
            <Link
              to="/profil"
              className="text-sm font-medium text-slate-600 transition-colors hover:text-kasa-accent dark:text-slate-400 dark:hover:text-kasa-accent"
            >
              {user.name}
            </Link>
            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoading}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-800 disabled:opacity-50 dark:text-slate-500 dark:hover:text-slate-200"
            >
              {formatMessage({ id: 'auth.logout.button' })}
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
