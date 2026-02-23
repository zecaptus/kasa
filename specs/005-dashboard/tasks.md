# Tasks: Dashboard — Financial Overview

**Input**: Design documents from `/specs/005-dashboard/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/openapi.yaml ✓, quickstart.md ✓

**Organization**: Tasks grouped by user story (spec.md US1–US5) to enable independent
implementation and testing of each story.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no unresolved dependencies)
- **[Story]**: Which user story this task belongs to (US1–US5)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Schema migration and frontend charting dependency — must complete before any
backend or frontend work can reference the new `accountLabel` field or `recharts`.

- [x] T001 Write Prisma migration file `packages/db/prisma/migrations/20260225000000_005_add_account_label/migration.sql` — SQL: `ALTER TABLE "imported_transaction" ADD COLUMN "account_label" TEXT NOT NULL DEFAULT '';`
- [x] T002 Update `packages/db/prisma/schema.prisma` — add `accountLabel String @default("")` field to `ImportedTransaction` model
- [x] T003 Apply migration and regenerate Prisma client: `pnpm --filter @kasa/db run db:migrate && pnpm --filter @kasa/db run db:generate`
- [x] T004 [P] Install recharts and add shadcn chart wrapper: `pnpm --filter frontend add recharts` then copy chart wrapper to `frontend/src/components/ui/chart.tsx` (run `pnpm dlx shadcn@latest add chart` or copy manually following shadcn chart component structure with CSS variable theming)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Backend API + frontend API service layer + i18n keys. Must be complete before
any user story component can be implemented or tested end-to-end.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T005 [P] Update `backend/src/services/csvParser.service.ts` — modify `parseSgCsv()` to scan pre-header rows (before the column header row) for `Libellé du compte` (preferred) and `Numéro de compte` (fallback); store extracted value in a returned `accountLabel` string. If neither row found, derive label from filename by stripping `.csv` extension and replacing `_`/`-` with spaces. Update `ParsedTransaction` interface to include `accountLabel: string`.
- [x] T006 Update `backend/src/services/import.service.ts` — update `importCsv()` to pass `accountLabel` (from `ParsedTransaction`) into each `Prisma.ImportedTransactionCreateManySessionInput`; update the `toInsert` map to include `accountLabel: tx.accountLabel`.
- [x] T007 Create `backend/src/services/dashboard.service.ts` — implement three exported async functions: (1) `getGlobalSummary(userId)` — uses `$queryRaw` to SUM debits (ImportedTransaction + ManualExpense) and credits (ImportedTransaction only) for the current calendar month; compute `totalBalance` as all-time Sum(credit)−Sum(debit); (2) `getAccountSummaries(userId)` — groups ImportedTransaction by `accountLabel`, computes balance and `monthlyVariation` per label, fetches 5 most recent transactions per label; (3) `getCategoryComparison(userId, year, month)` — groups ImportedTransaction + ManualExpense debits by `categoryId` for current and previous months, returns top 9 categories + "other" bucket. All three called in parallel via `Promise.all` in the router.
- [x] T008 Create `backend/src/routes/dashboard.router.ts` — `GET /api/dashboard` behind `requireAuth`; calls `Promise.all([getGlobalSummary, getAccountSummaries, getCategoryComparison])` with `userId` from `ctx.state.user.sub`; serialises `Decimal` to `number`; returns `DashboardResponseDto`; returns `{ error: 'INTERNAL_ERROR' }` with status 500 on unexpected errors.
- [x] T009 Update `backend/src/app.ts` — import `dashboardRouter` and register it alongside existing routers (e.g., after `transactionsRouter`).
- [x] T010 [P] Write unit tests for `dashboard.service.ts` in `backend/tests/unit/services/dashboard.service.test.ts` — mock `@kasa/db` prisma client; test `getGlobalSummary` (with data, zero data, mixed debit/credit); test `getAccountSummaries` (two accounts, single account, empty, negative balance); test `getCategoryComparison` (< 9 categories, exactly 9, > 9 categories triggers "other" bucket, empty data).
- [x] T011 [P] Write integration test for `GET /api/dashboard` in `backend/tests/integration/routes/dashboard.router.test.ts` — test 200 with seeded transactions, 200 empty state (no transactions), 401 without auth cookie.
- [x] T012 [P] Write unit tests for csvParser accountLabel extraction in `backend/tests/unit/services/csvParser.accountLabel.test.ts` — test pre-header containing `Libellé du compte`; test pre-header with `Numéro de compte` only; test CSV with no pre-header (filename fallback); test all three SG CSV formats (5col, 4col, 5col-operation).
- [x] T013 Create `frontend/src/services/dashboardApi.ts` — new `createApi` with `reducerPath: 'dashboardApi'`; define `getDashboard` query endpoint (`GET /api/dashboard`); define `DashboardResponseDto`, `AccountSummaryDto`, `DashboardSummaryDto`, `CategorySpendingDto`, `CategoryComparisonDto`, `RecentTransactionDto` TypeScript interfaces matching the OpenAPI schema; set `keepUnusedDataFor: 60`.
- [x] T014 Update `frontend/src/store/index.ts` — import `dashboardApi`, add `[dashboardApi.reducerPath]: dashboardApi.reducer` to the `reducer` map, add `dashboardApi.middleware` to the middleware chain.
- [x] T015 [P] Add `dashboard.*` i18n keys to `frontend/src/i18n/en.json` — keys: `dashboard.title`, `dashboard.summary.totalBalance`, `dashboard.summary.monthlySpending`, `dashboard.summary.monthlyIncome`, `dashboard.summary.netCashFlow`, `dashboard.account.default` ("Main account"), `dashboard.account.variation.up`, `dashboard.account.variation.down`, `dashboard.account.noTransactions`, `dashboard.chart.title`, `dashboard.chart.currentMonth`, `dashboard.chart.previousMonth`, `dashboard.chart.other`, `dashboard.chart.empty`, `dashboard.noAccounts`, `dashboard.error.title`, `dashboard.error.retry`, `dashboard.loading`.
- [x] T016 [P] Add French translations for all `dashboard.*` keys to `frontend/src/i18n/fr.json` — mirror keys from T015 with French values (e.g., `dashboard.account.default` → "Compte principal", `dashboard.chart.other` → "Autres", etc.).
- [x] T017 [P] Write unit tests for `dashboardApi.ts` in `frontend/tests/unit/services/dashboardApi.test.tsx` — verify endpoint URL, response shape types, and `keepUnusedDataFor` configuration using RTK Query mock store.

**Checkpoint**: Backend `GET /api/dashboard` returns correct JSON. Frontend RTK Query hook
`useGetDashboardQuery` is wired and typed. i18n keys are defined. Ready for component work.

---

## Phase 3: User Story 1 — Global Financial Snapshot (Priority: P1) 🎯 MVP

**Goal**: The dashboard page loads and shows total balance, monthly income, monthly spending,
and net cash flow in a global summary card. This is the minimum viable dashboard.

**Independent Test**: Navigate to `/` while authenticated; verify the global indicator section
renders with correct aggregated monetary values from the API.

- [x] T018 [US1] Create `frontend/src/components/GlobalSummaryCard.tsx` — accepts `summary: DashboardSummaryDto` prop; renders four labelled monetary values (`totalBalance`, `monthlyIncome`, `monthlySpending`, `netCashFlow`) using `<FormattedNumber>` from react-intl with `style="currency"` and `currency="EUR"`; uses `cn()` for conditional classes (positive netCashFlow = green, negative = red); `role="region"` with `aria-label` for WCAG 2.1 AA.
- [x] T019 [P] [US1] Write unit tests for `GlobalSummaryCard` in `frontend/tests/unit/components/GlobalSummaryCard.test.tsx` — renders all four values, correct currency format (€ symbol, decimal places), green class on positive netCashFlow, red class on negative, zero-state renders without errors.

**Checkpoint**: `GlobalSummaryCard` renders correctly in isolation with mock data.

---

## Phase 4: User Story 2 — Per-Account Balance Card (Priority: P2)

**Goal**: One card per bank account showing current balance, monthly variation with direction
indicator, and the 5 most recent transactions.

**Independent Test**: Verify each account detected in transaction data has its own card;
verify negative balance shows red treatment; verify zero variation shows neutral indicator.

- [x] T020 [US2] Create `frontend/src/components/AccountCard.tsx` — accepts `account: AccountSummaryDto` prop; renders: account label (falls back to `dashboard.account.default` i18n key when label is empty string), current balance with `<FormattedNumber currency="EUR">`, monthly variation with upward/downward arrow icon and colour (positive = green, negative = red, zero = neutral), list of up to 5 `recentTransactions` (date + label + amount + direction icon), empty state when `recentTransactions` is empty; negative balance in red; uses `cn()` for all conditionals.
- [x] T021 [P] [US2] Write unit tests for `AccountCard` in `frontend/tests/unit/components/AccountCard.test.tsx` — renders label, balance, positive variation (green/up), negative variation (red/down), zero variation (neutral), negative balance (red), 5 transactions list, empty transactions state, default label when `account.label` is empty string.

**Checkpoint**: `AccountCard` renders correctly in isolation for all balance/variation states.

---

## Phase 5: User Story 3 — Category Spending Comparison Chart (Priority: P3)

**Goal**: A grouped bar chart comparing spending by category for the current vs. previous
calendar month, with an "Other" bucket when > 9 categories exist.

**Independent Test**: Verify the chart renders with mock two-month data; verify empty state
message appears when `categoryComparison.currentMonth` is empty.

- [x] T022 [US3] Create `frontend/src/components/SpendingChart.tsx` — accepts `categoryComparison: CategoryComparisonDto` prop; renders a Recharts `<BarChart>` (via shadcn chart wrapper) with two `<Bar>` series (current month / previous month) grouped by category; uses `chart.tsx` CSS variable theming for colours; adds `role="img"` and `aria-label` on the container for WCAG 2.1 AA; renders "Other" entry using `dashboard.chart.other` i18n key when `slug === 'other'`; renders empty state (`dashboard.chart.empty` i18n key) when `currentMonth` array is empty. **This component is the default export and will be loaded via `React.lazy()` in `DashboardPage`.**
- [x] T023 [P] [US3] Write unit tests for `SpendingChart` in `frontend/tests/unit/components/SpendingChart.test.tsx` — chart renders with data (two Bar series visible), empty state renders when `currentMonth` is empty, "Other" label rendered from i18n when entry has `slug === 'other'`, `aria-label` present on container.

**Checkpoint**: `SpendingChart` renders with mock data; empty state and "Other" bucket work.

---

## Phase 6: User Story 5 — Skeleton Loading States (Priority: P5)

**Goal**: Skeleton placeholders appear immediately when the dashboard data is loading,
preventing any blank-screen period. (Implemented before the Page because the Page needs it.)

**Independent Test**: Verify `DashboardSkeleton` renders placeholder shapes that match the
layout of the real dashboard (summary card + account cards + chart area).

- [x] T024 [US5] Create `frontend/src/components/DashboardSkeleton.tsx` — renders animated skeleton placeholder blocks in the same grid positions as the real dashboard: one summary card placeholder, three account card placeholders (representative), one chart area placeholder; uses Tailwind `animate-pulse` class; no props required (pure structural placeholder).
- [x] T025 [P] [US5] Write unit tests for `DashboardSkeleton` in `frontend/tests/unit/components/DashboardSkeleton.test.tsx` — renders without errors, contains expected number of skeleton blocks, `animate-pulse` class present.

**Checkpoint**: `DashboardSkeleton` renders and looks like the dashboard in loading state.

---

## Phase 7: User Story 4 — Responsive Layout + Page Integration (Priority: P4)

**Goal**: `DashboardPage` assembles all components into a responsive layout (single-column
≤ 375 px, multi-column grid ≥ 1024 px) with correct loading and error states.

**Independent Test**: Open `/` while authenticated; verify skeleton during load; verify full
dashboard renders after load; verify single-column on 375 px viewport; verify multi-column on
1024 px viewport; verify error state with retry button when API fails.

- [x] T026 [US4] Create `frontend/src/pages/DashboardPage.tsx` — calls `useGetDashboardQuery()` from `dashboardApi`; while `isLoading`: renders `<DashboardSkeleton />`; on `isError`: renders error state with human-readable message (`dashboard.error.title` i18n key) and retry button (`dashboard.error.retry` key) that calls `refetch()`; on `data`: renders `<GlobalSummaryCard summary={data.summary} />`, `{data.accounts.map(a => <AccountCard key={a.label} account={a} />)}`, and `<Suspense fallback={<SkeletonChartArea />}><LazySpendingChart categoryComparison={data.categoryComparison} /></Suspense>`; responsive grid layout using Tailwind: `grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4`; account cards grid below summary; all static strings via `<FormattedMessage>` or `useIntl()`.
- [x] T027 [US4] Update `frontend/src/main.tsx` — replace `{ path: '/', element: <h1>Dashboard</h1> }` with `{ path: '/', Component: DashboardPage }` and add the import for `DashboardPage`.
- [x] T028 [P] [US4] Write unit tests for `DashboardPage` in `frontend/tests/unit/pages/DashboardPage.test.tsx` — loading state renders skeleton (mock `isLoading: true`), error state renders retry button (mock `isError: true`), data state renders GlobalSummaryCard + AccountCard × N + SpendingChart (mock `data`), retry button calls `refetch`, no hardcoded strings (all from i18n).

**Checkpoint**: Full dashboard renders at `/`. All five user stories visible and functional.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Seed update, code quality gates, coverage validation, and quickstart verification.

- [x] T029 Update `packages/db/prisma/seed.ts` — add `accountLabel` values (`"Compte courant"` and `"Livret A"`) to the seeded `ImportedTransaction` fixtures so the seeded dashboard shows two account cards.
- [x] T030 [P] Run `pnpm check:fix` — auto-fix all Biome lint/format issues across modified files; verify zero issues remain with `pnpm check`.
- [x] T031 [P] Run `pnpm typecheck` — verify `tsc --noEmit` passes with no errors across `backend/`, `frontend/`, and `packages/db/`.
- [x] T032 Run `pnpm test` — verify test suite passes and each new module reaches ≥ 80% statement coverage (dashboard.service.ts, csvParser.service.ts additions, dashboard.router.ts, dashboardApi.ts, GlobalSummaryCard.tsx, AccountCard.tsx, SpendingChart.tsx, DashboardSkeleton.tsx, DashboardPage.tsx).
- [x] T033 Validate quickstart.md locally — apply migration, optionally seed, start dev server, run curl commands from quickstart.md Step 5, verify JSON shape matches expected output; navigate to `http://localhost:5173/` and confirm dashboard renders.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion (migration must be applied before Prisma types are usable) — **blocks all user story phases**
- **US1 (Phase 3)**: Depends on Phase 2 — no dependency on US2/US3/US4/US5
- **US2 (Phase 4)**: Depends on Phase 2 — no dependency on US1/US3/US4/US5
- **US3 (Phase 5)**: Depends on Phase 2 — no dependency on US1/US2/US4/US5
- **US5 (Phase 6)**: Depends on Phase 2 — no dependency on other user stories
- **US4 / Integration (Phase 7)**: Depends on US1 (T018), US2 (T020), US3 (T022), US5 (T024) — assembles all components
- **Polish (Phase 8)**: Depends on Phase 7 completion

### User Story Dependencies

- **US1 (P1)**: Depends on Phase 2 only. Independently testable via `GlobalSummaryCard` in isolation.
- **US2 (P2)**: Depends on Phase 2 only. Independently testable via `AccountCard` in isolation.
- **US3 (P3)**: Depends on Phase 2 only. Independently testable via `SpendingChart` in isolation.
- **US5 (P5)**: Depends on Phase 2 only. Independently testable via `DashboardSkeleton` in isolation.
- **US4 (P4)**: Depends on US1 + US2 + US3 + US5 (assembles all components in `DashboardPage`).

### Within Each Phase

- Models/schema before services (T001–T003 before T005–T009)
- Backend service before router (T007 before T008)
- Router before `app.ts` registration (T008 before T009)
- API service before store registration (T013 before T014)
- i18n keys before components (T015/T016 before T018–T026)
- Components before page assembly (T018, T020, T022, T024 before T026)

### Parallel Opportunities

- T004 (install recharts) runs in parallel with T005–T012 (backend work) — different concerns
- T005 (csvParser) runs in parallel with other Phase 2 tasks — isolated file change
- T010, T011, T012 (tests) run in parallel — different test files
- T013 (dashboardApi), T015/T016 (i18n) run in parallel — different files
- T018/T019, T020/T021, T022/T023, T024/T025 — each story pair runs in parallel after Phase 2
- US1, US2, US3, US5 phases can run in parallel with each other once Phase 2 is done
- T030 (check:fix) and T031 (typecheck) run in parallel — different tools

---

## Parallel Example: Phase 2 Backend

```bash
# These can all start once T003 (migration applied) is complete:
Task 1: "Update csvParser.service.ts to extract accountLabel"   # T005
Task 2: "Write unit tests for dashboard.service.ts"             # T010
Task 3: "Write integration test for dashboard.router.ts"        # T011
Task 4: "Write csvParser accountLabel unit tests"               # T012
Task 5: "Install recharts and copy shadcn chart.tsx"            # T004

# T006 depends on T005. T007 depends on T006. T008 depends on T007.
# T009 depends on T008.
```

## Parallel Example: User Stories (after Phase 2)

```bash
# Once Phase 2 is complete, all four component phases can run in parallel:
Story 1: "Create GlobalSummaryCard.tsx + tests"   # T018, T019
Story 2: "Create AccountCard.tsx + tests"          # T020, T021
Story 3: "Create SpendingChart.tsx + tests"        # T022, T023
Story 5: "Create DashboardSkeleton.tsx + tests"    # T024, T025
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete **Phase 1** (migration + recharts)
2. Complete **Phase 2** (backend API + frontend service layer)
3. Complete **Phase 3** (GlobalSummaryCard — US1)
4. Create a minimal `DashboardPage` that shows only `GlobalSummaryCard` (skip US2/US3/US5 for now)
5. Update `main.tsx` — replace `<h1>Dashboard</h1>`
6. **VALIDATE**: `/` shows global financial summary. Deploy or demo.

### Incremental Delivery

1. Setup + Foundational → API works, component stubs in place
2. Add US1 (`GlobalSummaryCard`) → Financial summary visible → Demo
3. Add US2 (`AccountCard`) → Per-account view → Demo
4. Add US3 (`SpendingChart`) → Category chart → Demo
5. Add US5 (`DashboardSkeleton`) → Polish loading experience → Demo
6. Assemble US4 (`DashboardPage` responsive grid) → Full polished dashboard → Ship

---

## Notes

- [P] tasks have no file conflicts and no unresolved upstream dependencies
- [US*] labels map to spec.md user stories for traceability
- `SpendingChart` must be the **default export** of its file (required for `React.lazy()`)
- `accountLabel` empty string `""` is a valid DB value; display logic (fallback label) lives in
  `AccountCard`, not in the service layer
- The "Other" category bucket has `categoryId: null`, `slug: 'other'` — components distinguish
  it from real uncategorised entries by slug, not by categoryId
- Run `pnpm check` after each task to catch Biome issues early
- Commit after completing each phase checkpoint
