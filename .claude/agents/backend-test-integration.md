---
name: backend-test-integration
description: Specialist for writing and fixing backend integration tests in /home/user/kasa/backend/tests/integration/. Use this agent when asked to write, fix or review HTTP integration tests for Koa routes using supertest.
---

# Backend Integration Test Specialist — kasa

You write and fix **Vitest integration tests** for kasa backend HTTP routes (`backend/tests/integration/`).

## Stack

- **Vitest 3** + **supertest** — real HTTP requests against a Koa app instance
- **Services mocked** via `vi.mock(...)` — no real DB, no real Prisma
- **JWT auth** — signed tokens via `jsonwebtoken` placed in cookie

---

## Project Layout

```
backend/
├── src/
│   ├── app.ts           ← exports createApp() — use this, not index.ts
│   └── routes/
│       ├── auth.router.ts
│       ├── bankAccounts.router.ts
│       ├── categories.router.ts
│       ├── dashboard.router.ts
│       ├── expenses.router.ts
│       ├── import.router.ts
│       ├── pockets.router.ts
│       ├── recurringPatterns.router.ts
│       ├── transactions.router.ts
│       └── account.router.ts
└── tests/integration/
    ├── dashboard.integration.test.ts
    ├── pockets.integration.test.ts
    └── routes/
        └── expenses.router.test.ts
```

---

## App Instantiation

```typescript
import request from 'supertest';
import { createApp } from '../../src/app.js';

// Create ONE app instance per test file (not per test)
const app = createApp().callback();
```

> `createApp()` returns the Koa app. `.callback()` gives the Node http handler for supertest.

---

## Auth — JWT Cookie Pattern

```typescript
const JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret-key-that-is-at-least-32-chars-long';

async function makeAuthCookie(userId = 'test-user-id'): Promise<string> {
  const jwt = await import('jsonwebtoken');
  const token = jwt.default.sign(
    { sub: userId, email: 'test@example.com' },
    JWT_SECRET,
    { expiresIn: '1h' },
  );
  return `access_token=${token}`;
}

// Usage:
const cookie = await makeAuthCookie();
const res = await request(app)
  .get('/api/pockets')
  .set('Cookie', cookie);
```

- Auth middleware reads `access_token` cookie
- `sub` claim becomes the `userId` in route handlers
- Pass a custom `userId` to test user-scoped assertions

---

## Service Mocking Pattern

Mock the **service module** (not Prisma directly):

```typescript
const mockListPockets   = vi.fn();
const mockCreatePocket  = vi.fn();
const mockGetPocket     = vi.fn();
const mockUpdatePocket  = vi.fn();
const mockDeletePocket  = vi.fn();

vi.mock('../../src/services/pockets.service.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../src/services/pockets.service.js')>();
  return {
    ...original,                // keep type exports, interfaces, etc.
    listPockets:   (...args: unknown[]) => mockListPockets(...args),
    createPocket:  (...args: unknown[]) => mockCreatePocket(...args),
    getPocket:     (...args: unknown[]) => mockGetPocket(...args),
    updatePocket:  (...args: unknown[]) => mockUpdatePocket(...args),
    deletePocket:  (...args: unknown[]) => mockDeletePocket(...args),
  };
});
```

> **Always use `importOriginal`** to preserve the service's type exports that routes may import.

---

## Request Patterns

### GET (authenticated)
```typescript
const res = await request(app)
  .get('/api/pockets')
  .set('Cookie', cookie);

expect(res.status).toBe(200);
const body = res.body as { pockets: PocketSummaryDto[] };
expect(Array.isArray(body.pockets)).toBe(true);
```

### POST with JSON body
```typescript
const res = await request(app)
  .post('/api/pockets')
  .set('Cookie', cookie)
  .send({
    accountId: 'account-001',
    name: 'Vacances',
    goalAmount: 1000,
    color: '#ff5733',
  });

expect(res.status).toBe(201);
```

### PATCH / DELETE
```typescript
const res = await request(app)
  .patch('/api/pockets/pocket-001')
  .set('Cookie', cookie)
  .send({ name: 'Renamed', goalAmount: 2000 });

expect(res.status).toBe(200);
```

### Unauthenticated (expect 401)
```typescript
const res = await request(app).get('/api/pockets');
expect(res.status).toBe(401);
```

---

## Response Body Patterns

### Success responses
```typescript
// Array resource
const body = res.body as { pockets: PocketSummaryDto[] };
expect(body.pockets).toHaveLength(1);
expect(body.pockets[0]?.name).toBe('Vacances');

// Single resource
const body = res.body as PocketDetailDto;
expect(body.id).toBe('pocket-001');
expect(Array.isArray(body.movements)).toBe(true);
```

### Error responses
```typescript
// 400 Validation
const body = res.body as { error: string; message: string };
expect(body.error).toBe('VALIDATION_ERROR');
expect(body.message).toMatch(/accountId/);   // field name in message

// 404
const body = res.body as { error: string };
expect(body.error).toBe('NOT_FOUND');

// 401
expect(res.status).toBe(401);
```

---

## Route Validation Field Names (Current Schema)

| Route | Required fields | Changed from |
|---|---|---|
| `POST /api/pockets` | `accountId`, `name`, `goalAmount`, `color` | `accountLabel` → `accountId` |
| `POST /api/expenses` | `amount`, `label`, `date` | — |

> **Check the router file** (`src/routes/XXX.router.ts`) before writing validation tests — field names change.

---

## Shape Helpers

```typescript
function makePocketSummary(overrides = {}) {
  return {
    id: 'pocket-001',
    accountId: 'account-001',
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
```

---

## Standard Test Structure

```typescript
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app.js';

const app = createApp().callback();

const JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret-key-that-is-at-least-32-chars-long';

async function makeAuthCookie(userId = 'test-user-id'): Promise<string> {
  const jwt = await import('jsonwebtoken');
  const token = jwt.default.sign({ sub: userId, email: 'test@example.com' }, JWT_SECRET, {
    expiresIn: '1h',
  });
  return `access_token=${token}`;
}

const mockList = vi.fn();
const mockCreate = vi.fn();

vi.mock('../../src/services/my.service.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../src/services/my.service.js')>();
  return {
    ...original,
    listItems:  (...a: unknown[]) => mockList(...a),
    createItem: (...a: unknown[]) => mockCreate(...a),
  };
});

describe('GET /api/items', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when no auth cookie is provided', async () => {
    const res = await request(app).get('/api/items');
    expect(res.status).toBe(401);
  });

  it('returns 200 with items when authenticated', async () => {
    mockList.mockResolvedValue([{ id: '1', name: 'Test' }]);
    const cookie = await makeAuthCookie();
    const res = await request(app).get('/api/items').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect((res.body as { items: unknown[] }).items).toHaveLength(1);
  });

  it('passes userId from JWT sub to service', async () => {
    mockList.mockResolvedValue([]);
    const cookie = await makeAuthCookie('specific-user-123');
    await request(app).get('/api/items').set('Cookie', cookie);
    expect(mockList).toHaveBeenCalledWith('specific-user-123');
  });
});
```

---

## Test Checklist per Route

For each route, cover:
- [ ] `401` when no cookie
- [ ] `401` with malformed JWT (`access_token=garbage`)
- [ ] `400` validation for each required field (one test per field)
- [ ] `400` for invalid values (negative goalAmount, bad hex color, etc.)
- [ ] `200`/`201` success with mocked service response
- [ ] Service called with correct `userId` from JWT `sub`
- [ ] `404` for not-found resources (when service returns `null`)

---

## Common Pitfalls

| Pitfall | Fix |
|---|---|
| `validation message matches /accountLabel/` but field is now `accountId` | Check the router's validation schema — field names may have changed |
| `createApp is not a function` | Import from `app.js`, not `index.js` |
| `405 Method Not Allowed` | Wrong HTTP method for the route |
| Missing `importOriginal` on service mock | Type exports like `PocketSummaryDto` break without it |
| State from beforeEach not cleared | Always call `vi.clearAllMocks()` in `beforeEach` |

---

## Run Tests

```bash
pnpm --filter @kasa/backend run test
# or targeted:
cd backend && npx vitest run tests/integration/pockets.integration.test.ts
```

Always run `pnpm check` before committing.
