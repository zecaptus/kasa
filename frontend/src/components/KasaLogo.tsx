import { cn } from '../lib/cn';

interface KasaLogoProps {
  loading?: boolean;
  className?: string;
}

export function KasaLogo({ loading = false, className }: KasaLogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 200 80"
      aria-label="kasa."
      role="img"
      className={cn('group', { 'is-loading': loading }, className)}
    >
      {/* Chart icon — visible par défaut, disparaît en loading */}
      <g className="origin-[40px_42px]">
        <g
          className={cn(
            'origin-[40px_42px] transition-all duration-500',
            'ease-[cubic-bezier(0.34,1.56,0.64,1)]',
            'group-[.is-loading]:scale-0',
            'group-[.is-loading]:opacity-0',
            'group-[.is-loading]:rotate-180',
          )}
        >
          <path
            d="M 10 40 L 40 15 L 70 40"
            stroke="var(--color-kasa-accent)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <rect x="20" y="50" width="8" height="20" rx="4" fill="var(--color-kasa-primary)" />
          <rect x="36" y="40" width="8" height="30" rx="4" fill="var(--color-kasa-primary)" />
          <rect x="52" y="30" width="8" height="40" rx="4" fill="var(--color-kasa-primary)" />
        </g>

        {/* Spinner — invisible par défaut, apparaît en loading */}
        <g
          className={cn(
            'origin-[40px_42px] scale-0 opacity-0',
            'transition-all duration-500',
            'ease-[cubic-bezier(0.34,1.56,0.64,1)]',
            'group-[.is-loading]:scale-100',
            'group-[.is-loading]:opacity-100',
            { 'animate-[kasa-spin_2s_linear_infinite]': loading },
          )}
        >
          <circle
            cx="40"
            cy="42"
            r="22"
            strokeWidth="4"
            fill="none"
            className="stroke-slate-200 transition-colors duration-500 dark:stroke-slate-700"
          />
          <circle
            cx="40"
            cy="42"
            r="22"
            stroke="var(--color-kasa-accent)"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
            className={cn({ 'animate-[kasa-dash_1.5s_ease-in-out_infinite]': loading })}
          />
        </g>
      </g>

      {/* Texte "kasa." */}
      <text
        x="85"
        y="55"
        fontFamily="var(--font-sans)"
        fontWeight="800"
        fontSize="40"
        letterSpacing="-1"
        className="fill-kasa-dark transition-colors duration-500 dark:fill-white"
      >
        kasa
        <tspan className="fill-kasa-accent">.</tspan>
      </text>
    </svg>
  );
}
