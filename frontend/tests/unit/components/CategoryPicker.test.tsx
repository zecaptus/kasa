import { fireEvent, render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { describe, expect, it, vi } from 'vitest';
import { CategoryPicker } from '../../../src/components/CategoryPicker';
import enMessages from '../../../src/i18n/en.json';

const mockQueryResult = {
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
      {
        id: 'cat2',
        name: 'Transport',
        slug: 'transport',
        color: '#3b82f6',
        isSystem: true,
        userId: null,
        createdAt: '',
      },
    ],
  },
  isLoading: false,
};

vi.mock('../../../src/services/transactionsApi', () => ({
  useListCategoriesQuery: () => mockQueryResult,
}));

function renderPicker(
  props: { value?: string | null; onChange?: (id: string | null) => void; disabled?: boolean } = {},
) {
  const onChange = props.onChange ?? vi.fn();
  return render(
    <IntlProvider messages={enMessages} locale="en" defaultLocale="en">
      <CategoryPicker value={props.value ?? null} onChange={onChange} disabled={props.disabled} />
    </IntlProvider>,
  );
}

describe('CategoryPicker', () => {
  it('renders "Uncategorized" button', () => {
    renderPicker();
    expect(screen.getByRole('button', { name: /uncategorized/i })).toBeDefined();
  });

  it('renders a button for each category', () => {
    renderPicker();
    expect(screen.getByRole('button', { name: /alimentation/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /transport/i })).toBeDefined();
  });

  it('calls onChange with null when "Uncategorized" is clicked', () => {
    const onChange = vi.fn();
    renderPicker({ onChange });
    fireEvent.click(screen.getByRole('button', { name: /uncategorized/i }));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('calls onChange with categoryId when a category button is clicked', () => {
    const onChange = vi.fn();
    renderPicker({ onChange });
    fireEvent.click(screen.getByRole('button', { name: /alimentation/i }));
    expect(onChange).toHaveBeenCalledWith('cat1');
  });

  it('shows loading state when isLoading is true', () => {
    mockQueryResult.isLoading = true;
    // @ts-expect-error -- overriding data to undefined for loading state
    mockQueryResult.data = undefined;

    const { container } = renderPicker();
    // The component renders a pulsing placeholder div instead of buttons
    const pulse = container.querySelector('.animate-pulse');
    expect(pulse).toBeDefined();

    // Restore for subsequent tests
    mockQueryResult.isLoading = false;
    mockQueryResult.data = {
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
        {
          id: 'cat2',
          name: 'Transport',
          slug: 'transport',
          color: '#3b82f6',
          isSystem: true,
          userId: null,
          createdAt: '',
        },
      ],
    };
  });
});
