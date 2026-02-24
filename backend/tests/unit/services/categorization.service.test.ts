import type { CategoryRule } from '@kasa/db';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── mock @kasa/db ─────────────────────────────────────────────────────────────

const mockUpdateMany = vi.fn();
const mockFindMany = vi.fn();
const mockUpdate = vi.fn();

vi.mock('@kasa/db', () => ({
  prisma: {
    importedTransaction: {
      updateMany: (...args: unknown[]) => mockUpdateMany(...args),
      findMany: (...args: unknown[]) => mockFindMany(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
    categoryRule: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
    },
  },
}));

// Import after mock
import {
  matchRules,
  normalize,
  recategorizeAll,
} from '../../../src/services/categorization.service.js';

// ── helpers ───────────────────────────────────────────────────────────────────

function mkRule(id: string, keyword: string, categoryId: string, isSystem = false): CategoryRule {
  return { id, keyword, categoryId, isSystem, userId: 'u1', createdAt: new Date() };
}

// ── normalize ─────────────────────────────────────────────────────────────────

describe('normalize', () => {
  it('lowercases and strips accents', () => {
    expect(normalize('Café Côté')).toBe('cafe cote');
  });

  it('collapses multiple whitespace', () => {
    expect(normalize('  hello   world  ')).toBe('hello world');
  });

  it('replaces non-alphanumeric chars with spaces', () => {
    expect(normalize('hello/world-test')).toBe('hello world test');
  });

  it('trims leading and trailing whitespace', () => {
    expect(normalize('  trimmed  ')).toBe('trimmed');
  });
});

// ── matchRules ────────────────────────────────────────────────────────────────

describe('matchRules', () => {
  it('returns null when no rules', () => {
    expect(matchRules('CARREFOUR MARKET', [])).toBeNull();
  });

  it('matches exact keyword (case-insensitive, accents)', () => {
    const rules = [mkRule('r1', 'carrefour', 'cat-food')];
    const result = matchRules('VIR CARREFOUR MARKET 01/02', rules);
    expect(result).not.toBeNull();
    expect(result?.categoryId).toBe('cat-food');
    expect(result?.ruleId).toBe('r1');
    expect(result?.matchMethod).toBe('exact');
  });

  it('returns null when nothing matches', () => {
    const rules = [mkRule('r1', 'carrefour', 'cat-food')];
    expect(matchRules('MONOPRIX OPERA', rules)).toBeNull();
  });

  it('fuzzy matches a token with a typo', () => {
    // 'carrefouur' vs 'carrefour' — similar enough via bigram dice
    const rules = [mkRule('r1', 'carrefouur', 'cat-food')];
    const result = matchRules('VIR CARREFOUR MARKET', rules);
    expect(result).not.toBeNull();
    expect(result?.matchMethod).toBe('fuzzy');
  });

  it('does not fuzzy match completely different tokens', () => {
    const rules = [mkRule('r1', 'sncf', 'cat-transport')];
    expect(matchRules('CARREFOUR MARKET', rules)).toBeNull();
  });

  it('does not fuzzy match when all keyword tokens are too short', () => {
    // 'xy' (length 2) is not a substring of the label and fuzzy skips tokens < 3 chars
    const rules = [mkRule('r1', 'xy', 'cat-misc')];
    expect(matchRules('LONGER LABEL TEXT', rules)).toBeNull();
  });

  it('returns first matching rule in order', () => {
    const rules = [mkRule('r1', 'sncf', 'cat-transport'), mkRule('r2', 'carrefour', 'cat-food')];
    const result = matchRules('SNCF CARREFOUR', rules);
    expect(result?.ruleId).toBe('r1');
  });

  it('exposes isSystem flag from the rule', () => {
    const rules = [mkRule('r1', 'amazon', 'cat-shopping', true)];
    const result = matchRules('AMAZON MARKETPLACE', rules);
    expect(result?.isSystem).toBe(true);
  });
});

// ── recategorizeAll ───────────────────────────────────────────────────────────

describe('recategorizeAll', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('clears AUTO transactions and re-runs categorization', async () => {
    // After clearing, recategorizeUncategorized finds no NONE transactions
    mockUpdateMany.mockResolvedValue({ count: 5 });
    mockFindMany.mockResolvedValue([]); // no uncategorized left after reset

    const count = await recategorizeAll('user-1');

    expect(mockUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1', categorySource: 'AUTO' },
        data: { categoryId: null, categorySource: 'NONE', categoryRuleId: null },
      }),
    );
    expect(count).toBe(0);
  });
});
