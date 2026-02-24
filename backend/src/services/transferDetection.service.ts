import { type Prisma, prisma } from '@kasa/db';

// ─── Types ────────────────────────────────────────────────────────────────────

type VirTx = {
  id: string;
  accountId: string;
  accountingDate: Date;
  debit: Prisma.Decimal | null;
  credit: Prisma.Decimal | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysBetween(a: Date, b: Date): number {
  return Math.abs(a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24);
}

function isAmountMatch(debit: VirTx, credit: VirTx): boolean {
  if (!debit.debit || !credit.credit) return false;
  return debit.debit.equals(credit.credit);
}

function findMatchingCredit(debit: VirTx, credits: VirTx[], usedIds: Set<string>): string | null {
  for (const credit of credits) {
    if (usedIds.has(credit.id)) continue;
    if (debit.accountId === credit.accountId) continue;
    if (!isAmountMatch(debit, credit)) continue;
    if (daysBetween(debit.accountingDate, credit.accountingDate) > 3) continue;
    return credit.id;
  }
  return null;
}

async function linkPair(debitId: string, creditId: string): Promise<void> {
  await prisma.$transaction([
    prisma.importedTransaction.update({
      where: { id: debitId },
      data: { transferPeerId: creditId },
    }),
    prisma.importedTransaction.update({
      where: { id: creditId },
      data: { transferPeerId: debitId },
    }),
  ]);
}

// ─── detectTransferPairs ──────────────────────────────────────────────────────

/**
 * Matches VIR debit transactions with VIR credit transactions of the same amount
 * on different accounts within a 3-day window, then links them bidirectionally
 * via transferPeerId.
 */
export async function detectTransferPairs(userId: string): Promise<void> {
  const virTxs = await prisma.importedTransaction.findMany({
    where: {
      userId,
      transferPeerId: null,
      label: { contains: 'VIR', mode: 'insensitive' },
    },
    select: { id: true, accountId: true, accountingDate: true, debit: true, credit: true },
    orderBy: { accountingDate: 'asc' },
  });

  const debits = virTxs.filter((t) => t.debit !== null);
  const credits = virTxs.filter((t) => t.credit !== null);
  const usedCreditIds = new Set<string>();

  for (const debit of debits) {
    const creditId = findMatchingCredit(debit, credits, usedCreditIds);
    if (!creditId) continue;
    usedCreditIds.add(creditId);
    await linkPair(debit.id, creditId);
  }
}
