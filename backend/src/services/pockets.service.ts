import { Prisma, prisma } from '@kasa/db';

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface PocketSummaryDto {
  id: string;
  accountLabel: string;
  name: string;
  goalAmount: number;
  allocatedAmount: number;
  progressPct: number;
  color: string;
  createdAt: string;
}

export interface PocketMovementDto {
  id: string;
  direction: 'ALLOCATION' | 'WITHDRAWAL';
  amount: number;
  note: string | null;
  date: string;
  createdAt: string;
}

export interface PocketDetailDto extends PocketSummaryDto {
  movements: PocketMovementDto[];
  nextCursor: string | null;
}

// ─── Input types ──────────────────────────────────────────────────────────────

export interface CreatePocketInput {
  accountLabel: string;
  name: string;
  goalAmount: number;
  color: string;
}

export interface UpdatePocketInput {
  name?: string;
  goalAmount?: number;
  color?: string;
}

export interface CreateMovementInput {
  direction: 'ALLOCATION' | 'WITHDRAWAL';
  amount: number;
  note?: string | undefined;
  date: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toNum(d: Prisma.Decimal | null | undefined): number {
  return d == null ? 0 : Number(d);
}

function toPocketSummary(
  pocket: {
    id: string;
    accountLabel: string;
    name: string;
    goalAmount: Prisma.Decimal;
    color: string;
    createdAt: Date;
  },
  allocatedAmount: number,
): PocketSummaryDto {
  const goal = toNum(pocket.goalAmount);
  return {
    id: pocket.id,
    accountLabel: pocket.accountLabel,
    name: pocket.name,
    goalAmount: goal,
    allocatedAmount,
    progressPct: goal > 0 ? Math.min((allocatedAmount / goal) * 100, 100) : 0,
    color: pocket.color,
    createdAt: pocket.createdAt.toISOString(),
  };
}

function computeAllocated(movements: { direction: string; amount: Prisma.Decimal }[]): number {
  return movements.reduce((sum, m) => {
    const amt = toNum(m.amount);
    return m.direction === 'ALLOCATION' ? sum + amt : sum - amt;
  }, 0);
}

// ─── computeHeadroom ──────────────────────────────────────────────────────────

interface HeadroomRow {
  account_balance: Prisma.Decimal | null;
}

interface AllocatedRow {
  total_allocated: Prisma.Decimal | null;
}

export async function computeHeadroom(
  userId: string,
  accountLabel: string,
  excludePocketId?: string,
): Promise<number> {
  const [balanceRows, allocRows] = await Promise.all([
    prisma.$queryRaw<HeadroomRow[]>(Prisma.sql`
      SELECT COALESCE(SUM(COALESCE("credit", 0) - COALESCE("debit", 0)), 0) AS account_balance
      FROM "ImportedTransaction"
      WHERE "userId" = ${userId} AND "accountLabel" = ${accountLabel}
    `),
    prisma.$queryRaw<AllocatedRow[]>(Prisma.sql`
      SELECT COALESCE(SUM(
        CASE WHEN m."direction" = 'ALLOCATION' THEN m."amount" ELSE -m."amount" END
      ), 0) AS total_allocated
      FROM "PocketMovement" m
      JOIN "Pocket" p ON p.id = m."pocketId"
      WHERE p."userId" = ${userId}
        AND p."accountLabel" = ${accountLabel}
        ${excludePocketId ? Prisma.sql`AND p.id != ${excludePocketId}` : Prisma.sql``}
    `),
  ]);

  const accountBalance = toNum(balanceRows[0]?.account_balance);
  const totalAllocated = toNum(allocRows[0]?.total_allocated);
  return accountBalance - totalAllocated;
}

// ─── listPockets ──────────────────────────────────────────────────────────────

export async function listPockets(userId: string): Promise<PocketSummaryDto[]> {
  const pockets = await prisma.pocket.findMany({
    where: { userId },
    include: { movements: true },
    orderBy: [{ accountLabel: 'asc' }, { createdAt: 'asc' }],
  });

  return pockets.map((p) => toPocketSummary(p, computeAllocated(p.movements)));
}

// ─── createPocket ─────────────────────────────────────────────────────────────

export async function createPocket(
  userId: string,
  input: CreatePocketInput,
): Promise<PocketSummaryDto> {
  const pocket = await prisma.pocket.create({
    data: {
      userId,
      accountLabel: input.accountLabel,
      name: input.name.trim(),
      goalAmount: new Prisma.Decimal(input.goalAmount),
      color: input.color,
    },
  });
  return toPocketSummary(pocket, 0);
}

// ─── getPocket ────────────────────────────────────────────────────────────────

export async function getPocket(
  userId: string,
  id: string,
  limit = 20,
  cursor?: string,
): Promise<PocketDetailDto | null> {
  const pocket = await prisma.pocket.findFirst({
    where: { id, userId },
    include: { movements: true },
  });
  if (!pocket) return null;

  const allocatedAmount = computeAllocated(pocket.movements);
  const take = limit + 1;

  const movementsPage = await prisma.pocketMovement.findMany({
    where: { pocketId: id },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    take,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = movementsPage.length > limit;
  const page = hasMore ? movementsPage.slice(0, limit) : movementsPage;
  const nextCursor = hasMore ? (page[page.length - 1]?.id ?? null) : null;

  const movements: PocketMovementDto[] = page.map((m) => ({
    id: m.id,
    direction: m.direction,
    amount: toNum(m.amount),
    note: m.note ?? null,
    date: m.date.toISOString().split('T')[0] as string,
    createdAt: m.createdAt.toISOString(),
  }));

  return { ...toPocketSummary(pocket, allocatedAmount), movements, nextCursor };
}

// ─── updatePocket ─────────────────────────────────────────────────────────────

export async function updatePocket(
  userId: string,
  id: string,
  input: UpdatePocketInput,
): Promise<PocketSummaryDto | null> {
  const existing = await prisma.pocket.findFirst({
    where: { id, userId },
    include: { movements: true },
  });
  if (!existing) return null;

  const data: Prisma.PocketUpdateInput = {};
  if (input.name !== undefined) data.name = input.name.trim();
  if (input.goalAmount !== undefined) data.goalAmount = new Prisma.Decimal(input.goalAmount);
  if (input.color !== undefined) data.color = input.color;

  const updated = await prisma.pocket.update({ where: { id }, data });
  return toPocketSummary(updated, computeAllocated(existing.movements));
}

// ─── deletePocket ─────────────────────────────────────────────────────────────

export async function deletePocket(userId: string, id: string): Promise<boolean> {
  const pocket = await prisma.pocket.findFirst({ where: { id, userId } });
  if (!pocket) return false;
  await prisma.pocket.delete({ where: { id } });
  return true;
}

// ─── createMovement ───────────────────────────────────────────────────────────

export async function createMovement(
  userId: string,
  pocketId: string,
  input: CreateMovementInput,
): Promise<PocketSummaryDto> {
  const pocket = await prisma.pocket.findFirst({
    where: { id: pocketId, userId },
    include: { movements: true },
  });
  if (!pocket) throw new Error('NOT_FOUND');

  const currentAllocated = computeAllocated(pocket.movements);

  if (input.direction === 'ALLOCATION') {
    const headroom = await computeHeadroom(userId, pocket.accountLabel);
    if (input.amount > headroom) {
      const err = new Error('INSUFFICIENT_HEADROOM');
      (err as Error & { headroom: number }).headroom = headroom;
      throw err;
    }
  } else {
    if (input.amount > currentAllocated) {
      const err = new Error('INSUFFICIENT_POCKET_FUNDS');
      (err as Error & { available: number }).available = currentAllocated;
      throw err;
    }
  }

  await prisma.pocketMovement.create({
    data: {
      pocketId,
      direction: input.direction,
      amount: new Prisma.Decimal(input.amount),
      note: input.note ?? null,
      date: new Date(input.date),
    },
  });

  // Re-fetch updated allocated amount
  const updatedMovements = await prisma.pocketMovement.findMany({ where: { pocketId } });
  const newAllocated = computeAllocated(updatedMovements);
  return toPocketSummary(pocket, newAllocated);
}

// ─── deleteMovement ───────────────────────────────────────────────────────────

export async function deleteMovement(
  userId: string,
  pocketId: string,
  movementId: string,
): Promise<PocketSummaryDto | null> {
  const pocket = await prisma.pocket.findFirst({
    where: { id: pocketId, userId },
  });
  if (!pocket) return null;

  const movement = await prisma.pocketMovement.findFirst({
    where: { id: movementId, pocketId },
  });
  if (!movement) return null;

  await prisma.pocketMovement.delete({ where: { id: movementId } });

  const updatedMovements = await prisma.pocketMovement.findMany({ where: { pocketId } });
  return toPocketSummary(pocket, computeAllocated(updatedMovements));
}
