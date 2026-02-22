import { render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import frMessages from '../../src/i18n/fr.json';
import { LoginPage } from '../../src/pages/LoginPage';
import { store } from '../../src/store';

describe('App providers', () => {
  it('renders login page at /connexion', () => {
    render(
      <Provider store={store}>
        <IntlProvider messages={frMessages} locale="fr" defaultLocale="fr">
          <MemoryRouter initialEntries={['/connexion']}>
            <LoginPage />
          </MemoryRouter>
        </IntlProvider>
      </Provider>,
    );
    expect(screen.getByRole('heading', { name: 'Se connecter' })).toBeDefined();
  });
});
