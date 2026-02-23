# Tasks: Transactions — Vue unifiée, filtres et catégorisation

**Input**: Design documents from `/specs/004-transactions/`
**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ contracts/ ✅ quickstart.md ✅

**Organization**: Tasks grouped by user story — each story is independently implementable and testable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story label (US1–US4)

---

## Phase 1: Setup (Infrastructure & Migrations)

**Purpose**: Prisma schema, migrations SQL, seed, i18n keys — blocking prerequisites for all stories.

- [X] T001 Update `packages/db/prisma/schema.prisma` — add `Category`, `CategoryRule`, `CategorySource` enum; add `categoryId String?` + `categorySource CategorySource` + Category relation on `ImportedTransaction` and `ManualExpense`; remove `category ExpenseCategory` from `ManualExpense` (will be dropped in 004b)
- [X] T002 Create migration `packages/db/prisma/migrations/20260224000000_004_add_categories/migration.sql` — CREATE TABLE Category with 6 system rows (fixed IDs), ALTER ImportedTransaction + ManualExpense ADD COLUMN categoryId + categorySource, FK constraints, backfill UPDATE ManualExpense.categoryId from slug mapping, indexes
- [X] T003 Create migration `packages/db/prisma/migrations/20260224010000_004_drop_expense_category_enum/migration.sql` — DO $$ guard for NULL check, ALTER ManualExpense SET NOT NULL on categoryId, DROP COLUMN category, DROP TYPE "ExpenseCategory"
- [X] T004 Run `pnpm --filter @kasa/db run db:generate` to regenerate Prisma client with new models
- [X] T005 [P] Create `packages/db/prisma/seed.ts` — upsert 6 system categories (food/transport/housing/health/entertainment/other) + sample user + sample transactions for dev
- [X] T006 [P] Add i18n keys to `frontend/src/i18n/fr.json` and `frontend/src/i18n/en.json` — all `transactions.*` and `categories.*` keys from plan.md

---

## Phase 2: Foundational (Breaking Changes on Existing Code)

**Purpose**: Migrate existing code away from `ExpenseCategory` enum + bootstrap RTK Query API slice. BLOCKS all user stories.

**⚠️ CRITICAL**: Must be complete before any user story begins

- [X] T007 Update `backend/src/services/import.service.ts` — remove `ExpenseCategory` import, change `CreateExpenseInput.category` → `categoryId: string`, change `createExpense` data to use `categoryId`, change `listExpenses` filter `where.category` → `where.categoryId`, change `ListExpensesOptions.category` → `categoryId: string | undefined`
- [X] T008 [P] Update `backend/src/routes/expenses.router.ts` — remove `ExpenseCategory` import, change category query param parse to `categoryId: string`, update create expense body parsing to send `categoryId`
- [X] T009 [P] Update `frontend/src/services/importApi.ts` — change `ManualExpenseDto.category: string` → `categoryId: string | null`, change `CreateExpenseRequest.category` → `categoryId: string`
- [X] T010 Create `frontend/src/services/transactionsApi.ts` — RTK Query createApi with all endpoints: `listTransactions` (GET /transactions with filter params + cursor), `getTransaction` (GET /transactions/:id), `updateTransactionCategory` (PATCH /transactions/:id/category), `listCategories` (GET /categories), `createCategory`, `updateCategory`, `deleteCategory`, `listCategoryRules`, `createCategoryRule`, `updateCategoryRule`, `deleteCategoryRule`
- [X] T011 Update `frontend/src/store/index.ts` — add `transactionsApi` reducer and middleware

**Checkpoint**: Foundation ready — existing CRUD still works, new API slice bootstrapped

---

## Phase 3: User Story 1 — Vue unifiée de toutes les transactions (Priority: P1) 🎯 MVP

**Goal**: L'utilisateur voit toutes ses transactions (CSV + manuelles) dans une liste unifiée paginée.

**Independent Test**: Avec des transactions importées et des dépenses manuelles en base, accéder à `/transactions` affiche les deux types triés par date décroissante avec pagination cursor-based.

- [X] T012 [P] [US1] Create `backend/src/services/timeline.service.ts` — `listTimeline()` with `$queryRaw` UNION ALL (ImportedTransaction + ManualExpense), keyset cursor `(date DESC, id ASC)`, base64url cursor encode/decode, `getTransactionById()` tries IT then ME
- [X] T013 [P] [US1] Create `backend/src/routes/transactions.router.ts` — `GET /transactions` (calls listTimeline, validates cursor), `GET /transactions/:id` (calls getTransactionById, 404 if not found)
- [X] T014 [US1] Register transactions router in `backend/src/app.ts` — `app.use('/api', transactionsRouter.routes())`
- [X] T015 [P] [US1] Create `frontend/src/components/UnifiedTransactionList.tsx` — infinite scroll list using `useListTransactionsQuery`, renders each transaction with type badge (CSV/Manuel), amount colored by direction, category chip, date
- [X] T016 [P] [US1] Create `frontend/src/components/TransactionDetail.tsx` — drawer/sheet component showing full transaction detail (label, detail, date, amount, direction, status, category, source, reconciliation status)
- [X] T017 [US1] Create `frontend/src/pages/TransactionsPage.tsx` — page shell with `<UnifiedTransactionList>`, title via react-intl, empty state when no transactions
- [X] T018 [US1] Add `/transactions` route to `frontend/src/main.tsx` — protected route pointing to `TransactionsPage`
- [X] T019 [P] [US1] Update `frontend/src/components/NavBar.tsx` — add Transactions nav link (`transactions.title` i18n key)

**Checkpoint**: `/transactions` affiche la liste unifiée avec pagination, détail au clic — testable indépendamment

---

## Phase 4: User Story 2 — Filtrer et rechercher les transactions (Priority: P2)

**Goal**: L'utilisateur peut filtrer par période, catégorie, direction et chercher par texte.

**Independent Test**: Avec une liste de transactions de catégories et périodes variées, appliquer chaque filtre produit le sous-ensemble attendu. Les filtres combinés fonctionnent. Réinitialiser restaure la liste complète.

- [X] T020 [P] [US2] Create `frontend/src/store/transactionsSlice.ts` — Redux slice with filter state: `from`, `to`, `categoryId`, `direction`, `search`; actions: `setFilter`, `resetFilters`
- [X] T021 [US2] Update `frontend/src/store/index.ts` — add `transactionsSlice` reducer
- [X] T022 [P] [US2] Create `frontend/src/components/TransactionFilters.tsx` — filter bar with date range pickers (from/to), category multi-select (useListCategoriesQuery), direction toggle (all/debit/credit), text search input, reset button; dispatches to transactionsSlice
- [X] T023 [US2] Update `frontend/src/pages/TransactionsPage.tsx` — add `<TransactionFilters>` above list, read filter state from Redux, pass as query params to `useListTransactionsQuery`, display totals (debit/credit sum) from response
- [X] T024 [US2] Update `backend/src/services/timeline.service.ts` — add `totals` computation (sum of debit/credit for the full filtered set via a second COUNT query or aggregated in the UNION); return `{ items, nextCursor, totals }` from `listTimeline()`

**Checkpoint**: Tous les filtres fonctionnent seuls et en combinaison, réinitialisation OK, totaux affichés

---

## Phase 5: User Story 3 — Catégoriser les transactions (Priority: P3)

**Goal**: Catégorisation automatique à l'import + correction manuelle préservée lors des ré-imports.

**Independent Test**: Importer un CSV avec libellés connus → catégories assignées (AUTO). Recatégoriser manuellement → `categorySource = MANUAL`. Ré-importer → catégorie MANUAL non écrasée.

- [X] T025 [P] [US3] Create `backend/src/services/categorization.service.ts` — `normalize()` (réutilise la logique de bankLabelMatcher.ts), `matchRules()` pure function (scan linéaire sur tableau pré-trié: user rules first, isSystem last), `loadRules()` avec Map<userId, TTL 10s>, `bulkCategorizeTransactions()` (skip MANUAL, update AUTO/NONE), `invalidateRuleCache()`
- [X] T026 [US3] Update `backend/src/services/import.service.ts` — import `bulkCategorizeTransactions` from categorization.service, call after `runReconciliation(userId)` with the new transactions array (categorySource: 'NONE')
- [X] T027 [US3] Add `PATCH /transactions/:id/category` to `backend/src/routes/transactions.router.ts` — validate `categoryId` (null or existing category for this user/system), update IT or ME with `{ categoryId, categorySource: 'MANUAL' }`, return updated transaction; set `categorySource: 'NONE'` when categoryId is null
- [X] T028 [P] [US3] Create `frontend/src/components/CategoryPicker.tsx` — dropdown/popover using `useListCategoriesQuery`, groups system vs custom categories, shows color swatch, "Non catégorisée" option at top
- [X] T029 [US3] Update `frontend/src/components/TransactionDetail.tsx` — add category edit section with `<CategoryPicker>`, call `useUpdateTransactionCategoryMutation` on select, show AUTO/MANUAL badge
- [X] T030 [US3] Update `frontend/src/services/transactionsApi.ts` — ensure `updateTransactionCategory` mutation invalidates `['ImportedTransaction']` and `['ManualExpense']` tags so lists refresh after category change

**Checkpoint**: Auto-catégorisation à l'import + override manuel préservé au ré-import

---

## Phase 6: User Story 4 — Gérer ses catégories personnalisées (Priority: P4)

**Goal**: L'utilisateur crée, renomme et supprime ses catégories et règles de catégorisation.

**Independent Test**: Créer une catégorie "Sport", créer une règle "SALLE SPORT → Sport", importer un CSV avec ce libellé → la transaction est catégorisée dans "Sport". Supprimer la catégorie → les transactions passent à NULL.

- [X] T031 [P] [US4] Create `backend/src/services/categories.service.ts` — `listCategories()` (system + userId), `createCategory()` (slug from name, userId), `updateCategory()` (system guard), `deleteCategory()` (system guard, counts affected transactions, setNull via Prisma cascade, returns count), `listRules()`, `createRule()` (validates categoryId ownership), `updateRule()` (system guard), `deleteRule()` (system guard, NO retroactive recategorization, invalidates cache)
- [X] T032 [US4] Create `backend/src/routes/categories.router.ts` — wire all CRUD endpoints from categories.service: GET/POST /categories, PATCH/DELETE /categories/:id, GET/POST /categories/rules, PATCH/DELETE /categories/rules/:id; 403 on system entries, 404 on not found
- [X] T033 [US4] Register categories router in `backend/src/app.ts` — `app.use('/api', categoriesRouter.routes())`
- [X] T034 [P] [US4] Create `frontend/src/components/CategoryForm.tsx` — form to create/edit a category (name input + color picker with 12 preset swatches), validates name non-empty, calls createCategory or updateCategory mutation
- [X] T035 [P] [US4] Create `frontend/src/components/CategoryRuleForm.tsx` — form to create/edit a rule (keyword input + CategoryPicker for target category), validates keyword non-empty max 100 chars
- [X] T036 [US4] Create `frontend/src/pages/CategoriesPage.tsx` — two sections: (1) categories list with system (locked) + custom (edit/delete), add button; (2) rules list with system (locked) + custom (edit/delete), add button; delete confirmation shows affected transaction count
- [X] T037 [US4] Add `/categories` route to `frontend/src/main.tsx` — protected route pointing to `CategoriesPage`
- [X] T038 [P] [US4] Update `frontend/src/components/NavBar.tsx` — add Categories link (`categories.title` i18n key)
- [X] T039 [US4] Update `frontend/src/components/ExpenseForm.tsx` — replace hardcoded `CATEGORIES` const array with `useListCategoriesQuery`; send `categoryId` in mutation body instead of `category` enum string

**Checkpoint**: CRUD catégories et règles fonctionnel, règles utilisateur prioritaires sur règles système à l'import

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T040 [P] Update `CLAUDE.md` — add `004-transactions` to Active Technologies section (Category/CategoryRule models, CategorySource enum, timeline UNION ALL query)
- [X] T041 Run `pnpm check` — verify Biome zero issues across all modified files
- [X] T042 [P] Run `pnpm typecheck` — verify TypeScript strict passes (no `any`, all Prisma types correct after enum removal)
- [X] T043 [P] Run `pnpm --filter @kasa/db run db:generate` — confirm Prisma client regenerated cleanly after both migrations applied
- [X] T044 Verify quickstart.md Scénario 1 (liste unifiée) and Scénario 6 (auto-catégorisation) against implementation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately; T001→T002→T003→T004 sequential (schema before migrations before generate)
- **Phase 2 (Foundational)**: Depends on T004 (Prisma client regenerated) — BLOCKS all user stories
- **Phase 3 (US1)**: Depends on Phase 2 completion
- **Phase 4 (US2)**: Depends on Phase 3 (US1) — filters build on the list
- **Phase 5 (US3)**: Depends on Phase 2 completion — can run in parallel with US2 after Phase 2
- **Phase 6 (US4)**: Depends on Phase 2 completion — can run in parallel with US2/US3 after Phase 2
- **Phase 7 (Polish)**: Depends on all desired user stories complete

### User Story Dependencies

- **US1 (P1)**: Requires Phase 2 — no other story dependencies
- **US2 (P2)**: Requires US1 (filters augment the list)
- **US3 (P3)**: Requires Phase 2 — independent of US1/US2 (can run in parallel with US1 after foundation)
- **US4 (P4)**: Requires Phase 2 — independent of US1/US2/US3 for backend; CategoryPicker (T028) from US3 is reused in T034/T036

### Within Each User Story

- Backend service → Backend router → Wire in app.ts
- Frontend component → Frontend page → Register route → NavBar

### Parallel Opportunities

```bash
# Phase 1 (after T001 schema):
T002 (migration 004a) → T003 (migration 004b) → T004 (db:generate)
T005 (seed.ts) — parallel with T002/T003
T006 (i18n keys) — parallel with T002/T003

# Phase 2 (after Phase 1):
T007 (import.service) → T008 (expenses.router) [P]
T009 (importApi.ts) [P with T007/T008]
T010 (transactionsApi.ts) [P with T007/T008/T009]

# Phase 3 (US1 after Phase 2):
T012 (timeline.service) [P with T013]
T013 (transactions.router) [P with T012]
T015 (UnifiedTransactionList) [P with T016]
T016 (TransactionDetail) [P with T015]
T019 (NavBar) [P with T015/T016]

# Phase 5 (US3, parallel with US2 after Phase 2):
T025 (categorization.service) — independent of US2 work
T028 (CategoryPicker) — independent of US2 work
```

---

## Parallel Example: US3 & US2 after Phase 2

```bash
# Developer A works on US2 (filters):
T020 → T022 → T023 → T024

# Developer B works on US3 (categorization) simultaneously:
T025 → T026 → T027 → T028 → T029 → T030
```

---

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 1 (Setup) — T001→T006
2. Complete Phase 2 (Foundational) — T007→T011
3. Complete Phase 3 (US1) — T012→T019
4. **STOP and VALIDATE**: accéder à `/transactions`, vérifier liste unifiée CSV+manuelles, vérifier pagination
5. Demo: liste unifiée fonctionnelle sans filtres ni catégories

### Incremental Delivery

1. Phase 1+2 → Foundation (migrations + code existant migré)
2. US1 → Liste unifiée (MVP!)
3. US2 → Filtres + recherche
4. US3 → Catégorisation auto + override manuel
5. US4 → Catégories et règles personnalisées
6. Polish → Zero issues CI

### Full Sequential Order (Single Developer)

```
T001 → T002 → T003 → T004 → T005 → T006
→ T007 → T008 → T009 → T010 → T011
→ T012 → T013 → T014 → T015 → T016 → T017 → T018 → T019
→ T020 → T021 → T022 → T023 → T024
→ T025 → T026 → T027 → T028 → T029 → T030
→ T031 → T032 → T033 → T034 → T035 → T036 → T037 → T038 → T039
→ T040 → T041 → T042 → T043 → T044
```

---

## Notes

- [P] tasks touch different files — safe to run in parallel
- T001 (schema) must complete before T002/T003 (migrations) — migrations reference schema types
- T004 (`db:generate`) must complete before any TypeScript file that imports `@kasa/db` new types
- T028 (`CategoryPicker`) created in US3 is reused in US4 (T034 CategoryForm, T036 CategoriesPage)
- `$queryRaw` UNION ALL in T012 uses `Prisma.sql` tagged templates — NEVER `$queryRawUnsafe`
- `matchRules()` in T025 is a pure function — extract and test independently before wiring
- Delete category (T031) uses Prisma `onDelete: SetNull` cascade — no manual UPDATE needed in the service
