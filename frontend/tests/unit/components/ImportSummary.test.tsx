import { render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { describe, expect, it } from 'vitest';
import { ImportSummary } from '../../../src/components/ImportSummary';
import enMessages from '../../../src/i18n/en.json';
import type { ReconciliationCounts } from '../../../src/services/importApi';

function renderSummary(counts: ReconciliationCounts) {
  return render(
    <IntlProvider messages={enMessages} locale="en" defaultLocale="en">
      <ImportSummary counts={counts} />
    </IntlProvider>,
  );
}

describe('ImportSummary', () => {
  it('renders all count items', () => {
    const counts: ReconciliationCounts = {
      total: 100,
      reconciled: 50,
      awaitingReview: 20,
      unreconciled: 25,
      ignored: 5,
    };

    renderSummary(counts);

    // Check that all badges are rendered
    const badges = document.querySelectorAll('.rounded-full');
    expect(badges.length).toBe(5);

    // Check that the text contains the counts
    expect(screen.getByText(/100 transactions/i)).toBeDefined();
    expect(screen.getByText(/50 reconciled/i)).toBeDefined();
    expect(screen.getByText(/20 awaiting review/i)).toBeDefined();
    expect(screen.getByText(/25 unreconciled/i)).toBeDefined();
    expect(screen.getByText(/5 ignored/i)).toBeDefined();
  });

  it('renders zero counts correctly', () => {
    const counts: ReconciliationCounts = {
      total: 0,
      reconciled: 0,
      awaitingReview: 0,
      unreconciled: 0,
      ignored: 0,
    };

    renderSummary(counts);

    // Should still render all badges even with zero values
    const badges = document.querySelectorAll('.rounded-full');
    expect(badges.length).toBe(5);
  });

  it('applies correct styling classes', () => {
    const counts: ReconciliationCounts = {
      total: 10,
      reconciled: 5,
      awaitingReview: 2,
      unreconciled: 2,
      ignored: 1,
    };

    renderSummary(counts);

    const badges = document.querySelectorAll('.rounded-full');
    expect(badges.length).toBe(5);

    // Check that each badge has color classes
    badges.forEach((badge) => {
      expect(badge.className).toMatch(/bg-/);
      expect(badge.className).toMatch(/text-/);
    });
  });
});
