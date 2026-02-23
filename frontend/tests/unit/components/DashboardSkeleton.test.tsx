import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DashboardSkeleton } from '../../../src/components/DashboardSkeleton';

describe('DashboardSkeleton', () => {
  it('renders without errors', () => {
    expect(() => render(<DashboardSkeleton />)).not.toThrow();
  });

  it('contains animate-pulse skeleton blocks', () => {
    render(<DashboardSkeleton />);
    const pulseBlocks = document.querySelectorAll('.animate-pulse');
    expect(pulseBlocks.length).toBeGreaterThan(0);
  });

  it('marks the container as aria-busy', () => {
    render(<DashboardSkeleton />);
    const container = document.querySelector('[aria-busy="true"]');
    expect(container).toBeTruthy();
  });

  it('renders multiple skeleton placeholder elements', () => {
    render(<DashboardSkeleton />);
    const pulseBlocks = document.querySelectorAll('.animate-pulse');
    // Summary + 3 account cards + chart = many blocks
    expect(pulseBlocks.length).toBeGreaterThanOrEqual(5);
  });
});
