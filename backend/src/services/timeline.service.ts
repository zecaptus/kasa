import type { CategorySource } from '@kasa/db';
import { Prisma, prisma, type ReconciliationStatus } from '@kasa/db';

// ─── Types ────────────────────────────────────────────────────────────────────

export type UnifiedTransactionType = 'IMPORTED_TRANSACTION' | 'MANUAL_EXPENSE';

export interface CategoryInfo {
  id: string;
  name: string;
  slug: string;
  color: string;
  isSystem: boolean;
}

export interface UnifiedTransaction {
  id: string;
  type: UnifiedTransactionType;
  date: Date;
  label: string;
  detail: string | null;
  amount: Prisma.Decimal;
  direction: 'debit' | 'credit' | null;
  status: ReconciliationStatus | null;
  categoryId: string | null;
  categorySource: CategorySource;
  category: CategoryInfo | null;
  recurringPatternId: string | null;
  transferPeerId: string | null;
  transferPeerAccountLabel: string | null;
  transferLabel: string | null;
  accountId: string | null;
  accountLabel: string | null;
}

export interface TimelineCursor {
  date: string; // YYYY-MM-DD
  id: string;
}

export interface ListTimelineOptions {
  limit: number;
  cursor: TimelineCursor | undefined;
  from: string | undefined;
  to: string | undefined;
  categoryId: string | undefined;
  direction: 'debit' | 'credit' | undefined;
  search: string | undefined;
  accountId: string | undefined;
  transferLabel: string | undefined;
}

export interface TimelineTotals {
  debit: Prisma.Decimal;
  credit: Prisma.Decimal;
}

// ─── Raw row shape from $queryRaw ─────────────────────────────────────────────

interface UnifiedRow {
  id: string;
  type: string;
  date: Date;
  label: string;
  detail: string | null;
  amount: Prisma.Decimal;
  direction: string | null;
  status: string | null;
  category_id: string | null;
  category_source: string;
  cat_name: string | null;
  cat_slug: string | null;
  cat_color: string | null;
  cat_is_system: boolean | null;
  recurring_pattern_id: string | null;
  transfer_peer_id: string | null;
  transfer_peer_account_label: string | null;
  transfer_label: string | null;
  account_id: string | null;
  account_label: string | null;
}

interface TotalsRow {
  total_debit: Prisma.Decimal | null;
  total_credit: Prisma.Decimal | null;
}

// ─── Cursor helpers ───────────────────────────────────────────────────────────

export function encodeCursor(cursor: TimelineCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64url');
}

export function decodeCursor(raw: string): TimelineCursor {
  try {
    const parsed: unknown = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'date' in parsed &&
      'id' in parsed &&
      typeof (parsed as { date: unknown }).date === 'string' &&
      typeof (parsed as { id: unknown }).id === 'string'
    ) {
      return parsed as TimelineCursor;
    }
    throw new Error('invalid');
  } catch {
    const err = Object.assign(new Error('Invalid cursor'), { status: 400 });
    throw err;
  }
}

// ─── SQL clause helpers ───────────────────────────────────────────────────────

interface CursorClauses {
  itClause: Prisma.Sql;
  meClause: Prisma.Sql;
}

function buildCursorClauses(cursor: TimelineCursor | undefined): CursorClauses {
  if (!cursor) {
    return { itClause: Prisma.empty, meClause: Prisma.empty };
  }
  const cursorDate = new Date(cursor.date);
  const cursorId = cursor.id;
  return {
    itClause: Prisma.sql`AND (it."accountingDate" < ${cursorDate}::date OR (it."accountingDate" = ${cursorDate}::date AND it."id" > ${cursorId}))`,
    meClause: Prisma.sql`AND (me."date" < ${cursorDate}::date OR (me."date" = ${cursorDate}::date AND me."id" > ${cursorId}))`,
  };
}

function buildItDirectionClause(direction: 'debit' | 'credit' | undefined): Prisma.Sql {
  if (direction === 'debit') return Prisma.sql`AND it."debit" IS NOT NULL`;
  if (direction === 'credit') return Prisma.sql`AND it."credit" IS NOT NULL`;
  return Prisma.empty;
}

function buildItCategoryClause(categoryId: string | undefined): Prisma.Sql {
  if (categoryId === 'none') return Prisma.sql`AND it."categoryId" IS NULL`;
  if (categoryId) return Prisma.sql`AND it."categoryId" = ${categoryId}`;
  return Prisma.empty;
}

function buildMeCategoryClause(categoryId: string | undefined): Prisma.Sql {
  if (categoryId === 'none') return Prisma.sql`AND me."categoryId" IS NULL`;
  if (categoryId) return Prisma.sql`AND me."categoryId" = ${categoryId}`;
  return Prisma.empty;
}

function buildItTransferLabelClause(transferLabel: string | undefined): Prisma.Sql {
  if (transferLabel === 'none') return Prisma.sql`AND it."transferLabel" IS NULL`;
  if (transferLabel) return Prisma.sql`AND it."transferLabel" = ${transferLabel}`;
  return Prisma.empty;
}

interface FilterClauses {
  itFromClause: Prisma.Sql;
  itToClause: Prisma.Sql;
  meFromClause: Prisma.Sql;
  meToClause: Prisma.Sql;
  itDirectionClause: Prisma.Sql;
  meDirectionGuard: Prisma.Sql;
  itSearchClause: Prisma.Sql;
  meSearchClause: Prisma.Sql;
  itCategoryClause: Prisma.Sql;
  meCategoryClause: Prisma.Sql;
  itAccountClause: Prisma.Sql;
  meAccountGuard: Prisma.Sql;
  itTransferLabelClause: Prisma.Sql;
}

function buildFilterClauses(options: ListTimelineOptions): FilterClauses {
  const searchStr = options.search ? `%${options.search}%` : null;

  return {
    itFromClause: options.from
      ? Prisma.sql`AND it."accountingDate" >= ${new Date(options.from)}::date`
      : Prisma.empty,
    itToClause: options.to
      ? Prisma.sql`AND it."accountingDate" <= ${new Date(options.to)}::date`
      : Prisma.empty,
    meFromClause: options.from
      ? Prisma.sql`AND me."date" >= ${new Date(options.from)}::date`
      : Prisma.empty,
    meToClause: options.to
      ? Prisma.sql`AND me."date" <= ${new Date(options.to)}::date`
      : Prisma.empty,
    itDirectionClause: buildItDirectionClause(options.direction),
    meDirectionGuard: options.direction ? Prisma.sql`AND FALSE` : Prisma.empty,
    itSearchClause: searchStr
      ? Prisma.sql`AND (it."label" ILIKE ${searchStr} OR it."detail" ILIKE ${searchStr})`
      : Prisma.empty,
    meSearchClause: searchStr ? Prisma.sql`AND me."label" ILIKE ${searchStr}` : Prisma.empty,
    itCategoryClause: buildItCategoryClause(options.categoryId),
    meCategoryClause: buildMeCategoryClause(options.categoryId),
    itAccountClause: options.accountId
      ? Prisma.sql`AND it."accountId" = ${options.accountId}`
      : Prisma.empty,
    meAccountGuard: options.accountId ? Prisma.sql`AND FALSE` : Prisma.empty,
    itTransferLabelClause: buildItTransferLabelClause(options.transferLabel),
  };
}

// ─── listTimeline ─────────────────────────────────────────────────────────────

export async function listTimeline(
  userId: string,
  options: ListTimelineOptions,
): Promise<{ items: UnifiedTransaction[]; nextCursor: string | null; totals: TimelineTotals }> {
  const take = options.limit + 1;
  const { itClause: itCursorClause, meClause: meCursorClause } = buildCursorClauses(options.cursor);
  const f = buildFilterClauses(options);

  const rows = await prisma.$queryRaw<UnifiedRow[]>`
    SELECT
      it."id",
      'IMPORTED_TRANSACTION'                        AS "type",
      it."accountingDate"                           AS "date",
      it."label",
      it."detail",
      COALESCE(it."debit", it."credit", 0::decimal) AS "amount",
      CASE WHEN it."debit" IS NOT NULL THEN 'debit' ELSE 'credit' END AS "direction",
      it."status"::text                             AS "status",
      it."categoryId"                               AS "category_id",
      it."categorySource"::text                     AS "category_source",
      c."name"                                      AS "cat_name",
      c."slug"                                      AS "cat_slug",
      c."color"                                     AS "cat_color",
      c."isSystem"                                  AS "cat_is_system",
      it."recurringPatternId"                       AS "recurring_pattern_id",
      it."transferPeerId"                           AS "transfer_peer_id",
      peer_acc."label"                              AS "transfer_peer_account_label",
      it."transferLabel"                            AS "transfer_label",
      it."accountId"                                AS "account_id",
      acc."label"                                   AS "account_label"
    FROM "ImportedTransaction" it
    LEFT JOIN "Category" c ON c."id" = it."categoryId"
    LEFT JOIN "ImportedTransaction" peer_tx ON peer_tx."id" = it."transferPeerId"
    LEFT JOIN "Account" peer_acc ON peer_acc."id" = peer_tx."accountId"
    LEFT JOIN "Account" acc ON acc."id" = it."accountId"
    WHERE it."userId" = ${userId}
      ${itCursorClause}
      ${f.itFromClause}
      ${f.itToClause}
      ${f.itDirectionClause}
      ${f.itSearchClause}
      ${f.itCategoryClause}
      ${f.itAccountClause}
      ${f.itTransferLabelClause}

    UNION ALL

    SELECT
      me."id",
      'MANUAL_EXPENSE'                              AS "type",
      me."date",
      me."label",
      NULL::text                                    AS "detail",
      me."amount",
      NULL::text                                    AS "direction",
      NULL::text                                    AS "status",
      me."categoryId"                               AS "category_id",
      me."categorySource"::text                     AS "category_source",
      c."name"                                      AS "cat_name",
      c."slug"                                      AS "cat_slug",
      c."color"                                     AS "cat_color",
      c."isSystem"                                  AS "cat_is_system",
      NULL::text                                    AS "recurring_pattern_id",
      NULL::text                                    AS "transfer_peer_id",
      NULL::text                                    AS "transfer_peer_account_label",
      NULL::text                                    AS "transfer_label",
      NULL::text                                    AS "account_id",
      NULL::text                                    AS "account_label"
    FROM "ManualExpense" me
    LEFT JOIN "Category" c ON c."id" = me."categoryId"
    WHERE me."userId" = ${userId}
      ${meCursorClause}
      ${f.meFromClause}
      ${f.meToClause}
      ${f.meDirectionGuard}
      ${f.meSearchClause}
      ${f.meCategoryClause}
      ${f.meAccountGuard}

    ORDER BY "date" DESC, "id" ASC
    LIMIT ${take}
  `;

  const hasMore = rows.length > options.limit;
  const page = hasMore ? rows.slice(0, options.limit) : rows;
  const lastRow = page[page.length - 1];
  const nextCursor =
    hasMore && lastRow
      ? encodeCursor({
          date: lastRow.date.toISOString().split('T')[0] as string,
          id: lastRow.id,
        })
      : null;

  const items: UnifiedTransaction[] = page.map((row) => ({
    id: row.id,
    type: row.type as UnifiedTransactionType,
    date: row.date,
    label: row.label,
    detail: row.detail,
    amount: row.amount,
    direction: row.direction as 'debit' | 'credit' | null,
    status: row.status as ReconciliationStatus | null,
    categoryId: row.category_id,
    categorySource: row.category_source as CategorySource,
    category:
      row.category_id && row.cat_name
        ? {
            id: row.category_id,
            name: row.cat_name,
            slug: row.cat_slug ?? '',
            color: row.cat_color ?? '#94a3b8',
            isSystem: row.cat_is_system ?? false,
          }
        : null,
    recurringPatternId: row.recurring_pattern_id,
    transferPeerId: row.transfer_peer_id,
    transferPeerAccountLabel: row.transfer_peer_account_label,
    transferLabel: row.transfer_label ?? null,
    accountId: row.account_id,
    accountLabel: row.account_label,
  }));

  // Compute totals for the filtered set (all pages, not just current)
  const totals = await getTimelineTotals(userId, options);

  return { items, nextCursor, totals };
}

// ─── getTimelineTotals ────────────────────────────────────────────────────────

async function getTimelineTotals(
  userId: string,
  options: ListTimelineOptions,
): Promise<TimelineTotals> {
  const f = buildFilterClauses(options);

  const result = await prisma.$queryRaw<TotalsRow[]>`
    SELECT
      SUM(CASE WHEN src."direction" = 'debit' THEN src."amount" ELSE 0 END)  AS "total_debit",
      SUM(CASE WHEN src."direction" = 'credit' THEN src."amount" ELSE 0 END) AS "total_credit"
    FROM (
      SELECT
        COALESCE(it."debit", it."credit", 0::decimal) AS "amount",
        CASE WHEN it."debit" IS NOT NULL THEN 'debit' ELSE 'credit' END AS "direction"
      FROM "ImportedTransaction" it
      WHERE it."userId" = ${userId}
        ${f.itFromClause}
        ${f.itToClause}
        ${f.itDirectionClause}
        ${f.itSearchClause}
        ${f.itCategoryClause}
        ${f.itAccountClause}

      UNION ALL

      SELECT me."amount", NULL AS "direction"
      FROM "ManualExpense" me
      WHERE me."userId" = ${userId}
        ${f.meFromClause}
        ${f.meToClause}
        ${f.meDirectionGuard}
        ${f.meSearchClause}
        ${f.meCategoryClause}
        ${f.meAccountGuard}
    ) src
  `;

  const row = result[0];
  return {
    debit: row?.total_debit ?? new Prisma.Decimal(0),
    credit: row?.total_credit ?? new Prisma.Decimal(0),
  };
}

// ─── getTransactionById ───────────────────────────────────────────────────────

export async function getTransactionById(
  userId: string,
  id: string,
): Promise<UnifiedTransaction | null> {
  const it = await prisma.importedTransaction.findFirst({
    where: { id, userId },
    include: { category: true, account: true, transferPeer: { include: { account: true } } },
  });

  if (it) {
    return {
      id: it.id,
      type: 'IMPORTED_TRANSACTION',
      date: it.accountingDate,
      label: it.label,
      detail: it.detail,
      amount: (it.debit ?? it.credit) as Prisma.Decimal,
      direction: it.debit !== null ? 'debit' : 'credit',
      status: it.status,
      categoryId: it.categoryId,
      categorySource: it.categorySource,
      category: it.category
        ? {
            id: it.category.id,
            name: it.category.name,
            slug: it.category.slug,
            color: it.category.color,
            isSystem: it.category.isSystem,
          }
        : null,
      recurringPatternId: it.recurringPatternId,
      transferPeerId: it.transferPeerId,
      transferPeerAccountLabel: it.transferPeer?.account.label ?? null,
      transferLabel: it.transferLabel,
      accountId: it.accountId,
      accountLabel: it.account.label,
    };
  }

  const me = await prisma.manualExpense.findFirst({
    where: { id, userId },
    include: { category: true },
  });

  if (me) {
    return {
      id: me.id,
      type: 'MANUAL_EXPENSE',
      date: me.date,
      label: me.label,
      detail: null,
      amount: me.amount,
      direction: null,
      status: null,
      categoryId: me.categoryId,
      categorySource: me.categorySource,
      category: me.category
        ? {
            id: me.category.id,
            name: me.category.name,
            slug: me.category.slug,
            color: me.category.color,
            isSystem: me.category.isSystem,
          }
        : null,
      recurringPatternId: null,
      transferPeerId: null,
      transferPeerAccountLabel: null,
      transferLabel: null,
      accountId: null,
      accountLabel: null,
    };
  }

  return null;
}

// ─── updateTransactionRecurring ──────────────────────────────────────────────

export async function updateTransactionRecurring(
  userId: string,
  id: string,
  recurringPatternId: string | null,
): Promise<UnifiedTransaction | null> {
  // Only ImportedTransaction supports recurringPatternId
  const it = await prisma.importedTransaction.findFirst({ where: { id, userId } });
  if (!it) return null;

  // Verify the pattern belongs to the user (if not null)
  if (recurringPatternId !== null) {
    const pattern = await prisma.recurringPattern.findFirst({
      where: { id: recurringPatternId, userId },
    });
    if (!pattern) return null;
  }

  await prisma.importedTransaction.update({
    where: { id },
    data: { recurringPatternId },
  });
  return getTransactionById(userId, id);
}

// ─── TransferCandidateResult ──────────────────────────────────────────────────

export interface TransferCandidateResult {
  id: string;
  label: string;
  date: string;
  amount: number;
  direction: 'debit' | 'credit';
  accountLabel: string;
  linkedToAccountLabel: string | null;
}

// ─── listTransferCandidates ───────────────────────────────────────────────────

export async function listTransferCandidates(
  userId: string,
  txId: string,
  accountId: string,
): Promise<TransferCandidateResult[]> {
  const tx = await prisma.importedTransaction.findFirst({
    where: { id: txId, userId },
    select: { id: true, debit: true, credit: true },
  });
  if (!tx) return [];

  const amount = tx.debit ?? tx.credit;
  if (!amount) return [];

  const candidates = await prisma.importedTransaction.findMany({
    where: {
      userId,
      accountId,
      id: { not: txId },
      ...(tx.debit !== null ? { credit: amount } : { debit: amount }),
    },
    select: {
      id: true,
      label: true,
      accountingDate: true,
      debit: true,
      credit: true,
      transferPeerId: true,
      account: { select: { label: true } },
      transferPeer: { select: { account: { select: { label: true } } } },
    },
    orderBy: { accountingDate: 'desc' },
    take: 200,
  });

  return candidates.map((c) => ({
    id: c.id,
    label: c.label,
    date: c.accountingDate.toISOString().split('T')[0] as string,
    amount: Number(c.debit ?? c.credit),
    direction: (c.debit !== null ? 'debit' : 'credit') as 'debit' | 'credit',
    accountLabel: c.account.label,
    linkedToAccountLabel:
      c.transferPeerId !== null && c.transferPeerId !== txId
        ? (c.transferPeer?.account.label ?? null)
        : null,
  }));
}

// ─── updateTransferPeer ───────────────────────────────────────────────────────

type PrismaTransactionClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/**
 * Handles the old peer when reassigning a transfer:
 * - If the new peer also had an existing link, swap: link oldPeer ↔ newPeerOldPeer.
 * - Otherwise, simply unlink the old peer.
 */
async function relinkOrphans(
  db: PrismaTransactionClient,
  oldPeerId: string,
  newPeerOldPeerId: string | null,
  txId: string,
): Promise<void> {
  const sel = { select: { id: true } } as const;
  if (newPeerOldPeerId && newPeerOldPeerId !== txId) {
    await db.importedTransaction.update({
      where: { id: oldPeerId },
      data: { transferPeerId: newPeerOldPeerId },
      ...sel,
    });
    await db.importedTransaction.update({
      where: { id: newPeerOldPeerId },
      data: { transferPeerId: oldPeerId },
      ...sel,
    });
  } else {
    await db.importedTransaction.update({
      where: { id: oldPeerId },
      data: { transferPeerId: null },
      ...sel,
    });
  }
}

async function applyTransferPeerUpdate(
  db: PrismaTransactionClient,
  userId: string,
  txId: string,
  oldPeerId: string | null,
  newPeerId: string | null,
): Promise<void> {
  const sel = { select: { id: true } } as const;
  if (!newPeerId) {
    if (oldPeerId) {
      await db.importedTransaction.update({
        where: { id: oldPeerId },
        data: { transferPeerId: null },
        ...sel,
      });
    }
    await db.importedTransaction.update({
      where: { id: txId },
      data: { transferPeerId: null },
      ...sel,
    });
    return;
  }

  const newPeer = await db.importedTransaction.findFirst({
    where: { id: newPeerId, userId },
    select: { transferPeerId: true },
  });
  if (!newPeer) throw Object.assign(new Error('PEER_NOT_FOUND'), { status: 404 });

  const newPeerOldPeerId = newPeer.transferPeerId;

  if (oldPeerId && oldPeerId !== newPeerId) {
    await relinkOrphans(db, oldPeerId, newPeerOldPeerId, txId);
  } else if (newPeerOldPeerId && newPeerOldPeerId !== txId) {
    await db.importedTransaction.update({
      where: { id: newPeerOldPeerId },
      data: { transferPeerId: null },
      ...sel,
    });
  }

  await db.importedTransaction.update({
    where: { id: txId },
    data: { transferPeerId: newPeerId },
    ...sel,
  });
  await db.importedTransaction.update({
    where: { id: newPeerId },
    data: { transferPeerId: txId },
    ...sel,
  });
}

export async function updateTransferPeer(
  userId: string,
  txId: string,
  newPeerId: string | null,
): Promise<UnifiedTransaction | null> {
  const tx = await prisma.importedTransaction.findFirst({
    where: { id: txId, userId },
    select: { id: true, transferPeerId: true },
  });
  if (!tx) return null;

  await prisma.$transaction((db) =>
    applyTransferPeerUpdate(db, userId, txId, tx.transferPeerId, newPeerId),
  );

  return getTransactionById(userId, txId);
}

// ─── updateTransactionCategory ───────────────────────────────────────────────

export async function updateTransactionCategory(
  userId: string,
  id: string,
  categoryId: string | null,
): Promise<UnifiedTransaction | null> {
  const it = await prisma.importedTransaction.findFirst({ where: { id, userId } });
  if (it) {
    await prisma.importedTransaction.update({
      where: { id },
      data: {
        categoryId,
        categorySource: categoryId === null ? 'NONE' : 'MANUAL',
      },
    });
    return getTransactionById(userId, id);
  }

  const me = await prisma.manualExpense.findFirst({ where: { id, userId } });
  if (me) {
    await prisma.manualExpense.update({
      where: { id },
      data: {
        categoryId,
        categorySource: categoryId === null ? 'NONE' : 'MANUAL',
      },
    });
    return getTransactionById(userId, id);
  }

  return null;
}
