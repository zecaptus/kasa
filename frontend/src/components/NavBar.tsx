import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router';
import { PlusIcon } from '../icons/Plus';
import { PocketIcon } from '../icons/Pocket';
import { QuitIcon } from '../icons/Quit';
import { SettingsIcon } from '../icons/Settings';
import { UploadIcon } from '../icons/Upload';
import { useLogoutMutation } from '../services/authApi';
import { loggedOut } from '../store/authSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { Dropdown } from './ui/Dropdown';
import { DropdownItem } from './ui/DropdownItem';

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
    <nav className="sticky top-0 z-50 bg-white/80 px-4 py-3 backdrop-blur-xl dark:bg-slate-950/80">
      <div className="flex items-center justify-end gap-2">
        {user && (
          <>
            <Dropdown
              trigger={
                <button
                  type="button"
                  aria-label={formatMessage({ id: 'nav.new' })}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                >
                  <PlusIcon className="h-5" />
                </button>
              }
            >
              <DropdownItem to="/import" icon={<UploadIcon className="h-4" />}>
                {formatMessage({ id: 'nav.import' })}
              </DropdownItem>
              <DropdownItem to="/cagnottes" icon={<PocketIcon className="h-4" />}>
                {formatMessage({ id: 'pockets.create' })}
              </DropdownItem>
            </Dropdown>

            <Dropdown
              trigger={
                <button
                  type="button"
                  aria-label={user.name}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-kasa-accent text-sm font-semibold text-white"
                >
                  {user.name.charAt(0).toUpperCase()}
                </button>
              }
            >
              <DropdownItem to="/profil" icon={<SettingsIcon className="h-4" />}>
                {formatMessage({ id: 'nav.settings' })}
              </DropdownItem>
              <DropdownItem
                onClick={() => void handleLogout()}
                disabled={isLoading}
                icon={<QuitIcon className="h-4" />}
              >
                {formatMessage({ id: 'auth.logout.button' })}
              </DropdownItem>
            </Dropdown>
          </>
        )}
      </div>
    </nav>
  );
}
