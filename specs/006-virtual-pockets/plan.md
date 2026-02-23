# Implementation Plan: Cagnottes — Virtual Savings Pockets

**Branch**: `006-virtual-pockets` | **Date**: 2026-02-23 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/006-virtual-pockets/spec.md`

## Summary

Virtual savings pockets that users can create against any bank account in their transaction
data. Each pocket has a name, colour, and savings goal; users allocate and withdraw amounts
manually; allocated totals can never exceed the linked account's current balance.

**Approach**: 2 new Prisma models (`Pocket`, `PocketMovement`) + 1 enum (`PocketMovementDir`).
7 REST endpoints under `/api/pockets`. Separate pockets API (RTK Query) called in parallel with
the dashboard API — pocket cards rendered nested inside `AccountCard` on the dashboard.
New `/cagnottes` management page for full CRUD + movement history.

## Technical Context

**Language/Version**: TypeScript 5.7 (strict mode), Node.js 22 LTS
**Primary Dependencies**: Koa 2 + @koa/router (backend), React 19 + RTK Query (frontend), Prisma 6 + PostgreSQL 16, react-intl
**Storage**: PostgreSQL 16 — 2 new models (`Pocket`, `PocketMovement`), 1 new enum, 1 migration
**Testing**: Vitest 3 — coverage ≥ 80% per module (v8 provider)
**Target Platform**: Node.js (Vercel Functions) + React SPA (Vite 6)
**Project Type**: Monorepo pnpm — `backend/` + `frontend/` + `packages/db/`
**Performance Goals**: `GET /api/pockets` P95 < 300 ms; pocket detail P95 < 300 ms; balance check synchronous within movement creation
**Constraints**: Biome zero-issue; tsc strict; complexity ≤ 10; WCAG 2.1 AA; no over-allocation permitted (FR-006)
**Scale/Scope**: Single user; ≤ 20 pockets; ≤ 200 movements per pocket

## Constitution Check

- [x] **I. Code Quality**: Biome at repo root; all new functions respect ≤ 10 complexity. Balance-check logic extracted into a pure function `computeHeadroom(accountBalance, totalAllocated)`. `pockets.service.ts` exports focused, single-responsibility functions. No `any`.
- [x] **II. Testing Standards**: `pockets.service.ts` covered by unit tests (mocked Prisma). `pockets.router.ts` covered by integration tests. `PocketCard.tsx`, `PocketsPage.tsx` covered by React Testing Library unit tests. Coverage target ≥ 80% per module.
- [x] **III. UX Consistency**: All strings via `react-intl` (new `pockets.*` keys in `en.json` + `fr.json`). Conditional classes via `cn()`. Mobile-first (≤375 px). Error messages human-readable (INSUFFICIENT_HEADROOM shows exact headroom amount). Empty states and loading skeletons consistent with dashboard patterns.
- [x] **IV. Performance**: SLOs documented: `GET /api/pockets` and movement operations P95 < 300 ms. Indexes on `(userId)` and `(userId, accountLabel)` for pocket queries. Index on `(pocketId, date)` for movement pagination. Balance-check query runs in the same DB transaction as movement creation to prevent race conditions.
- [x] **Violations**: None. No constitution exceptions required.

## Project Structure

### Documentation (this feature)

```text
specs/006-virtual-pockets/
├── plan.md              ← This file
├── research.md          ← Technical decisions
├── data-model.md        ← Schema + computed DTOs + balance enforcement SQL
├── quickstart.md        ← Local dev walkthrough
├── contracts/
│   └── openapi.yaml     ← 7 REST endpoints
└── tasks.md             ← Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code

```text
packages/db/
├── prisma/
│   ├── schema.prisma                                    MODIFIED — +Pocket, +PocketMovement, +PocketMovementDir, +User.pockets relation
│   └── migrations/
│       └── 20260226000000_006_add_pockets/              NEW — CREATE TABLE Pocket, PocketMovement + indexes

backend/
├── src/
│   ├── app.ts                                           MODIFIED — register pocketsRouter
│   ├── routes/
│   │   └── pockets.router.ts                            NEW — 7 endpoints
│   └── services/
│       └── pockets.service.ts                           NEW — listPockets, createPocket, getPocket,
│                                                              updatePocket, deletePocket,
│                                                              createMovement, deleteMovement,
│                                                              computeHeadroom (pure)
└── tests/
    ├── unit/
    │   └── services/
    │       └── pockets.service.test.ts                  NEW
    └── integration/
        └── pockets.integration.test.ts                  NEW

frontend/
├── src/
│   ├── main.tsx                                         MODIFIED — add /cagnottes route
│   ├── services/
│   │   └── pocketsApi.ts                                NEW — RTK Query 7 endpoints
│   ├── store/
│   │   └── index.ts                                     MODIFIED — register pocketsApi
│   ├── components/
│   │   ├── AccountCard.tsx                              MODIFIED — accept + render pockets[] prop
│   │   ├── PocketCard.tsx                               NEW — progress bar, goal, colour
│   │   └── PocketForm.tsx                               NEW — create/edit form (name, goal, colour, account)
│   ├── pages/
│   │   ├── DashboardPage.tsx                            MODIFIED — call useListPocketsQuery, pass to AccountCard
│   │   └── PocketsPage.tsx                              NEW — management page (/cagnottes)
│   ├── components/
│   │   └── NavBar.tsx                                   MODIFIED — add Cagnottes nav link
│   └── i18n/
│       ├── en.json                                      MODIFIED — add pockets.* keys
│       └── fr.json                                      MODIFIED — add pockets.* keys
└── tests/
    └── unit/
        ├── components/
        │   ├── PocketCard.test.tsx                      NEW
        │   └── PocketForm.test.tsx                      NEW
        ├── pages/
        │   └── PocketsPage.test.tsx                     NEW
        └── services/
            └── pocketsApi.test.tsx                      NEW
```

**Structure Decision**: Web application (Option 2) — existing `backend/` + `frontend/` layout. No new package required.

## Complexity Tracking

> No constitution violations. Table not required.
