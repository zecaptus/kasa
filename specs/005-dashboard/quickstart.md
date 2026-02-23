# Quickstart: 005-dashboard

## Prerequisites

- Phase 3 (004-transactions) merged to `main` ✓
- `pnpm install` run at repo root
- PostgreSQL 16 running locally (or via `docker compose up db`)
- `.env` file in `backend/` with `DATABASE_URL` and `JWT_SECRET`

---

## Step 1 — Apply the Migration

```bash
pnpm --filter @kasa/db run db:migrate
pnpm --filter @kasa/db run db:generate
```

This applies:
```
packages/db/prisma/migrations/20260225000000_005_add_account_label/
```

Which runs:
```sql
ALTER TABLE "imported_transaction" ADD COLUMN "account_label" TEXT NOT NULL DEFAULT '';
```

Existing rows receive `account_label = ''`. The column is displayed as a localised
"Compte principal" / "Main account" fallback in the UI.

**Verify**:
```bash
psql $DATABASE_URL -c "
  SELECT column_name, data_type, column_default
  FROM information_schema.columns
  WHERE table_name = 'imported_transaction'
    AND column_name = 'account_label';"
```

Expected output:
```
 column_name  | data_type | column_default
--------------+-----------+---------------
 account_label | text      | ''::text
```

---

## Step 2 — Seed Dev Data (optional)

```bash
pnpm --filter @kasa/db run db:seed
```

The seed creates:
- 1 test user (`test@kasa.app` / `password: Test1234!`)
- 2 import sessions with `accountLabel` values `"Compte courant"` and `"Livret A"`
- ~40 imported transactions spread across the current and previous calendar month
- ~5 manual expenses in the current month
- System categories with category rules for auto-categorisation

---

## Step 3 — Start Dev Server

```bash
pnpm dev
```

- Frontend: `http://localhost:5173/`
- Backend: `http://localhost:3000/`

---

## Step 4 — Verify the Dashboard API

```bash
# 1. Authenticate
curl -s -c /tmp/kasa-cookies.txt \
  -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@kasa.app","password":"Test1234!"}' | jq .

# 2. Fetch dashboard
curl -s -b /tmp/kasa-cookies.txt \
  http://localhost:3000/api/dashboard | jq .
```

**Expected shape** (seeded data):

```json
{
  "summary": {
    "totalBalance": 4250.50,
    "monthlySpending": 850.00,
    "monthlyIncome": 2800.00,
    "netCashFlow": 1950.00
  },
  "accounts": [
    {
      "label": "Compte courant",
      "balance": 1250.50,
      "monthlyVariation": -320.00,
      "recentTransactions": [ /* 5 items */ ]
    },
    {
      "label": "Livret A",
      "balance": 3000.00,
      "monthlyVariation": 0.00,
      "recentTransactions": []
    }
  ],
  "categoryComparison": {
    "currentMonth": [ /* up to 10 items */ ],
    "previousMonth": [ /* same length */ ]
  }
}
```

**Empty-state response** (no transactions):

```json
{
  "summary": { "totalBalance": 0, "monthlySpending": 0, "monthlyIncome": 0, "netCashFlow": 0 },
  "accounts": [],
  "categoryComparison": { "currentMonth": [], "previousMonth": [] }
}
```

---

## Step 5 — Verify the Frontend

Navigate to `http://localhost:5173/` (the `/` route now renders `DashboardPage`).

Expected UI with seeded data:
- **Global summary card**: total balance, monthly income, monthly spending, net cash flow.
- **Account cards**: two cards ("Compte courant", "Livret A") each with balance, variation
  indicator, and recent transaction list.
- **Spending chart**: grouped bar chart comparing the current and previous month by category.
  Chart is lazy-loaded — a skeleton placeholder appears first, then the Recharts component.

Expected empty state (no seed data):
- Global summary card shows all zeros.
- No account cards ("No accounts found" empty state).
- Chart shows "No categorised transactions yet" empty state.

---

## Step 6 — Run Tests

```bash
pnpm test
```

Coverage target ≥ 80% per module. Key modules to verify:

| Module | What is tested |
|---|---|
| `backend/src/services/dashboard.service.ts` | `getAccountSummaries`, `getGlobalSummary`, `getCategoryComparison` — unit tests with mocked Prisma |
| `backend/src/services/csvParser.service.ts` | Pre-header extraction of `accountLabel` — unit tests with fixture CSV buffers |
| `backend/src/routes/dashboard.router.ts` | `GET /api/dashboard` — integration test with seeded DB |
| `frontend/src/services/dashboardApi.ts` | RTK Query endpoint type safety and cache behaviour |
| `frontend/src/pages/DashboardPage.tsx` | Renders summary, accounts, chart; skeleton during loading; error state with retry |
| `frontend/src/components/AccountCard.tsx` | Balance, variation (positive/negative), 5 recent transactions, empty state |
| `frontend/src/components/GlobalSummaryCard.tsx` | All four fields, locale currency formatting |
| `frontend/src/components/SpendingChart.tsx` | Renders chart with data; shows empty state; "Other" grouping when > 9 categories |

---

## Step 7 — Test Account Label Extraction (CSV Parser)

To verify the updated parser correctly extracts `accountLabel` from a pre-header:

```bash
# Create a minimal fixture CSV matching SG "5col-operation" format with a pre-header
cat > /tmp/test-sg.csv << 'EOF'
Numéro de compte ; FR76 3000 3030 0001 2345 6789 012;;
Libellé du compte ; Compte courant;;
Devise ; EUR;;
Date de l'opération;Libellé;Détail de l'écriture;Montant;Devise
15/02/2026;CB MONOPRIX;Achat en magasin;-45.30;EUR
EOF

curl -s -b /tmp/kasa-cookies.txt \
  -X POST http://localhost:3000/api/import/csv \
  -F "file=@/tmp/test-sg.csv" | jq '.transactions[0].accountLabel'
# Expected: "Compte courant"
```
