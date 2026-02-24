import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';
import { Provider } from 'react-redux';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TransactionFilters } from '../../../src/components/TransactionFilters';
import enMessages from '../../../src/i18n/en.json';
import { store } from '../../../src/store';
import { resetFilters } from '../../../src/store/transactionsSlice';

vi.mock('../../../src/services/transactionsApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/services/transactionsApi')>();
  return {
    ...actual,
    useListCategoriesQuery: () => ({ data: { categories: [] } }),
  };
});

vi.mock('../../../src/services/bankAccountsApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/services/bankAccountsApi')>();
  return {
    ...actual,
    useListBankAccountsQuery: () => ({ data: { accounts: [] } }),
  };
});

function renderFilters() {
  return render(
    <Provider store={store}>
      <IntlProvider messages={enMessages} locale="en" defaultLocale="en">
        <TransactionFilters />
      </IntlProvider>
    </Provider>,
  );
}

/** Render and open the collapsible advanced filters panel. */
function renderFiltersOpen() {
  const result = renderFilters();
  fireEvent.click(screen.getByText('Filters'));
  return result;
}

describe('TransactionFilters', () => {
  beforeEach(() => {
    store.dispatch(resetFilters());
  });

  it('renders search input', () => {
    renderFilters();
    const searchInput = screen.getByPlaceholderText('Search…');
    expect(searchInput).toBeDefined();
  });

  it('renders date range inputs', () => {
    renderFiltersOpen();
    const dateInputs = screen.getAllByLabelText('Period');
    expect(dateInputs.length).toBe(2);
  });

  it('renders direction select', () => {
    renderFiltersOpen();
    expect(screen.getByText('All')).toBeDefined();
    expect(screen.getByText('Expenses')).toBeDefined();
    expect(screen.getByText('Income')).toBeDefined();
  });

  it('renders category select', () => {
    renderFiltersOpen();
    expect(screen.getByText('Category')).toBeDefined();
  });

  it('reset button not shown initially', () => {
    renderFilters();
    const resetButton = screen.queryByText('Reset');
    expect(resetButton).toBeNull();
  });

  it('reset button shown when search has a value', async () => {
    renderFiltersOpen();
    const searchInput = screen.getByPlaceholderText('Search…');
    await userEvent.type(searchInput, 'coffee');
    expect(screen.getByText('Reset')).toBeDefined();
  });

  it('reset button clears filters when clicked', async () => {
    renderFiltersOpen();
    const searchInput = screen.getByPlaceholderText('Search…');
    await userEvent.type(searchInput, 'coffee');
    const resetBtn = screen.getByText('Reset');
    fireEvent.click(resetBtn);
    expect(screen.queryByText('Reset')).toBeNull();
  });

  it('direction select onChange is exercised', () => {
    renderFiltersOpen();
    const selects = document.querySelectorAll('select');
    // direction select is second select (after category)
    const directionSelect = selects[1] as HTMLSelectElement;
    fireEvent.change(directionSelect, { target: { value: 'debit' } });
    expect(directionSelect.value).toBe('debit');
  });

  it('from date input onChange is exercised', () => {
    renderFiltersOpen();
    const dateInputs = screen.getAllByLabelText('Period');
    fireEvent.change(dateInputs[0], { target: { value: '2026-01-01' } });
    expect((dateInputs[0] as HTMLInputElement).value).toBe('2026-01-01');
  });

  it('to date input onChange is exercised', () => {
    renderFiltersOpen();
    const dateInputs = screen.getAllByLabelText('Period');
    fireEvent.change(dateInputs[1], { target: { value: '2026-01-31' } });
    expect((dateInputs[1] as HTMLInputElement).value).toBe('2026-01-31');
  });
});
