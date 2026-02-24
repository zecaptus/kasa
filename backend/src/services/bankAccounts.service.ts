import { Prisma, prisma } from '@kasa/db';

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface BankAccountDto {
  id: string;
  accountNumber: string;
  label: string;
  isHidden: boolean;
  currentBalance: number | null;
  currency: string | null;
  createdAt: string;
}

// ─── Raw row types ─────────────────────────────────────────────────────────────

interface BalanceDeltaRow {
  delta: Prisma.Decimal | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toNum(d: Prisma.Decimal | null | undefined): number {
  return d == null ? 0 : Number(d);
}

async function computeCurrentBalance(
  accountId: string,
  snapshotBalance: Prisma.Decimal,
  balanceDate: Date,
): Promise<number> {
  const rows = await prisma.$queryRaw<BalanceDeltaRow[]>(Prisma.sql`
    SELECT COALESCE(SUM(COALESCE("credit", 0) - COALESCE("debit", 0)), 0) AS delta
    FROM "ImportedTransaction"
    WHERE "accountId" = ${accountId}
      AND "accountingDate" > ${balanceDate}
  `);
  return toNum(snapshotBalance) + toNum(rows[0]?.delta);
}

// ─── setAccountBalance ────────────────────────────────────────────────────────

export async function setAccountBalance(
  userId: string,
  accountId: string,
  balance: number,
  date: Date,
): Promise<BankAccountDto | null> {
  const existing = await prisma.account.findFirst({
    where: { id: accountId, ownerId: userId },
  });
  if (!existing) return null;

  await prisma.account.update({
    where: { id: accountId },
    data: {
      lastKnownBalance: new Prisma.Decimal(balance),
      lastKnownBalanceDate: date,
    },
  });

  return getBankAccount(userId, accountId);
}

// ─── listBankAccounts ──────────────────────────────────────────────────────────

export async function listBankAccounts(userId: string): Promise<BankAccountDto[]> {
  const accounts = await prisma.account.findMany({
    where: {
      OR: [{ ownerId: userId }, { viewers: { some: { userId } } }],
    },
    orderBy: { label: 'asc' },
  });

  return Promise.all(
    accounts.map(async (acc) => {
      let currentBalance: number | null = null;
      if (acc.lastKnownBalance != null && acc.lastKnownBalanceDate != null) {
        currentBalance = await computeCurrentBalance(
          acc.id,
          acc.lastKnownBalance,
          acc.lastKnownBalanceDate,
        );
      }
      return {
        id: acc.id,
        accountNumber: acc.accountNumber,
        label: acc.label,
        isHidden: acc.isHidden,
        currentBalance,
        currency: null,
        createdAt: acc.createdAt.toISOString(),
      };
    }),
  );
}

// ─── getBankAccount ────────────────────────────────────────────────────────────

export async function getBankAccount(
  userId: string,
  accountId: string,
): Promise<BankAccountDto | null> {
  const acc = await prisma.account.findFirst({
    where: {
      id: accountId,
      OR: [{ ownerId: userId }, { viewers: { some: { userId } } }],
    },
  });

  if (!acc) return null;

  let currentBalance: number | null = null;
  if (acc.lastKnownBalance != null && acc.lastKnownBalanceDate != null) {
    currentBalance = await computeCurrentBalance(
      acc.id,
      acc.lastKnownBalance,
      acc.lastKnownBalanceDate,
    );
  }

  return {
    id: acc.id,
    accountNumber: acc.accountNumber,
    label: acc.label,
    isHidden: acc.isHidden,
    currentBalance,
    currency: null,
    createdAt: acc.createdAt.toISOString(),
  };
}

// ─── renameBankAccount ────────────────────────────────────────────────────────

export async function renameBankAccount(
  userId: string,
  accountId: string,
  label: string,
): Promise<BankAccountDto | null> {
  const existing = await prisma.account.findFirst({
    where: { id: accountId, ownerId: userId },
  });
  if (!existing) return null;

  await prisma.account.update({
    where: { id: accountId },
    data: { label: label.trim() },
  });

  return getBankAccount(userId, accountId);
}

// ─── setAccountHidden ─────────────────────────────────────────────────────────

export async function setAccountHidden(
  userId: string,
  accountId: string,
  isHidden: boolean,
): Promise<BankAccountDto | null> {
  const existing = await prisma.account.findFirst({
    where: { id: accountId, ownerId: userId },
  });
  if (!existing) return null;

  await prisma.account.update({
    where: { id: accountId },
    data: { isHidden },
  });

  return getBankAccount(userId, accountId);
}
