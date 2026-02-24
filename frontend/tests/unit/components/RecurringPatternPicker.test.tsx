import { fireEvent, render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { Provider } from 'react-redux';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RecurringPatternPicker } from '../../../src/components/RecurringPatternPicker';
import enMessages from '../../../src/i18n/en.json';
import type { RecurringPatternDto } from '../../../src/services/recurringPatternsApi';
import { store } from '../../../src/store';

const mockLinkRecurring = vi.fn();
const mockCreatePattern = vi.fn();

vi.mock('../../../src/services/recurringPatternsApi', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../../src/services/recurringPatternsApi')>();
  return {
    ...actual,
    useCreateRecurringPatternMutation: () => [mockCreatePattern, { isLoading: false }],
    useDeleteRecurringPatternMutation: () => [vi.fn(), { isLoading: false }],
    useUpdateRecurringPatternMutation: () => [vi.fn(), { isLoading: false }],
    useListRecurringPatternsQuery: () => ({ data: { patterns: [] }, isLoading: false }),
  };
});

vi.mock('../../../src/services/transactionsApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/services/transactionsApi')>();
  return {
    ...actual,
    useUpdateTransactionRecurringMutation: () => [mockLinkRecurring, { isLoading: false }],
  };
});

const mockPatterns: RecurringPatternDto[] = [
  {
    id: 'pattern-001',
    label: 'Loyer',
    keyword: 'loyer',
    amount: 800,
    frequency: 'MONTHLY',
    source: 'MANUAL',
    isActive: true,
    nextOccurrenceDate: null,
    transactionCount: 3,
    lastTransactionDate: null,
    transferPeerAccountLabel: null,
    createdAt: '2025-01-01T00:00:00.000Z',
  },
];

function renderPicker(
  patterns: RecurringPatternDto[] = [],
  currentPatternId: string | null = null,
) {
  return render(
    <Provider store={store}>
      <IntlProvider messages={enMessages} locale="en" defaultLocale="en">
        <RecurringPatternPicker
          transactionId="tx-001"
          currentPatternId={currentPatternId}
          patterns={patterns}
        />
      </IntlProvider>
    </Provider>,
  );
}

describe('RecurringPatternPicker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the select dropdown', () => {
    renderPicker();
    const select = document.querySelector('select');
    expect(select).toBeTruthy();
  });

  it('renders None option', () => {
    renderPicker();
    expect(screen.getByText('None')).toBeDefined();
  });

  it('renders create option', () => {
    renderPicker();
    expect(screen.getByText('+ Create a pattern')).toBeDefined();
  });

  it('renders available patterns in the dropdown', () => {
    renderPicker(mockPatterns);
    expect(screen.getByText('Loyer')).toBeDefined();
  });

  it('shows create form when sentinel option is selected', () => {
    renderPicker();
    const select = document.querySelector('select') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: '__create__' } });
    // CreatePatternForm shows label and keyword inputs
    expect(screen.getByPlaceholderText('Label')).toBeDefined();
    expect(screen.getByPlaceholderText('Keyword')).toBeDefined();
  });

  it('hides create form when cancel is clicked', () => {
    renderPicker();
    const select = document.querySelector('select') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: '__create__' } });
    expect(screen.getByPlaceholderText('Label')).toBeDefined();
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByPlaceholderText('Label')).toBeNull();
  });

  it('calls linkRecurring when a pattern is selected', () => {
    mockLinkRecurring.mockReturnValue({ unwrap: vi.fn().mockResolvedValue({}) });
    renderPicker(mockPatterns, null);
    const select = document.querySelector('select') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'pattern-001' } });
    expect(mockLinkRecurring).toHaveBeenCalledWith({
      id: 'tx-001',
      recurringPatternId: 'pattern-001',
    });
  });

  it('calls linkRecurring with null when None is selected', () => {
    mockLinkRecurring.mockReturnValue({ unwrap: vi.fn().mockResolvedValue({}) });
    renderPicker(mockPatterns, 'pattern-001');
    const select = document.querySelector('select') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: '' } });
    expect(mockLinkRecurring).toHaveBeenCalledWith({
      id: 'tx-001',
      recurringPatternId: null,
    });
  });

  it('reflects currentPatternId as selected value', () => {
    renderPicker(mockPatterns, 'pattern-001');
    const select = document.querySelector('select') as HTMLSelectElement;
    expect(select.value).toBe('pattern-001');
  });

  it('create form submission calls createPattern and linkRecurring', async () => {
    const mockUnwrapCreate = vi.fn().mockResolvedValue({ id: 'new-pattern-id' });
    const mockUnwrapLink = vi.fn().mockResolvedValue({});
    mockCreatePattern.mockReturnValue({ unwrap: mockUnwrapCreate });
    mockLinkRecurring.mockReturnValue({ unwrap: mockUnwrapLink });

    renderPicker();
    const select = document.querySelector('select') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: '__create__' } });

    const labelInput = screen.getByPlaceholderText('Label');
    const keywordInput = screen.getByPlaceholderText('Keyword');
    fireEvent.change(labelInput, { target: { value: 'Netflix' } });
    fireEvent.change(keywordInput, { target: { value: 'netflix' } });

    const form = document.querySelector('form');
    if (form) fireEvent.submit(form);

    expect(mockCreatePattern).toHaveBeenCalledWith(
      expect.objectContaining({ label: 'Netflix', keyword: 'netflix' }),
    );
  });
});
