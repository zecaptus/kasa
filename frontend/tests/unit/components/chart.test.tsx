import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ChartContainer, useChart } from '../../../src/components/ui/chart';

// Mock recharts to avoid ResizeObserver / SVG issues in jsdom
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  Tooltip: () => null,
  Legend: () => null,
}));

// A simple component that calls useChart() to exercise the hook
function ChartConsumer() {
  const { config } = useChart();
  return <div data-testid="chart-config">{Object.keys(config).join(',')}</div>;
}

describe('chart utilities', () => {
  it('ChartContainer renders children', () => {
    const config = { current: { label: 'Current', color: '#22c55e' } };
    render(
      <ChartContainer config={config}>
        <div data-testid="child" />
      </ChartContainer>,
    );
    expect(document.querySelector('[data-testid="child"]')).toBeTruthy();
  });

  it('useChart returns config when inside ChartContainer', () => {
    const config = { current: { label: 'Current', color: '#22c55e' } };
    render(
      <ChartContainer config={config}>
        <ChartConsumer />
      </ChartContainer>,
    );
    expect(document.querySelector('[data-testid="chart-config"]')?.textContent).toBe('current');
  });
});
