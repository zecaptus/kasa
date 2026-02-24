import { prisma } from '@kasa/db';
import { normalize } from './categorization.service.js';

export interface RuleSuggestion {
  keyword: string;
  matchCount: number;
}

const STOP_WORDS = new Set([
  'par',
  'de',
  'du',
  'les',
  'des',
  'sur',
  'pour',
  'avec',
  'the',
  'and',
  'for',
]);

function extractKeywords(label: string): string[] {
  return normalize(label)
    .split(' ')
    .filter((t) => t.length >= 4 && !/^\d+$/.test(t) && !STOP_WORDS.has(t));
}

function buildFrequencyMap(labels: string[]): Map<string, number> {
  const freq = new Map<string, number>();
  for (const label of labels) {
    for (const kw of extractKeywords(label)) {
      freq.set(kw, (freq.get(kw) ?? 0) + 1);
    }
  }
  return freq;
}

export async function suggestRules(userId: string): Promise<RuleSuggestion[]> {
  const [txs, rules] = await Promise.all([
    prisma.importedTransaction.findMany({
      where: { userId, categorySource: 'NONE' },
      select: { label: true },
    }),
    prisma.categoryRule.findMany({
      where: { OR: [{ userId }, { isSystem: true }] },
      select: { keyword: true },
    }),
  ]);

  const existingKeywords = new Set(rules.map((r) => normalize(r.keyword)));
  const freq = buildFrequencyMap(txs.map((t) => t.label));

  return [...freq.entries()]
    .filter(([kw, count]) => count >= 3 && !existingKeywords.has(kw))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([keyword, matchCount]) => ({ keyword, matchCount }));
}
