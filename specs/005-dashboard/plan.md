# Implementation Plan: Dashboard — Financial Overview

**Branch**: `005-dashboard` | **Date**: 2026-02-23 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/005-dashboard/spec.md`

## Summary

Single-page dashboard providing an at-a-glance financial overview: a global summary card
(total balance, monthly income/spending, net cash flow), per-account cards with balance
variation and recent transactions, and a grouped bar chart comparing category spending for
the current vs. previous calendar month.

**Approach**: Additive schema migration (add `accountLabel` to `ImportedTransaction`, extracted
from the SG CSV pre-header at parse time). New `dashboard.service.ts` runs three PostgreSQL
aggregations in parallel. Single `GET /api/dashboard` endpoint. New `DashboardPage` (replaces
placeholder) with `GlobalSummaryCard`, `AccountCard`, `SpendingChart` (lazy-loaded via
Recharts/shadcn chart), and `DashboardSkeleton`. RTK Query cache 60 s TTL.

## Technical Context

**Language/Version**: TypeScript 5.7 (strict mode), Node.js 22 LTS
**Primary Dependencies**: Recharts 2.x via shadcn chart wrapper (frontend), Koa 2 + @koa/router (backend), React 19 + RTK Query, Prisma 6 + PostgreSQL 16, react-intl
**Storage**: PostgreSQL 16 — 1 additive migration (new `account_label` column on `imported_transaction`)
**Testing**: Vitest 3 — coverage ≥ 80% per module (v8 provider)
**Target Platform**: Node.js (Vercel Functions) + React SPA (Vite 6)
**Project Type**: Monorepo pnpm — `backend/` + `frontend/` + `packages/db/`
**Performance Goals**: `GET /api/dashboard` P95 < 500 ms server-side (3 parallel SQL aggregations); full dashboard interactive ≤ 1.5 s P95 (SC-001); skeleton ≤ 200 ms (SC-002)
**Constraints**: Biome zero-issue; tsc strict; cyclomatic complexity ≤ 10; WCAG 2.1 AA; PWA-safe bundle (chart lazy-loaded)
**Scale/Scope**: Single user; ~500–2 000 transactions per year; no pagination on dashboard (aggregated totals only)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **I. Code Quality**: Biome configured at repo root. `dashboard.service.ts` exports three
  pure-function-style async service functions (`getAccountSummaries`, `getGlobalSummary`,
  `getCategoryComparison`), each with a single responsibility and complexity ≤ 10. All raw SQL
  typed explicitly (`Prisma.sql` tagged template + typed result interfaces). No `any`.
- [x] **II. Testing Standards**: All three service functions are unit-tested with mocked Prisma
  client. `dashboard.router.ts` has an integration test against a real test DB. Frontend
  components tested with React Testing Library (render + loading + error states). Coverage ≥ 80%
  per new module.
- [x] **III. UX Consistency**: All string literals pass through `react-intl` (new `dashboard.*`
  i18n keys in `en.json` + `fr.json`). Conditional class names use `cn()`. Mobile-first layout
  (≤ 375 px single column, ≥ 1024 px grid). Error message (fetch failure) is human-readable with
  a retry button; no raw codes or stack traces. Skeleton loading prevents blank-screen period.
- [x] **IV. Performance**: SLOs: `GET /api/dashboard` P95 < 500 ms (three parallel SQL queries
  on indexed columns). Full page interactive ≤ 1.5 s P95 (SC-001). Skeleton ≤ 200 ms (SC-002).
  Recharts loaded via `React.lazy()` + `<Suspense>` — does not inflate initial bundle. Dashboard
  SLO must be verified in integration test by asserting response time.
- [x] **Violations**: None. No constitution exceptions required.

## Project Structure

### Documentation (this feature)

```text
specs/005-dashboard/
├── plan.md              ← This file
├── research.md          ← Phase 0 — charting library, account labelling, API design
├── data-model.md        ← Phase 1 — schema change + computed DTOs
├── quickstart.md        ← Phase 1 — local dev walkthrough
├── contracts/
│   └── openapi.yaml     ← Phase 1 — GET /api/dashboard
└── tasks.md             ← Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code

```text
packages/db/
├── prisma/
│   ├── schema.prisma                                    MODIFIED — ImportedTransaction: +accountLabel
│   └── migrations/
│       └── 20260225000000_005_add_account_label/        NEW — ALTER TABLE add account_label column

backend/
├── src/
│   ├── app.ts                                           MODIFIED — register dashboardRouter
│   ├── routes/
│   │   └── dashboard.router.ts                          NEW — GET /api/dashboard
│   └── services/
│       ├── csvParser.service.ts                         MODIFIED — extract accountLabel from pre-header
│       ├── import.service.ts                            MODIFIED — pass accountLabel when creating ImportedTransaction
│       └── dashboard.service.ts                         NEW — getAccountSummaries, getGlobalSummary, getCategoryComparison
└── tests/
    ├── unit/
    │   └── services/
    │       ├── dashboard.service.test.ts                NEW
    │       └── csvParser.accountLabel.test.ts           NEW (augments existing parser tests)
    └── integration/
        └── routes/
            └── dashboard.router.test.ts                 NEW

frontend/
├── src/
│   ├── main.tsx                                         MODIFIED — import DashboardPage, replace <h1> placeholder
│   ├── services/
│   │   └── dashboardApi.ts                              NEW — RTK Query getDashboard endpoint
│   ├── store/
│   │   └── index.ts                                     MODIFIED — add dashboardApi reducer + middleware
│   ├── pages/
│   │   └── DashboardPage.tsx                            NEW
│   ├── components/
│   │   ├── ui/
│   │   │   └── chart.tsx                                NEW — shadcn chart wrapper (copied via CLI)
│   │   ├── GlobalSummaryCard.tsx                        NEW
│   │   ├── AccountCard.tsx                              NEW
│   │   ├── SpendingChart.tsx                            NEW (lazy-loaded)
│   │   └── DashboardSkeleton.tsx                        NEW
│   └── i18n/
│       ├── en.json                                      MODIFIED — add dashboard.* keys
│       └── fr.json                                      MODIFIED — add dashboard.* keys
└── tests/
    └── unit/
        ├── services/
        │   └── dashboardApi.test.tsx                    NEW
        └── components/
            ├── GlobalSummaryCard.test.tsx               NEW
            ├── AccountCard.test.tsx                     NEW
            ├── SpendingChart.test.tsx                   NEW
            └── DashboardSkeleton.test.tsx               NEW
```

**Structure Decision**: Web application (Option 2) — existing `backend/` + `frontend/` layout.
No new package or workspace entry required. `recharts` added as a direct dependency of
`frontend/` (not as a workspace package).

## Complexity Tracking

> No constitution violations. Table not required.
