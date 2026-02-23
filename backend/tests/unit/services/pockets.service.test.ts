import { Prisma } from '@kasa/db';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PocketDetailDto, PocketSummaryDto } from '../../../src/services/pockets.service.js';
import {
  createMovement,
  createPocket,
  deleteMovement,
  deletePocket,
  getPocket,
  listPockets,
  updatePocket,
} from '../../../src/services/pockets.service.js';

// ── mock @kasa/db ─────────────────────────────────────────────────────────────

const mockPocketFindMany = vi.fn();
const mockPocketCreate = vi.fn();
const mockPocketFindFirst = vi.fn();
const mockPocketUpdate = vi.fn();
const mockPocketDelete = vi.fn();
const mockMovementFindMany = vi.fn();
const mockMovementCreate = vi.fn();
const mockMovementFindFirst = vi.fn();
const mockMovementDelete = vi.fn();
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
    pocket: {
      findMany: (...args: unknown[]) => mockPocketFindMany(...args),
      create: (...args: unknown[]) => mockPocketCreate(...args),
      findFirst: (...args: unknown[]) => mockPocketFindFirst(...args),
      update: (...args: unknown[]) => mockPocketUpdate(...args),
      delete: (...args: unknown[]) => mockPocketDelete(...args),
    },
    pocketMovement: {
      findMany: (...args: unknown[]) => mockMovementFindMany(...args),
      create: (...args: unknown[]) => mockMovementCreate(...args),
      findFirst: (...args: unknown[]) => mockMovementFindFirst(...args),
      delete: (...args: unknown[]) => mockMovementDelete(...args),
    },
  },
}));

// ── helpers ───────────────────────────────────────────────────────────────────

function dec(v: number): Prisma.Decimal {
  return new Prisma.Decimal(v);
}

const USER_ID = 'user-abc-123';
const POCKET_ID = 'pocket-001';
const MOVEMENT_ID = 'movement-001';

function makePocketRow(overrides: Record<string, unknown> = {}) {
  return {
    id: POCKET_ID,
    userId: USER_ID,
    accountLabel: 'Compte courant',
    name: 'Vacances',
    goalAmount: dec(1000),
    color: '#ff5733',
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    movements: [],
    ...overrides,
  };
}

function makeMovementRow(overrides: Record<string, unknown> = {}) {
  return {
    id: MOVEMENT_ID,
    pocketId: POCKET_ID,
    direction: 'ALLOCATION' as const,
    amount: dec(200),
    note: null,
    date: new Date('2025-06-01T00:00:00.000Z'),
    createdAt: new Date('2025-06-01T12:00:00.000Z'),
    ...overrides,
  };
}

// ── listPockets ───────────────────────────────────────────────────────────────

describe('listPockets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty array when user has no pockets', async () => {
    mockPocketFindMany.mockResolvedValue([]);

    const result: PocketSummaryDto[] = await listPockets(USER_ID);

    expect(result).toHaveLength(0);
  });

  it('returns pockets with correct allocatedAmount and progressPct', async () => {
    const movements = [
      makeMovementRow({ direction: 'ALLOCATION', amount: dec(400) }),
      makeMovementRow({ id: 'mv-2', direction: 'WITHDRAWAL', amount: dec(100) }),
    ];
    mockPocketFindMany.mockResolvedValue([makePocketRow({ movements })]);

    const result: PocketSummaryDto[] = await listPockets(USER_ID);

    expect(result).toHaveLength(1);
    expect(result[0]?.allocatedAmount).toBe(300); // 400 - 100
    expect(result[0]?.progressPct).toBe(30); // 300 / 1000 * 100
    expect(result[0]?.goalAmount).toBe(1000);
    expect(result[0]?.name).toBe('Vacances');
    expect(result[0]?.color).toBe('#ff5733');
  });
});

// ── createPocket ──────────────────────────────────────────────────────────────

describe('createPocket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates pocket and returns summary with zero allocatedAmount', async () => {
    mockPocketCreate.mockResolvedValue(makePocketRow());

    const result: PocketSummaryDto = await createPocket(USER_ID, {
      accountLabel: 'Compte courant',
      name: 'Vacances',
      goalAmount: 1000,
      color: '#ff5733',
    });

    expect(result.allocatedAmount).toBe(0);
    expect(result.progressPct).toBe(0);
    expect(result.goalAmount).toBe(1000);
    expect(result.name).toBe('Vacances');
    expect(mockPocketCreate).toHaveBeenCalledOnce();
  });
});

// ── getPocket ─────────────────────────────────────────────────────────────────

describe('getPocket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when pocket not found', async () => {
    mockPocketFindFirst.mockResolvedValue(null);

    const result = await getPocket(USER_ID, POCKET_ID);

    expect(result).toBeNull();
  });

  it('returns pocket detail with movements page', async () => {
    const movement = makeMovementRow();
    mockPocketFindFirst.mockResolvedValue(makePocketRow({ movements: [movement] }));
    mockMovementFindMany.mockResolvedValue([movement]);

    const result: PocketDetailDto | null = await getPocket(USER_ID, POCKET_ID);

    expect(result).not.toBeNull();
    expect(result?.id).toBe(POCKET_ID);
    expect(result?.allocatedAmount).toBe(200);
    expect(result?.movements).toHaveLength(1);
    expect(result?.movements[0]?.direction).toBe('ALLOCATION');
    expect(result?.movements[0]?.amount).toBe(200);
    expect(result?.nextCursor).toBeNull();
  });

  it('sets nextCursor when more pages exist', async () => {
    const limit = 2;
    const movements = [
      makeMovementRow({ id: 'mv-1' }),
      makeMovementRow({ id: 'mv-2' }),
      makeMovementRow({ id: 'mv-3' }), // extra item signals hasMore
    ];
    mockPocketFindFirst.mockResolvedValue(makePocketRow({ movements: [] }));
    mockMovementFindMany.mockResolvedValue(movements);

    const result = await getPocket(USER_ID, POCKET_ID, limit);

    expect(result?.movements).toHaveLength(2);
    expect(result?.nextCursor).toBe('mv-2');
  });
});

// ── updatePocket ──────────────────────────────────────────────────────────────

describe('updatePocket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when pocket not found', async () => {
    mockPocketFindFirst.mockResolvedValue(null);

    const result = await updatePocket(USER_ID, POCKET_ID, { name: 'New Name' });

    expect(result).toBeNull();
    expect(mockPocketUpdate).not.toHaveBeenCalled();
  });

  it('updates pocket and returns updated summary', async () => {
    const existing = makePocketRow({
      movements: [makeMovementRow({ amount: dec(300) })],
    });
    const updated = makePocketRow({ name: 'New Name' });
    mockPocketFindFirst.mockResolvedValue(existing);
    mockPocketUpdate.mockResolvedValue(updated);

    const result: PocketSummaryDto | null = await updatePocket(USER_ID, POCKET_ID, {
      name: 'New Name',
    });

    expect(result).not.toBeNull();
    expect(result?.name).toBe('New Name');
    expect(result?.allocatedAmount).toBe(300);
    expect(mockPocketUpdate).toHaveBeenCalledOnce();
  });
});

// ── deletePocket ──────────────────────────────────────────────────────────────

describe('deletePocket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns false when pocket not found', async () => {
    mockPocketFindFirst.mockResolvedValue(null);

    const result = await deletePocket(USER_ID, POCKET_ID);

    expect(result).toBe(false);
    expect(mockPocketDelete).not.toHaveBeenCalled();
  });

  it('deletes pocket and returns true', async () => {
    mockPocketFindFirst.mockResolvedValue(makePocketRow());
    mockPocketDelete.mockResolvedValue(undefined);

    const result = await deletePocket(USER_ID, POCKET_ID);

    expect(result).toBe(true);
    expect(mockPocketDelete).toHaveBeenCalledOnce();
  });
});

// ── createMovement ────────────────────────────────────────────────────────────

describe('createMovement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws NOT_FOUND when pocket does not exist', async () => {
    mockPocketFindFirst.mockResolvedValue(null);

    await expect(
      createMovement(USER_ID, POCKET_ID, {
        direction: 'ALLOCATION',
        amount: 100,
        date: '2025-06-01',
      }),
    ).rejects.toThrow('NOT_FOUND');
  });

  it('creates ALLOCATION movement successfully when headroom is sufficient', async () => {
    mockPocketFindFirst.mockResolvedValue(makePocketRow({ movements: [] }));
    // computeHeadroom: account_balance=500, total_allocated=0 → headroom=500
    mockQueryRaw
      .mockResolvedValueOnce([{ account_balance: dec(500) }])
      .mockResolvedValueOnce([{ total_allocated: dec(0) }]);
    mockMovementCreate.mockResolvedValue(undefined);
    mockMovementFindMany.mockResolvedValue([makeMovementRow({ amount: dec(100) })]);

    const result: PocketSummaryDto = await createMovement(USER_ID, POCKET_ID, {
      direction: 'ALLOCATION',
      amount: 100,
      date: '2025-06-01',
    });

    expect(result.allocatedAmount).toBe(100);
    expect(mockMovementCreate).toHaveBeenCalledOnce();
  });

  it('throws INSUFFICIENT_HEADROOM with headroom property when allocation exceeds headroom', async () => {
    mockPocketFindFirst.mockResolvedValue(makePocketRow({ movements: [] }));
    // account_balance=100, total_allocated=80 → headroom=20, trying to allocate 30
    mockQueryRaw
      .mockResolvedValueOnce([{ account_balance: dec(100) }])
      .mockResolvedValueOnce([{ total_allocated: dec(80) }]);

    let caughtError: (Error & { headroom?: number }) | null = null;
    try {
      await createMovement(USER_ID, POCKET_ID, {
        direction: 'ALLOCATION',
        amount: 30,
        date: '2025-06-01',
      });
    } catch (err) {
      caughtError = err as Error & { headroom?: number };
    }

    expect(caughtError).not.toBeNull();
    expect(caughtError?.message).toBe('INSUFFICIENT_HEADROOM');
    expect(caughtError?.headroom).toBe(20);
  });

  it('creates WITHDRAWAL movement successfully when funds are sufficient', async () => {
    const movements = [makeMovementRow({ amount: dec(500) })];
    mockPocketFindFirst.mockResolvedValue(makePocketRow({ movements }));
    mockMovementCreate.mockResolvedValue(undefined);
    mockMovementFindMany.mockResolvedValue([
      makeMovementRow({ amount: dec(500) }),
      makeMovementRow({ id: 'mv-2', direction: 'WITHDRAWAL', amount: dec(200) }),
    ]);

    const result: PocketSummaryDto = await createMovement(USER_ID, POCKET_ID, {
      direction: 'WITHDRAWAL',
      amount: 200,
      date: '2025-06-01',
    });

    expect(result.allocatedAmount).toBe(300); // 500 - 200
    expect(mockMovementCreate).toHaveBeenCalledOnce();
  });

  it('throws INSUFFICIENT_POCKET_FUNDS when withdrawal exceeds current allocated', async () => {
    const movements = [makeMovementRow({ amount: dec(100) })];
    mockPocketFindFirst.mockResolvedValue(makePocketRow({ movements }));

    let caughtError: (Error & { available?: number }) | null = null;
    try {
      await createMovement(USER_ID, POCKET_ID, {
        direction: 'WITHDRAWAL',
        amount: 150,
        date: '2025-06-01',
      });
    } catch (err) {
      caughtError = err as Error & { available?: number };
    }

    expect(caughtError).not.toBeNull();
    expect(caughtError?.message).toBe('INSUFFICIENT_POCKET_FUNDS');
    expect(caughtError?.available).toBe(100);
  });
});

// ── deleteMovement ────────────────────────────────────────────────────────────

describe('deleteMovement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when pocket not found', async () => {
    mockPocketFindFirst.mockResolvedValue(null);

    const result = await deleteMovement(USER_ID, POCKET_ID, MOVEMENT_ID);

    expect(result).toBeNull();
    expect(mockMovementDelete).not.toHaveBeenCalled();
  });

  it('returns null when movement not found', async () => {
    mockPocketFindFirst.mockResolvedValue(makePocketRow());
    mockMovementFindFirst.mockResolvedValue(null);

    const result = await deleteMovement(USER_ID, POCKET_ID, MOVEMENT_ID);

    expect(result).toBeNull();
    expect(mockMovementDelete).not.toHaveBeenCalled();
  });

  it('deletes movement and returns updated pocket summary', async () => {
    mockPocketFindFirst.mockResolvedValue(makePocketRow());
    mockMovementFindFirst.mockResolvedValue(makeMovementRow());
    mockMovementDelete.mockResolvedValue(undefined);
    mockMovementFindMany.mockResolvedValue([]); // no movements remaining

    const result: PocketSummaryDto | null = await deleteMovement(USER_ID, POCKET_ID, MOVEMENT_ID);

    expect(result).not.toBeNull();
    expect(result?.allocatedAmount).toBe(0);
    expect(mockMovementDelete).toHaveBeenCalledOnce();
  });
});
