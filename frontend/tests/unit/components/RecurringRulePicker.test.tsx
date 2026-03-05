import { fireEvent, render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { Provider } from 'react-redux';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RecurringRulePicker } from '../../../src/components/RecurringRulePicker';
import enMessages from '../../../src/i18n/en.json';
import type { RecurringRuleDto } from '../../../src/services/recurringRulesApi';
import { store } from '../../../src/store';

const mockLinkRecurring = vi.fn();
const mockCreateRuleFromTransaction = vi.fn();

vi.mock('../../../src/services/recurringRulesApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/services/recurringRulesApi')>();
  return {
    ...actual,
    useCreateRuleFromTransactionMutation: () => [
      mockCreateRuleFromTransaction,
      { isLoading: false },
    ],
  };
});

vi.mock('../../../src/services/transactionsApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/services/transactionsApi')>();
  return {
    ...actual,
    useUpdateTransactionRecurringMutation: () => [mockLinkRecurring, { isLoading: false }],
  };
});

const mockRules: RecurringRuleDto[] = [
  {
    id: 'rule-001',
    label: 'Netflix',
    keyword: 'netflix',
    periodMonths: 1,
    anchorDate: '2026-01-15',
    amount: 15.99,
    isActive: true,
    nextOccurrenceDate: '2026-03-15',
    transactionCount: 3,
    lastTransactionDate: '2026-02-15',
    accountLabel: null,
    createdAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'rule-002',
    label: 'Loyer',
    keyword: 'loyer',
    periodMonths: 1,
    anchorDate: '2026-01-01',
    amount: 800,
    isActive: true,
    nextOccurrenceDate: '2026-03-01',
    transactionCount: 5,
    lastTransactionDate: '2026-02-01',
    accountLabel: null,
    createdAt: '2025-01-01T00:00:00.000Z',
  },
];

function renderPicker(rules: RecurringRuleDto[] = [], currentRuleId: string | null = null) {
  return render(
    <Provider store={store}>
      <IntlProvider messages={enMessages} locale="en" defaultLocale="en">
        <RecurringRulePicker
          transactionId="tx-001"
          transactionLabel="VIR NETFLIX"
          currentRuleId={currentRuleId}
          rules={rules}
        />
      </IntlProvider>
    </Provider>,
  );
}

describe('RecurringRulePicker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLinkRecurring.mockReturnValue({ unwrap: vi.fn().mockResolvedValue({}) });
    mockCreateRuleFromTransaction.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({ id: 'new-rule' }),
    });
  });

  it('renders the select dropdown', () => {
    renderPicker();
    expect(document.querySelector('select')).toBeTruthy();
  });

  it('renders None option', () => {
    renderPicker();
    expect(screen.getByText('None')).toBeDefined();
  });

  it('renders create from transaction option', () => {
    renderPicker();
    expect(screen.getByText('+ Create rule from this transaction')).toBeDefined();
  });

  it('renders available rules in dropdown', () => {
    renderPicker(mockRules);
    expect(screen.getByText('Netflix')).toBeDefined();
    expect(screen.getByText('Loyer')).toBeDefined();
  });

  it('reflects currentRuleId as the selected value', () => {
    renderPicker(mockRules, 'rule-001');
    const select = document.querySelector('select') as HTMLSelectElement;
    expect(select.value).toBe('rule-001');
  });

  it('select value is empty string when currentRuleId is null', () => {
    renderPicker(mockRules, null);
    const select = document.querySelector('select') as HTMLSelectElement;
    expect(select.value).toBe('');
  });

  it('shows create form when sentinel option is selected', () => {
    renderPicker();
    const select = document.querySelector('select') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: '__create__' } });
    expect(screen.getByPlaceholderText('Label')).toBeDefined();
  });

  it('shows period select in create form', () => {
    renderPicker();
    const select = document.querySelector('select') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: '__create__' } });
    const periodSelect = document.querySelector('select[aria-label="Period"]') as HTMLSelectElement;
    expect(periodSelect).toBeTruthy();
  });

  it('hides create form when cancel is clicked', () => {
    renderPicker();
    const select = document.querySelector('select') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: '__create__' } });
    expect(screen.getByPlaceholderText('Label')).toBeDefined();
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByPlaceholderText('Label')).toBeNull();
  });

  it('calls linkRecurring when a rule is selected', () => {
    renderPicker(mockRules, null);
    const select = document.querySelector('select') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'rule-001' } });
    expect(mockLinkRecurring).toHaveBeenCalledWith({
      id: 'tx-001',
      recurringRuleId: 'rule-001',
    });
  });

  it('calls linkRecurring with null when None is selected', () => {
    renderPicker(mockRules, 'rule-001');
    const select = document.querySelector('select') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: '' } });
    expect(mockLinkRecurring).toHaveBeenCalledWith({
      id: 'tx-001',
      recurringRuleId: null,
    });
  });

  it('does not call linkRecurring when sentinel is selected', () => {
    renderPicker(mockRules);
    const select = document.querySelector('select') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: '__create__' } });
    expect(mockLinkRecurring).not.toHaveBeenCalled();
  });

  it('create form label input is pre-filled with transactionLabel', () => {
    renderPicker();
    const select = document.querySelector('select') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: '__create__' } });
    const labelInput = screen.getByPlaceholderText('Label') as HTMLInputElement;
    expect(labelInput.value).toBe('VIR NETFLIX');
  });

  it('create form label can be changed', () => {
    renderPicker();
    const select = document.querySelector('select') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: '__create__' } });
    const labelInput = screen.getByPlaceholderText('Label');
    fireEvent.change(labelInput, { target: { value: 'My Rule' } });
    expect((labelInput as HTMLInputElement).value).toBe('My Rule');
  });

  it('create form period select has correct options', () => {
    renderPicker();
    const select = document.querySelector('select') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: '__create__' } });
    const periodSelect = document.querySelector('select[aria-label="Period"]');
    const options = periodSelect?.querySelectorAll('option');
    expect(options?.length).toBe(5);
  });

  it('create form period select can be changed', () => {
    renderPicker();
    const mainSelect = document.querySelector('select') as HTMLSelectElement;
    fireEvent.change(mainSelect, { target: { value: '__create__' } });
    const periodSelect = document.querySelector('select[aria-label="Period"]') as HTMLSelectElement;
    fireEvent.change(periodSelect, { target: { value: '12' } });
    expect(periodSelect.value).toBe('12');
  });

  it('create form submit does not call createRule when label is empty', () => {
    renderPicker();
    const select = document.querySelector('select') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: '__create__' } });
    const labelInput = screen.getByPlaceholderText('Label');
    fireEvent.change(labelInput, { target: { value: '   ' } });
    const form = document.querySelector('form');
    if (form) fireEvent.submit(form);
    expect(mockCreateRuleFromTransaction).not.toHaveBeenCalled();
  });

  it('create form submit calls createRuleFromTransaction with correct args', async () => {
    renderPicker();
    const mainSelect = document.querySelector('select') as HTMLSelectElement;
    fireEvent.change(mainSelect, { target: { value: '__create__' } });
    const labelInput = screen.getByPlaceholderText('Label');
    fireEvent.change(labelInput, { target: { value: 'Netflix Sub' } });
    const form = document.querySelector('form');
    if (form) fireEvent.submit(form);
    expect(mockCreateRuleFromTransaction).toHaveBeenCalledWith({
      transactionId: 'tx-001',
      label: 'Netflix Sub',
      periodMonths: 1,
    });
  });

  it('select shows __create__ sentinel value when showCreate is true', () => {
    renderPicker();
    const select = document.querySelector('select') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: '__create__' } });
    expect(select.value).toBe('__create__');
  });
});
