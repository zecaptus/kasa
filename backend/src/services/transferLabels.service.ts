import { type Prisma, prisma, type TransferLabelRule } from '@kasa/db';
import { normalize } from './categorization.service.js';

// ─── Talisman bigram dice ─────────────────────────────────────────────────────

const talisman = require('talisman/metrics/dice') as
  | { default?: (a: string, b: string) => number }
  | ((a: string, b: string) => number);
const bigramDice: (a: string, b: string) => number =
  typeof talisman === 'function'
    ? talisman
    : (talisman as { default: (a: string, b: string) => number }).default;
const FUZZY_THRESHOLD = 0.75;

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

function findMatchingRule(
  tx: {
    label: string;
    detail: string | null;
    debit: Prisma.Decimal | null;
    credit: Prisma.Decimal | null;
  },
  rules: TransferLabelRule[],
): TransferLabelRule | null {
  const normLabel = normalize(tx.label);
  const normDetail = tx.detail ? normalize(tx.detail) : '';
  const combinedText = `${normLabel} ${normDetail}`.trim();
  const txAmount = tx.debit ?? tx.credit;

  for (const rule of rules) {
    if (rule.amount !== null && (txAmount == null || !rule.amount.equals(txAmount))) continue;
    const normKeyword = normalize(rule.keyword);
    const matched = combinedText.includes(normKeyword) || fuzzyMatch(combinedText, normKeyword);
    if (matched) {
      return rule;
    }
  }
  return null;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TransferLabelRuleWithCount extends TransferLabelRule {
  transactionCount: number;
}

// ─── listTransferLabelRules ───────────────────────────────────────────────────

export async function listTransferLabelRules(
  userId: string,
): Promise<TransferLabelRuleWithCount[]> {
  const rules = await prisma.transferLabelRule.findMany({
    where: { OR: [{ userId }, { isSystem: true }] },
    orderBy: [{ isSystem: 'asc' }, { createdAt: 'asc' }],
    include: { _count: { select: { transactions: true } } },
  });
  return rules.map((r) => ({
    ...r,
    transactionCount: r._count.transactions,
  }));
}

// ─── createTransferLabelRule ──────────────────────────────────────────────────

export async function createTransferLabelRule(
  userId: string,
  keyword: string,
  label: string,
  amount?: number | null,
): Promise<TransferLabelRule> {
  return prisma.transferLabelRule.create({
    data: { userId, keyword, label, amount: amount ?? null },
  });
}

// ─── updateTransferLabelRule ──────────────────────────────────────────────────

export async function updateTransferLabelRule(
  userId: string,
  ruleId: string,
  data: { keyword?: string; label?: string; amount?: number | null },
): Promise<TransferLabelRule | null> {
  const rule = await prisma.transferLabelRule.findFirst({
    where: { id: ruleId, userId },
  });
  if (!rule) return null;
  return prisma.transferLabelRule.update({ where: { id: ruleId }, data });
}

// ─── deleteTransferLabelRule ──────────────────────────────────────────────────

export async function deleteTransferLabelRule(userId: string, ruleId: string): Promise<boolean> {
  const rule = await prisma.transferLabelRule.findFirst({
    where: { id: ruleId, userId },
  });
  if (!rule) return false;
  await prisma.transferLabelRule.delete({ where: { id: ruleId } });
  return true;
}

// ─── applyTransferLabelRules ──────────────────────────────────────────────────

export async function applyTransferLabelRules(userId: string, txIds?: string[]): Promise<number> {
  const rules = await prisma.transferLabelRule.findMany({
    where: { OR: [{ userId }, { isSystem: true }] },
    orderBy: [{ isSystem: 'asc' }, { createdAt: 'asc' }],
  });

  if (rules.length === 0) return 0;

  const where = {
    userId,
    transferLabel: null,
    ...(txIds ? { id: { in: txIds } } : {}),
  };

  const transactions = await prisma.importedTransaction.findMany({
    where,
    select: { id: true, label: true, detail: true, debit: true, credit: true },
  });

  let count = 0;
  for (const tx of transactions) {
    const matchedRule = findMatchingRule(tx, rules);
    if (matchedRule) {
      await prisma.importedTransaction.update({
        where: { id: tx.id },
        data: { transferLabel: matchedRule.label, transferLabelRuleId: matchedRule.id },
      });
      count++;
    }
  }

  return count;
}

// ─── setTransferLabel ─────────────────────────────────────────────────────────

export async function setTransferLabel(
  userId: string,
  txId: string,
  label: string | null,
): Promise<boolean> {
  const tx = await prisma.importedTransaction.findFirst({
    where: { id: txId, userId },
  });
  if (!tx) return false;
  await prisma.importedTransaction.update({
    where: { id: txId },
    data: { transferLabel: label, transferLabelRuleId: null },
  });
  return true;
}
