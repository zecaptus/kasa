import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';
import { describe, expect, it, vi } from 'vitest';
import { PocketCard } from '../../../src/components/PocketCard';
import enMessages from '../../../src/i18n/en.json';
import type { PocketSummaryDto } from '../../../src/services/pocketsApi';

function renderCard(pocket: PocketSummaryDto) {
  return render(
    <IntlProvider messages={enMessages} locale="en" defaultLocale="en">
      <PocketCard pocket={pocket} />
    </IntlProvider>,
  );
}

const basePocket: PocketSummaryDto = {
  id: 'p1',
  accountLabel: 'Livret A',
  name: 'Vacances',
  goalAmount: 2000,
  allocatedAmount: 850,
  progressPct: 42.5,
  color: '#3b82f6',
  createdAt: '2026-02-23T00:00:00.000Z',
};

describe('PocketCard', () => {
  it('renders pocket name', () => {
    renderCard(basePocket);
    expect(screen.getByText('Vacances')).toBeDefined();
  });

  it('renders progressbar with correct aria-valuenow', () => {
    renderCard(basePocket);
    const bar = document.querySelector('[role="progressbar"]');
    expect(bar).toBeTruthy();
    expect(bar?.getAttribute('aria-valuenow')).toBe('43');
  });

  it('renders progress bar with correct width style', () => {
    renderCard(basePocket);
    const inner = document.querySelector('[role="progressbar"] > div') as HTMLElement | null;
    expect(inner?.style.width).toBe('42.5%');
  });

  it('caps progress bar at 100% when allocatedAmount > goalAmount', () => {
    renderCard({ ...basePocket, allocatedAmount: 2500, progressPct: 100 });
    const inner = document.querySelector('[role="progressbar"] > div') as HTMLElement | null;
    expect(inner?.style.width).toBe('100%');
  });

  it('shows goal-achieved indicator when progressPct >= 100', () => {
    renderCard({ ...basePocket, allocatedAmount: 2000, progressPct: 100 });
    expect(screen.getByText('✓')).toBeDefined();
  });

  it('does not show goal-achieved indicator below 100%', () => {
    renderCard(basePocket);
    expect(screen.queryByText('✓')).toBeNull();
  });

  it('renders allocated/goal ratio', () => {
    renderCard(basePocket);
    // Should show something like "€850.00 / €2,000.00"
    const text = document.body.textContent ?? '';
    expect(text).toContain('850');
    expect(text).toContain('2,000');
  });

  it('renders add movement button when onAddMovement is provided', () => {
    const onAdd = vi.fn();
    render(
      <IntlProvider messages={enMessages} locale="en" defaultLocale="en">
        <PocketCard pocket={basePocket} onAddMovement={onAdd} />
      </IntlProvider>,
    );
    expect(screen.getByText('Add movement')).toBeDefined();
  });

  it('does not render action buttons in compact mode', () => {
    const onAdd = vi.fn();
    render(
      <IntlProvider messages={enMessages} locale="en" defaultLocale="en">
        <PocketCard pocket={basePocket} onAddMovement={onAdd} compact />
      </IntlProvider>,
    );
    expect(screen.queryByText('Add movement')).toBeNull();
  });

  it('has aria-label on progress bar', () => {
    renderCard(basePocket);
    const bar = document.querySelector('[role="progressbar"]');
    expect(bar?.getAttribute('aria-label')).toBeTruthy();
  });

  it('calls onAddMovement when Add movement button clicked', async () => {
    const onAdd = vi.fn();
    render(
      <IntlProvider messages={enMessages} locale="en" defaultLocale="en">
        <PocketCard pocket={basePocket} onAddMovement={onAdd} />
      </IntlProvider>,
    );
    await userEvent.click(screen.getByText('Add movement'));
    expect(onAdd).toHaveBeenCalledWith(basePocket);
  });

  it('calls onEdit when Edit button clicked', async () => {
    const onEdit = vi.fn();
    render(
      <IntlProvider messages={enMessages} locale="en" defaultLocale="en">
        <PocketCard pocket={basePocket} onEdit={onEdit} />
      </IntlProvider>,
    );
    await userEvent.click(screen.getByText('Edit'));
    expect(onEdit).toHaveBeenCalledWith(basePocket);
  });

  it('calls onDelete when Delete button clicked', async () => {
    const onDelete = vi.fn();
    render(
      <IntlProvider messages={enMessages} locale="en" defaultLocale="en">
        <PocketCard pocket={basePocket} onDelete={onDelete} />
      </IntlProvider>,
    );
    await userEvent.click(screen.getByText('Delete'));
    expect(onDelete).toHaveBeenCalledWith(basePocket);
  });
});
