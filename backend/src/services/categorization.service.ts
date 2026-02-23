import { type CategoryRule, prisma } from '@kasa/db';

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

function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── matchRules (pure function) ───────────────────────────────────────────────

export interface CategorizationResult {
  categoryId: string;
  ruleId: string;
  isSystem: boolean;
}

export function matchRules(label: string, rules: CategoryRule[]): CategorizationResult | null {
  const normalizedLabel = normalize(label);
  for (const rule of rules) {
    if (normalizedLabel.includes(normalize(rule.keyword))) {
      return {
        categoryId: rule.categoryId,
        ruleId: rule.id,
        isSystem: rule.isSystem,
      };
    }
  }
  return null;
}

// ─── bulkCategorizeTransactions ───────────────────────────────────────────────

export async function bulkCategorizeTransactions(
  userId: string,
  transactions: Array<{ id: string; label: string; categorySource: string }>,
): Promise<number> {
  const rules = await loadRules(userId);
  let count = 0;

  for (const tx of transactions) {
    if (tx.categorySource === 'MANUAL') continue;

    const result = matchRules(tx.label, rules);
    if (result) {
      await prisma.importedTransaction.update({
        where: { id: tx.id },
        data: { categoryId: result.categoryId, categorySource: 'AUTO' },
      });
      count++;
    }
  }

  return count;
}

// ─── categorizeLabel (single transaction) ────────────────────────────────────

export async function categorizeLabel(
  userId: string,
  label: string,
): Promise<CategorizationResult | null> {
  const rules = await loadRules(userId);
  return matchRules(label, rules);
}
