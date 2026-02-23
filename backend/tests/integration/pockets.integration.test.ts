import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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

// ── mock the pockets service so we don't hit a real DB ────────────────────────

const mockListPockets = vi.fn();
const mockCreatePocket = vi.fn();
const mockGetPocket = vi.fn();
const mockUpdatePocket = vi.fn();
const mockDeletePocket = vi.fn();
const mockCreateMovement = vi.fn();
const mockDeleteMovement = vi.fn();

vi.mock('../../src/services/pockets.service.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../src/services/pockets.service.js')>();
  return {
    ...original,
    listPockets: (...args: unknown[]) => mockListPockets(...args),
    createPocket: (...args: unknown[]) => mockCreatePocket(...args),
    getPocket: (...args: unknown[]) => mockGetPocket(...args),
    updatePocket: (...args: unknown[]) => mockUpdatePocket(...args),
    deletePocket: (...args: unknown[]) => mockDeletePocket(...args),
    createMovement: (...args: unknown[]) => mockCreateMovement(...args),
    deleteMovement: (...args: unknown[]) => mockDeleteMovement(...args),
  };
});

// ── shape helpers ─────────────────────────────────────────────────────────────

function makePocketSummary(overrides = {}) {
  return {
    id: 'pocket-001',
    accountLabel: 'Compte courant',
    name: 'Vacances',
    goalAmount: 1000,
    allocatedAmount: 300,
    progressPct: 30,
    color: '#ff5733',
    createdAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makePocketDetail(overrides = {}) {
  return {
    ...makePocketSummary(),
    movements: [
      {
        id: 'movement-001',
        direction: 'ALLOCATION',
        amount: 300,
        note: null,
        date: '2025-06-01',
        createdAt: '2025-06-01T12:00:00.000Z',
      },
    ],
    nextCursor: null,
    ...overrides,
  };
}

// ── GET /api/pockets ──────────────────────────────────────────────────────────

describe('GET /api/pockets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when no auth cookie is provided', async () => {
    const res = await request(app).get('/api/pockets');

    expect(res.status).toBe(401);
  });

  it('returns 401 when auth cookie is malformed', async () => {
    const res = await request(app)
      .get('/api/pockets')
      .set('Cookie', 'access_token=not-a-valid-jwt');

    expect(res.status).toBe(401);
  });

  it('returns 200 with pockets array when authenticated', async () => {
    mockListPockets.mockResolvedValue([makePocketSummary()]);

    const cookie = await makeAuthCookie();
    const res = await request(app).get('/api/pockets').set('Cookie', cookie);

    expect(res.status).toBe(200);
    const body = res.body as { pockets: unknown[] };
    expect(Array.isArray(body.pockets)).toBe(true);
    expect(body.pockets).toHaveLength(1);
  });

  it('returns 200 with empty pockets array when user has none', async () => {
    mockListPockets.mockResolvedValue([]);

    const cookie = await makeAuthCookie();
    const res = await request(app).get('/api/pockets').set('Cookie', cookie);

    expect(res.status).toBe(200);
    const body = res.body as { pockets: unknown[] };
    expect(body.pockets).toHaveLength(0);
  });

  it('calls listPockets with the userId from the JWT sub claim', async () => {
    mockListPockets.mockResolvedValue([]);

    const userId = 'specific-user-999';
    const cookie = await makeAuthCookie(userId);
    await request(app).get('/api/pockets').set('Cookie', cookie);

    expect(mockListPockets).toHaveBeenCalledWith(userId);
  });
});

// ── POST /api/pockets ─────────────────────────────────────────────────────────

describe('POST /api/pockets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when no auth cookie is provided', async () => {
    const res = await request(app).post('/api/pockets').send({
      accountLabel: 'Compte courant',
      name: 'Vacances',
      goalAmount: 1000,
      color: '#ff5733',
    });

    expect(res.status).toBe(401);
  });

  it('returns 400 when accountLabel is missing', async () => {
    const cookie = await makeAuthCookie();
    const res = await request(app)
      .post('/api/pockets')
      .set('Cookie', cookie)
      .send({ name: 'Vacances', goalAmount: 1000, color: '#ff5733' });

    expect(res.status).toBe(400);
    const body = res.body as { error: string; message: string };
    expect(body.error).toBe('VALIDATION_ERROR');
    expect(body.message).toMatch(/accountLabel/);
  });

  it('returns 400 when name is missing', async () => {
    const cookie = await makeAuthCookie();
    const res = await request(app)
      .post('/api/pockets')
      .set('Cookie', cookie)
      .send({ accountLabel: 'Compte courant', goalAmount: 1000, color: '#ff5733' });

    expect(res.status).toBe(400);
    const body = res.body as { error: string; message: string };
    expect(body.error).toBe('VALIDATION_ERROR');
    expect(body.message).toMatch(/name/);
  });

  it('returns 400 when goalAmount is not positive', async () => {
    const cookie = await makeAuthCookie();
    const res = await request(app)
      .post('/api/pockets')
      .set('Cookie', cookie)
      .send({ accountLabel: 'Compte courant', name: 'Vacances', goalAmount: -5, color: '#ff5733' });

    expect(res.status).toBe(400);
    const body = res.body as { error: string; message: string };
    expect(body.error).toBe('VALIDATION_ERROR');
    expect(body.message).toMatch(/goalAmount/);
  });

  it('returns 400 when color is not a valid hex', async () => {
    const cookie = await makeAuthCookie();
    const res = await request(app)
      .post('/api/pockets')
      .set('Cookie', cookie)
      .send({ accountLabel: 'Compte courant', name: 'Vacances', goalAmount: 1000, color: 'red' });

    expect(res.status).toBe(400);
    const body = res.body as { error: string; message: string };
    expect(body.error).toBe('VALIDATION_ERROR');
    expect(body.message).toMatch(/color/);
  });

  it('returns 201 with pocket summary on valid input', async () => {
    mockCreatePocket.mockResolvedValue(makePocketSummary());

    const cookie = await makeAuthCookie();
    const res = await request(app).post('/api/pockets').set('Cookie', cookie).send({
      accountLabel: 'Compte courant',
      name: 'Vacances',
      goalAmount: 1000,
      color: '#ff5733',
    });

    expect(res.status).toBe(201);
    const body = res.body as ReturnType<typeof makePocketSummary>;
    expect(body.id).toBe('pocket-001');
    expect(body.name).toBe('Vacances');
  });
});

// ── GET /api/pockets/:id ──────────────────────────────────────────────────────

describe('GET /api/pockets/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 404 when pocket does not exist', async () => {
    mockGetPocket.mockResolvedValue(null);

    const cookie = await makeAuthCookie();
    const res = await request(app).get('/api/pockets/nonexistent').set('Cookie', cookie);

    expect(res.status).toBe(404);
    const body = res.body as { error: string };
    expect(body.error).toBe('NOT_FOUND');
  });

  it('returns 200 with pocket detail when found', async () => {
    mockGetPocket.mockResolvedValue(makePocketDetail());

    const cookie = await makeAuthCookie();
    const res = await request(app).get('/api/pockets/pocket-001').set('Cookie', cookie);

    expect(res.status).toBe(200);
    const body = res.body as ReturnType<typeof makePocketDetail>;
    expect(body.id).toBe('pocket-001');
    expect(Array.isArray(body.movements)).toBe(true);
    expect(body.movements).toHaveLength(1);
    expect(body.nextCursor).toBeNull();
  });
});

// ── PATCH /api/pockets/:id ────────────────────────────────────────────────────

describe('PATCH /api/pockets/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 404 when pocket does not exist', async () => {
    mockUpdatePocket.mockResolvedValue(null);

    const cookie = await makeAuthCookie();
    const res = await request(app)
      .patch('/api/pockets/nonexistent')
      .set('Cookie', cookie)
      .send({ name: 'New Name' });

    expect(res.status).toBe(404);
    const body = res.body as { error: string };
    expect(body.error).toBe('NOT_FOUND');
  });

  it('returns 400 when name is empty string', async () => {
    const cookie = await makeAuthCookie();
    const res = await request(app)
      .patch('/api/pockets/pocket-001')
      .set('Cookie', cookie)
      .send({ name: '' });

    expect(res.status).toBe(400);
    const body = res.body as { error: string };
    expect(body.error).toBe('VALIDATION_ERROR');
  });

  it('returns 200 with updated pocket on valid patch', async () => {
    mockUpdatePocket.mockResolvedValue(makePocketSummary({ name: 'New Name' }));

    const cookie = await makeAuthCookie();
    const res = await request(app)
      .patch('/api/pockets/pocket-001')
      .set('Cookie', cookie)
      .send({ name: 'New Name' });

    expect(res.status).toBe(200);
    const body = res.body as ReturnType<typeof makePocketSummary>;
    expect(body.name).toBe('New Name');
  });
});

// ── DELETE /api/pockets/:id ───────────────────────────────────────────────────

describe('DELETE /api/pockets/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 404 when pocket does not exist', async () => {
    mockDeletePocket.mockResolvedValue(false);

    const cookie = await makeAuthCookie();
    const res = await request(app).delete('/api/pockets/nonexistent').set('Cookie', cookie);

    expect(res.status).toBe(404);
    const body = res.body as { error: string };
    expect(body.error).toBe('NOT_FOUND');
  });

  it('returns 204 when pocket is deleted', async () => {
    mockDeletePocket.mockResolvedValue(true);

    const cookie = await makeAuthCookie();
    const res = await request(app).delete('/api/pockets/pocket-001').set('Cookie', cookie);

    expect(res.status).toBe(204);
  });
});

// ── POST /api/pockets/:id/movements ──────────────────────────────────────────

describe('POST /api/pockets/:id/movements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when direction is invalid', async () => {
    const cookie = await makeAuthCookie();
    const res = await request(app)
      .post('/api/pockets/pocket-001/movements')
      .set('Cookie', cookie)
      .send({ direction: 'INVALID', amount: 100, date: '2025-06-01' });

    expect(res.status).toBe(400);
    const body = res.body as { error: string; message: string };
    expect(body.error).toBe('VALIDATION_ERROR');
    expect(body.message).toMatch(/direction/);
  });

  it('returns 400 when amount is not positive', async () => {
    const cookie = await makeAuthCookie();
    const res = await request(app)
      .post('/api/pockets/pocket-001/movements')
      .set('Cookie', cookie)
      .send({ direction: 'ALLOCATION', amount: 0, date: '2025-06-01' });

    expect(res.status).toBe(400);
    const body = res.body as { error: string; message: string };
    expect(body.error).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when date is invalid', async () => {
    const cookie = await makeAuthCookie();
    const res = await request(app)
      .post('/api/pockets/pocket-001/movements')
      .set('Cookie', cookie)
      .send({ direction: 'ALLOCATION', amount: 100, date: 'not-a-date' });

    expect(res.status).toBe(400);
    const body = res.body as { error: string; message: string };
    expect(body.error).toBe('VALIDATION_ERROR');
  });

  it('returns 404 when pocket does not exist', async () => {
    mockCreateMovement.mockRejectedValue(new Error('NOT_FOUND'));

    const cookie = await makeAuthCookie();
    const res = await request(app)
      .post('/api/pockets/nonexistent/movements')
      .set('Cookie', cookie)
      .send({ direction: 'ALLOCATION', amount: 100, date: '2025-06-01' });

    expect(res.status).toBe(404);
    const body = res.body as { error: string };
    expect(body.error).toBe('NOT_FOUND');
  });

  it('returns 422 with headroom when INSUFFICIENT_HEADROOM', async () => {
    mockCreateMovement.mockRejectedValue(
      Object.assign(new Error('INSUFFICIENT_HEADROOM'), { headroom: 350 }),
    );

    const cookie = await makeAuthCookie();
    const res = await request(app)
      .post('/api/pockets/pocket-001/movements')
      .set('Cookie', cookie)
      .send({ direction: 'ALLOCATION', amount: 500, date: '2025-06-01' });

    expect(res.status).toBe(422);
    const body = res.body as { error: string; headroom: number };
    expect(body.error).toBe('INSUFFICIENT_HEADROOM');
    expect(body.headroom).toBe(350);
  });

  it('returns 422 with available when INSUFFICIENT_POCKET_FUNDS', async () => {
    mockCreateMovement.mockRejectedValue(
      Object.assign(new Error('INSUFFICIENT_POCKET_FUNDS'), { available: 50 }),
    );

    const cookie = await makeAuthCookie();
    const res = await request(app)
      .post('/api/pockets/pocket-001/movements')
      .set('Cookie', cookie)
      .send({ direction: 'WITHDRAWAL', amount: 200, date: '2025-06-01' });

    expect(res.status).toBe(422);
    const body = res.body as { error: string; available: number };
    expect(body.error).toBe('INSUFFICIENT_POCKET_FUNDS');
    expect(body.available).toBe(50);
  });

  it('returns 201 with updated pocket summary on successful movement creation', async () => {
    mockCreateMovement.mockResolvedValue(makePocketSummary({ allocatedAmount: 400 }));

    const cookie = await makeAuthCookie();
    const res = await request(app)
      .post('/api/pockets/pocket-001/movements')
      .set('Cookie', cookie)
      .send({ direction: 'ALLOCATION', amount: 100, date: '2025-06-01' });

    expect(res.status).toBe(201);
    const body = res.body as ReturnType<typeof makePocketSummary>;
    expect(body.allocatedAmount).toBe(400);
  });
});

// ── DELETE /api/pockets/:id/movements/:movementId ─────────────────────────────

describe('DELETE /api/pockets/:id/movements/:movementId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 404 when pocket or movement does not exist', async () => {
    mockDeleteMovement.mockResolvedValue(null);

    const cookie = await makeAuthCookie();
    const res = await request(app)
      .delete('/api/pockets/pocket-001/movements/nonexistent')
      .set('Cookie', cookie);

    expect(res.status).toBe(404);
    const body = res.body as { error: string };
    expect(body.error).toBe('NOT_FOUND');
  });

  it('returns 200 with updated pocket summary after movement deletion', async () => {
    mockDeleteMovement.mockResolvedValue(makePocketSummary({ allocatedAmount: 0 }));

    const cookie = await makeAuthCookie();
    const res = await request(app)
      .delete('/api/pockets/pocket-001/movements/movement-001')
      .set('Cookie', cookie);

    expect(res.status).toBe(200);
    const body = res.body as ReturnType<typeof makePocketSummary>;
    expect(body.allocatedAmount).toBe(0);
    expect(mockDeleteMovement).toHaveBeenCalledWith(
      expect.any(String),
      'pocket-001',
      'movement-001',
    );
  });
});
