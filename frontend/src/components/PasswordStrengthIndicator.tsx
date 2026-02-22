import { useIntl } from 'react-intl';
import { cn } from '../lib/cn';
import { getPasswordStrength } from '../lib/passwordStrength';

interface PasswordStrengthIndicatorProps {
  password: string;
}

const segments = [
  { key: 'seg-1', color: 'bg-red-500' },
  { key: 'seg-2', color: 'bg-orange-500' },
  { key: 'seg-3', color: 'bg-yellow-500' },
  { key: 'seg-4', color: 'bg-lime-500' },
  { key: 'seg-5', color: 'bg-green-500' },
];

const labelKeys: Record<string, string> = {
  weak: 'auth.register.strength.weak',
  fair: 'auth.register.strength.fair',
  good: 'auth.register.strength.good',
  strong: 'auth.register.strength.strong',
  veryStrong: 'auth.register.strength.veryStrong',
};

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const { formatMessage } = useIntl();
  const { score, label, color } = getPasswordStrength(password);

  if (password.length === 0) return null;

  return (
    <div className="mt-1.5 space-y-1">
      <div className="flex gap-1">
        {segments.map((seg, i) => (
          <div
            key={seg.key}
            className={cn('h-1 flex-1 rounded-full transition-colors duration-300', {
              [segments[score].color]: i <= score,
              'bg-slate-200 dark:bg-slate-700': i > score,
            })}
          />
        ))}
      </div>
      <p className={cn('text-xs', color)}>{formatMessage({ id: labelKeys[label] })}</p>
    </div>
  );
}
