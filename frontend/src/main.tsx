import { StrictMode, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { IntlProvider } from 'react-intl';
import { Provider } from 'react-redux';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { App } from './app';
import { ProtectedRoute } from './components/ProtectedRoute';
import enMessages from './i18n/en.json';
import frMessages from './i18n/fr.json';
import { CategoriesPage } from './pages/CategoriesPage';
import { DashboardPage } from './pages/DashboardPage';
import { ImportPage } from './pages/ImportPage';
import { LoginPage } from './pages/LoginPage';
import { PocketsPage } from './pages/PocketsPage';
import { ProfilePage } from './pages/ProfilePage';
import { ReconciliationPage } from './pages/ReconciliationPage';
import { RegisterPage } from './pages/RegisterPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { store } from './store';
import { useAppSelector } from './store/hooks';
import './styles/globals.css';

const messages: Record<string, Record<string, string>> = {
  fr: frMessages,
  en: enMessages,
};

const router = createBrowserRouter([
  {
    Component: App,
    children: [
      {
        path: '/connexion',
        Component: LoginPage,
      },
      {
        path: '/inscription',
        Component: RegisterPage,
      },
      {
        Component: ProtectedRoute,
        children: [
          {
            path: '/',
            Component: DashboardPage,
          },
          {
            path: '/profil',
            Component: ProfilePage,
          },
          {
            path: '/import',
            Component: ImportPage,
          },
          {
            path: '/transactions',
            Component: TransactionsPage,
          },
          {
            path: '/rapprochement',
            Component: ReconciliationPage,
          },
          {
            path: '/categories',
            Component: CategoriesPage,
          },
          {
            path: '/cagnottes',
            Component: PocketsPage,
          },
        ],
      },
    ],
  },
]);

function LocalizedApp() {
  const userLocale = useAppSelector((state) => state.auth.user?.locale);
  const locale = useMemo(() => (userLocale === 'EN' ? 'en' : 'fr'), [userLocale]);

  return (
    <IntlProvider messages={messages[locale]} locale={locale} defaultLocale="fr">
      <RouterProvider router={router} />
    </IntlProvider>
  );
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');

createRoot(rootElement).render(
  <StrictMode>
    <Provider store={store}>
      <LocalizedApp />
    </Provider>
  </StrictMode>,
);
