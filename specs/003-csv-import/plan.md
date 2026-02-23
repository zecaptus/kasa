# Implementation Plan: CSV Import & Transaction Reconciliation

**Branch**: `003-csv-import` | **Date**: 2026-02-22 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/003-csv-import/spec.md`

---

## Summary

Import CSV bank statements (Société Générale format), manual expense entry, and automatic transaction reconciliation. The reconciliation engine uses a hybrid token-set / bigram-Dice algorithm with SEPA prefix stripping, running automatically after each CSV import and after each manual expense save. Files are not retained after parsing (RGPD compliance). Multiple import sessions can coexist simultaneously; the reconciliation scope is global across all user expenses.

---

## Technical Context

**Language/Version**: TypeScript 5.7 (strict) — Node.js 22 LTS
**Primary Dependencies**:
- Backend: Koa 2, @koa/router, @koa/multer, csv-parse, iconv-lite, talisman
- Frontend: React 19, RTK Query, react-intl, Tailwind CSS 4, clsx + tailwind-merge
- Shared: Prisma 6 (@kasa/db), PostgreSQL 16

**Storage**: PostgreSQL 16 via Prisma 6 — 4 new models (ImportSession, ImportedTransaction, ManualExpense, Reconciliation)
**Testing**: Vitest 3 — coverage ≥ 80 % per module (v8 provider)
**Target Platform**: Web (Vercel — frontend SPA + backend Koa handler)
**Project Type**: Web application — monorepo (backend/ + frontend/ + packages/db/)
**Performance SLOs**:
- CSV parsing + import (≤ 5 MB file): < 3 s end-to-end on the server
- Reconciliation engine (50 transactions × all user expenses): < 1 s
- API p95 response time (all endpoints except POST /import/csv): < 300 ms
- Full upload-to-summary workflow (user-facing): < 5 min for ≤ 50 transactions (SC-001)

**Constraints**:
- CSV file NOT stored after parsing (Q2 — privacy / RGPD)
- SG CSV encoding: Windows-1252 (UTF-8 BOM fallback) — must use iconv-lite at parse time
- Reconciliation trigger: after each CSV import AND after each manual expense save (Q1)
- Candidate scope: global — all unreconciled expenses of the user, no date-window filter (Q4)
- Multiple import sessions allowed simultaneously (Q5)

**Scale/Scope**: Personal finance — single user per account, ~50–200 transactions/month. O(N×M) reconciliation matrix stays small (N, M < 500 in practice).

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **I. Code Quality**: Biome already configured repo-wide (zero-issue policy). New services must respect cyclomatic complexity ≤ 10. The reconciliation engine's matching loop is O(N×M) iterations of a simple scoring function — no complexity violation. All public APIs explicitly typed; no `any`.
- [x] **II. Testing Standards**: Test strategy documented (see Project Structure below). Unit tests for `csvParser.service.ts`, `bankLabelMatcher.ts`, `reconciliation.service.ts` with synthetic datasets. Integration tests for all router endpoints via supertest. Coverage ≥ 80 % per module enforced by vitest.config.ts.
- [x] **III. UX Consistency**: All UI strings through react-intl (mandatory per Constitution V). Error messages are human-readable (see OpenAPI examples). Mobile-first layout (≤ 375 px first). `cn()` helper for conditional classes.
- [x] **IV. Performance**: SLOs documented above. Reconciliation engine benchmarked in unit tests with 200×200 matrix. CSV parsing time measured in integration test (5 MB synthetic file). No N+1 query risk: reconciliation fetches all unreconciled transactions in one query then computes in-memory.
- [ ] **Violations**: None — no exception required.

*Post-Phase 1 re-check*: Constitution Check re-confirmed after data model and contracts design. No violations introduced. The `@@unique([userId, accountingDate, label, debit, credit])` compound constraint handles deduplication at DB level without a separate query (avoids N+1 on re-import).

---

## Project Structure

### Documentation (this feature)

```text
specs/003-csv-import/
├── plan.md              # This file
├── research.md          # Phase 0 output — D1 (SG CSV format) + D4 (similarity algo)
├── data-model.md        # Phase 1 output — Prisma schema (4 models, 2 enums)
├── quickstart.md        # Phase 1 output — setup + usage guide
├── contracts/
│   └── openapi.yaml     # Phase 1 output — 9 endpoints
└── tasks.md             # Phase 2 output (via /speckit.tasks — not yet created)
```

### Source Code

```text
packages/db/
└── prisma/
    ├── schema.prisma        # + ReconciliationStatus, ExpenseCategory enums
    │                        # + ImportSession, ImportedTransaction,
    │                        #   ManualExpense, Reconciliation models
    └── migrations/          # new migration file (auto-generated)

backend/
├── src/
│   ├── routes/
│   │   ├── import.router.ts          # POST /import/csv
│   │   │                             # GET  /import/sessions
│   │   │                             # GET  /import/sessions/:id
│   │   │                             # PATCH /import/transactions/:id
│   │   └── expenses.router.ts        # GET  /expenses
│   │                                 # POST /expenses
│   │                                 # DELETE /expenses/:id
│   │                                 # POST /reconciliation/confirm
│   │                                 # DELETE /reconciliation/:id
│   ├── services/
│   │   ├── csvParser.service.ts      # SG CSV detection, iconv decode, parse, validate
│   │   ├── bankLabelMatcher.ts       # talisman bigram + tokenSetRatio, preprocessing
│   │   ├── reconciliation.service.ts # match N×M, auto-accept ≥0.85, collect candidates
│   │   └── import.service.ts         # orchestrate: parse → dedup → persist → reconcile
│   └── middleware/
│       └── upload.ts                 # @koa/multer memoryStorage, 5 MB limit
└── tests/
    ├── unit/
    │   ├── services/csvParser.service.test.ts
    │   ├── services/bankLabelMatcher.test.ts       # synthetic label pairs, threshold tests
    │   ├── services/reconciliation.service.test.ts # auto-match, ambiguous, no-match cases
    │   └── services/import.service.test.ts
    └── integration/
        ├── routes/import.router.test.ts   # full upload flow with test CSV fixture
        └── routes/expenses.router.test.ts

frontend/
├── src/
│   ├── pages/
│   │   ├── ImportPage.tsx              # Upload zone + session list (P1)
│   │   └── ReconciliationPage.tsx      # Transactions list + resolve ambiguities (P3-P5)
│   ├── components/
│   │   ├── CsvDropzone.tsx             # Drag-and-drop + file picker
│   │   ├── ExpenseForm.tsx             # Create manual expense (P2)
│   │   ├── TransactionList.tsx         # Paginated transaction list with status badges
│   │   ├── ReconciliationCard.tsx      # One transaction: status + candidate list
│   │   └── ImportSummary.tsx           # Counts bar: total/reconciled/pending/ignored
│   ├── services/
│   │   ├── importApi.ts                # RTK Query: import endpoints
│   │   └── expensesApi.ts              # RTK Query: expense + reconciliation endpoints
│   └── store/
│       └── importSlice.ts              # UI state: active session, filter (status)
└── tests/
    ├── unit/
    │   ├── components/CsvDropzone.test.tsx
    │   ├── components/ExpenseForm.test.tsx
    │   └── store/importSlice.test.ts
    └── integration/
        └── pages/ImportPage.test.tsx
```

**Structure Decision**: Option 2 (Web application). Backend handlers in `backend/src/routes/`, business logic strictly in `backend/src/services/`. Frontend pages consume only RTK Query hooks. Shared types from `@kasa/db` (Prisma generated types).

---

## Complexity Tracking

> No Constitution violations — table left intentionally empty.

---

## Phase 0: Research — Resolved

| # | Inconnue | Décision | Fichier |
|---|---|---|---|
| D1 | Format CSV SG (colonnes, encodage, séparateur) | Semicolon `;`, Windows-1252, `DD/MM/YYYY`, colonnes `Débit`/`Crédit` séparées | research.md |
| D4 | Algorithme de rapprochement libellés | Hybride tokenSetRatio + bigramDice, package `talisman`, seuils 0.85/0.60 | research.md |
| — | Librairie parsing CSV | `csv-parse` + `iconv-lite` | research.md |
| — | Upload fichier Koa | `@koa/multer` memoryStorage | research.md |

---

## Phase 1: Design — Artefacts produits

| Artefact | Chemin | Contenu |
|---|---|---|
| Data model | `specs/003-csv-import/data-model.md` | 4 modèles Prisma, 2 enums, index strategy, state transitions |
| API contract | `specs/003-csv-import/contracts/openapi.yaml` | 9 endpoints, tous les schémas de requête/réponse |
| Quickstart | `specs/003-csv-import/quickstart.md` | Installation, migration, commandes dev/test, structure fichiers |

---

## SLOs (récapitulatif)

| Opération | SLO | Méthode de mesure |
|---|---|---|
| `POST /import/csv` (5 MB) | < 3 s côté serveur | Integration test avec fixture CSV synthétique 5 MB |
| Moteur de réconciliation (200×200) | < 1 s | Unit test avec dataset synthétique |
| `GET /import/sessions` | < 300 ms p95 | Integration test |
| `POST /expenses` + réconciliation | < 500 ms p95 | Integration test |
| Workflow complet utilisateur (≤ 50 transactions) | < 5 min | SC-001 (acceptance test) |

---

## Décisions d'architecture

| # | Décision | Rationale |
|---|---|---|
| A1 | Réconciliation déclenchée après import ET après save expense | Q1 — évite une action manuelle utilisateur, cohérence immédiate |
| A2 | Fichier CSV non conservé après parsing | Q2 — privacy / RGPD, constitution §Privacy |
| A3 | Suppression ManualExpense en hard delete | Q3 — reset UNRECONCILED atomique via transaction Prisma |
| A4 | Scope réconciliation global (pas de fenêtre temporelle) | Q4 — l'utilisateur peut saisir ses dépenses avant ou après l'import |
| A5 | Sessions multiples simultanées sans contrainte | Q5 — rattrapage de plusieurs mois d'un coup sans friction |
| A6 | Clé de dédup composite `(userId, accountingDate, label, debit, credit)` | Pas d'ID unique SG dans le CSV — composite key est la seule approche viable |
| A7 | Seuil auto-réconciliation : score ≥ 0.85 | Conservateur intentionnellement — faux positif en finance pire que faux négatif |
| A8 | `@db.Date` (sans heure) pour les dates | SG CSV n'inclut pas l'heure — évite les bugs de fuseau horaire |
