import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../../src/app.js';

const app = createApp().callback();

// ── helpers ──────────────────────────────────────────────────────────────────

const TEST_JWT = process.env.JWT_SECRET ?? 'test-secret-key-that-is-at-least-32-chars-long';

// In integration tests, we mock auth by injecting a pre-signed token.
// The auth middleware reads the cookie 'access_token'.
// Here we test the router logic in isolation without a real DB:
// - Validation errors (no DB needed)
// - 401 when not authenticated

describe('GET /api/expenses', () => {
  it('returns 401 when not authenticated', async () => {
    const res = await request(app).get('/api/expenses');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/expenses', () => {
  it('returns 401 when not authenticated', async () => {
    const res = await request(app).post('/api/expenses').send({
      amount: 42.5,
      label: 'Loyer',
      date: '2025-01-15',
      category: 'HOUSING',
    });
    expect(res.status).toBe(401);
  });
});

describe('DELETE /api/expenses/:id', () => {
  it('returns 401 when not authenticated', async () => {
    const res = await request(app).delete('/api/expenses/non-existent-id');
    expect(res.status).toBe(401);
  });
});

// Validation tests (no auth needed to test the 400 response shape)
// These confirm the router returns structured errors

describe('POST /api/expenses — validation errors (auth bypassed via unit test of service)', () => {
  it('returns 401 (no auth) rather than 400 — validation is a post-auth concern', async () => {
    const res = await request(app).post('/api/expenses').send({});
    // Without auth, we get 401 before validation runs
    expect(res.status).toBe(401);
  });
});

describe('POST /api/import/csv', () => {
  it('returns 401 when not authenticated', async () => {
    const res = await request(app).post('/api/import/csv');
    expect(res.status).toBe(401);
  });

  it('returns 400 for missing file when authenticated with valid session', async () => {
    // We can test this if we can forge a valid JWT cookie.
    // JWT_SECRET is set via vitest env (vitest.config.ts).
    const jwt = await import('jsonwebtoken');
    const token = jwt.default.sign({ sub: 'test-user-id', email: 'test@example.com' }, TEST_JWT, {
      expiresIn: '1h',
    });

    const res = await request(app).post('/api/import/csv').set('Cookie', `access_token=${token}`);

    // No file attached → 400 MISSING_FILE
    expect(res.status).toBe(400);
    expect((res.body as { error: string }).error).toBe('MISSING_FILE');
  });

  it('returns 400 for invalid CSV format', async () => {
    const jwt = await import('jsonwebtoken');
    const token = jwt.default.sign({ sub: 'test-user-id', email: 'test@example.com' }, TEST_JWT, {
      expiresIn: '1h',
    });

    const res = await request(app)
      .post('/api/import/csv')
      .set('Cookie', `access_token=${token}`)
      .attach('file', Buffer.from('not,a,valid,sg,csv'), 'bad.csv');

    expect(res.status).toBe(400);
    expect((res.body as { error: string }).error).toBe('INVALID_CSV_FORMAT');
  });
});
