import { fireEvent, render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { Provider } from 'react-redux';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RecurringRuleRow } from '../../../src/components/RecurringRuleRow';
import enMessages from '../../../src/i18n/en.json';
import type { RecurringRuleDto } from '../../../src/services/recurringRulesApi';
import { store } from '../../../src/store';

const mockDeleteRule = vi.fn();
const mockUpdateRule = vi.fn();

vi.mock('../../../src/services/recurringRulesApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/services/recurringRulesApi')>();
  return {
    ...actual,
    useDeleteRecurringRuleMutation: () => [mockDeleteRule, { isLoading: false }],
    useUpdateRecurringRuleMutation: () => [mockUpdateRule, { isLoading: false }],
  };
});

const mockRule: RecurringRuleDto = {
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
};

function renderRow(rule: RecurringRuleDto = mockRule) {
  return render(
    <Provider store={store}>
      <IntlProvider messages={enMessages} locale="en" defaultLocale="en">
        <ul>
          <RecurringRuleRow rule={rule} />
        </ul>
      </IntlProvider>
    </Provider>,
  );
}

describe('RecurringRuleRow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the rule label', () => {
    renderRow();
    expect(screen.getByText('Netflix')).toBeDefined();
  });

  it('renders the period', () => {
    renderRow();
    expect(screen.getByText('Monthly')).toBeDefined();
  });

  it('renders the amount', () => {
    renderRow();
    const amountEl = document.querySelector('.text-red-600');
    expect(amountEl).toBeTruthy();
  });

  it('renders next occurrence date', () => {
    renderRow();
    expect(screen.getByText(/Next:/i)).toBeDefined();
  });

  it('renders accountLabel when present', () => {
    renderRow({ ...mockRule, accountLabel: 'Livret A' });
    expect(screen.getByText('Livret A')).toBeDefined();
  });

  it('does not render accountLabel separator when accountLabel is null', () => {
    renderRow();
    expect(screen.queryByText('·')).toBeNull();
  });

  it('does not render amount when amount is null', () => {
    renderRow({ ...mockRule, amount: null });
    expect(document.querySelector('.text-red-600')).toBeNull();
  });

  it('shows edit form when pencil button is clicked', () => {
    renderRow();
    const editBtn = screen.getByTitle('Edit');
    fireEvent.click(editBtn);
    expect(screen.getByDisplayValue('Netflix')).toBeDefined();
  });

  it('toggles edit form off when pencil is clicked again', () => {
    renderRow();
    fireEvent.click(screen.getByTitle('Edit'));
    expect(screen.getByDisplayValue('Netflix')).toBeDefined();
    fireEvent.click(screen.getByTitle('Edit'));
    expect(screen.queryByDisplayValue('Netflix')).toBeNull();
  });

  it('hides edit form when cancel is clicked', () => {
    renderRow();
    fireEvent.click(screen.getByTitle('Edit'));
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByDisplayValue('Netflix')).toBeNull();
  });

  it('shows delete confirmation when trash button is clicked', () => {
    renderRow();
    const deleteBtn = screen.getByTitle('Delete');
    fireEvent.click(deleteBtn);
    expect(screen.getByText('Delete this recurring charge?')).toBeDefined();
  });

  it('cancel in delete confirmation returns to view', () => {
    renderRow();
    fireEvent.click(screen.getByTitle('Delete'));
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByText('Delete this recurring charge?')).toBeNull();
    expect(screen.getByText('Netflix')).toBeDefined();
  });

  it('clicking Delete in confirmation calls deleteRule mutation', () => {
    mockDeleteRule.mockResolvedValue({});
    renderRow();
    fireEvent.click(screen.getByTitle('Delete'));
    const deleteButtons = screen.getAllByText('Delete');
    fireEvent.click(deleteButtons[0]);
    expect(mockDeleteRule).toHaveBeenCalledWith('rule-001');
  });

  it('edit form has period select with current period', () => {
    renderRow();
    fireEvent.click(screen.getByTitle('Edit'));
    const select = document.querySelector('select') as HTMLSelectElement;
    expect(select.value).toBe('1');
  });

  it('edit form period select can be changed', () => {
    renderRow();
    fireEvent.click(screen.getByTitle('Edit'));
    const select = document.querySelector('select') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: '6' } });
    expect(select.value).toBe('6');
  });

  it('edit form active checkbox is checked when rule is active', () => {
    renderRow();
    fireEvent.click(screen.getByTitle('Edit'));
    const checkbox = document.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
  });

  it('edit form active checkbox can be toggled', () => {
    renderRow();
    fireEvent.click(screen.getByTitle('Edit'));
    const checkbox = document.querySelector('input[type="checkbox"]') as HTMLInputElement;
    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(false);
  });

  it('edit form label input can be changed', () => {
    renderRow();
    fireEvent.click(screen.getByTitle('Edit'));
    const input = screen.getByDisplayValue('Netflix');
    fireEvent.change(input, { target: { value: 'Netflix Premium' } });
    expect((input as HTMLInputElement).value).toBe('Netflix Premium');
  });

  it('edit form submission calls updateRule mutation', () => {
    mockUpdateRule.mockResolvedValue({});
    renderRow();
    fireEvent.click(screen.getByTitle('Edit'));
    const form = document.querySelector('form');
    if (form) fireEvent.submit(form);
    expect(mockUpdateRule).toHaveBeenCalledWith({
      id: 'rule-001',
      label: 'Netflix',
      periodMonths: 1,
      isActive: true,
    });
  });

  it('edit form has all period options', () => {
    renderRow();
    fireEvent.click(screen.getByTitle('Edit'));
    const options = document.querySelectorAll('select option');
    expect(options.length).toBe(5);
  });

  it('renders every 2 months period label', () => {
    renderRow({ ...mockRule, periodMonths: 2 });
    expect(screen.getByText('Every 2 months')).toBeDefined();
  });

  it('renders annually period label for 12 months', () => {
    renderRow({ ...mockRule, periodMonths: 12 });
    expect(screen.getByText('Annually')).toBeDefined();
  });
});
