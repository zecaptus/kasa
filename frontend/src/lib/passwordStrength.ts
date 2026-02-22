export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  color: string;
}

const checks = [
  (p: string): boolean => p.length >= 12,
  (p: string): boolean => /[A-Z]/.test(p),
  (p: string): boolean => /[a-z]/.test(p),
  (p: string): boolean => /\d/.test(p),
  (p: string): boolean => /[^A-Za-z0-9]/.test(p),
] as const;

const levels: readonly [string, string][] = [
  ['weak', 'text-red-500'],
  ['fair', 'text-orange-500'],
  ['good', 'text-yellow-500'],
  ['strong', 'text-lime-500'],
  ['veryStrong', 'text-green-500'],
];

export function getPasswordStrength(password: string): PasswordStrength {
  if (password.length === 0) {
    return { score: 0, label: 'weak', color: 'text-red-500' };
  }

  let score = 0;
  for (const check of checks) {
    if (check(password)) score++;
  }

  // Clamp to 0-4 range
  const idx = Math.min(score, 4) as 0 | 1 | 2 | 3 | 4;
  const [label, color] = levels[idx];

  return { score: idx, label, color };
}
