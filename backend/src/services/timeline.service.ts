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
      c."isSystem"                                  AS "cat_is_system"
    FROM "ImportedTransaction" it
    LEFT JOIN "Category" c ON c."id" = it."categoryId"
    WHERE it."userId" = ${userId}
      ${itCursorClause}
      ${f.itFromClause}
      ${f.itToClause}
      ${f.itDirectionClause}
      ${f.itSearchClause}
      ${f.itCategoryClause}

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
      c."isSystem"                                  AS "cat_is_system"
    FROM "ManualExpense" me
    LEFT JOIN "Category" c ON c."id" = me."categoryId"
    WHERE me."userId" = ${userId}
      ${meCursorClause}
      ${f.meFromClause}
      ${f.meToClause}
      ${f.meDirectionGuard}
      ${f.meSearchClause}
      ${f.meCategoryClause}

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

      UNION ALL

      SELECT me."amount", NULL AS "direction"
      FROM "ManualExpense" me
      WHERE me."userId" = ${userId}
        ${f.meFromClause}
        ${f.meToClause}
        ${f.meDirectionGuard}
        ${f.meSearchClause}
        ${f.meCategoryClause}
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
    include: { category: true },
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
    };
  }

  return null;
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
