import {
  type ImportedTransaction,
  type ImportSession,
  type ManualExpense,
  Prisma,
  prisma,
  type ReconciliationStatus,
} from '@kasa/db';
import { aiCategorizeBatch } from './aiCategorization.service.js';
import { bulkCategorizeTransactions } from './categorization.service.js';
import { config } from '../config.js';
import { parseSgCsv } from './csvParser.service.js';
import { runReconciliation } from './reconciliation.service.js';
import { detectRecurringPatterns } from './recurringPatterns.service.js';
import { detectTransferPairs } from './transferDetection.service.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ReconciliationCounts {
  total: number;
  reconciled: number;
  awaitingReview: number;
  unreconciled: number;
  ignored: number;
}

export interface ImportCsvResult {
  session: ImportSession & { transactions: ImportedTransaction[]; counts: ReconciliationCounts };
  newCount: number;
  skippedCount: number;
  balanceMissing: boolean;
}

export interface CreateExpenseInput {
  amount: number;
  label: string;
  /** ISO date string YYYY-MM-DD */
  date: string;
  categoryId: string;
}

export interface ListExpensesOptions {
  limit: number;
  cursor: string | undefined;
  from: string | undefined;
  to: string | undefined;
  categoryId: string | undefined;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeCounts(transactions: ImportedTransaction[]): ReconciliationCounts {
  return {
    total: transactions.length,
    reconciled: transactions.filter((t) => t.status === 'RECONCILED').length,
    awaitingReview: 0, // Populated by reconciliation service when candidates exist
    unreconciled: transactions.filter((t) => t.status === 'UNRECONCILED').length,
    ignored: transactions.filter((t) => t.status === 'IGNORED').length,
  };
}

// ─── Helper: getOrCreateAccount ───────────────────────────────────────────────

async function getOrCreateAccount(
  tx: Prisma.TransactionClient,
  userId: string,
  accountNumber: string,
): Promise<string> {
  const existing = await tx.account.findUnique({
    where: { ownerId_accountNumber: { ownerId: userId, accountNumber } },
  });

  if (existing) return existing.id;

  const created = await tx.account.create({
    data: {
      ownerId: userId,
      accountNumber,
      label: accountNumber, // Default label = account number
    },
  });

  return created.id;
}

// ─── Helper: insertTransactionsWithDedupe ─────────────────────────────────────

type TransactionInsertRow = Omit<
  Prisma.ImportedTransactionCreateManyInput,
  'sessionId' | 'accountId'
>;

async function insertTransactionsWithDedupe(
  tx: Prisma.TransactionClient,
  sessionId: string,
  accountId: string,
  toInsert: TransactionInsertRow[],
): Promise<{ transactions: ImportedTransaction[]; newCount: number }> {
  // Use createMany with skipDuplicates for better performance (avoids timeout)
  const result = await tx.importedTransaction.createMany({
    data: toInsert.map((data) => ({ ...data, sessionId, accountId })),
    skipDuplicates: true,
  });

  // Fetch the created transactions to return them
  const createdTransactions = await tx.importedTransaction.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'asc' },
  });

  return { transactions: createdTransactions, newCount: result.count };
}

// ─── importCsv ────────────────────────────────────────────────────────────────

export async function importCsv(
  userId: string,
  filename: string,
  buffer: Buffer,
): Promise<ImportCsvResult> {
  const parsed = await parseSgCsv(buffer, filename);

  // accountNumber from CSV metadata or fall back to a label derived from filename
  const accountNumber =
    parsed.metadata.accountNumber ??
    parsed.transactions[0]?.accountLabel ??
    filename.replace(/\.csv$/i, '');

  // Build transaction create inputs (accountId filled in the transaction body below)
  const toInsert = parsed.transactions.map((t) => ({
    userId,
    accountingDate: t.accountingDate,
    valueDate: t.valueDate ?? null,
    label: t.label,
    detail: t.detail ?? null,
    debit: t.debit !== null ? new Prisma.Decimal(t.debit) : null,
    credit: t.credit !== null ? new Prisma.Decimal(t.credit) : null,
    status: 'UNRECONCILED' as ReconciliationStatus,
  }));

  // Create session and attempt to insert transactions, skipping duplicates
  const session = await prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {
      const accountId = await getOrCreateAccount(tx, userId, accountNumber);

      const created = await tx.importSession.create({
        data: {
          userId,
          accountId,
          filename,
          exportStartDate: parsed.metadata.exportStartDate,
          exportEndDate: parsed.metadata.exportEndDate,
          transactionCount: parsed.metadata.transactionCount,
          balanceDate: parsed.metadata.balanceDate,
          balance:
            parsed.metadata.balance !== null ? new Prisma.Decimal(parsed.metadata.balance) : null,
          currency: parsed.metadata.currency,
        },
      });

      const { transactions, newCount } = await insertTransactionsWithDedupe(
        tx,
        created.id,
        accountId,
        toInsert,
      );

      // Update account balance snapshot when CSV provides it
      if (parsed.metadata.balance !== null) {
        const balanceDate =
          parsed.metadata.balanceDate ?? parsed.metadata.exportEndDate ?? new Date();
        await tx.account.update({
          where: { id: accountId },
          data: {
            lastKnownBalance: new Prisma.Decimal(parsed.metadata.balance),
            lastKnownBalanceDate: balanceDate,
          },
        });
      }

      return { session: created, newCount, transactions };
    },
    { timeout: 30000 },
  );

  const skippedCount = parsed.transactions.length - session.newCount;

  // Trigger reconciliation after import (Q1: runs after every import)
  await runReconciliation(userId);

  // Auto-categorize new transactions (skip MANUAL overrides)
  await bulkCategorizeTransactions(
    userId,
    session.transactions.map((t) => ({
      id: t.id,
      label: t.label,
      categorySource: t.categorySource,
    })),
  );

  // AI-categorize remaining NONE transactions (if enabled)
  if (config.AI_CATEGORIZATION_ENABLED) {
    const uncategorized = await prisma.importedTransaction.findMany({
      where: { sessionId: session.session.id, categorySource: 'NONE' },
      select: { id: true, label: true, categorySource: true },
    });
    if (uncategorized.length > 0) {
      await aiCategorizeBatch(userId, uncategorized);
    }
  }

  // Detect recurring patterns after import
  await detectRecurringPatterns(userId);

  // Detect internal transfer pairs (VIR EMIS ↔ VIR RECU across accounts)
  await detectTransferPairs(userId);

  const counts = computeCounts(session.transactions);

  return {
    session: { ...session.session, transactions: session.transactions, counts },
    newCount: session.newCount,
    skippedCount,
    balanceMissing: parsed.metadata.balance === null,
  };
}

// ─── getSession ───────────────────────────────────────────────────────────────

export async function getSessionWithTransactions(
  userId: string,
  sessionId: string,
): Promise<
  | (ImportSession & {
      transactions: (ImportedTransaction & {
        reconciliation: {
          id: string;
          manualExpenseId: string;
          confidenceScore: number;
          isAutoMatched: boolean;
        } | null;
      })[];
      counts: ReconciliationCounts;
    })
  | null
> {
  const session = await prisma.importSession.findFirst({
    where: { id: sessionId, userId },
    include: {
      transactions: {
        orderBy: { accountingDate: 'desc' },
        include: {
          reconciliation: {
            select: {
              id: true,
              manualExpenseId: true,
              confidenceScore: true,
              isAutoMatched: true,
            },
          },
        },
      },
    },
  });

  if (!session) return null;

  const counts = computeCounts(session.transactions);
  return { ...session, counts };
}

// ─── listSessions ─────────────────────────────────────────────────────────────

export interface SessionSummary {
  id: string;
  filename: string;
  importedAt: Date;
  counts: ReconciliationCounts;
}

export async function listSessions(
  userId: string,
  limit: number,
  cursor?: string,
): Promise<{ sessions: SessionSummary[]; nextCursor: string | null }> {
  const take = limit + 1;
  const sessions = await prisma.importSession.findMany({
    where: { userId },
    orderBy: { importedAt: 'desc' },
    take,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      _count: { select: { transactions: true } },
      transactions: {
        select: { status: true },
      },
    },
  });

  const hasMore = sessions.length > limit;
  const page = hasMore ? sessions.slice(0, limit) : sessions;
  const nextCursor = hasMore ? (page[page.length - 1]?.id ?? null) : null;

  const summaries: SessionSummary[] = page.map((s) => {
    const counts = {
      total: s.transactions.length,
      reconciled: s.transactions.filter((t) => t.status === 'RECONCILED').length,
      awaitingReview: 0, // populated by reconciliation service when candidates exist
      unreconciled: s.transactions.filter((t) => t.status === 'UNRECONCILED').length,
      ignored: s.transactions.filter((t) => t.status === 'IGNORED').length,
    };
    return { id: s.id, filename: s.filename, importedAt: s.importedAt, counts };
  });

  return { sessions: summaries, nextCursor };
}

// ─── updateTransactionStatus ──────────────────────────────────────────────────

export async function updateTransactionStatus(
  userId: string,
  transactionId: string,
  status: 'IGNORED' | 'UNRECONCILED',
): Promise<ImportedTransaction | null> {
  const tx = await prisma.importedTransaction.findFirst({
    where: { id: transactionId, userId },
  });
  if (!tx) return null;

  return prisma.importedTransaction.update({
    where: { id: transactionId },
    data: { status },
  });
}

// ─── createExpense ────────────────────────────────────────────────────────────

export async function createExpense(
  userId: string,
  input: CreateExpenseInput,
): Promise<ManualExpense> {
  const expense = await prisma.manualExpense.create({
    data: {
      userId,
      amount: new Prisma.Decimal(input.amount),
      label: input.label,
      date: new Date(input.date),
      categoryId: input.categoryId,
      categorySource: 'MANUAL',
    },
  });

  // Trigger reconciliation after expense save (Q1: runs after every createExpense)
  await runReconciliation(userId);

  return expense;
}

// ─── deleteExpense ────────────────────────────────────────────────────────────

export async function deleteExpense(userId: string, expenseId: string): Promise<boolean> {
  const expense = await prisma.manualExpense.findFirst({
    where: { id: expenseId, userId },
    include: { reconciliation: true },
  });
  if (!expense) return false;

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // If linked to a reconciliation, reset the ImportedTransaction status first
    if (expense.reconciliation) {
      await tx.importedTransaction.update({
        where: { id: expense.reconciliation.importedTransactionId },
        data: { status: 'UNRECONCILED' },
      });
    }
    // Hard delete (cascades Reconciliation)
    await tx.manualExpense.delete({ where: { id: expenseId } });
  });

  return true;
}

// ─── listExpenses ─────────────────────────────────────────────────────────────

function buildDateFilter(
  from: string | undefined,
  to: string | undefined,
): Prisma.DateTimeFilter | undefined {
  if (!from && !to) return undefined;
  const filter: Prisma.DateTimeFilter = {};
  if (from) filter.gte = new Date(from);
  if (to) filter.lte = new Date(to);
  return filter;
}

export async function listExpenses(
  userId: string,
  options: ListExpensesOptions,
): Promise<{ expenses: ManualExpense[]; nextCursor: string | null }> {
  const take = options.limit + 1;
  const dateFilter = buildDateFilter(options.from, options.to);

  const where: Prisma.ManualExpenseWhereInput = {
    userId,
    ...(dateFilter ? { date: dateFilter } : {}),
    ...(options.categoryId ? { categoryId: options.categoryId } : {}),
  };

  const expenses = await prisma.manualExpense.findMany({
    where,
    orderBy: { date: 'desc' },
    take,
    ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
  });

  const hasMore = expenses.length > options.limit;
  const page = hasMore ? expenses.slice(0, options.limit) : expenses;
  const nextCursor = hasMore ? (page[page.length - 1]?.id ?? null) : null;

  return { expenses: page, nextCursor };
}
