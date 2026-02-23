import * as React from 'react';
import * as RechartsPrimitive from 'recharts';
import { cn } from '../../lib/cn';

// ─── Chart Config ─────────────────────────────────────────────────────────────

export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode;
    color?: string;
  };
};

type ChartContextProps = {
  config: ChartConfig;
};

const ChartContext = React.createContext<ChartContextProps | null>(null);

export function useChart() {
  const context = React.useContext(ChartContext);
  if (!context) throw new Error('useChart must be used within a <ChartContainer />');
  return context;
}

// ─── ChartStyle ───────────────────────────────────────────────────────────────

function ChartStyle({ id, config }: { id: string; config: ChartConfig }) {
  const entries = Object.entries(config).filter(([, c]) => c.color);
  if (!entries.length) return null;
  return (
    <style>{`[data-chart=${id}] {\n${entries.map(([k, c]) => `  --color-${k}: ${c.color};`).join('\n')}\n}`}</style>
  );
}

// ─── ChartContainer ───────────────────────────────────────────────────────────

export const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<'div'> & {
    config: ChartConfig;
    children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>['children'];
  }
>(({ id, className, children, config, ...props }, ref) => {
  const uniqueId = React.useId();
  const chartId = `chart-${id ?? uniqueId.replace(/:/g, '')}`;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-chart={chartId}
        ref={ref}
        className={cn('flex aspect-video justify-center text-xs', className)}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>{children}</RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
});
ChartContainer.displayName = 'ChartContainer';

// ─── ChartTooltip ─────────────────────────────────────────────────────────────

export const ChartTooltip = RechartsPrimitive.Tooltip;

// ─── ChartLegend ─────────────────────────────────────────────────────────────

export const ChartLegend = RechartsPrimitive.Legend;
