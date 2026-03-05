import { useIntl } from 'react-intl';
import { Link } from 'react-router';
import { DashboardIcon } from '../icons/Dashbord';
import { PocketIcon } from '../icons/Pocket';
import { TransactionsIcon } from '../icons/Transactions';
import { useIsApiLoading } from '../store/hooks';
import { KasaLogo } from './KasaLogo';
import { MenuItem } from './ui/MenuItem';

export const Sidebar = () => {
  const { formatMessage } = useIntl();
  const isApiLoading = useIsApiLoading();
  return (
    <aside className="sticky top-0 h-screen px-4 py-3 flex flex-col gap-2">
      <header className="mb-6">
        <Link to="/" aria-label={formatMessage({ id: 'nav.home' })}>
          <KasaLogo loading={isApiLoading} className="h-10 w-auto" />
        </Link>
      </header>

      <MenuItem to="/" end aria-label="Dashboard" icon={<DashboardIcon className="h-6" />}>
        Dashboard
      </MenuItem>
      <MenuItem
        to="/transactions"
        aria-label={formatMessage({ id: 'transactions.title' })}
        icon={<TransactionsIcon className="h-6" />}
      >
        {formatMessage({ id: 'transactions.title' })}
      </MenuItem>
      <MenuItem
        to="/cagnottes"
        aria-label={formatMessage({ id: 'nav.pockets' })}
        icon={<PocketIcon className="h-6" />}
      >
        {formatMessage({ id: 'nav.pockets' })}
      </MenuItem>
    </aside>
  );
};
