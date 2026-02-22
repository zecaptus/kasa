import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { IntlProvider } from 'react-intl';
import { Provider } from 'react-redux';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { App } from './app';
import { ProtectedRoute } from './components/ProtectedRoute';
import frMessages from './i18n/fr.json';
import { LoginPage } from './pages/LoginPage';
import { ProfilePage } from './pages/ProfilePage';
import { RegisterPage } from './pages/RegisterPage';
import { store } from './store';
import './styles/globals.css';

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
            element: (
              <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
              </div>
            ),
          },
          {
            path: '/profil',
            Component: ProfilePage,
          },
        ],
      },
    ],
  },
]);

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');

createRoot(rootElement).render(
  <StrictMode>
    <Provider store={store}>
      <IntlProvider messages={frMessages} locale="fr" defaultLocale="fr">
        <RouterProvider router={router} />
      </IntlProvider>
    </Provider>
  </StrictMode>,
);
