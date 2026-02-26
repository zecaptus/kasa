import { Prisma } from '@kasa/db';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  AccountSummaryDto,
  CategoryComparisonDto,
  DashboardSummaryDto,
} from '../../../src/services/dashboard.service.js';
import {
  getAccountSummaries,
  getCategoryComparison,
  getGlobalSummary,
} from '../../../src/services/dashboard.service.js';

// ── mock @kasa/db ─────────────────────────────────────────────────────────────

const mockQueryRaw = vi.fn();

vi.mock('@kasa/db', () => ({
  Prisma: {
    sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({ strings, values }),
    Decimal: class Decimal {
      private readonly val: number;
      constructor(v: number | string) {
        this.val = Number(v);
      }
      toNumber() {
        return this.val;
      }
      valueOf() {
        return this.val;
      }
    },
  },
  prisma: {
    $queryRaw: (...args: unknown[]) => mockQueryRaw(...args),
  },
}));

// ── helpers ───────────────────────────────────────────────────────────────────

function dec(v: number): Prisma.Decimal {
  return new Prisma.Decimal(v);
}

const USER_ID = 'user-abc-123';

const mockRange = {
  start: new Date('2025-01-01T00:00:00Z'),
  end: new Date('2025-02-01T00:00:00Z'),
  prevStart: new Date('2024-12-01T00:00:00Z'),
  prevEnd: new Date('2025-01-01T00:00:00Z'),
};

// ── getGlobalSummary ──────────────────────────────────────────────────────────

describe('getGlobalSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns correct totals when transactions and manual expenses exist', async () => {
    // First call: imported transactions summary
    // Second call: manual expenses
    mockQueryRaw
      .mockResolvedValueOnce([
        {
          total_balance: dec(4200),
          monthly_spending_imported: dec(350.5),
          monthly_income: dec(2500),
        },
      ])
      .mockResolvedValueOnce([
        {
          monthly_spending_manual: dec(149.5),
        },
      ]);

    const result: DashboardSummaryDto = await getGlobalSummary(USER_ID, mockRange);

    expect(result.totalBalance).toBe(4200);
    expect(result.monthlyIncome).toBe(2500);
    expect(result.monthlySpending).toBeCloseTo(500); // 350.5 + 149.5
    expect(result.netCashFlow).toBeCloseTo(2000); // 2500 - 500
  });

  it('returns all zeros when user has no data', async () => {
    mockQueryRaw
      .mockResolvedValueOnce([
        {
          total_balance: dec(0),
          monthly_spending_imported: dec(0),
          monthly_income: dec(0),
        },
      ])
      .mockResolvedValueOnce([
        {
          monthly_spending_manual: dec(0),
        },
      ]);

    const result: DashboardSummaryDto = await getGlobalSummary(USER_ID, mockRange);

    expect(result.totalBalance).toBe(0);
    expect(result.monthlySpending).toBe(0);
    expect(result.monthlyIncome).toBe(0);
    expect(result.netCashFlow).toBe(0);
  });

  it('handles null Decimal values gracefully (treats as zero)', async () => {
    mockQueryRaw
      .mockResolvedValueOnce([
        {
          total_balance: null,
          monthly_spending_imported: null,
          monthly_income: null,
        },
      ])
      .mockResolvedValueOnce([
        {
          monthly_spending_manual: null,
        },
      ]);

    const result: DashboardSummaryDto = await getGlobalSummary(USER_ID, mockRange);

    expect(result.totalBalance).toBe(0);
    expect(result.monthlySpending).toBe(0);
    expect(result.monthlyIncome).toBe(0);
    expect(result.netCashFlow).toBe(0);
  });

  it('computes negative netCashFlow when spending exceeds income', async () => {
    mockQueryRaw
      .mockResolvedValueOnce([
        {
          total_balance: dec(-200),
          monthly_spending_imported: dec(1800),
          monthly_income: dec(1500),
        },
      ])
      .mockResolvedValueOnce([{ monthly_spending_manual: dec(0) }]);

    const result: DashboardSummaryDto = await getGlobalSummary(USER_ID, mockRange);

    expect(result.netCashFlow).toBeCloseTo(-300);
  });
});

// ── getAccountSummaries ────────────────────────────────────────────────────────

describe('getAccountSummaries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns two accounts with their recent transactions', async () => {
    const balanceRows = [
      {
        account_id: 'acc-courant',
        account_label: 'Compte courant',
        account_number: null,
        is_hidden: false,
        balance: dec(1200),
        range_variation: dec(-300),
        net_since_range_start: dec(0),
        last_known_balance: null,
        last_known_balance_date: null,
        balance_delta: dec(0),
      },
      {
        account_id: 'acc-livret',
        account_label: 'Livret A',
        account_number: null,
        is_hidden: false,
        balance: dec(5000),
        range_variation: dec(50),
        net_since_range_start: dec(0),
        last_known_balance: null,
        last_known_balance_date: null,
        balance_delta: dec(0),
      },
    ];

    const recentRows = [
      {
        id: 'tx1',
        date: new Date('2025-01-15'),
        label: 'CARREFOUR',
        amount: dec(42.5),
        direction: 'debit',
        account_id: 'acc-courant',
        transfer_peer_account_label: null,
      },
      {
        id: 'tx2',
        date: new Date('2025-01-14'),
        label: 'SALAIRE',
        amount: dec(2500),
        direction: 'credit',
        account_id: 'acc-courant',
        transfer_peer_account_label: null,
      },
      {
        id: 'tx3',
        date: new Date('2025-01-10'),
        label: 'VIREMENT LIVRET',
        amount: dec(50),
        direction: 'credit',
        account_id: 'acc-livret',
        transfer_peer_account_label: null,
      },
    ];

    // First call: balance rows; second call: recent tx rows; third call: prediction rows
    mockQueryRaw
      .mockResolvedValueOnce(balanceRows)
      .mockResolvedValueOnce(recentRows)
      .mockResolvedValueOnce([]);

    const result: AccountSummaryDto[] = await getAccountSummaries(USER_ID, mockRange);

    expect(result).toHaveLength(2);

    const courant = result.find((a) => a.label === 'Compte courant');
    expect(courant).toBeDefined();
    expect(courant?.balance).toBe(1200);
    expect(courant?.rangeVariation).toBe(-300);
    expect(courant?.recentTransactions).toHaveLength(2);
    expect(courant?.recentTransactions[0]?.id).toBe('tx1');
    expect(courant?.recentTransactions[0]?.date).toBe('2025-01-15');
    expect(courant?.recentTransactions[0]?.amount).toBeCloseTo(42.5);
    expect(courant?.recentTransactions[0]?.direction).toBe('debit');

    const livret = result.find((a) => a.label === 'Livret A');
    expect(livret?.balance).toBe(5000);
    expect(livret?.recentTransactions).toHaveLength(1);
  });

  it('returns account with empty recentTransactions when no recent rows exist', async () => {
    mockQueryRaw
      .mockResolvedValueOnce([
        {
          account_label: 'Compte pro',
          balance: dec(8000),
          range_variation: dec(0),
          net_since_range_start: dec(0),
        },
      ])
      .mockResolvedValueOnce([]) // no recent transactions at all
      .mockResolvedValueOnce([]); // no predictions

    const result: AccountSummaryDto[] = await getAccountSummaries(USER_ID, mockRange);

    expect(result).toHaveLength(1);
    expect(result[0]?.label).toBe('Compte pro');
    expect(result[0]?.recentTransactions).toHaveLength(0);
  });

  it('returns empty array when user has no accounts', async () => {
    mockQueryRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    const result: AccountSummaryDto[] = await getAccountSummaries(USER_ID, mockRange);

    expect(result).toHaveLength(0);
  });
});

// ── getCategoryComparison ─────────────────────────────────────────────────────

describe('getCategoryComparison', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns up to 9 categories without an "other" bucket when count ≤ 9', async () => {
    const makeRow = (id: string, name: string, amount: number) => ({
      category_id: id,
      cat_name: name,
      cat_slug: name.toLowerCase(),
      cat_color: '#aabbcc',
      amount: dec(amount),
    });

    const currentRows = [
      makeRow('cat-1', 'Alimentation', 400),
      makeRow('cat-2', 'Loyer', 800),
      makeRow('cat-3', 'Transport', 120),
    ];
    const previousRows = [
      makeRow('cat-1', 'Alimentation', 380),
      makeRow('cat-2', 'Loyer', 800),
      makeRow('cat-3', 'Transport', 90),
    ];

    mockQueryRaw.mockResolvedValueOnce(currentRows).mockResolvedValueOnce(previousRows);

    const result: CategoryComparisonDto = await getCategoryComparison(USER_ID, mockRange);

    expect(result.currentMonth).toHaveLength(3);
    expect(result.previousMonth).toHaveLength(3);

    const otherCurrent = result.currentMonth.find((c) => c.slug === '__aggregate_other__');
    expect(otherCurrent).toBeUndefined();

    // Sorted by amount desc: Loyer first
    expect(result.currentMonth[0]?.slug).toBe('loyer');
    expect(result.currentMonth[0]?.amount).toBe(800);

    // Previous month aligns to same category slots
    expect(result.previousMonth[0]?.slug).toBe('loyer');
    expect(result.previousMonth[0]?.amount).toBe(800);
    expect(result.previousMonth[1]?.amount).toBe(380); // Alimentation previous
  });

  it('collapses categories beyond 9 into an "other" bucket', async () => {
    const makeRow = (n: number, amount: number) => ({
      category_id: `cat-${n}`,
      cat_name: `Category ${n}`,
      cat_slug: `category-${n}`,
      cat_color: '#000000',
      amount: dec(amount),
    });

    // 11 categories — top 9 kept, rest → "other"
    const currentRows = Array.from({ length: 11 }, (_, i) => makeRow(i + 1, 100 - i * 5));
    const previousRows = Array.from({ length: 11 }, (_, i) => makeRow(i + 1, 90 - i * 5));

    mockQueryRaw.mockResolvedValueOnce(currentRows).mockResolvedValueOnce(previousRows);

    const result: CategoryComparisonDto = await getCategoryComparison(USER_ID, mockRange);

    // Should be 9 named + 1 other = 10
    expect(result.currentMonth).toHaveLength(10);
    expect(result.previousMonth).toHaveLength(10);

    const otherCurrent = result.currentMonth.find((c) => c.slug === '__aggregate_other__');
    expect(otherCurrent).toBeDefined();
    expect(otherCurrent?.categoryId).toBeNull();
    // Two overflow categories: amounts at index 9 = 100-9*5=55 and index 10 = 100-10*5=50
    expect(otherCurrent?.amount).toBeCloseTo(55 + 50);

    const otherPrev = result.previousMonth.find((c) => c.slug === '__aggregate_other__');
    expect(otherPrev).toBeDefined();
    // Previous overflow: 90-9*5=45 and 90-10*5=40
    expect(otherPrev?.amount).toBeCloseTo(45 + 40);
  });

  it('returns empty comparison arrays when user has no spending data', async () => {
    mockQueryRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    const result: CategoryComparisonDto = await getCategoryComparison(USER_ID, mockRange);

    expect(result.currentMonth).toHaveLength(0);
    expect(result.previousMonth).toHaveLength(0);
  });

  it('sets previous month amount to 0 for categories that had no spending last month', async () => {
    const currentRows = [
      {
        category_id: 'cat-new',
        cat_name: 'New Category',
        cat_slug: 'new-category',
        cat_color: '#ff0000',
        amount: dec(200),
      },
    ];
    // This category didn't exist last month
    const previousRows: never[] = [];

    mockQueryRaw.mockResolvedValueOnce(currentRows).mockResolvedValueOnce(previousRows);

    const result: CategoryComparisonDto = await getCategoryComparison(USER_ID, mockRange);

    expect(result.currentMonth).toHaveLength(1);
    expect(result.previousMonth).toHaveLength(1);
    expect(result.previousMonth[0]?.amount).toBe(0);
    expect(result.previousMonth[0]?.slug).toBe('new-category');
  });
});
