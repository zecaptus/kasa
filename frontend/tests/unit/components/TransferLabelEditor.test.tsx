import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { Provider } from 'react-redux';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TransferLabelEditor } from '../../../src/components/TransferLabelEditor';
import enMessages from '../../../src/i18n/en.json';
import type { UnifiedTransactionDto } from '../../../src/services/transactionsApi';
import { store } from '../../../src/store';

const mockUpdateTransferLabel = vi.fn();
const mockCreateTransferLabelRule = vi.fn();

vi.mock('../../../src/services/transactionsApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/services/transactionsApi')>();
  return {
    ...actual,
    useUpdateTransferLabelMutation: () => [mockUpdateTransferLabel, { isLoading: false }],
    useCreateTransferLabelRuleMutation: () => [mockCreateTransferLabelRule, { isLoading: false }],
  };
});

const mockTransaction: UnifiedTransactionDto = {
  id: 'tx-001',
  type: 'IMPORTED_TRANSACTION',
  date: '2026-01-15',
  label: 'VIR BANCAIRE LIVRET A',
  detail: null,
  amount: 500,
  direction: 'debit',
  status: 'UNRECONCILED',
  categoryId: null,
  categorySource: 'NONE',
  category: null,
  recurringRuleId: null,
  transferPeerId: null,
  transferPeerAccountLabel: null,
  transferLabel: null,
  accountId: null,
  accountLabel: null,
};

function renderEditor(transaction: UnifiedTransactionDto = mockTransaction) {
  return render(
    <Provider store={store}>
      <IntlProvider messages={enMessages} locale="en" defaultLocale="en">
        <TransferLabelEditor transaction={transaction} />
      </IntlProvider>
    </Provider>,
  );
}

describe('TransferLabelEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateTransferLabel.mockResolvedValue({});
    mockCreateTransferLabelRule.mockResolvedValue({});
  });

  it('renders the Transfer Labels title', () => {
    renderEditor();
    expect(screen.getByText('Transfer Labels')).toBeDefined();
  });

  it('shows "Set a label" button when no label exists', () => {
    renderEditor();
    expect(screen.getByText('Set a label')).toBeDefined();
  });

  it('shows "Edit" button when transferLabel is set', () => {
    renderEditor({ ...mockTransaction, transferLabel: 'Savings account' });
    expect(screen.getByText('Edit')).toBeDefined();
  });

  it('shows the existing label as a badge when set', () => {
    renderEditor({ ...mockTransaction, transferLabel: 'Savings account' });
    expect(screen.getByText('Savings account')).toBeDefined();
  });

  it('does not show badge when no transfer label', () => {
    renderEditor();
    expect(screen.queryByText('Savings account')).toBeNull();
  });

  it('switches to edit form when Set a label button is clicked', () => {
    renderEditor();
    fireEvent.click(screen.getByText('Set a label'));
    // EditForm renders label placeholder
    expect(screen.getByPlaceholderText('E.g. Savings account')).toBeDefined();
  });

  it('switches to edit form when Edit button is clicked', () => {
    renderEditor({ ...mockTransaction, transferLabel: 'My label' });
    fireEvent.click(screen.getByText('Edit'));
    expect(screen.getByPlaceholderText('E.g. Savings account')).toBeDefined();
  });

  it('renders the label input pre-filled with existing label in edit form', () => {
    renderEditor({ ...mockTransaction, transferLabel: 'Livret A' });
    fireEvent.click(screen.getByText('Edit'));
    const input = screen.getByPlaceholderText('E.g. Savings account') as HTMLInputElement;
    expect(input.value).toBe('Livret A');
  });

  it('renders the label input empty when no existing label', () => {
    renderEditor();
    fireEvent.click(screen.getByText('Set a label'));
    const input = screen.getByPlaceholderText('E.g. Savings account') as HTMLInputElement;
    expect(input.value).toBe('');
  });

  it('cancel button in edit form returns to static view', () => {
    renderEditor();
    fireEvent.click(screen.getByText('Set a label'));
    expect(screen.getByPlaceholderText('E.g. Savings account')).toBeDefined();
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByPlaceholderText('E.g. Savings account')).toBeNull();
    expect(screen.getByText('Set a label')).toBeDefined();
  });

  it('renders the "Create a rule for this keyword" checkbox', () => {
    renderEditor();
    fireEvent.click(screen.getByText('Set a label'));
    expect(screen.getByText('Create a rule for this keyword')).toBeDefined();
  });

  it('shows keyword input when create rule checkbox is checked', () => {
    renderEditor();
    fireEvent.click(screen.getByText('Set a label'));
    const checkbox = document.querySelector('input[type="checkbox"]') as HTMLInputElement;
    fireEvent.click(checkbox);
    expect(screen.getByPlaceholderText('E.g. savings')).toBeDefined();
  });

  it('hides keyword input when create rule checkbox is unchecked', () => {
    renderEditor();
    fireEvent.click(screen.getByText('Set a label'));
    const checkbox = document.querySelector('input[type="checkbox"]') as HTMLInputElement;
    fireEvent.click(checkbox);
    expect(screen.getByPlaceholderText('E.g. savings')).toBeDefined();
    fireEvent.click(checkbox);
    expect(screen.queryByPlaceholderText('E.g. savings')).toBeNull();
  });

  it('calls updateTransferLabel on form submit', async () => {
    renderEditor();
    fireEvent.click(screen.getByText('Set a label'));
    const input = screen.getByPlaceholderText('E.g. Savings account');
    fireEvent.change(input, { target: { value: 'My savings' } });
    const form = document.querySelector('form');
    if (form) fireEvent.submit(form);
    await waitFor(() => {
      expect(mockUpdateTransferLabel).toHaveBeenCalledWith({
        id: 'tx-001',
        label: 'My savings',
      });
    });
  });

  it('calls updateTransferLabel with null when label is cleared', async () => {
    renderEditor({ ...mockTransaction, transferLabel: 'Old label' });
    fireEvent.click(screen.getByText('Edit'));
    const input = screen.getByPlaceholderText('E.g. Savings account');
    fireEvent.change(input, { target: { value: '   ' } });
    const form = document.querySelector('form');
    if (form) fireEvent.submit(form);
    await waitFor(() => {
      expect(mockUpdateTransferLabel).toHaveBeenCalledWith({
        id: 'tx-001',
        label: null,
      });
    });
  });

  it('calls createTransferLabelRule when create rule is checked and label/keyword are filled', async () => {
    renderEditor();
    fireEvent.click(screen.getByText('Set a label'));

    const labelInput = screen.getByPlaceholderText('E.g. Savings account');
    fireEvent.change(labelInput, { target: { value: 'Savings' } });

    const checkbox = document.querySelector('input[type="checkbox"]') as HTMLInputElement;
    fireEvent.click(checkbox);

    const keywordInput = screen.getByPlaceholderText('E.g. savings');
    // keyword is pre-filled with transaction.label
    expect((keywordInput as HTMLInputElement).value).toBe('VIR BANCAIRE LIVRET A');

    const form = document.querySelector('form');
    if (form) fireEvent.submit(form);
    await waitFor(() => {
      expect(mockCreateTransferLabelRule).toHaveBeenCalledWith({
        keyword: 'VIR BANCAIRE LIVRET A',
        label: 'Savings',
      });
    });
  });

  it('does not call createTransferLabelRule when checkbox is not checked', async () => {
    renderEditor();
    fireEvent.click(screen.getByText('Set a label'));
    const labelInput = screen.getByPlaceholderText('E.g. Savings account');
    fireEvent.change(labelInput, { target: { value: 'Savings' } });
    const form = document.querySelector('form');
    if (form) fireEvent.submit(form);
    await waitFor(() => {
      expect(mockUpdateTransferLabel).toHaveBeenCalled();
    });
    expect(mockCreateTransferLabelRule).not.toHaveBeenCalled();
  });

  it('renders the save button in edit form', () => {
    renderEditor();
    fireEvent.click(screen.getByText('Set a label'));
    expect(screen.getByRole('button', { name: /save/i })).toBeDefined();
  });

  it('keyword input can be changed', () => {
    renderEditor();
    fireEvent.click(screen.getByText('Set a label'));
    const checkbox = document.querySelector('input[type="checkbox"]') as HTMLInputElement;
    fireEvent.click(checkbox);
    const keywordInput = screen.getByPlaceholderText('E.g. savings');
    fireEvent.change(keywordInput, { target: { value: 'livret' } });
    expect((keywordInput as HTMLInputElement).value).toBe('livret');
  });
});
