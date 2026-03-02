import { Prisma, prisma } from '@kasa/db';

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface AccountSummaryDto {
  accountId: string;
  label: string;
  accountNumber: string;
  isHidden: boolean;
  balance: number;
  rangeVariation: number;
  balanceAtRangeStart: number;
  currentBalance: number | null;
  balanceDate: string | null;
  endOfMonthPrediction: number | null;
}

export interface DashboardSummaryDto {
  totalBalance: number;
  monthlySpending: number;
  monthlyIncome: number;
  netCashFlow: number;
}

export interface CategorySpendingDto {
  categoryId: string | null;
  name: string;
  slug: string;
  color: string;
  amount: number;
}

export interface CategoryComparisonDto {
  currentMonth: CategorySpendingDto[];
  previousMonth: CategorySpendingDto[];
}

export interface DashboardResponseDto {
  summary: DashboardSummaryDto;
  accounts: AccountSummaryDto[];
  categoryComparison: CategoryComparisonDto;
}

// ─── Date range types ─────────────────────────────────────────────────────────

export interface DateRangeParams {
  from?: string;
  to?: string;
}

interface ResolvedRange {
  start: Date;
  end: Date;
  prevStart: Date;
  prevEnd: Date;
}

// ─── Raw row types ─────────────────────────────────────────────────────────────

interface GlobalSummaryRow {
  total_balance: Prisma.Decimal | null;
  monthly_spending_imported: Prisma.Decimal | null;
  monthly_income: Prisma.Decimal | null;
}

interface MonthlyExpenseRow {
  monthly_spending_manual: Prisma.Decimal | null;
}

interface AccountBalanceRow {
  account_id: string;
  account_label: string;
  account_number: string;
  is_hidden: boolean;
  balance: Prisma.Decimal | null;
  range_variation: Prisma.Decimal | null;
  net_since_range_start: Prisma.Decimal | null;
  last_known_balance: Prisma.Decimal | null;
  last_known_balance_date: Date | null;
  balance_delta: Prisma.Decimal | null;
}

interface CategorySpendingRow {
  category_id: string | null;
  cat_name: string | null;
  cat_slug: string | null;
  cat_color: string | null;
  amount: Prisma.Decimal | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toNum(d: Prisma.Decimal | null | undefined): number {
  if (d == null) return 0;
  return Number(d);
}

function resolveRange(params: DateRangeParams): ResolvedRange {
  const now = new Date();

  const fromDate = params.from
    ? new Date(`${params.from}T00:00:00Z`)
    : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const toDate = params.to
    ? new Date(`${params.to}T00:00:00Z`)
    : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const start = fromDate;
  // end is exclusive (to + 1 day)
  const end = new Date(toDate.getTime() + 24 * 60 * 60 * 1000);

  // Previous period = same duration shifted backwards (prevEnd = start)
  const durationMs = end.getTime() - start.getTime();
  const prevEnd = new Date(start.getTime());
  const prevStart = new Date(start.getTime() - durationMs);

  return { start, end, prevStart, prevEnd };
}

const OTHER_ENTRY: Omit<CategorySpendingDto, 'amount'> = {
  categoryId: null,
  name: '__aggregate_other__',
  slug: '__aggregate_other__',
  color: '#94a3b8',
};

const MAX_CHART_CATEGORIES = 9;

function buildCategoryComparison(
  current: CategorySpendingRow[],
  previous: CategorySpendingRow[],
): CategoryComparisonDto {
  // Sort current by amount desc; take top MAX_CHART_CATEGORIES
  const sortedCurrent = [...current].sort((a, b) => toNum(b.amount) - toNum(a.amount));
  const top = sortedCurrent.slice(0, MAX_CHART_CATEGORIES);
  const rest = sortedCurrent.slice(MAX_CHART_CATEGORIES);

  const topIds = new Set(top.map((r) => r.category_id));

  const toDto = (r: CategorySpendingRow): CategorySpendingDto => ({
    categoryId: r.category_id,
    name: r.cat_name ?? 'uncategorized',
    slug: r.cat_slug ?? 'uncategorized',
    color: r.cat_color ?? '#64748b',
    amount: toNum(r.amount),
  });

  const currentMonth = top.map(toDto);
  const otherCurrentAmount = rest.reduce((s, r) => s + toNum(r.amount), 0);

  // Map previous month onto the same top slots
  const prevMap = new Map<string | null, CategorySpendingRow>();
  for (const r of previous) {
    prevMap.set(r.category_id, r);
  }

  const previousMonth: CategorySpendingDto[] = top.map((topRow) => {
    const prev = prevMap.get(topRow.category_id);
    return {
      categoryId: topRow.category_id,
      name: topRow.cat_name ?? 'uncategorized',
      slug: topRow.cat_slug ?? 'uncategorized',
      color: topRow.cat_color ?? '#64748b',
      amount: prev ? toNum(prev.amount) : 0,
    };
  });

  // "Other" bucket aggregates everything outside top-9 from both months
  const otherPreviousAmount = previous
    .filter((r) => !topIds.has(r.category_id))
    .reduce((s, r) => s + toNum(r.amount), 0);

  if (rest.length > 0 || otherPreviousAmount > 0) {
    currentMonth.push({ ...OTHER_ENTRY, amount: otherCurrentAmount });
    previousMonth.push({ ...OTHER_ENTRY, amount: otherPreviousAmount });
  }
  return { currentMonth, previousMonth };
}

// ─── getGlobalSummary ─────────────────────────────────────────────────────────

export async function getGlobalSummary(
  userId: string,
  range: ResolvedRange,
): Promise<DashboardSummaryDto> {
  const [summaryRows, manualRows] = await Promise.all([
    prisma.$queryRaw<GlobalSummaryRow[]>(Prisma.sql`
      SELECT
        COALESCE(SUM(COALESCE(it."credit", 0) - COALESCE(it."debit", 0)), 0) AS total_balance,
        COALESCE(SUM(CASE WHEN it."accountingDate" >= ${range.start} AND it."accountingDate" < ${range.end}
                         THEN COALESCE(it."debit", 0) ELSE 0 END), 0)        AS monthly_spending_imported,
        COALESCE(SUM(CASE WHEN it."accountingDate" >= ${range.start} AND it."accountingDate" < ${range.end}
                         THEN COALESCE(it."credit", 0) ELSE 0 END), 0)       AS monthly_income
      FROM "ImportedTransaction" it
      JOIN "Account" a ON a.id = it."accountId" AND a."isHidden" = false
      WHERE it."userId" = ${userId}
        AND it."transferPeerId" IS NULL
    `),
    prisma.$queryRaw<MonthlyExpenseRow[]>(Prisma.sql`
      SELECT COALESCE(SUM("amount"), 0) AS monthly_spending_manual
      FROM "ManualExpense"
      WHERE "userId" = ${userId}
        AND "date" >= ${range.start}
        AND "date" < ${range.end}
    `),
  ]);

  const row = summaryRows[0];
  const manualRow = manualRows[0];

  const totalBalance = toNum(row?.total_balance);
  const monthlyIncome = toNum(row?.monthly_income);
  const monthlySpending =
    toNum(row?.monthly_spending_imported) + toNum(manualRow?.monthly_spending_manual);
  const netCashFlow = monthlyIncome - monthlySpending;

  return { totalBalance, monthlySpending, monthlyIncome, netCashFlow };
}

// ─── getAccountPredictions ────────────────────────────────────────────────────

type RuleRow = {
  amount: Prisma.Decimal | null;
  periodMonths: number;
  transactions: { accountingDate: Date; debit: Prisma.Decimal | null; accountId: string }[];
};

function ruleContribution(
  rule: RuleRow,
  today: Date,
  endOfMonth: Date,
): { accountId: string; amount: number } | null {
  const lastTx = rule.transactions[0];
  if (!lastTx) return null;

  const d = new Date(lastTx.accountingDate);
  while (d <= today) d.setMonth(d.getMonth() + rule.periodMonths);
  if (d > endOfMonth) return null;

  const amount = rule.amount !== null ? Number(rule.amount) : Number(lastTx.debit ?? 0);
  if (amount <= 0) return null;

  return { accountId: lastTx.accountId, amount };
}

async function getAccountPredictions(userId: string): Promise<Map<string, number>> {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const endOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));

  const rules = await prisma.recurringRule.findMany({
    where: { userId, isActive: true },
    select: {
      amount: true,
      periodMonths: true,
      transactions: {
        orderBy: { accountingDate: 'desc' },
        take: 1,
        select: { accountingDate: true, debit: true, accountId: true },
      },
    },
  });

  const map = new Map<string, number>();
  for (const rule of rules) {
    const contrib = ruleContribution(rule, today, endOfMonth);
    if (contrib) {
      map.set(contrib.accountId, (map.get(contrib.accountId) ?? 0) + contrib.amount);
    }
  }
  return map;
}

// ─── getAccountSummaries ──────────────────────────────────────────────────────

export async function getAccountSummaries(
  userId: string,
  range: ResolvedRange,
): Promise<AccountSummaryDto[]> {
  const [balanceRows, predictionMap] = await Promise.all([
    prisma.$queryRaw<AccountBalanceRow[]>(Prisma.sql`
      SELECT
        a.id                                                             AS account_id,
        a."label"                                                        AS account_label,
        a."accountNumber"                                                AS account_number,
        a."isHidden"                                                     AS is_hidden,
        COALESCE(SUM(COALESCE(t."credit", 0) - COALESCE(t."debit", 0)), 0) AS balance,
        COALESCE(SUM(
          CASE WHEN t."accountingDate" >= ${range.start} AND t."accountingDate" < ${range.end}
               THEN COALESCE(t."credit", 0) - COALESCE(t."debit", 0) ELSE 0 END
        ), 0)                                                            AS range_variation,
        COALESCE(SUM(
          CASE WHEN t."accountingDate" >= ${range.start}
               THEN COALESCE(t."credit", 0) - COALESCE(t."debit", 0) ELSE 0 END
        ), 0)                                                            AS net_since_range_start,
        a."lastKnownBalance"                                             AS last_known_balance,
        a."lastKnownBalanceDate"                                         AS last_known_balance_date,
        COALESCE(SUM(
          CASE WHEN a."lastKnownBalanceDate" IS NOT NULL
                AND t."accountingDate" > a."lastKnownBalanceDate"
               THEN COALESCE(t."credit", 0) - COALESCE(t."debit", 0) ELSE 0 END
        ), 0)                                                            AS balance_delta
      FROM "Account" a
      LEFT JOIN "ImportedTransaction" t ON t."accountId" = a.id
      WHERE a."ownerId" = ${userId}
         OR EXISTS (SELECT 1 FROM "AccountViewer" av WHERE av."accountId" = a.id AND av."userId" = ${userId})
      GROUP BY a.id, a."label", a."accountNumber", a."isHidden", a."lastKnownBalance", a."lastKnownBalanceDate"
      ORDER BY a."label"
    `),
    getAccountPredictions(userId),
  ]);

  return balanceRows.map((row) => {
    const currentBalance =
      row.last_known_balance != null
        ? toNum(row.last_known_balance) + toNum(row.balance_delta)
        : null;
    const balanceDate = row.last_known_balance_date
      ? row.last_known_balance_date.toISOString().split('T')[0]
      : null;
    const upcomingDebit = predictionMap.get(row.account_id) ?? 0;
    const endOfMonthPrediction = currentBalance !== null ? currentBalance - upcomingDebit : null;
    const netSinceRangeStart = toNum(row.net_since_range_start);
    const balanceAtRangeStart =
      currentBalance !== null
        ? currentBalance - netSinceRangeStart
        : toNum(row.balance) - netSinceRangeStart;
    return {
      accountId: row.account_id,
      label: row.account_label,
      accountNumber: row.account_number,
      isHidden: row.is_hidden,
      balance: toNum(row.balance),
      rangeVariation: toNum(row.range_variation),
      balanceAtRangeStart,
      currentBalance,
      balanceDate: balanceDate as string | null,
      endOfMonthPrediction,
    };
  });
}

// ─── getCategoryComparison ────────────────────────────────────────────────────

export async function getCategoryComparison(
  userId: string,
  range: ResolvedRange,
): Promise<CategoryComparisonDto> {
  const queryCategorySpending = (start: Date, end: Date) =>
    prisma.$queryRaw<CategorySpendingRow[]>(Prisma.sql`
      SELECT
        t.category_id,
        c."name"   AS cat_name,
        c."slug"   AS cat_slug,
        c."color"  AS cat_color,
        COALESCE(SUM(t.amount), 0) AS amount
      FROM (
        SELECT it."categoryId" AS category_id, COALESCE(it."debit", 0) AS amount
        FROM "ImportedTransaction" it
        JOIN "Account" a ON a.id = it."accountId" AND a."isHidden" = false
        WHERE it."userId" = ${userId}
          AND it."accountingDate" >= ${start}
          AND it."accountingDate" < ${end}
          AND it."debit" IS NOT NULL
          AND it."transferPeerId" IS NULL

        UNION ALL

        SELECT "categoryId" AS category_id, "amount"
        FROM "ManualExpense"
        WHERE "userId" = ${userId}
          AND "date" >= ${start}
          AND "date" < ${end}
      ) t
      LEFT JOIN "Category" c ON c.id = t.category_id
      GROUP BY t.category_id, c."name", c."slug", c."color"
      ORDER BY amount DESC
    `);

  const [currentRows, previousRows] = await Promise.all([
    queryCategorySpending(range.start, range.end),
    queryCategorySpending(range.prevStart, range.prevEnd),
  ]);

  return buildCategoryComparison(currentRows, previousRows);
}

// ─── getDashboard ─────────────────────────────────────────────────────────────

export async function getDashboard(
  userId: string,
  params: DateRangeParams = {},
): Promise<DashboardResponseDto> {
  const range = resolveRange(params);

  const [summary, accounts, categoryComparison] = await Promise.all([
    getGlobalSummary(userId, range),
    getAccountSummaries(userId, range),
    getCategoryComparison(userId, range),
  ]);

  // totalBalance = sum of currentBalance for visible accounts (real balances override the tx sum)
  const visibleWithBalance = accounts.filter((a) => !a.isHidden && a.currentBalance !== null);
  const totalBalance =
    visibleWithBalance.length > 0
      ? visibleWithBalance.reduce((s, a) => s + (a.currentBalance ?? 0), 0)
      : summary.totalBalance;

  return { summary: { ...summary, totalBalance }, accounts, categoryComparison };
}
