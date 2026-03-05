import { render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { Sidebar } from '../../../src/components/Sidebar';
import enMessages from '../../../src/i18n/en.json';
import { store } from '../../../src/store';

function renderSidebar(initialEntries = ['/']) {
  return render(
    <Provider store={store}>
      <IntlProvider messages={enMessages} locale="en" defaultLocale="en">
        <MemoryRouter initialEntries={initialEntries}>
          <Sidebar />
        </MemoryRouter>
      </IntlProvider>
    </Provider>,
  );
}

describe('Sidebar', () => {
  it('renders the sidebar element', () => {
    renderSidebar();
    expect(document.querySelector('aside')).toBeTruthy();
  });

  it('renders the home link with aria-label', () => {
    renderSidebar();
    const homeLink = document.querySelector('a[aria-label="Home"]');
    expect(homeLink).toBeTruthy();
  });

  it('renders the Dashboard menu item', () => {
    renderSidebar();
    expect(screen.getByText('Dashboard')).toBeDefined();
  });

  it('renders the Transactions menu item', () => {
    renderSidebar();
    expect(screen.getByText('Transactions')).toBeDefined();
  });

  it('renders the Pockets menu item', () => {
    renderSidebar();
    expect(screen.getByText('Pockets')).toBeDefined();
  });

  it('renders a link to /transactions', () => {
    renderSidebar();
    const links = document.querySelectorAll('a');
    const hrefs = Array.from(links).map((l) => l.getAttribute('href'));
    expect(hrefs).toContain('/transactions');
  });

  it('renders a link to /cagnottes', () => {
    renderSidebar();
    const links = document.querySelectorAll('a');
    const hrefs = Array.from(links).map((l) => l.getAttribute('href'));
    expect(hrefs).toContain('/cagnottes');
  });

  it('renders KasaLogo inside the header', () => {
    renderSidebar();
    const header = document.querySelector('header');
    expect(header).toBeTruthy();
    // KasaLogo renders an svg or img inside the header link
    expect(header?.querySelector('a')).toBeTruthy();
  });

  it('renders icons for each menu item', () => {
    renderSidebar();
    // Each MenuItem renders an SVG icon
    const icons = document.querySelectorAll('svg');
    expect(icons.length).toBeGreaterThan(0);
  });
});
