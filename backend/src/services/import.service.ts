import {
  type ExpenseCategory,
  type ImportedTransaction,
  type ImportSession,
  type ManualExpense,
  Prisma,
  prisma,
  type ReconciliationStatus,
} from '@kasa/db';
import { parseSgCsv } from './csvParser.service.js';
import { runReconciliation } from './reconciliation.service.js';

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
}

export interface CreateExpenseInput {
  amount: number;
  label: string;
  /** ISO date string YYYY-MM-DD */
  date: string;
  category: ExpenseCategory;
}

export interface ListExpensesOptions {
  limit: number;
  cursor: string | undefined;
  from: string | undefined;
  to: string | undefined;
  category: ExpenseCategory | undefined;
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

// ─── importCsv ────────────────────────────────────────────────────────────────

export async function importCsv(
  userId: string,
  filename: string,
  buffer: Buffer,
): Promise<ImportCsvResult> {
  const parsed = await parseSgCsv(buffer);

  // Build transaction create inputs
  const toInsert: Prisma.ImportedTransactionCreateManySessionInput[] = parsed.map((tx) => ({
    userId,
    accountingDate: tx.accountingDate,
    valueDate: tx.valueDate ?? null,
    label: tx.label,
    detail: tx.detail ?? null,
    debit: tx.debit !== null ? new Prisma.Decimal(tx.debit) : null,
    credit: tx.credit !== null ? new Prisma.Decimal(tx.credit) : null,
    status: 'UNRECONCILED' as ReconciliationStatus,
  }));

  // Create session and attempt to insert transactions, skipping duplicates
  const session = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const created = await tx.importSession.create({
      data: { userId, filename },
    });

    let newCount = 0;
    const createdTransactions: ImportedTransaction[] = [];

    for (const data of toInsert) {
      try {
        const t = await tx.importedTransaction.create({
          data: { ...data, sessionId: created.id },
        });
        createdTransactions.push(t);
        newCount++;
      } catch (err: unknown) {
        // Unique constraint violation (P2002) = duplicate → skip
        if (
          typeof err === 'object' &&
          err !== null &&
          'code' in err &&
          (err as { code: string }).code !== 'P2002'
        ) {
          throw err;
        }
      }
    }

    return { session: created, newCount, transactions: createdTransactions };
  });

  const skippedCount = parsed.length - session.newCount;

  // Trigger reconciliation after import (Q1: runs after every import)
  await runReconciliation(userId);

  const counts = computeCounts(session.transactions);

  return {
    session: { ...session.session, transactions: session.transactions, counts },
    newCount: session.newCount,
    skippedCount,
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
      category: input.category,
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
    ...(options.category ? { category: options.category } : {}),
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
