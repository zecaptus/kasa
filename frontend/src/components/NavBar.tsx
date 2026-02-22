import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router';
import { useLogoutMutation } from '../services/authApi';
import { loggedOut } from '../store/authSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks';

export function NavBar() {
  const { formatMessage } = useIntl();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
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
    <nav className="border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
      <div className="mx-auto flex max-w-4xl items-center justify-between">
        <span className="text-lg font-bold text-slate-900 dark:text-white">
          kasa<span className="text-kasa-accent">.</span>
        </span>

        {user && (
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-600 dark:text-slate-400">{user.name}</span>
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoading}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white"
            >
              {formatMessage({ id: 'auth.logout.button' })}
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
