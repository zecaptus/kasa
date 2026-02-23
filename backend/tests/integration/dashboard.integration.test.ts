import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app.js';

// ── app instance ──────────────────────────────────────────────────────────────

const app = createApp().callback();

// ── auth helpers ──────────────────────────────────────────────────────────────

const JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret-key-that-is-at-least-32-chars-long';

async function makeAuthCookie(userId = 'test-user-id'): Promise<string> {
  const jwt = await import('jsonwebtoken');
  const token = jwt.default.sign({ sub: userId, email: 'test@example.com' }, JWT_SECRET, {
    expiresIn: '1h',
  });
  return `access_token=${token}`;
}

// ── mock the dashboard service so we don't hit a real DB ─────────────────────

const mockGetDashboard = vi.fn();

vi.mock('../../src/services/dashboard.service.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../src/services/dashboard.service.js')>();
  return {
    ...original,
    getDashboard: (...args: unknown[]) => mockGetDashboard(...args),
  };
});

// ── shape helpers ─────────────────────────────────────────────────────────────

function makeSummary(overrides = {}) {
  return {
    totalBalance: 4200,
    monthlySpending: 500,
    monthlyIncome: 2500,
    netCashFlow: 2000,
    ...overrides,
  };
}

function makeAccount(label: string) {
  return {
    label,
    balance: 1000,
    monthlyVariation: -100,
    recentTransactions: [
      {
        id: 'tx-1',
        date: '2025-01-15',
        label: 'CARREFOUR',
        amount: 42.5,
        direction: 'debit',
      },
    ],
  };
}

function makeCategoryComparison(overrides = {}) {
  return {
    currentMonth: [
      {
        categoryId: 'cat-1',
        name: 'Alimentation',
        slug: 'alimentation',
        color: '#aabb00',
        amount: 400,
      },
    ],
    previousMonth: [
      {
        categoryId: 'cat-1',
        name: 'Alimentation',
        slug: 'alimentation',
        color: '#aabb00',
        amount: 380,
      },
    ],
    ...overrides,
  };
}

function makeFullDashboard() {
  return {
    summary: makeSummary(),
    accounts: [makeAccount('Compte courant'), makeAccount('Livret A')],
    categoryComparison: makeCategoryComparison(),
  };
}

function makeEmptyDashboard() {
  return {
    summary: { totalBalance: 0, monthlySpending: 0, monthlyIncome: 0, netCashFlow: 0 },
    accounts: [],
    categoryComparison: { currentMonth: [], previousMonth: [] },
  };
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('GET /api/dashboard', () => {
  it('returns 401 when no auth cookie is provided', async () => {
    const res = await request(app).get('/api/dashboard');

    expect(res.status).toBe(401);
  });

  it('returns 401 when auth cookie is malformed', async () => {
    const res = await request(app)
      .get('/api/dashboard')
      .set('Cookie', 'access_token=not-a-valid-jwt');

    expect(res.status).toBe(401);
  });

  it('returns 200 with correct shape when authenticated', async () => {
    mockGetDashboard.mockResolvedValue(makeFullDashboard());

    const cookie = await makeAuthCookie();
    const res = await request(app).get('/api/dashboard').set('Cookie', cookie);

    expect(res.status).toBe(200);

    const body = res.body as {
      summary: unknown;
      accounts: unknown[];
      categoryComparison: { currentMonth: unknown[]; previousMonth: unknown[] };
    };

    // Top-level keys
    expect(body).toHaveProperty('summary');
    expect(body).toHaveProperty('accounts');
    expect(body).toHaveProperty('categoryComparison');

    // Summary shape
    expect(body.summary).toMatchObject({
      totalBalance: expect.any(Number),
      monthlySpending: expect.any(Number),
      monthlyIncome: expect.any(Number),
      netCashFlow: expect.any(Number),
    });

    // Accounts shape
    expect(Array.isArray(body.accounts)).toBe(true);
    expect(body.accounts).toHaveLength(2);
    const firstAccount = body.accounts[0] as {
      label: string;
      balance: number;
      monthlyVariation: number;
      recentTransactions: unknown[];
    };
    expect(firstAccount).toMatchObject({
      label: expect.any(String),
      balance: expect.any(Number),
      monthlyVariation: expect.any(Number),
      recentTransactions: expect.any(Array),
    });

    // CategoryComparison shape
    expect(Array.isArray(body.categoryComparison.currentMonth)).toBe(true);
    expect(Array.isArray(body.categoryComparison.previousMonth)).toBe(true);
  });

  it('returns 200 with correct data values for authenticated user', async () => {
    mockGetDashboard.mockResolvedValue(makeFullDashboard());

    const cookie = await makeAuthCookie('user-42');
    const res = await request(app).get('/api/dashboard').set('Cookie', cookie);

    expect(res.status).toBe(200);

    const body = res.body as ReturnType<typeof makeFullDashboard>;
    expect(body.summary.totalBalance).toBe(4200);
    expect(body.summary.monthlyIncome).toBe(2500);
    expect(body.summary.monthlySpending).toBe(500);
    expect(body.summary.netCashFlow).toBe(2000);
    expect(body.accounts[0]?.label).toBe('Compte courant');
    expect(body.accounts[0]?.recentTransactions[0]?.direction).toBe('debit');
  });

  it('calls getDashboard with the userId from the JWT sub claim', async () => {
    mockGetDashboard.mockResolvedValue(makeFullDashboard());

    const userId = 'specific-user-999';
    const cookie = await makeAuthCookie(userId);
    await request(app).get('/api/dashboard').set('Cookie', cookie);

    expect(mockGetDashboard).toHaveBeenCalledWith(userId);
  });

  it('returns 200 with all-zero summary for new user with no transactions', async () => {
    mockGetDashboard.mockResolvedValue(makeEmptyDashboard());

    const cookie = await makeAuthCookie('new-user-id');
    const res = await request(app).get('/api/dashboard').set('Cookie', cookie);

    expect(res.status).toBe(200);

    const body = res.body as ReturnType<typeof makeEmptyDashboard>;
    expect(body.summary.totalBalance).toBe(0);
    expect(body.summary.monthlySpending).toBe(0);
    expect(body.summary.monthlyIncome).toBe(0);
    expect(body.summary.netCashFlow).toBe(0);
    expect(body.accounts).toHaveLength(0);
    expect(body.categoryComparison.currentMonth).toHaveLength(0);
    expect(body.categoryComparison.previousMonth).toHaveLength(0);
  });

  it('returns 500 when the dashboard service throws', async () => {
    mockGetDashboard.mockRejectedValue(new Error('DB_UNAVAILABLE'));

    const cookie = await makeAuthCookie();
    const res = await request(app).get('/api/dashboard').set('Cookie', cookie);

    expect(res.status).toBe(500);
  });
});
