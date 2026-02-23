import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';
import { Provider } from 'react-redux';
import { describe, expect, it, vi } from 'vitest';
import { PocketForm } from '../../../src/components/PocketForm';
import enMessages from '../../../src/i18n/en.json';
import { store } from '../../../src/store';

const mockUnwrap = vi.fn().mockResolvedValue({});
const mockMutate = vi.fn().mockReturnValue({ unwrap: mockUnwrap });

vi.mock('../../../src/services/pocketsApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/services/pocketsApi')>();
  return {
    ...actual,
    useCreatePocketMutation: () => [mockMutate, { isLoading: false }],
    useUpdatePocketMutation: () => [mockMutate, { isLoading: false }],
  };
});

vi.mock('../../../src/services/dashboardApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/services/dashboardApi')>();
  return {
    ...actual,
    useGetDashboardQuery: () => ({
      data: {
        accounts: [
          { label: 'Livret A', balance: 3000, monthlyVariation: 0, recentTransactions: [] },
        ],
      },
    }),
  };
});

function renderForm(initialValues?: Parameters<typeof PocketForm>[0]['initialValues']) {
  return render(
    <Provider store={store}>
      <IntlProvider messages={enMessages} locale="en" defaultLocale="en">
        <PocketForm initialValues={initialValues} onSuccess={vi.fn()} onCancel={vi.fn()} />
      </IntlProvider>
    </Provider>,
  );
}

describe('PocketForm', () => {
  it('renders name, goal and colour fields', () => {
    renderForm();
    expect(screen.getByLabelText(/Name/i)).toBeDefined();
    expect(screen.getByLabelText(/Goal/i)).toBeDefined();
    expect(screen.getByText('Colour')).toBeDefined();
  });

  it('renders account selector for new pocket', () => {
    renderForm();
    expect(screen.getByText(/Account/i)).toBeDefined();
  });

  it('does not render account selector in edit mode', () => {
    renderForm({
      id: 'p1',
      accountLabel: 'Livret A',
      name: 'Test',
      goalAmount: 500,
      allocatedAmount: 0,
      progressPct: 0,
      color: '#22c55e',
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    // No account label field in edit mode
    const selects = document.querySelectorAll('select');
    expect(selects.length).toBe(0);
  });

  it('shows Create button for new pocket', () => {
    renderForm();
    expect(screen.getByText('Create')).toBeDefined();
  });

  it('shows Save button for edit mode', () => {
    renderForm({
      id: 'p1',
      accountLabel: 'Livret A',
      name: 'Test',
      goalAmount: 500,
      allocatedAmount: 0,
      progressPct: 0,
      color: '#22c55e',
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    expect(screen.getByText('Save')).toBeDefined();
  });

  it('renders 6 colour swatches', () => {
    renderForm();
    const swatches = document.querySelectorAll('button[aria-label^="#"]');
    expect(swatches.length).toBe(6);
  });

  it('populates account selector from dashboard accounts', () => {
    renderForm();
    expect(screen.getByText('Livret A')).toBeDefined();
  });

  it('submits the create form and calls onSuccess', async () => {
    const onSuccess = vi.fn();
    render(
      <Provider store={store}>
        <IntlProvider messages={enMessages} locale="en" defaultLocale="en">
          <PocketForm initialValues={undefined} onSuccess={onSuccess} onCancel={vi.fn()} />
        </IntlProvider>
      </Provider>,
    );
    // Fill in required fields
    const nameInput = screen.getByLabelText(/Name/i) as HTMLInputElement;
    const goalInput = screen.getByLabelText(/Goal/i) as HTMLInputElement;

    await userEvent.type(nameInput, 'Test pocket');
    await userEvent.type(goalInput, '500');
    await userEvent.click(screen.getByText('Create'));
    expect(onSuccess).toHaveBeenCalledOnce();
  });

  it('submits the edit form and calls onSuccess', async () => {
    const onSuccess = vi.fn();
    render(
      <Provider store={store}>
        <IntlProvider messages={enMessages} locale="en" defaultLocale="en">
          <PocketForm
            initialValues={{
              id: 'p1',
              accountLabel: 'Livret A',
              name: 'Existing',
              goalAmount: 1000,
              allocatedAmount: 0,
              progressPct: 0,
              color: '#22c55e',
              createdAt: '2026-01-01T00:00:00.000Z',
            }}
            onSuccess={onSuccess}
            onCancel={vi.fn()}
          />
        </IntlProvider>
      </Provider>,
    );
    await userEvent.click(screen.getByText('Save'));
    expect(onSuccess).toHaveBeenCalledOnce();
  });

  it('shows validation error and does not call onSuccess when name is empty', async () => {
    const onSuccess = vi.fn();
    render(
      <Provider store={store}>
        <IntlProvider messages={enMessages} locale="en" defaultLocale="en">
          <PocketForm initialValues={undefined} onSuccess={onSuccess} onCancel={vi.fn()} />
        </IntlProvider>
      </Provider>,
    );
    // Don't fill in name, only goal
    const goalInput = screen.getByLabelText(/Goal/i) as HTMLInputElement;
    await userEvent.type(goalInput, '500');
    await userEvent.click(screen.getByText('Create'));
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
