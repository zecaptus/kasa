import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';
import { describe, expect, it, vi } from 'vitest';
import { RuleSuggestions } from '../../../src/components/RuleSuggestions';
import en from '../../../src/i18n/en.json';

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <IntlProvider locale="en" messages={en}>
      {ui}
    </IntlProvider>,
  );
}

describe('RuleSuggestions', () => {
  it('renders nothing when suggestions are empty', () => {
    const { container } = renderWithIntl(<RuleSuggestions suggestions={[]} onAccept={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders suggestion keywords', () => {
    renderWithIntl(
      <RuleSuggestions
        suggestions={[
          { keyword: 'carrefour', matchCount: 5 },
          { keyword: 'amazon', matchCount: 3 },
        ]}
        onAccept={vi.fn()}
      />,
    );
    expect(screen.getByText('carrefour')).toBeDefined();
    expect(screen.getByText('amazon')).toBeDefined();
  });

  it('shows match counts', () => {
    renderWithIntl(
      <RuleSuggestions suggestions={[{ keyword: 'sncf', matchCount: 7 }]} onAccept={vi.fn()} />,
    );
    expect(screen.getByText('×7')).toBeDefined();
  });

  it('calls onAccept with the keyword when Use button is clicked', async () => {
    const user = userEvent.setup();
    const onAccept = vi.fn();

    renderWithIntl(
      <RuleSuggestions
        suggestions={[{ keyword: 'carrefour', matchCount: 4 }]}
        onAccept={onAccept}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Use' }));
    expect(onAccept).toHaveBeenCalledWith('carrefour');
  });

  it('shows the title text', () => {
    renderWithIntl(
      <RuleSuggestions suggestions={[{ keyword: 'amazon', matchCount: 3 }]} onAccept={vi.fn()} />,
    );
    expect(screen.getByText('Suggested rules')).toBeDefined();
  });
});
