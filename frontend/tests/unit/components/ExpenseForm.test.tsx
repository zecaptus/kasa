import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { Provider } from 'react-redux';
import { describe, expect, it } from 'vitest';
import { ExpenseForm } from '../../../src/components/ExpenseForm';
import enMessages from '../../../src/i18n/en.json';
import { store } from '../../../src/store';

function renderForm() {
  return render(
    <Provider store={store}>
      <IntlProvider messages={enMessages} locale="en" defaultLocale="en">
        <ExpenseForm />
      </IntlProvider>
    </Provider>,
  );
}

describe('ExpenseForm', () => {
  it('renders all form fields', () => {
    renderForm();
    expect(screen.getByLabelText(/amount/i)).toBeDefined();
    expect(screen.getByLabelText(/label/i)).toBeDefined();
    expect(screen.getByLabelText(/date/i)).toBeDefined();
    expect(screen.getByLabelText(/category/i)).toBeDefined();
  });

  it('shows validation errors when submitting empty form', async () => {
    renderForm();
    // Clear the amount field
    const amountInput = screen.getByLabelText(/amount/i);
    fireEvent.change(amountInput, { target: { value: '' } });

    const submitBtn = screen.getByRole('button', { name: /save/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/amount must be a positive number/i)).toBeDefined();
      expect(screen.getByText(/label is required/i)).toBeDefined();
      expect(screen.getByText(/category is required/i)).toBeDefined();
    });
  });

  it('shows validation error for negative amount', async () => {
    renderForm();
    const amountInput = screen.getByLabelText(/amount/i);
    fireEvent.change(amountInput, { target: { value: '-5' } });

    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByText(/amount must be a positive number/i)).toBeDefined();
    });
  });
});
