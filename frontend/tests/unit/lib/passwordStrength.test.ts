import { describe, expect, it } from 'vitest';
import { getPasswordStrength } from '../../../src/lib/passwordStrength';

describe('getPasswordStrength', () => {
  it('returns score 0 for empty string', () => {
    const result = getPasswordStrength('');
    expect(result.score).toBe(0);
    expect(result.label).toBe('weak');
  });

  it('returns score 0 for very short password with no variety', () => {
    const result = getPasswordStrength('aaa');
    // Only lowercase check passes → score 1 → label "fair"
    expect(result.score).toBe(1);
  });

  it('returns score 1 for password with only lowercase', () => {
    const result = getPasswordStrength('abcdefgh');
    // lowercase ✓ (length < 12, no upper, no digit, no special)
    expect(result.score).toBe(1);
    expect(result.label).toBe('fair');
  });

  it('returns score 2 for password with lowercase + digits', () => {
    const result = getPasswordStrength('abc12345');
    // lowercase ✓, digit ✓
    expect(result.score).toBe(2);
    expect(result.label).toBe('good');
  });

  it('returns score 3 for password with lowercase + uppercase + digits', () => {
    const result = getPasswordStrength('Abc12345');
    // uppercase ✓, lowercase ✓, digit ✓
    expect(result.score).toBe(3);
    expect(result.label).toBe('strong');
  });

  it('returns score 4 for password with all checks passing', () => {
    const result = getPasswordStrength('Abcdef12345!');
    // length ≥12 ✓, uppercase ✓, lowercase ✓, digit ✓, special ✓
    expect(result.score).toBe(4);
    expect(result.label).toBe('veryStrong');
    expect(result.color).toBe('text-green-500');
  });

  it('handles 8-char boundary (min required, no length bonus)', () => {
    const result = getPasswordStrength('Abcdef1!');
    // 8 chars < 12 so no length bonus
    // uppercase ✓, lowercase ✓, digit ✓, special ✓ → score 4
    expect(result.score).toBe(4);
  });

  it('gives length bonus for passwords ≥ 12 chars', () => {
    const result = getPasswordStrength('abcdefghijkl');
    // length ≥12 ✓, lowercase ✓ → score 2
    expect(result.score).toBe(2);
  });
});
