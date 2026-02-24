import { Prisma, prisma } from '@kasa/db';
import { normalize } from './categorization.service.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export type RecurrenceFrequency = 'WEEKLY' | 'MONTHLY' | 'ANNUAL';
export type RecurrenceSource = 'AUTO' | 'MANUAL';

export interface RecurringPatternDto {
  id: string;
  label: string;
  keyword: string;
  amount: number | null;
  frequency: RecurrenceFrequency;
  source: RecurrenceSource;
  isActive: boolean;
  nextOccurrenceDate: string | null;
  transactionCount: number;
  lastTransactionDate: string | null;
  transferPeerAccountLabel: string | null;
  createdAt: string;
}

export interface CreateRecurringPatternInput {
  label: string;
  keyword: string;
  amount?: number | null;
  frequency: RecurrenceFrequency;
}

export interface UpdateRecurringPatternInput {
  label?: string;
  isActive?: boolean;
  frequency?: RecurrenceFrequency;
  nextOccurrenceDate?: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FREQUENCY_DAYS: Record<RecurrenceFrequency, number> = {
  WEEKLY: 7,
  MONTHLY: 30,
  ANNUAL: 365,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function median(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 !== 0) return sorted[mid] ?? 0;
  return ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
}

function deriveFrequency(medianDays: number): RecurrenceFrequency | null {
  if (medianDays >= 5 && medianDays <= 9) return 'WEEKLY';
  if (medianDays >= 25 && medianDays <= 35) return 'MONTHLY';
  if (medianDays >= 350 && medianDays <= 380) return 'ANNUAL';
  return null;
}

function computeNextOccurrence(lastDate: Date, frequency: RecurrenceFrequency): Date {
  const next = new Date(lastDate);
  next.setDate(next.getDate() + FREQUENCY_DAYS[frequency]);
  return next;
}

function amountsConsistent(amounts: number[]): boolean {
  if (amounts.length < 2) return true;
  const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
  if (mean === 0) return false;
  const variance = amounts.reduce((sum, a) => sum + (a - mean) ** 2, 0) / amounts.length;
  const stddev = Math.sqrt(variance);
  return stddev / mean < 0.1;
}

function toIsoDate(date: Date): string {
  return date.toISOString().split('T')[0] as string;
}

type TxRow = { id: string; label: string; debit: Prisma.Decimal | null; accountingDate: Date };

type PatternWithIncludes = {
  id: string;
  label: string;
  keyword: string;
  amount: Prisma.Decimal | null;
  frequency: string;
  source: string;
  isActive: boolean;
  nextOccurrenceDate: Date | null;
  createdAt: Date;
  _count: { transactions: number };
  transactions: {
    accountingDate: Date;
    transferPeer: { account: { label: string } } | null;
  }[];
};

function toDto(pattern: PatternWithIncludes): RecurringPatternDto {
  const lastTx = pattern.transactions[0] ?? null;
  return {
    id: pattern.id,
    label: pattern.label,
    keyword: pattern.keyword,
    amount: pattern.amount !== null ? Number(pattern.amount) : null,
    frequency: pattern.frequency as RecurrenceFrequency,
    source: pattern.source as RecurrenceSource,
    isActive: pattern.isActive,
    nextOccurrenceDate: pattern.nextOccurrenceDate ? toIsoDate(pattern.nextOccurrenceDate) : null,
    transactionCount: pattern._count.transactions,
    lastTransactionDate: lastTx ? toIsoDate(lastTx.accountingDate) : null,
    transferPeerAccountLabel: lastTx?.transferPeer?.account?.label ?? null,
    createdAt: pattern.createdAt.toISOString(),
  };
}

const PATTERN_INCLUDE = {
  _count: { select: { transactions: true } },
  transactions: {
    orderBy: { accountingDate: 'desc' as const },
    take: 1,
    select: {
      accountingDate: true,
      transferPeer: { select: { account: { select: { label: true } } } },
    },
  },
} as const;

// ─── Detection helpers ────────────────────────────────────────────────────────

function groupByNormalizedLabel(transactions: TxRow[]): Map<string, TxRow[]> {
  const groups = new Map<string, TxRow[]>();
  for (const tx of transactions) {
    const key = normalize(tx.label);
    const group = groups.get(key) ?? [];
    group.push(tx);
    groups.set(key, group);
  }
  return groups;
}

function computeIntervals(sorted: TxRow[]): number[] {
  const intervals: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    if (!prev || !curr) continue;
    intervals.push(
      (curr.accountingDate.getTime() - prev.accountingDate.getTime()) / (1000 * 60 * 60 * 24),
    );
  }
  return intervals;
}

interface PatternCandidate {
  keyword: string;
  label: string;
  frequency: RecurrenceFrequency;
  medianAmount: number | null;
  lastDate: Date;
  transactionIds: string[];
}

function buildCandidate(keyword: string, txGroup: TxRow[]): PatternCandidate | null {
  if (txGroup.length < 2) return null;
  const sorted = [...txGroup].sort(
    (a, b) => a.accountingDate.getTime() - b.accountingDate.getTime(),
  );
  const intervals = computeIntervals(sorted);
  if (intervals.length === 0) return null;
  const frequency = deriveFrequency(median(intervals));
  if (!frequency) return null;
  const amounts = sorted.map((t) => Number(t.debit ?? 0)).filter((a) => a > 0);
  if (!amountsConsistent(amounts)) return null;
  const lastTx = sorted[sorted.length - 1];
  if (!lastTx) return null;
  return {
    keyword,
    label: txGroup[0]?.label ?? keyword,
    frequency,
    medianAmount: amounts.length > 0 ? median(amounts) : null,
    lastDate: lastTx.accountingDate,
    transactionIds: sorted.map((t) => t.id),
  };
}

async function upsertPattern(userId: string, c: PatternCandidate): Promise<string> {
  const nextOccurrenceDate = computeNextOccurrence(c.lastDate, c.frequency);
  const daysSinceLast = (Date.now() - c.lastDate.getTime()) / (1000 * 60 * 60 * 24);
  const isStillActive = daysSinceLast <= 2 * FREQUENCY_DAYS[c.frequency];
  const amountDecimal = c.medianAmount !== null ? new Prisma.Decimal(c.medianAmount) : null;

  const existing = await prisma.recurringPattern.findFirst({
    where: { userId, keyword: c.keyword, source: 'AUTO' },
  });

  if (existing) {
    await prisma.recurringPattern.update({
      where: { id: existing.id },
      data: {
        label: c.label,
        amount: amountDecimal,
        frequency: c.frequency,
        isActive: isStillActive,
        nextOccurrenceDate,
      },
    });
    return existing.id;
  }

  const created = await prisma.recurringPattern.create({
    data: {
      userId,
      label: c.label,
      keyword: c.keyword,
      amount: amountDecimal,
      frequency: c.frequency,
      source: 'AUTO',
      isActive: isStillActive,
      nextOccurrenceDate,
    },
  });
  return created.id;
}

// ─── detectRecurringPatterns ──────────────────────────────────────────────────

export async function detectRecurringPatterns(userId: string): Promise<void> {
  const transactions = await prisma.importedTransaction.findMany({
    where: { userId, debit: { not: null } },
    select: { id: true, label: true, debit: true, accountingDate: true },
    orderBy: { accountingDate: 'asc' },
  });

  const groups = groupByNormalizedLabel(transactions);
  const detectedKeywords = new Set<string>();

  for (const [keyword, txGroup] of groups) {
    const candidate = buildCandidate(keyword, txGroup);
    if (!candidate) continue;

    const patternId = await upsertPattern(userId, candidate);
    detectedKeywords.add(keyword);

    await prisma.importedTransaction.updateMany({
      where: { id: { in: candidate.transactionIds } },
      data: { recurringPatternId: patternId },
    });
  }

  if (detectedKeywords.size > 0) {
    await prisma.recurringPattern.updateMany({
      where: { userId, source: 'AUTO', keyword: { notIn: Array.from(detectedKeywords) } },
      data: { isActive: false },
    });
  }
}

// ─── listRecurringPatterns ────────────────────────────────────────────────────

export async function listRecurringPatterns(userId: string): Promise<RecurringPatternDto[]> {
  const patterns = await prisma.recurringPattern.findMany({
    where: { userId },
    orderBy: { nextOccurrenceDate: 'asc' },
    include: PATTERN_INCLUDE,
  });
  return patterns.map(toDto);
}

// ─── createRecurringPattern ───────────────────────────────────────────────────

export async function createRecurringPattern(
  userId: string,
  input: CreateRecurringPatternInput,
): Promise<RecurringPatternDto> {
  const pattern = await prisma.recurringPattern.create({
    data: {
      userId,
      label: input.label,
      keyword: normalize(input.keyword),
      amount: input.amount != null ? new Prisma.Decimal(input.amount) : null,
      frequency: input.frequency,
      source: 'MANUAL',
      isActive: true,
    },
    include: PATTERN_INCLUDE,
  });
  return toDto(pattern);
}

// ─── updateRecurringPattern ───────────────────────────────────────────────────

export async function updateRecurringPattern(
  userId: string,
  id: string,
  input: UpdateRecurringPatternInput,
): Promise<RecurringPatternDto | null> {
  const existing = await prisma.recurringPattern.findFirst({ where: { id, userId } });
  if (!existing) return null;

  const pattern = await prisma.recurringPattern.update({
    where: { id },
    data: {
      ...(input.label !== undefined ? { label: input.label } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(input.frequency !== undefined ? { frequency: input.frequency } : {}),
      ...(input.nextOccurrenceDate !== undefined
        ? {
            nextOccurrenceDate:
              input.nextOccurrenceDate !== null ? new Date(input.nextOccurrenceDate) : null,
          }
        : {}),
    },
    include: PATTERN_INCLUDE,
  });
  return toDto(pattern);
}

// ─── deleteRecurringPattern ───────────────────────────────────────────────────

export async function deleteRecurringPattern(userId: string, id: string): Promise<boolean> {
  const existing = await prisma.recurringPattern.findFirst({ where: { id, userId } });
  if (!existing) return false;
  await prisma.recurringPattern.delete({ where: { id } });
  return true;
}
