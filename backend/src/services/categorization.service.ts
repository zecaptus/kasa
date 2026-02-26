import { type CategoryRule, type Prisma, prisma } from '@kasa/db';

// ─── Talisman bigram dice ─────────────────────────────────────────────────────

const talisman = require('talisman/metrics/dice') as
  | { default?: (a: string, b: string) => number }
  | ((a: string, b: string) => number);
const bigramDice: (a: string, b: string) => number =
  typeof talisman === 'function'
    ? talisman
    : (talisman as { default: (a: string, b: string) => number }).default;
const FUZZY_THRESHOLD = 0.75;

// ─── Cache ────────────────────────────────────────────────────────────────────

const ruleCache = new Map<string, { rules: CategoryRule[]; loadedAt: number }>();
const CACHE_TTL_MS = 10_000;

export function invalidateRuleCache(userId: string): void {
  ruleCache.delete(userId);
}

async function loadRules(userId: string): Promise<CategoryRule[]> {
  const cached = ruleCache.get(userId);
  if (cached && Date.now() - cached.loadedAt < CACHE_TTL_MS) {
    return cached.rules;
  }
  const rules = await prisma.categoryRule.findMany({
    where: { OR: [{ userId }, { isSystem: true }] },
    orderBy: [{ isSystem: 'asc' }, { createdAt: 'asc' }],
  });
  ruleCache.set(userId, { rules, loadedAt: Date.now() });
  return rules;
}

// ─── Normalization ────────────────────────────────────────────────────────────

export function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── Fuzzy helpers ────────────────────────────────────────────────────────────

function isFuzzyTokenMatch(keyToken: string, labelTokens: string[]): boolean {
  return labelTokens.some((lt) => bigramDice(keyToken, lt) >= FUZZY_THRESHOLD);
}

function fuzzyMatch(normLabel: string, normKeyword: string): boolean {
  const keyTokens = normKeyword.split(' ').filter((t) => t.length >= 3);
  const labelTokens = normLabel.split(' ').filter((t) => t.length >= 3);
  if (keyTokens.length === 0) return false;
  return keyTokens.every((kt) => isFuzzyTokenMatch(kt, labelTokens));
}

// ─── matchRules (pure function) ───────────────────────────────────────────────

export interface CategorizationResult {
  categoryId: string;
  ruleId: string;
  isSystem: boolean;
  matchMethod: 'exact' | 'fuzzy';
}

export function matchRules(
  label: string,
  rules: CategoryRule[],
  txAmount?: Prisma.Decimal | null,
): CategorizationResult | null {
  const normalizedLabel = normalize(label);
  for (const rule of rules) {
    if (rule.amount !== null && (txAmount == null || !rule.amount.equals(txAmount))) continue;
    const normKeyword = normalize(rule.keyword);
    if (normalizedLabel.includes(normKeyword)) {
      return {
        categoryId: rule.categoryId,
        ruleId: rule.id,
        isSystem: rule.isSystem,
        matchMethod: 'exact',
      };
    }
    if (fuzzyMatch(normalizedLabel, normKeyword)) {
      return {
        categoryId: rule.categoryId,
        ruleId: rule.id,
        isSystem: rule.isSystem,
        matchMethod: 'fuzzy',
      };
    }
  }
  return null;
}

// ─── bulkCategorizeTransactions ───────────────────────────────────────────────

export async function bulkCategorizeTransactions(
  userId: string,
  transactions: Array<{
    id: string;
    label: string;
    categorySource: string;
    debit?: Prisma.Decimal | null;
    credit?: Prisma.Decimal | null;
  }>,
): Promise<number> {
  const rules = await loadRules(userId);
  let count = 0;

  for (const tx of transactions) {
    if (tx.categorySource === 'MANUAL' || tx.categorySource === 'AI') continue;

    const txAmount = tx.debit ?? tx.credit ?? null;
    const result = matchRules(tx.label, rules, txAmount);
    if (result) {
      await prisma.importedTransaction.update({
        where: { id: tx.id },
        data: {
          categoryId: result.categoryId,
          categorySource: 'AUTO',
          categoryRuleId: result.ruleId,
        },
      });
      count++;
    }
  }

  return count;
}

// ─── recategorizeUncategorized ────────────────────────────────────────────────

export async function recategorizeUncategorized(userId: string): Promise<number> {
  const transactions = await prisma.importedTransaction.findMany({
    where: { userId, categorySource: 'NONE' },
    select: { id: true, label: true, categorySource: true, debit: true, credit: true },
  });
  return bulkCategorizeTransactions(userId, transactions);
}

// ─── recategorizeAll ──────────────────────────────────────────────────────────

export async function recategorizeAll(userId: string): Promise<number> {
  await prisma.importedTransaction.updateMany({
    where: { userId, categorySource: 'AUTO' },
    data: { categoryId: null, categorySource: 'NONE', categoryRuleId: null },
  });
  return recategorizeUncategorized(userId);
}

// ─── categorizeLabel (single transaction) ────────────────────────────────────

export async function categorizeLabel(
  userId: string,
  label: string,
): Promise<CategorizationResult | null> {
  const rules = await loadRules(userId);
  return matchRules(label, rules);
}
