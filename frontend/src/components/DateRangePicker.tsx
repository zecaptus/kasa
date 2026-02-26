import { useIntl } from 'react-intl';

interface Props {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}

export function DateRangePicker({ from, to, onChange }: Props) {
  const intl = useIntl();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
        <span>{intl.formatMessage({ id: 'dashboard.range.from' })}</span>
        <input
          type="date"
          value={from}
          max={to}
          onChange={(e) => onChange(e.target.value, to)}
          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm tabular-nums outline-none focus:border-kasa-accent focus:ring-2 focus:ring-kasa-accent/15 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
      </label>
      <label className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
        <span>{intl.formatMessage({ id: 'dashboard.range.to' })}</span>
        <input
          type="date"
          value={to}
          min={from}
          onChange={(e) => onChange(from, e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm tabular-nums outline-none focus:border-kasa-accent focus:ring-2 focus:ring-kasa-accent/15 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
      </label>
    </div>
  );
}
