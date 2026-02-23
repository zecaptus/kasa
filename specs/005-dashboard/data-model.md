# Data Model: 005-dashboard

## Schema Changes

### 1. `ImportedTransaction` — new field

```prisma
model ImportedTransaction {
  // ... existing fields ...
  accountLabel   String               @default("")   // NEW
  // ...
}
```

| Field | Type | Constraint | Purpose |
|---|---|---|---|
| `accountLabel` | `String` | `@default("")` | Display name of the bank account (extracted from CSV pre-header or derived from filename). Empty string = unknown / no CSV metadata available. |

**Migration file**: `packages/db/prisma/migrations/20260225000000_005_add_account_label/migration.sql`

```sql
ALTER TABLE "imported_transaction" ADD COLUMN "account_label" TEXT NOT NULL DEFAULT '';
```

No index needed on `accountLabel` alone; it will be used in GROUP BY aggregations alongside
`userId` which is already indexed.

---

## Computed Read Models (server-side, no new DB tables)

These types are computed by `dashboard.service.ts` and serialised to JSON by the API. They are
not persisted.

### `RecentTransactionDto`

```typescript
interface RecentTransactionDto {
  id: string;
  date: string;           // YYYY-MM-DD
  label: string;
  amount: number;
  direction: 'debit' | 'credit';
}
```

### `AccountSummaryDto`

```typescript
interface AccountSummaryDto {
  label: string;                         // accountLabel value (empty → displayed as default)
  balance: number;                       // Sum(credit) - Sum(debit) all-time for this label
  monthlyVariation: number;             // This calendar month: Sum(credit) - Sum(debit)
  recentTransactions: RecentTransactionDto[];  // Last 5, accountingDate DESC
}
```

**Balance computation**:
- `balance = SUM(credit) - SUM(debit)` over all `ImportedTransaction` where `userId = $userId`
  AND `accountLabel = $label` AND `debit IS NOT NULL OR credit IS NOT NULL`.
- `monthlyVariation = SUM(credit) - SUM(debit)` filtered to `accountingDate` in the current
  calendar month.

### `DashboardSummaryDto`

```typescript
interface DashboardSummaryDto {
  totalBalance: number;       // Sum of all account balances (ImportedTransaction only)
  monthlySpending: number;    // Sum(debit) current month — ImportedTransaction + ManualExpense
  monthlyIncome: number;      // Sum(credit) current month — ImportedTransaction only
  netCashFlow: number;        // monthlyIncome - monthlySpending
}
```

**Note**: `ManualExpense.amount` is always a positive value representing a spending amount
(expense). It contributes to `monthlySpending` only.

### `CategorySpendingDto`

```typescript
interface CategorySpendingDto {
  categoryId: string | null;  // null = uncategorised
  name: string;               // Category name; "Sans catégorie" / "Uncategorised" handled client-side via i18n
  slug: string;
  color: string;
  amount: number;             // Sum(debit) for this category in the given calendar month
                              // (ImportedTransaction + ManualExpense)
}
```

### `CategoryComparisonDto`

```typescript
interface CategoryComparisonDto {
  currentMonth: CategorySpendingDto[];   // Top 9 + "Other" (if > 9 categories)
  previousMonth: CategorySpendingDto[];  // Same slots as currentMonth
}
```

**Grouping rule**: The top-9 categories are determined by total spending in the **current month**.
Previous-month data is mapped onto the same slots. Categories not in the top-9 (from either
month) are summed into a synthetic `{ categoryId: null, name: 'other', slug: 'other', color:
'#94a3b8', amount: X }` entry.

### `DashboardResponseDto` (full API response)

```typescript
interface DashboardResponseDto {
  summary: DashboardSummaryDto;
  accounts: AccountSummaryDto[];
  categoryComparison: CategoryComparisonDto;
}
```

---

## Data Flow

```
PostgreSQL
  ImportedTransaction (grouped by accountLabel)  ──→  AccountSummaryDto[]
  ImportedTransaction + ManualExpense (current month totals)  ──→  DashboardSummaryDto
  ImportedTransaction + ManualExpense (grouped by category, 2 months)  ──→  CategoryComparisonDto

dashboard.service.ts
  getAccountSummaries(userId)
  getGlobalSummary(userId)
  getCategoryComparison(userId, year, month)
  → all three run in parallel via Promise.all

GET /api/dashboard
  → DashboardResponseDto (serialised to JSON)

RTK Query dashboardApi.getDashboard
  → cached 60 s

DashboardPage.tsx
  ├── GlobalSummaryCard    (summary)
  ├── AccountCard × N      (accounts[])
  └── SpendingChart        (categoryComparison — lazy-loaded)
```
