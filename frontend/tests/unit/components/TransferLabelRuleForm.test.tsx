import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { describe, expect, it, vi } from 'vitest';
import { TransferLabelRuleForm } from '../../../src/components/TransferLabelRuleForm';
import enMessages from '../../../src/i18n/en.json';

vi.mock('../../../src/services/transactionsApi', () => ({
  useCreateTransferLabelRuleMutation: () => [
    vi.fn().mockResolvedValue({ data: { labeled: 0 } }),
    { isLoading: false },
  ],
  useUpdateTransferLabelRuleMutation: () => [
    vi.fn().mockResolvedValue({ data: { labeled: 0 } }),
    { isLoading: false },
  ],
}));

function renderForm(props: Parameters<typeof TransferLabelRuleForm>[0] = {}) {
  return render(
    <IntlProvider messages={enMessages} locale="en" defaultLocale="en">
      <TransferLabelRuleForm {...props} />
    </IntlProvider>,
  );
}

describe('TransferLabelRuleForm', () => {
  it('renders keyword input', () => {
    renderForm();
    expect(screen.getByLabelText(/keyword/i)).toBeDefined();
  });

  it('renders label input', () => {
    renderForm();
    expect(screen.getByLabelText(/^label$/i)).toBeDefined();
  });

  it('renders amount input', () => {
    renderForm();
    expect(screen.getByLabelText(/exact amount/i)).toBeDefined();
  });

  it('shows "Create" button in create mode', () => {
    renderForm();
    expect(screen.getByRole('button', { name: /create/i })).toBeDefined();
  });

  it('shows "Save" button in update mode', () => {
    renderForm({ ruleId: 'rule1', initialValues: { keyword: 'savings', label: 'My savings' } });
    expect(screen.getByRole('button', { name: /save/i })).toBeDefined();
  });

  it('shows validation error when submitting with empty keyword', async () => {
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: /create/i }));
    await waitFor(() => {
      const errors = document.querySelectorAll('.text-red-600');
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  it('shows validation error when submitting with empty label', async () => {
    renderForm();
    const keywordInput = screen.getByLabelText(/keyword/i);
    fireEvent.change(keywordInput, { target: { value: 'savings' } });
    fireEvent.click(screen.getByRole('button', { name: /create/i }));
    await waitFor(() => {
      const errors = document.querySelectorAll('.text-red-600');
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  it('accepts keyword input', () => {
    renderForm();
    const input = screen.getByLabelText(/keyword/i);
    fireEvent.change(input, { target: { value: 'VIR BANCAIRE' } });
    expect((input as HTMLInputElement).value).toBe('VIR BANCAIRE');
  });

  it('accepts label input', () => {
    renderForm();
    const input = screen.getByLabelText(/^label$/i);
    fireEvent.change(input, { target: { value: 'My transfer' } });
    expect((input as HTMLInputElement).value).toBe('My transfer');
  });

  it('accepts amount input', () => {
    renderForm();
    const input = screen.getByLabelText(/exact amount/i);
    fireEvent.change(input, { target: { value: '250.00' } });
    expect((input as HTMLInputElement).value).toBe('250.00');
  });

  it('prepopulates fields in update mode', () => {
    renderForm({
      ruleId: 'rule1',
      initialValues: { keyword: 'savings', label: 'My savings', amount: 600 },
    });
    const keywordInput = screen.getByLabelText(/keyword/i);
    expect((keywordInput as HTMLInputElement).value).toBe('savings');
    const labelInput = screen.getByLabelText(/^label$/i);
    expect((labelInput as HTMLInputElement).value).toBe('My savings');
    const amountInput = screen.getByLabelText(/exact amount/i);
    expect((amountInput as HTMLInputElement).value).toBe('600');
  });
});
