import type { Prisma } from '@kasa/db';
import { prisma } from '@kasa/db';
import { matchBankLabel } from './bankLabelMatcher.js';

// ─── Constants ────────────────────────────────────────────────────────────────

export const HIGH_CONFIDENCE_THRESHOLD = 0.85;
export const PLAUSIBLE_THRESHOLD = 0.6;
const DATE_TOLERANCE_DAYS = 3;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ReconciliationCandidate {
  expenseId: string;
  score: number;
  confidence: 'high' | 'plausible' | 'weak';
}

export interface ReconciliationResult {
  autoReconciled: string[]; // importedTransactionId[]
  awaitingReview: string[]; // importedTransactionId[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysDiff(a: Date, b: Date): number {
  return Math.abs(a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24);
}

function getAmount(tx: {
  debit: Prisma.Decimal | null;
  credit: Prisma.Decimal | null;
}): number | null {
  if (tx.debit !== null) return Number(tx.debit);
  if (tx.credit !== null) return Number(tx.credit);
  return null;
}

// ─── Core matching function (exported for unit testing) ───────────────────────

interface TxInput {
  label: string;
  debit: unknown;
  credit: unknown;
  accountingDate: Date;
}

interface ExpenseInput {
  id: string;
  label: string;
  amount: unknown;
  date: Date;
}

function scoreExpenseMatch(
  tx: TxInput,
  expense: ExpenseInput,
  txAmount: number,
): ReconciliationCandidate | null {
  if (Math.abs(txAmount - Number(expense.amount)) > 0.001) return null;
  if (daysDiff(tx.accountingDate, expense.date) > DATE_TOLERANCE_DAYS) return null;
  const match = matchBankLabel(tx.label, expense.label);
  if (match.confidence === 'none') return null;
  return {
    expenseId: expense.id,
    score: match.score,
    confidence: match.confidence as 'high' | 'plausible' | 'weak',
  };
}

export function computeReconciliationCandidates(
  tx: TxInput,
  expenses: ExpenseInput[],
): ReconciliationCandidate[] {
  const txAmount =
    tx.debit !== null ? Number(tx.debit) : tx.credit !== null ? Number(tx.credit) : null;
  if (txAmount === null) return [];
  const candidates: ReconciliationCandidate[] = [];
  for (const expense of expenses) {
    const candidate = scoreExpenseMatch(tx, expense, txAmount);
    if (candidate) candidates.push(candidate);
  }
  return candidates.sort((a, b) => b.score - a.score);
}

// ─── Main reconciliation engine ───────────────────────────────────────────────

export async function runReconciliation(userId: string): Promise<ReconciliationResult> {
  // Fetch all unreconciled transactions and unreconciled expenses for this user
  const [transactions, expenses] = await Promise.all([
    prisma.importedTransaction.findMany({
      where: { userId, status: 'UNRECONCILED' },
    }),
    prisma.manualExpense.findMany({
      where: {
        userId,
        reconciliation: null,
      },
    }),
  ]);

  const autoReconciled: string[] = [];
  const awaitingReview: string[] = [];

  for (const tx of transactions) {
    const candidates = computeReconciliationCandidates(tx, expenses);

    const highConfidence = candidates.filter((c) => c.score >= HIGH_CONFIDENCE_THRESHOLD);

    if (highConfidence.length === 1 && highConfidence[0]) {
      // Unique high-confidence match → auto-reconcile
      const { expenseId } = highConfidence[0];
      const { score } = highConfidence[0];

      await prisma.$transaction([
        prisma.reconciliation.create({
          data: {
            importedTransactionId: tx.id,
            manualExpenseId: expenseId,
            confidenceScore: score,
            isAutoMatched: true,
          },
        }),
        prisma.importedTransaction.update({
          where: { id: tx.id },
          data: { status: 'RECONCILED' },
        }),
      ]);

      autoReconciled.push(tx.id);
    } else if (candidates.filter((c) => c.score >= PLAUSIBLE_THRESHOLD).length > 1) {
      // Multiple plausible matches → needs user review
      awaitingReview.push(tx.id);
    }
  }

  return { autoReconciled, awaitingReview };
}

// ─── Confirm reconciliation (user picks a match) ──────────────────────────────

export async function confirmReconciliation(
  userId: string,
  importedTransactionId: string,
  manualExpenseId: string,
): Promise<{
  id: string;
  importedTransactionId: string;
  manualExpenseId: string;
  confidenceScore: number;
  isAutoMatched: boolean;
  reconciledAt: Date;
} | null> {
  // Verify ownership
  const [tx, expense] = await Promise.all([
    prisma.importedTransaction.findFirst({
      where: { id: importedTransactionId, userId, status: 'UNRECONCILED' },
    }),
    prisma.manualExpense.findFirst({
      where: { id: manualExpenseId, userId, reconciliation: null },
    }),
  ]);

  if (!tx || !expense) return null;

  const match = matchBankLabel(tx.label, expense.label);

  const result = await prisma.$transaction(async (trx: Prisma.TransactionClient) => {
    const reconciliation = await trx.reconciliation.create({
      data: {
        importedTransactionId,
        manualExpenseId,
        confidenceScore: match.score,
        isAutoMatched: false,
      },
    });
    await trx.importedTransaction.update({
      where: { id: importedTransactionId },
      data: { status: 'RECONCILED' },
    });
    return reconciliation;
  });

  return result;
}

// ─── Undo reconciliation ──────────────────────────────────────────────────────

export async function undoReconciliation(
  userId: string,
  reconciliationId: string,
): Promise<boolean> {
  const reconciliation = await prisma.reconciliation.findFirst({
    where: { id: reconciliationId },
    include: { importedTransaction: true },
  });

  if (!reconciliation || reconciliation.importedTransaction.userId !== userId) return false;

  await prisma.$transaction([
    prisma.importedTransaction.update({
      where: { id: reconciliation.importedTransactionId },
      data: { status: 'UNRECONCILED' },
    }),
    prisma.reconciliation.delete({ where: { id: reconciliationId } }),
  ]);

  return true;
}

// ─── getAmount helper exposed (for import.service.ts) ────────────────────────
export { getAmount };
