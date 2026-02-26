import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { describe, expect, it, vi } from 'vitest';
import { CategoryRuleForm } from '../../../src/components/CategoryRuleForm';
import enMessages from '../../../src/i18n/en.json';

vi.mock('../../../src/services/transactionsApi', () => ({
  useCreateCategoryRuleMutation: () => [vi.fn(), { isLoading: false }],
  useUpdateCategoryRuleMutation: () => [vi.fn(), { isLoading: false }],
  useListCategoriesQuery: () => ({
    data: {
      categories: [
        {
          id: 'cat1',
          name: 'Alimentation',
          slug: 'food',
          color: '#22c55e',
          isSystem: true,
          userId: null,
          createdAt: '',
        },
      ],
    },
    isLoading: false,
  }),
}));

function renderForm(props: Parameters<typeof CategoryRuleForm>[0] = {}) {
  return render(
    <IntlProvider messages={enMessages} locale="en" defaultLocale="en">
      <CategoryRuleForm {...props} />
    </IntlProvider>,
  );
}

describe('CategoryRuleForm', () => {
  it('renders keyword input', () => {
    renderForm();
    expect(screen.getByLabelText(/keyword/i)).toBeDefined();
  });

  it('renders category select with options', () => {
    renderForm();
    expect(screen.getByLabelText(/target category/i)).toBeDefined();
    expect(screen.getByText('Alimentation')).toBeDefined();
  });

  it('renders hint text', () => {
    renderForm();
    expect(screen.getByText(/label contains this keyword/i)).toBeDefined();
  });

  it('shows "Create" button in create mode', () => {
    renderForm();
    expect(screen.getByRole('button', { name: /create/i })).toBeDefined();
  });

  it('shows "Save" button in update mode', () => {
    renderForm({ ruleId: 'rule1', initialValues: { keyword: 'NETFLIX', categoryId: 'cat1' } });
    expect(screen.getByRole('button', { name: /save/i })).toBeDefined();
  });

  it('shows validation error when submitting with empty keyword', async () => {
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: /create/i }));
    await waitFor(() => {
      // There will be validation errors shown
      const errors = document.querySelectorAll('.text-red-600');
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  it('accepts keyword input', () => {
    renderForm();
    const input = screen.getByLabelText(/keyword/i);
    fireEvent.change(input, { target: { value: 'NETFLIX' } });
    expect((input as HTMLInputElement).value).toBe('NETFLIX');
  });

  it('prepopulates fields in update mode', () => {
    renderForm({ ruleId: 'rule1', initialValues: { keyword: 'SNCF', categoryId: 'cat1' } });
    const input = screen.getByLabelText(/keyword/i);
    expect((input as HTMLInputElement).value).toBe('SNCF');
  });

  it('renders amount input', () => {
    renderForm();
    expect(screen.getByLabelText(/exact amount/i)).toBeDefined();
  });

  it('prepopulates amount field in update mode', () => {
    renderForm({
      ruleId: 'rule1',
      initialValues: { keyword: 'NETFLIX', categoryId: 'cat1', amount: 99.99 },
    });
    const input = screen.getByLabelText(/exact amount/i);
    expect((input as HTMLInputElement).value).toBe('99.99');
  });

  it('accepts amount input', () => {
    renderForm();
    const input = screen.getByLabelText(/exact amount/i);
    fireEvent.change(input, { target: { value: '150.50' } });
    expect((input as HTMLInputElement).value).toBe('150.50');
  });
});
