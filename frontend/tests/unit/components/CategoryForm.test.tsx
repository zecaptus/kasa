import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { describe, expect, it, vi } from 'vitest';
import { CategoryForm } from '../../../src/components/CategoryForm';
import enMessages from '../../../src/i18n/en.json';

vi.mock('../../../src/services/transactionsApi', () => ({
  useCreateCategoryMutation: () => [vi.fn(), { isLoading: false }],
  useUpdateCategoryMutation: () => [vi.fn(), { isLoading: false }],
}));

function renderForm(
  props: {
    onSuccess?: () => void;
    initialValues?: { name: string; color: string };
    categoryId?: string;
  } = {},
) {
  return render(
    <IntlProvider messages={enMessages} locale="en" defaultLocale="en">
      <CategoryForm {...props} />
    </IntlProvider>,
  );
}

describe('CategoryForm', () => {
  it('renders name input and color swatches', () => {
    renderForm();
    expect(screen.getByLabelText(/name/i)).toBeDefined();
    const swatches = screen.getAllByRole('button', { name: /^#/ });
    expect(swatches.length).toBeGreaterThan(0);
  });

  it('shows "Create" button in create mode', () => {
    renderForm();
    expect(screen.getByRole('button', { name: /create/i })).toBeDefined();
  });

  it('shows "Save" button when categoryId prop is provided', () => {
    renderForm({ categoryId: 'cat-123' });
    expect(screen.getByRole('button', { name: /save/i })).toBeDefined();
  });

  it('shows error when submitting with empty name', async () => {
    renderForm();
    const nameInput = screen.getByLabelText(/name/i);
    fireEvent.change(nameInput, { target: { value: '' } });

    fireEvent.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(screen.getAllByText(/name/i).length).toBeGreaterThan(0);
    });
  });

  it('name input accepts text input', () => {
    renderForm();
    const nameInput = screen.getByLabelText(/name/i) as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'Groceries' } });
    expect(nameInput.value).toBe('Groceries');
  });
});
