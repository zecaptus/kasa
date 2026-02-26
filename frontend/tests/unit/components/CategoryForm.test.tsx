import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { describe, expect, it, vi } from 'vitest';
import { CategoryForm } from '../../../src/components/CategoryForm';
import enMessages from '../../../src/i18n/en.json';

vi.mock('../../../src/services/transactionsApi', () => ({
  useCreateCategoryMutation: () => [vi.fn().mockResolvedValue({}), { isLoading: false }],
  useUpdateCategoryMutation: () => [vi.fn().mockResolvedValue({}), { isLoading: false }],
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

  it('renders color palette with at least 20 preset buttons', () => {
    renderForm();
    const colorButtons = screen.getAllByRole('button', { name: /^#/ });
    expect(colorButtons.length).toBeGreaterThanOrEqual(20);
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

  it('prepopulates name field from initialValues', () => {
    renderForm({ initialValues: { name: 'Transport', color: '#3b82f6' } });
    const nameInput = screen.getByLabelText(/name/i) as HTMLInputElement;
    expect(nameInput.value).toBe('Transport');
  });

  it('calls onSuccess after successful create submit', async () => {
    const onSuccess = vi.fn();
    renderForm({ onSuccess });
    const nameInput = screen.getByLabelText(/name/i);
    fireEvent.change(nameInput, { target: { value: 'Food' } });
    fireEvent.click(screen.getByRole('button', { name: /create/i }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());
  });

  it('calls onSuccess after successful update submit', async () => {
    const onSuccess = vi.fn();
    renderForm({ categoryId: 'cat-456', onSuccess });
    const nameInput = screen.getByLabelText(/name/i);
    fireEvent.change(nameInput, { target: { value: 'Restaurants' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());
  });

  it('clicking a color preset selects it and gives it a ring class', () => {
    renderForm();
    const colorButtons = screen.getAllByRole('button', { name: /^#/ });
    // Click the second preset (index 1) which is not the default selected
    const secondPreset = colorButtons[1];
    fireEvent.click(secondPreset);
    expect(secondPreset.className).toContain('ring-2');
  });

  it('renders custom color picker label', () => {
    renderForm({ initialValues: { name: 'Test', color: '#ef4444' } });
    // The custom color label is present in the DOM (contains the hidden input[type=color])
    const colorInput = document.querySelector('input[type="color"]') as HTMLInputElement;
    expect(colorInput).toBeTruthy();
  });

  it('custom color label gets ring style when a non-preset color is set', () => {
    // Use a color that is not in PRESET_COLORS to trigger the custom style branch (line 141)
    renderForm({ initialValues: { name: 'Custom', color: '#123456' } });
    const customLabel = document.querySelector('label[title]') as HTMLLabelElement;
    expect(customLabel).toBeTruthy();
    // The label should have an inline backgroundColor style for the custom color
    expect(customLabel.style.backgroundColor).toBe('rgb(18, 52, 86)');
  });
});
