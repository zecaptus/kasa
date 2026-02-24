import { fireEvent, render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { Provider } from 'react-redux';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RecurringPatternRow } from '../../../src/components/RecurringPatternRow';
import enMessages from '../../../src/i18n/en.json';
import type { RecurringPatternDto } from '../../../src/services/recurringPatternsApi';
import { store } from '../../../src/store';

const mockDeletePattern = vi.fn();
const mockUpdatePattern = vi.fn();

vi.mock('../../../src/services/recurringPatternsApi', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../../src/services/recurringPatternsApi')>();
  return {
    ...actual,
    useDeleteRecurringPatternMutation: () => [mockDeletePattern, { isLoading: false }],
    useUpdateRecurringPatternMutation: () => [mockUpdatePattern, { isLoading: false }],
  };
});

const mockPattern: RecurringPatternDto = {
  id: 'pattern-001',
  label: 'Loyer',
  keyword: 'loyer',
  amount: 800,
  frequency: 'MONTHLY',
  source: 'MANUAL',
  isActive: true,
  nextOccurrenceDate: '2026-03-01',
  transactionCount: 5,
  lastTransactionDate: '2026-02-01',
  transferPeerAccountLabel: null,
  createdAt: '2025-01-01T00:00:00.000Z',
};

function renderRow(pattern: RecurringPatternDto = mockPattern) {
  return render(
    <Provider store={store}>
      <IntlProvider messages={enMessages} locale="en" defaultLocale="en">
        <ul>
          <RecurringPatternRow pattern={pattern} />
        </ul>
      </IntlProvider>
    </Provider>,
  );
}

describe('RecurringPatternRow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the pattern label', () => {
    renderRow();
    expect(screen.getByText('Loyer')).toBeDefined();
  });

  it('renders the frequency', () => {
    renderRow();
    expect(screen.getByText('Monthly')).toBeDefined();
  });

  it('renders the amount', () => {
    renderRow();
    // Amount is displayed as -€800.00 or similar
    const el = document.querySelector('.text-red-600');
    expect(el).toBeTruthy();
  });

  it('renders next occurrence date', () => {
    renderRow();
    expect(screen.getByText(/Next:/i)).toBeDefined();
  });

  it('renders transferPeerAccountLabel when present', () => {
    renderRow({ ...mockPattern, transferPeerAccountLabel: 'Livret A' });
    expect(screen.getByText(/Livret A/)).toBeDefined();
  });

  it('does not render transferPeerAccountLabel when null', () => {
    renderRow();
    expect(screen.queryByText(/Livret A/)).toBeNull();
  });

  it('shows edit form when pencil button is clicked', () => {
    renderRow();
    const editBtn = screen.getByTitle('Edit');
    fireEvent.click(editBtn);
    // EditForm shows a label input
    expect(screen.getByDisplayValue('Loyer')).toBeDefined();
  });

  it('hides edit form when cancel is clicked', () => {
    renderRow();
    fireEvent.click(screen.getByTitle('Edit'));
    expect(screen.getByDisplayValue('Loyer')).toBeDefined();
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByDisplayValue('Loyer')).toBeNull();
  });

  it('shows delete confirmation when trash button is clicked', () => {
    renderRow();
    const deleteBtn = screen.getByTitle('Delete');
    fireEvent.click(deleteBtn);
    expect(screen.getByText('Delete this recurring charge?')).toBeDefined();
  });

  it('cancel delete confirmation returns to view', () => {
    renderRow();
    fireEvent.click(screen.getByTitle('Delete'));
    fireEvent.click(screen.getByText('Cancel'));
    // Back to view: delete confirmation gone
    expect(screen.queryByText('Delete this recurring charge?')).toBeNull();
    expect(screen.getByText('Loyer')).toBeDefined();
  });

  it('clicking delete in confirmation calls mutation', () => {
    renderRow();
    fireEvent.click(screen.getByTitle('Delete'));
    // Click the "Delete" button in the confirm view
    const buttons = screen.getAllByText('Delete');
    fireEvent.click(buttons[0]);
    expect(mockDeletePattern).toHaveBeenCalledWith('pattern-001');
  });

  it('renders without amount when amount is null', () => {
    renderRow({ ...mockPattern, amount: null });
    expect(document.querySelector('.text-red-600')).toBeNull();
  });

  it('renders without nextOccurrenceDate when null', () => {
    renderRow({ ...mockPattern, nextOccurrenceDate: null });
    expect(screen.queryByText(/Next:/i)).toBeNull();
  });

  it('edit form frequency select changes', () => {
    renderRow();
    fireEvent.click(screen.getByTitle('Edit'));
    const selects = document.querySelectorAll('select');
    fireEvent.change(selects[0], { target: { value: 'WEEKLY' } });
    expect((selects[0] as HTMLSelectElement).value).toBe('WEEKLY');
  });

  it('edit form submits and calls mutation', () => {
    mockUpdatePattern.mockResolvedValue({});
    renderRow();
    fireEvent.click(screen.getByTitle('Edit'));
    const form = document.querySelector('form');
    if (form) fireEvent.submit(form);
    expect(mockUpdatePattern).toHaveBeenCalled();
  });
});
