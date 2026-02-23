# Tasks: Cagnottes — Virtual Savings Pockets

**Input**: Design documents from `/specs/006-virtual-pockets/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/openapi.yaml ✓, quickstart.md ✓

**Organization**: Tasks grouped by user story (spec.md US1–US5) to enable independent
implementation and testing of each story.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no unresolved dependencies)
- **[Story]**: Which user story this task belongs to (US1–US5)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Schema migration — must be complete before any backend or frontend work
can reference the new `Pocket` / `PocketMovement` models.

- [x] T001 Write migration file `packages/db/prisma/migrations/20260226000000_006_add_pockets/migration.sql` — CREATE TYPE `PocketMovementDir` AS ENUM ('ALLOCATION', 'WITHDRAWAL'); CREATE TABLE `Pocket` (id, userId FK→User CASCADE, accountLabel TEXT, name VARCHAR(100), goalAmount DECIMAL(12,2), color TEXT DEFAULT '#94a3b8', createdAt, updatedAt); CREATE TABLE `PocketMovement` (id, pocketId FK→Pocket CASCADE, direction PocketMovementDir, amount DECIMAL(12,2), note VARCHAR(255)?, date DATE, createdAt); all indexes per data-model.md
- [x] T002 Update `packages/db/prisma/schema.prisma` — add `PocketMovementDir` enum, `Pocket` model, `PocketMovement` model, and `pockets Pocket[]` relation on `User`
- [x] T003 Apply migration and regenerate Prisma client: `pnpm --filter @kasa/db run db:migrate && pnpm --filter @kasa/db run db:generate`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Backend service + router + frontend API service + i18n keys + store
registration. Must be complete before any user story component can be built.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T004 Create `backend/src/services/pockets.service.ts` — export: `listPockets(userId)` → `PocketSummaryDto[]`; `createPocket(userId, input)` → `PocketSummaryDto`; `getPocket(userId, id, pagination)` → `PocketDetailDto`; `updatePocket(userId, id, input)` → `PocketSummaryDto`; `deletePocket(userId, id)` → `boolean`; `createMovement(userId, pocketId, input)` → `PocketSummaryDto`; `deleteMovement(userId, pocketId, movementId)` → `PocketSummaryDto`; `computeHeadroom(userId, accountLabel, excludePocketId?)` → `number` (pure Prisma, uses $queryRaw for account balance + sum of allocations per data-model.md)
- [x] T005 Create `backend/src/routes/pockets.router.ts` — prefix `/api/pockets`, all 7 endpoints behind `requireAuth`; extract `userId` from `ctx.state.user.sub`; validate request bodies (name, goalAmount > 0, color hex pattern, direction enum, amount > 0, date ISO); return 201 on create, 204 on delete pocket, 200 elsewhere; 404 when pocket not found or not owned by user; 422 with `INSUFFICIENT_HEADROOM` / `INSUFFICIENT_POCKET_FUNDS` for business rule violations; follow pattern of `categories.router.ts`
- [x] T006 Register pockets router in `backend/src/app.ts` — import `pocketsRouter` and add `app.use(pocketsRouter.routes()); app.use(pocketsRouter.allowedMethods());`
- [x] T007 Write unit tests for `pockets.service.ts` in `backend/tests/unit/services/pockets.service.test.ts` — mock `@kasa/db`; test `listPockets` (empty, multiple accounts); `createPocket` (valid, invalid goalAmount); `createMovement` (ALLOCATION within headroom, ALLOCATION exceeds headroom → throws, WITHDRAWAL within balance, WITHDRAWAL exceeds balance → throws); `deleteMovement`; `computeHeadroom` (with existing allocations, with zero allocations)
- [x] T008 Write integration test in `backend/tests/integration/pockets.integration.test.ts` — test all 7 endpoints: 401 unauthenticated; 201 create pocket; 200 list; 200 get detail with movements; 200 PATCH update; 204 DELETE pocket; 201 add movement; 422 INSUFFICIENT_HEADROOM; 200 DELETE movement
- [x] T009 [P] Create `frontend/src/services/pocketsApi.ts` — new `createApi` with `reducerPath: 'pocketsApi'`; define `PocketSummaryDto`, `PocketMovementDto`, `PocketDetailDto` TypeScript interfaces matching openapi.yaml; endpoints: `listPockets` (GET /pockets, tag 'Pocket'), `createPocket` (POST /pockets, invalidates 'Pocket'), `getPocket` (GET /pockets/:id with cursor param), `updatePocket` (PATCH /pockets/:id, invalidates 'Pocket'), `deletePocket` (DELETE /pockets/:id, invalidates 'Pocket'), `createMovement` (POST /pockets/:id/movements, invalidates 'Pocket'), `deleteMovement` (DELETE /pockets/:id/movements/:movementId, invalidates 'Pocket')
- [x] T010 Register `pocketsApi` in `frontend/src/store/index.ts` — add `[pocketsApi.reducerPath]: pocketsApi.reducer` and `pocketsApi.middleware`
- [x] T011 [P] Add `pockets.*` i18n keys to `frontend/src/i18n/en.json` — keys: `pockets.title` ("Pockets"), `pockets.create` ("New pocket"), `pockets.edit` ("Edit"), `pockets.delete` ("Delete"), `pockets.delete.confirm` ("Delete pocket \"{name}\"? All movements will be lost."), `pockets.name` ("Name"), `pockets.goal` ("Goal amount"), `pockets.color` ("Colour"), `pockets.account` ("Account"), `pockets.allocated` ("Allocated"), `pockets.progress` ("Progress"), `pockets.noAccounts` ("Import a bank statement first."), `pockets.empty` ("No pockets yet. Create one to start saving."), `pockets.form.submit.create` ("Create"), `pockets.form.submit.update` ("Save"), `pockets.movement.add` ("Add movement"), `pockets.movement.allocation` ("Allocation"), `pockets.movement.withdrawal` ("Withdrawal"), `pockets.movement.amount` ("Amount"), `pockets.movement.note` ("Note (optional)"), `pockets.movement.date` ("Date"), `pockets.movement.empty` ("No movements yet."), `pockets.movement.delete` ("Delete"), `pockets.error.insufficientHeadroom` ("Maximum allocatable: {amount}"), `pockets.error.insufficientFunds` ("Insufficient allocated balance: {amount}"), `nav.pockets` ("Pockets")
- [x] T012 [P] Add French translations for all `pockets.*` keys to `frontend/src/i18n/fr.json`
- [x] T013 [P] Write unit tests for `pocketsApi.ts` in `frontend/tests/unit/services/pocketsApi.test.tsx` — verify `reducerPath`, all endpoint names, tag types

**Checkpoint**: `GET /api/pockets` returns `{ pockets: [] }`. RTK Query hooks are wired
and typed. i18n keys defined. Ready for component work.

---

## Phase 3: User Story 1 — Create / Edit / Delete Pockets (Priority: P1) 🎯 MVP

**Goal**: Users can create a pocket with name, goal, colour, and linked account; edit it;
and delete it (with confirmation if it has movements).

**Independent Test**: Create a pocket via the form on `/cagnottes`; verify it appears in
the list with correct name, goal, colour, and 0 % progress. Edit its name; verify the
change persists. Delete it; verify it disappears.

- [x] T014 [US1] Create `frontend/src/components/PocketForm.tsx` — form with: name input (required, max 100 chars), goalAmount input (required, number > 0), color picker (6 swatches from palette: `#22c55e #3b82f6 #f59e0b #ec4899 #8b5cf6 #94a3b8`), account selector (dropdown populated from `useGetDashboardQuery().data.accounts`); uses `react-intl` for all labels; calls `useCreatePocketMutation` or `useUpdatePocketMutation` depending on `initialValues` prop; `onSuccess` callback; Biome/TypeScript strict
- [x] T015 [US1] Create `frontend/src/pages/PocketsPage.tsx` — route `/cagnottes`; calls `useListPocketsQuery()`; renders: page title, "New pocket" button opening `PocketForm` in a modal/drawer, list of pocket entries with edit + delete actions; delete opens a confirmation dialog (`pockets.delete.confirm` i18n key); handles loading and error states; empty state when no pockets
- [x] T016 [US1] Update `frontend/src/main.tsx` — add `{ path: '/cagnottes', Component: PocketsPage }` inside ProtectedRoute children; import `PocketsPage`
- [x] T017 [US1] Update `frontend/src/components/NavBar.tsx` — add a "Pockets" nav link pointing to `/cagnottes` using `pockets.title` i18n key, consistent with existing nav items
- [x] T018 [P] [US1] Write unit tests for `PocketForm.tsx` in `frontend/tests/unit/components/PocketForm.test.tsx` — renders all fields; submits with valid data; shows validation errors for empty name and non-positive goal; colour swatches render; account selector is populated
- [x] T019 [P] [US1] Write unit tests for `PocketsPage.tsx` in `frontend/tests/unit/pages/PocketsPage.test.tsx` — loading state; empty state; list with one pocket; delete confirmation dialog; create form opens on button click

**Checkpoint**: `/cagnottes` page renders; pockets can be created, edited, and deleted.

---

## Phase 4: User Story 2 — Allocate / Withdraw Funds (Priority: P2)

**Goal**: Users can add an ALLOCATION or WITHDRAWAL movement to a pocket; the allocated
amount updates immediately; over-allocation and over-withdrawal are rejected with clear error
messages.

**Independent Test**: Allocate €200 to a pocket; verify `allocatedAmount` becomes €200.
Attempt to allocate an amount exceeding headroom; verify the 422 error with the headroom
amount is displayed. Withdraw €50; verify `allocatedAmount` is €150.

- [x] T020 [US2] Add movement form to `frontend/src/pages/PocketsPage.tsx` — within each pocket entry (or a pocket detail panel), show an "Add movement" button that opens a form with: direction toggle (ALLOCATION / WITHDRAWAL), amount input, optional note, date picker (default today); calls `useCreateMovementMutation`; on 422 INSUFFICIENT_HEADROOM/INSUFFICIENT_POCKET_FUNDS, display the error message from the API response using `pockets.error.insufficientHeadroom` / `pockets.error.insufficientFunds` i18n keys (interpolating the available amount); on success, the pocket's `allocatedAmount` and `progressPct` update via RTK Query cache invalidation
- [x] T021 [P] [US2] Write unit tests for movement form in `frontend/tests/unit/pages/PocketsPage.test.tsx` — add movement test cases: valid ALLOCATION updates pocket; 422 INSUFFICIENT_HEADROOM shows formatted error with amount; valid WITHDRAWAL decreases allocated; 422 INSUFFICIENT_POCKET_FUNDS shown correctly

**Checkpoint**: Movements can be recorded; business-rule errors are surfaced with
correct amounts; pocket totals update without page reload.

---

## Phase 5: User Story 3 — Progress Indicator (Priority: P3)

**Goal**: Each pocket card displays a visual progress bar showing `progressPct`, the
numeric ratio (€X / €Y), and a distinct goal-achieved state at 100 %.

**Independent Test**: With a pocket at 60 % of goal, verify a progress bar at 60 % and
the label "€600 / €1 000" are visible. At 100 %, verify a goal-achieved indicator.

- [x] T022 [US3] Create `frontend/src/components/PocketCard.tsx` — renders: pocket name (in the pocket's colour), progress bar (div with `width: {progressPct}%`, capped at 100 %, coloured with the pocket's colour), ratio label (`{allocatedAmount} / {goalAmount}` formatted with `<FormattedNumber currency="EUR">`), goal-achieved indicator (distinct background or icon when `progressPct >= 100`); "Add movement" button and edit/delete actions; uses `cn()` for conditionals; WCAG: `role="progressbar"` with `aria-valuenow`, `aria-valuemin=0`, `aria-valuemax=100`, `aria-label`
- [x] T023 [P] [US3] Write unit tests for `PocketCard.tsx` in `frontend/tests/unit/components/PocketCard.test.tsx` — renders name; progress bar width matches progressPct; ratio label formatted correctly; goal-achieved indicator present at 100 %; bar capped at 100 % when over goal; aria attributes present

**Checkpoint**: `PocketCard` renders correctly for all progress states in isolation.

---

## Phase 6: User Story 4 — Dashboard Integration (Priority: P4)

**Goal**: Pocket cards appear nested beneath their linked account cards on the dashboard.
Pockets for different accounts appear under the correct account card.

**Independent Test**: With pockets linked to two different accounts, open the dashboard
and verify each account card shows only its own pockets nested below it.

- [x] T024 [US4] Update `frontend/src/components/AccountCard.tsx` — add optional `pockets?: PocketSummaryDto[]` prop; when the array is non-empty, render a list of `<PocketCard>` components below the recent-transactions section; each `PocketCard` receives the pocket data; when empty or undefined, no change to existing layout
- [x] T025 [US4] Update `frontend/src/pages/DashboardPage.tsx` — add `const { data: pocketsData } = useListPocketsQuery()` (called in parallel with `useGetDashboardQuery`); for each account in `data.accounts`, filter `pocketsData.pockets` by `accountLabel` and pass as the `pockets` prop to the corresponding `AccountCard`
- [x] T026 [P] [US4] Write unit tests for `AccountCard.tsx` updates in `frontend/tests/unit/components/AccountCard.test.tsx` — add test: renders pocket cards when `pockets` prop is provided; renders without pockets when prop is undefined; pockets render below the transactions list

**Checkpoint**: Dashboard shows pocket cards nested under the correct account cards.

---

## Phase 7: User Story 5 — Movement History (Priority: P5)

**Goal**: Users can view the full paginated movement history for a pocket in reverse
chronological order; empty state when no movements.

**Independent Test**: Open a pocket with 5 movements; verify 5 entries in date-descending
order, each showing direction, amount, date, and optional note.

- [x] T027 [US5] Create movement history view in `frontend/src/pages/PocketsPage.tsx` — clicking a pocket opens a detail panel/page showing: pocket summary (via `PocketCard`), movement list (calls `useGetPocketQuery(id)` with cursor pagination); each movement row shows direction icon (↑ ALLOCATION / ↓ WITHDRAWAL), amount, date, note; delete movement button per row (calls `useDeleteMovementMutation`); "Load more" button when `nextCursor` is not null; empty state when no movements
- [x] T028 [P] [US5] Write unit tests for movement history in `frontend/tests/unit/pages/PocketsPage.test.tsx` — movement list renders with 3 entries; delete movement button calls mutation; empty state shows correctly; "Load more" visible when nextCursor is present

**Checkpoint**: Full CRUD + history working end-to-end for all 5 user stories.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Code quality gates, coverage, and quickstart validation.

- [x] T029 [P] Run `pnpm check` — verify Biome zero issues across all new/modified files; run `pnpm check:fix` if needed
- [x] T030 [P] Run `pnpm typecheck` — verify `tsc --noEmit` passes with no errors
- [x] T031 Run `pnpm test` — verify all tests pass and new modules reach ≥ 80% coverage; key modules: `pockets.service.ts`, `pockets.router.ts` (via integration test), `pocketsApi.ts`, `PocketCard.tsx`, `PocketForm.tsx`, `PocketsPage.tsx`
- [x] T032 Validate quickstart.md locally — apply migration, start dev server, execute curl commands from quickstart.md Step 3, confirm JSON shape; navigate to `/cagnottes` and `/` (dashboard) and verify UI

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — **blocks all user story phases**
- **US1 (Phase 3)**: Depends on Phase 2 — independently testable
- **US2 (Phase 4)**: Depends on Phase 2 + US1 (movement form lives in PocketsPage from US1)
- **US3 (Phase 5)**: Depends on Phase 2 — `PocketCard` is independent; but needs US2 data to test progress meaningfully
- **US4 (Phase 6)**: Depends on Phase 2 + US3 (needs `PocketCard`)
- **US5 (Phase 7)**: Depends on Phase 2 + US1 + US2 (history requires movements)
- **Polish (Phase 8)**: Depends on all user story phases

### User Story Dependencies

- **US1 (P1)**: Phase 2 complete → independently testable
- **US2 (P2)**: US1 complete (movement form added to PocketsPage)
- **US3 (P3)**: Phase 2 complete → `PocketCard` independently testable in isolation
- **US4 (P4)**: US3 complete (`PocketCard` must exist to be rendered in `AccountCard`)
- **US5 (P5)**: US1 + US2 complete (history requires pockets + movements to exist)

### Parallel Opportunities Within Phases

- T007 + T008 (backend tests) run in parallel with T009 + T010 + T011 + T012 + T013 (frontend setup) — different files
- T018 + T019 (US1 tests) run in parallel — different files
- T022 + T023 (US3 — PocketCard) runs in parallel with T020 + T021 (US2 — movements) if Phase 2 is done
- T026 (AccountCard tests) runs in parallel with T024 + T025 (implementation)
- T029 + T030 run in parallel (Biome check + typecheck use different tools)

---

## Parallel Example: Phase 2

```bash
# Once T003 (migration applied) is complete, run in parallel:
Task A: "Create pockets.service.ts"                # T004 (sequential: T005 depends on it)
Task B: "Create pocketsApi.ts"                     # T009 (independent)
Task C: "Add pockets.* i18n keys to en.json"       # T011 (independent)
Task D: "Add pockets.* i18n keys to fr.json"       # T012 (independent)
Task E: "Write pockets.service unit tests"         # T007 (independent of T004 if mocked)
```

## Parallel Example: US3 + US2 (after Phase 2)

```bash
# US3 (PocketCard) and US2 (movement form) have no file conflicts:
Task A: "Create PocketCard.tsx + tests"            # T022, T023
Task B: "Add movement form to PocketsPage"         # T020, T021
```

---

## Implementation Strategy

### MVP First (US1 + US2 Only)

1. Complete **Phase 1** (migration)
2. Complete **Phase 2** (backend + frontend API layer)
3. Complete **Phase 3** (create/edit/delete pockets — US1)
4. Complete **Phase 4** (allocate/withdraw — US2)
5. **VALIDATE**: pockets can be created and funded from `/cagnottes`. Deploy or demo.

### Incremental Delivery

1. Setup + Foundational → API functional
2. US1 → pockets CRUD on `/cagnottes` → Demo
3. US2 → allocations + withdrawals working → Demo
4. US3 → progress bars → Demo
5. US4 → dashboard nested cards → Demo
6. US5 → movement history → Ship

---

## Notes

- [P] tasks have no file conflicts and no unresolved upstream dependencies
- `PocketCard` is the default export in `PocketCard.tsx` (no lazy loading needed — small component)
- The movement form in US2 is added to `PocketsPage.tsx` (not a separate component) to keep the story slice thin; extract to `MovementForm.tsx` only if complexity > 10 triggers a Biome error
- `computeHeadroom` in the service takes an optional `excludePocketId` to support future "what-if" calculations — not used in this phase but documents the pattern
- Run `pnpm check` after each phase to catch Biome issues early
- Commit after each phase checkpoint
