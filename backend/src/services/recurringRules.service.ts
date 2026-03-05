import { Prisma, prisma } from '@kasa/db';
import { normalize } from './categorization.service.js';

// ─── Talisman bigram Dice ─────────────────────────────────────────────────────

const talismanRaw = require('talisman/metrics/dice') as
  | ((a: string, b: string) => number)
  | { default: (a: string, b: string) => number };

const bigramDice: (a: string, b: string) => number =
  typeof talismanRaw === 'function'
    ? talismanRaw
    : (talismanRaw as { default: (a: string, b: string) => number }).default;

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_PERIODS = [1, 2, 3, 6, 12] as const;
export type PeriodMonths = (typeof VALID_PERIODS)[number];
const FUZZY_THRESHOLD = 0.75;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RecurringRuleDto {
  id: string;
  label: string;
  keyword: string;
  periodMonths: number;
  anchorDate: string;
  amount: number | null;
  isActive: boolean;
  nextOccurrenceDate: string;
  transactionCount: number;
  lastTransactionDate: string | null;
  accountLabel: string | null;
  createdAt: string;
}

export interface PendingMatchDto {
  id: string;
  ruleId: string;
  ruleLabel: string;
  transactionId: string;
  transactionLabel: string;
  transactionDate: string;
  transactionAmount: number | null;
  score: number;
}

export interface CreateRecurringRuleInput {
  label: string;
  periodMonths: number;
  amount?: number | null;
  anchorDate?: string;
}

export interface CreateRuleFromTransactionInput {
  label: string;
  periodMonths: number;
}

export interface UpdateRecurringRuleInput {
  label?: string;
  isActive?: boolean;
  periodMonths?: number;
  amount?: number | null;
}

export function isValidPeriod(n: unknown): n is PeriodMonths {
  return VALID_PERIODS.includes(n as PeriodMonths);
}

// ─── Internal types ───────────────────────────────────────────────────────────

type RuleWithIncludes = {
  id: string;
  label: string;
  keyword: string;
  periodMonths: number;
  anchorDate: Date;
  amount: Prisma.Decimal | null;
  isActive: boolean;
  createdAt: Date;
  _count: { transactions: number };
  transactions: {
    accountingDate: Date;
    debit: Prisma.Decimal | null;
    account: { label: string };
  }[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toIsoDate(date: Date): string {
  return date.toISOString().split('T')[0] as string;
}

function computeNext(anchor: Date, months: number): Date {
  const d = new Date(anchor);
  const now = new Date();
  while (d <= now) d.setMonth(d.getMonth() + months);
  return d;
}

const RULE_INCLUDE = {
  _count: { select: { transactions: true } },
  transactions: {
    orderBy: { accountingDate: 'desc' as const },
    take: 1,
    select: { accountingDate: true, debit: true, account: { select: { label: true } } },
  },
} as const;

function toDto(rule: RuleWithIncludes): RecurringRuleDto {
  const lastTx = rule.transactions[0] ?? null;
  const anchorForNext = lastTx ? lastTx.accountingDate : rule.anchorDate;
  return {
    id: rule.id,
    label: rule.label,
    keyword: rule.keyword,
    periodMonths: rule.periodMonths,
    anchorDate: toIsoDate(rule.anchorDate),
    amount:
      rule.amount !== null
        ? Number(rule.amount)
        : lastTx?.debit != null
          ? Number(lastTx.debit)
          : null,
    isActive: rule.isActive,
    nextOccurrenceDate: toIsoDate(computeNext(anchorForNext, rule.periodMonths)),
    transactionCount: rule._count.transactions,
    lastTransactionDate: lastTx ? toIsoDate(lastTx.accountingDate) : null,
    accountLabel: lastTx?.account.label ?? null,
    createdAt: rule.createdAt.toISOString(),
  };
}

// ─── listRecurringRules ───────────────────────────────────────────────────────

export async function listRecurringRules(userId: string): Promise<RecurringRuleDto[]> {
  const rules = await prisma.recurringRule.findMany({
    where: { userId },
    include: RULE_INCLUDE,
    orderBy: { createdAt: 'asc' },
  });
  const dtos = rules.map(toDto);
  dtos.sort((a, b) => a.nextOccurrenceDate.localeCompare(b.nextOccurrenceDate));
  return dtos;
}

// ─── createRecurringRule ─────────────────────────────────────────────────────

export async function createRecurringRule(
  userId: string,
  input: CreateRecurringRuleInput,
): Promise<RecurringRuleDto> {
  const anchorDate = input.anchorDate ? new Date(input.anchorDate) : new Date();
  const rule = await prisma.recurringRule.create({
    data: {
      userId,
      label: input.label,
      keyword: normalize(input.label),
      periodMonths: input.periodMonths,
      anchorDate,
      amount: input.amount != null ? new Prisma.Decimal(input.amount) : null,
      isActive: true,
    },
    include: RULE_INCLUDE,
  });
  return toDto(rule);
}

// ─── createRuleFromTransaction ────────────────────────────────────────────────

function normalizeText(label: string, detail: string | null): string {
  return normalize(label + (detail ? ` ${detail}` : ''));
}

async function autoLinkHistoricalTxs(
  userId: string,
  ruleId: string,
  keyword: string,
): Promise<void> {
  const candidates = await prisma.importedTransaction.findMany({
    where: { userId, recurringRuleId: null },
    select: { id: true, label: true, detail: true },
  });
  const toLink = candidates
    .filter((t) => normalizeText(t.label, t.detail).includes(keyword))
    .map((t) => t.id);
  if (toLink.length > 0) {
    await prisma.importedTransaction.updateMany({
      where: { id: { in: toLink } },
      data: { recurringRuleId: ruleId },
    });
  }
}

export async function createRuleFromTransaction(
  userId: string,
  txId: string,
  input: CreateRuleFromTransactionInput,
): Promise<RecurringRuleDto | null> {
  const tx = await prisma.importedTransaction.findFirst({ where: { id: txId, userId } });
  if (!tx) return null;

  const keyword = normalize(input.label);
  const rule = await prisma.recurringRule.create({
    data: {
      userId,
      label: input.label,
      keyword,
      periodMonths: input.periodMonths,
      anchorDate: tx.accountingDate,
      isActive: true,
    },
    include: RULE_INCLUDE,
  });

  await prisma.importedTransaction.update({
    where: { id: txId },
    data: { recurringRuleId: rule.id },
  });

  await autoLinkHistoricalTxs(userId, rule.id, keyword);

  const updated = await prisma.recurringRule.findUniqueOrThrow({
    where: { id: rule.id },
    include: RULE_INCLUDE,
  });
  return toDto(updated);
}

// ─── updateRecurringRule ─────────────────────────────────────────────────────

export async function updateRecurringRule(
  userId: string,
  id: string,
  input: UpdateRecurringRuleInput,
): Promise<RecurringRuleDto | null> {
  const existing = await prisma.recurringRule.findFirst({ where: { id, userId } });
  if (!existing) return null;

  const data: Prisma.RecurringRuleUpdateInput = {};
  if (input.label !== undefined) data.label = input.label;
  if (input.isActive !== undefined) data.isActive = input.isActive;
  if (input.periodMonths !== undefined) data.periodMonths = input.periodMonths;
  if ('amount' in input) {
    data.amount = input.amount != null ? new Prisma.Decimal(input.amount) : null;
  }

  const rule = await prisma.recurringRule.update({
    where: { id },
    data,
    include: RULE_INCLUDE,
  });
  return toDto(rule);
}

// ─── deleteRecurringRule ─────────────────────────────────────────────────────

export async function deleteRecurringRule(userId: string, id: string): Promise<boolean> {
  const existing = await prisma.recurringRule.findFirst({ where: { id, userId } });
  if (!existing) return false;
  await prisma.recurringRule.delete({ where: { id } });
  return true;
}

// ─── matchTransactionsToRules ─────────────────────────────────────────────────

interface RuleRef {
  id: string;
  keyword: string;
}

function findExactMatch(normalizedLabel: string, rules: RuleRef[]): RuleRef | null {
  for (const rule of rules) {
    if (normalizedLabel.includes(rule.keyword)) return rule;
  }
  return null;
}

function findFuzzyMatch(
  normalizedLabel: string,
  rules: RuleRef[],
): { rule: RuleRef; score: number } | null {
  let best: { rule: RuleRef; score: number } | null = null;
  for (const rule of rules) {
    const score = bigramDice(normalizedLabel, rule.keyword);
    if (score >= FUZZY_THRESHOLD && (!best || score > best.score)) {
      best = { rule, score };
    }
  }
  return best;
}

export async function matchTransactionsToRules(userId: string): Promise<void> {
  const rules = await prisma.recurringRule.findMany({
    where: { userId, isActive: true },
    select: { id: true, keyword: true },
  });
  if (rules.length === 0) return;

  const transactions = await prisma.importedTransaction.findMany({
    where: { userId, recurringRuleId: null, pendingMatch: null, debit: { not: null } },
    select: { id: true, label: true, detail: true },
  });

  for (const tx of transactions) {
    const normalizedLabel = normalizeText(tx.label, tx.detail);
    const exact = findExactMatch(normalizedLabel, rules);
    if (exact) {
      await prisma.importedTransaction.update({
        where: { id: tx.id },
        data: { recurringRuleId: exact.id },
      });
      continue;
    }
    const fuzzy = findFuzzyMatch(normalizedLabel, rules);
    if (fuzzy) {
      await prisma.recurringPendingMatch.upsert({
        where: { transactionId: tx.id },
        update: { ruleId: fuzzy.rule.id, score: fuzzy.score },
        create: { ruleId: fuzzy.rule.id, transactionId: tx.id, score: fuzzy.score },
      });
    }
  }
}

// ─── listPendingMatches ───────────────────────────────────────────────────────

export async function listPendingMatches(userId: string): Promise<PendingMatchDto[]> {
  const matches = await prisma.recurringPendingMatch.findMany({
    where: { rule: { userId } },
    include: {
      rule: { select: { id: true, label: true } },
      transaction: { select: { id: true, label: true, accountingDate: true, debit: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  return matches.map((m) => ({
    id: m.id,
    ruleId: m.ruleId,
    ruleLabel: m.rule.label,
    transactionId: m.transactionId,
    transactionLabel: m.transaction.label,
    transactionDate: toIsoDate(m.transaction.accountingDate),
    transactionAmount: m.transaction.debit != null ? Number(m.transaction.debit) : null,
    score: m.score,
  }));
}

// ─── confirmPendingMatch ─────────────────────────────────────────────────────

export async function confirmPendingMatch(userId: string, matchId: string): Promise<boolean> {
  const match = await prisma.recurringPendingMatch.findFirst({
    where: { id: matchId, rule: { userId } },
    select: { id: true, transactionId: true, ruleId: true },
  });
  if (!match) return false;

  await prisma.importedTransaction.update({
    where: { id: match.transactionId },
    data: { recurringRuleId: match.ruleId },
  });
  await prisma.recurringPendingMatch.delete({ where: { id: match.id } });
  return true;
}

// ─── dismissPendingMatch ─────────────────────────────────────────────────────

export async function dismissPendingMatch(userId: string, matchId: string): Promise<boolean> {
  const match = await prisma.recurringPendingMatch.findFirst({
    where: { id: matchId, rule: { userId } },
    select: { id: true },
  });
  if (!match) return false;
  await prisma.recurringPendingMatch.delete({ where: { id: match.id } });
  return true;
}
