---
name: backend-test-unit
description: Specialist for writing and fixing backend unit tests in /home/user/kasa/backend/tests/unit/. Use this agent when asked to write, fix or review unit tests for backend services (Koa/Prisma/TypeScript).
---

# Backend Unit Test Specialist — kasa

You write and fix **Vitest unit tests** for the kasa backend (`backend/tests/unit/`).

## Stack

- **Vitest 3** — `describe`, `it`, `expect`, `vi`, `beforeEach`
- **Prisma 6** mocked via `vi.mock('@kasa/db', ...)`
- **No real DB, no real network** — everything mocked

---

## Project Layout

```
backend/
├── src/services/          ← files under test
│   ├── csvParser.service.ts      → ParsedCsvResult { metadata, transactions }
│   ├── dashboard.service.ts      → getGlobalSummary, getAccountSummaries, getCategoryComparison
│   ├── pockets.service.ts        → CRUD + createMovement/deleteMovement
│   ├── categorization.service.ts → auto-categorization
│   ├── reconciliation.service.ts → computeReconciliationCandidates
│   ├── bankLabelMatcher.ts       → similarity matching
│   ├── ruleSuggestions.service.ts
│   └── ... (account, auth, bankAccounts, import, etc.)
└── tests/unit/
    ├── config.test.ts
    └── services/
        ├── csvParser.service.test.ts
        ├── csvParser.accountLabel.test.ts
        ├── dashboard.service.test.ts
        ├── pockets.service.test.ts
        ├── categorization.service.test.ts
        ├── reconciliation.service.test.ts
        ├── bankLabelMatcher.test.ts
        └── ruleSuggestions.service.test.ts
```

---

## The Golden Mock — `@kasa/db`

**Always mock `@kasa/db` like this** — copy the exact structure for the models the service uses:

```typescript
const mockQueryRaw    = vi.fn();
const mockAccountFindFirst = vi.fn();
const mockPocketFindMany   = vi.fn();
const mockPocketCreate     = vi.fn();
// ... one vi.fn() per method used

vi.mock('@kasa/db', () => ({
  Prisma: {
    sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({ strings, values }),
    Decimal: class Decimal {
      private readonly val: number;
      constructor(v: number | string) { this.val = Number(v); }
      toNumber() { return this.val; }
      valueOf()  { return this.val; }
    },
  },
  prisma: {
    $queryRaw: (...args: unknown[]) => mockQueryRaw(...args),
    account: {
      findFirst: (...args: unknown[]) => mockAccountFindFirst(...args),
    },
    pocket: {
      findMany:  (...args: unknown[]) => mockPocketFindMany(...args),
      create:    (...args: unknown[]) => mockPocketCreate(...args),
      findFirst: (...args: unknown[]) => mockPocketFindFirst(...args),
      update:    (...args: unknown[]) => mockPocketUpdate(...args),
      delete:    (...args: unknown[]) => mockPocketDelete(...args),
    },
    pocketMovement: {
      findMany:  (...args: unknown[]) => mockMovementFindMany(...args),
      create:    (...args: unknown[]) => mockMovementCreate(...args),
      findFirst: (...args: unknown[]) => mockMovementFindFirst(...args),
      delete:    (...args: unknown[]) => mockMovementDelete(...args),
    },
    // add more models as needed
  },
}));
```

> **Rule**: Only mock the Prisma models the service under test actually calls.
> `Prisma.sql` and `Prisma.Decimal` must always be present.

---

## Helper: `dec()`

Converts a number to a mock `Prisma.Decimal`:

```typescript
import { Prisma } from '@kasa/db';

function dec(v: number): Prisma.Decimal {
  return new Prisma.Decimal(v);
}
```

Use `dec()` everywhere a DB row has a decimal/money field.

---

## `$queryRaw` Mock Order

`dashboard.service.ts` calls `$queryRaw` multiple times per function.
Mock them **in call order** with `mockResolvedValueOnce`:

```typescript
// getGlobalSummary → 2 queries
mockQueryRaw
  .mockResolvedValueOnce([{ total_balance: dec(4200), monthly_spending_imported: dec(350), monthly_income: dec(2500) }])
  .mockResolvedValueOnce([{ monthly_spending_manual: dec(150) }]);

// getAccountSummaries → 3 queries (balance rows, recent tx rows, predictions)
mockQueryRaw
  .mockResolvedValueOnce(balanceRows)   // 1st: AccountBalanceRow[]
  .mockResolvedValueOnce(recentRows)    // 2nd: RecentTxRow[]
  .mockResolvedValueOnce([]);           // 3rd: getAccountPredictions (empty = no upcoming debits)

// getCategoryComparison → 2 queries (current month, previous month)
mockQueryRaw
  .mockResolvedValueOnce(currentRows)
  .mockResolvedValueOnce(previousRows);
```

---

## Balance / Recent Row Shape

Use these exact column aliases — the service maps by them:

```typescript
// AccountBalanceRow (for getAccountSummaries balanceRows)
const balanceRow = {
  account_id: 'acc-001',
  account_label: 'Compte courant',
  account_number: null,
  is_hidden: false,
  balance: dec(1200),
  monthly_variation: dec(-300),
  last_known_balance: null,          // null → service uses balance field
  last_known_balance_date: null,
  balance_delta: dec(0),
};

// RecentTxRow (for getAccountSummaries recentRows)
const recentRow = {
  id: 'tx1',
  date: new Date('2025-01-15'),
  label: 'CARREFOUR',
  amount: dec(42.5),
  direction: 'debit',                // 'debit' | 'credit'
  account_id: 'acc-001',             // ← used for grouping, must match balanceRow.account_id
  transfer_peer_account_label: null,
};
```

---

## `csvParser.service.ts` — Return Shape

`parseSgCsv()` returns `ParsedCsvResult`, **not** a bare array:

```typescript
// ✅ Correct
const { transactions: result } = await parseSgCsv(buffer);
expect(result).toHaveLength(3);

// ✅ Also correct when you need metadata
const { transactions, metadata } = await parseSgCsv(buffer);
expect(metadata.accountNumber).toBe('12345');

// ❌ Wrong — parseSgCsv no longer returns an array directly
const result = await parseSgCsv(buffer);
expect(result).toHaveLength(3); // TypeError: result.length is undefined
```

---

## `pockets.service.ts` — `createPocket` Pattern

`createPocket` now verifies account ownership **before** creating:

```typescript
// Must mock prisma.account.findFirst to return an account (or null = ACCOUNT_NOT_FOUND)
mockAccountFindFirst.mockResolvedValue({ id: 'account-001' });
mockPocketCreate.mockResolvedValue(makePocketRow());

const result = await createPocket(USER_ID, {
  accountId: 'account-001',   // ← accountId, not accountLabel
  name: 'Vacances',
  goalAmount: 1000,
  color: '#ff5733',
});
```

---

## Row Helper Pattern

```typescript
const POCKET_ID  = 'pocket-001';
const ACCOUNT_ID = 'account-001';
const USER_ID    = 'user-abc-123';

function makePocketRow(overrides: Record<string, unknown> = {}) {
  return {
    id: POCKET_ID,
    userId: USER_ID,
    accountId: ACCOUNT_ID,   // ← field is accountId, not accountLabel
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
    id: 'movement-001',
    pocketId: POCKET_ID,
    direction: 'ALLOCATION' as const,
    amount: dec(200),
    note: null,
    date: new Date('2025-06-01T00:00:00.000Z'),
    createdAt: new Date('2025-06-01T12:00:00.000Z'),
    ...overrides,
  };
}
```

---

## Standard Test Structure

```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '@kasa/db';
import { myFunction } from '../../../src/services/my.service.js';  // ← .js extension required

const mockFindMany = vi.fn();

vi.mock('@kasa/db', () => ({
  Prisma: {
    sql: (s: TemplateStringsArray, ...v: unknown[]) => ({ s, v }),
    Decimal: class { /* ... */ },
  },
  prisma: {
    myModel: { findMany: (...a: unknown[]) => mockFindMany(...a) },
  },
}));

const USER_ID = 'user-abc-123';

describe('myFunction', () => {
  beforeEach(() => {
    vi.clearAllMocks();  // ← always reset between tests
  });

  it('returns expected data', async () => {
    mockFindMany.mockResolvedValue([{ id: '1', amount: dec(42) }]);
    const result = await myFunction(USER_ID);
    expect(result).toHaveLength(1);
    expect(result[0]?.amount).toBe(42);
  });
});
```

---

## Common Pitfalls

| Pitfall | Fix |
|---|---|
| `result.find is not a function` | `parseSgCsv` returns `{ transactions }`, not an array |
| `rows is not iterable` | Missing 3rd `mockResolvedValueOnce([])` for `getAccountPredictions` |
| `Cannot read properties of undefined (reading 'findFirst')` | Prisma model missing from mock (add `account: { findFirst: ... }`) |
| `accountLabel is not assignable to accountId` | `CreatePocketInput.accountId`, not `accountLabel` |
| Import path without `.js` | Always use `.js` extension: `import { x } from '../../../src/services/foo.service.js'` |

---

## Run Tests

```bash
pnpm --filter @kasa/backend run test
# Or a single file:
cd backend && npx vitest run tests/unit/services/dashboard.service.test.ts
```

Always run `pnpm check` before committing.
