import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── mock @kasa/db ─────────────────────────────────────────────────────────────

const mockTxFindMany = vi.fn();
const mockRuleFindMany = vi.fn();

vi.mock('@kasa/db', () => ({
  prisma: {
    importedTransaction: {
      findMany: (...args: unknown[]) => mockTxFindMany(...args),
    },
    categoryRule: {
      findMany: (...args: unknown[]) => mockRuleFindMany(...args),
    },
  },
}));

// Import after mock
import { suggestRules } from '../../../src/services/ruleSuggestions.service.js';

describe('suggestRules', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty array when no uncategorized transactions', async () => {
    mockTxFindMany.mockResolvedValue([]);
    mockRuleFindMany.mockResolvedValue([]);

    const suggestions = await suggestRules('user-1');
    expect(suggestions).toEqual([]);
  });

  it('returns top keywords with count >= 3', async () => {
    mockTxFindMany.mockResolvedValue([
      { label: 'CARREFOUR MARKET PARIS' },
      { label: 'CARREFOUR MARKET LYON' },
      { label: 'CARREFOUR CITY NICE' },
      { label: 'AMAZON MARKETPLACE' },
    ]);
    mockRuleFindMany.mockResolvedValue([]);

    const suggestions = await suggestRules('user-1');
    // 'carrefour' appears 3 times — should be included
    const carrefourSuggestion = suggestions.find((s) => s.keyword === 'carrefour');
    expect(carrefourSuggestion).toBeDefined();
    expect(carrefourSuggestion?.matchCount).toBe(3);
    // 'amazon' appears 1 time — should not be included
    expect(suggestions.find((s) => s.keyword === 'amazon')).toBeUndefined();
  });

  it('excludes keywords already covered by existing rules', async () => {
    mockTxFindMany.mockResolvedValue([
      { label: 'CARREFOUR MARKET PARIS' },
      { label: 'CARREFOUR MARKET LYON' },
      { label: 'CARREFOUR CITY NICE' },
    ]);
    mockRuleFindMany.mockResolvedValue([{ keyword: 'Carrefour' }]);

    const suggestions = await suggestRules('user-1');
    expect(suggestions.find((s) => s.keyword === 'carrefour')).toBeUndefined();
  });

  it('excludes stop words', async () => {
    mockTxFindMany.mockResolvedValue([
      { label: 'VIR POUR LOYER' },
      { label: 'VIR POUR LOYER' },
      { label: 'VIR POUR LOYER' },
    ]);
    mockRuleFindMany.mockResolvedValue([]);

    const suggestions = await suggestRules('user-1');
    // 'pour' is a stop word and should be excluded
    expect(suggestions.find((s) => s.keyword === 'pour')).toBeUndefined();
  });

  it('returns results sorted by matchCount descending', async () => {
    mockTxFindMany.mockResolvedValue([
      { label: 'AMAZON MARKETPLACE' },
      { label: 'AMAZON MARKETPLACE' },
      { label: 'AMAZON MARKETPLACE' },
      { label: 'AMAZON MARKETPLACE' },
      { label: 'CARREFOUR MARKET' },
      { label: 'CARREFOUR MARKET' },
      { label: 'CARREFOUR MARKET' },
    ]);
    mockRuleFindMany.mockResolvedValue([]);

    const suggestions = await suggestRules('user-1');
    expect(suggestions.length).toBeGreaterThan(0);
    if (suggestions.length >= 2) {
      expect(suggestions[0].matchCount).toBeGreaterThanOrEqual(suggestions[1].matchCount);
    }
  });

  it('returns at most 10 suggestions', async () => {
    // Create labels with many different high-frequency keywords
    const labels = [];
    for (let i = 0; i < 15; i++) {
      for (let j = 0; j < 3; j++) {
        labels.push({ label: `KEYWORD${i}ABCD TRANSACTION` });
      }
    }
    mockTxFindMany.mockResolvedValue(labels);
    mockRuleFindMany.mockResolvedValue([]);

    const suggestions = await suggestRules('user-1');
    expect(suggestions.length).toBeLessThanOrEqual(10);
  });
});
