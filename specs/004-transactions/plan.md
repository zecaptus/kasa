# Implementation Plan: Transactions — Vue unifiée, filtres et catégorisation

**Branch**: `004-transactions` | **Date**: 2026-02-23 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-transactions/spec.md`

## Summary

Vue unifiée paginée de toutes les transactions (CSV importées + dépenses manuelles), avec filtres (période, catégorie, direction, recherche texte), catégorisation automatique par règles mot-clé, catégories personnalisables et règles utilisateur.

**Approche** : Migration en 3 phases depuis l'enum `ExpenseCategory` vers un modèle `Category` FK flexible. Vue unifiée via `$queryRaw` UNION ALL avec keyset cursor `(date DESC, id ASC)`. Moteur de catégorisation par scan linéaire avec cache TTL 10s et `CategorySource` enum (NONE/AUTO/MANUAL) pour protéger les choix manuels.

## Technical Context

**Language/Version**: TypeScript 5.7 (strict mode), Node.js 22 LTS
**Primary Dependencies**: Koa 2 + @koa/router (backend), React 19 + RTK Query (frontend), Prisma 6 + PostgreSQL 16
**Storage**: PostgreSQL 16 — 2 nouveaux modèles (`Category`, `CategoryRule`), 2 migrations
**Testing**: Vitest 3 — couverture ≥ 80% par module (v8 provider)
**Target Platform**: Serveur Node.js (Vercel Functions) + SPA React
**Project Type**: Monorepo pnpm — `backend/` + `frontend/` + `packages/db/`
**Performance Goals**: Liste transactions (p95) < 500 ms pour 500 lignes ; recatégorisation PATCH < 200 ms
**Constraints**: Biome zero-issue, tsc --noEmit strict, complexité ≤ 10 par fonction
**Scale/Scope**: Mono-utilisateur, ~500-2000 transactions par an

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [X] **I. Code Quality**: Biome configuré au repo root. Toutes les nouvelles fonctions respectent la limite de complexité ≤ 10. `matchRules()` est une pure function exportable et facilement testable. `$queryRaw` typé avec `<UnifiedRow[]>` explicite, jamais de `any`.
- [X] **II. Testing Standards**: `categorization.service.ts` contient une pure function `matchRules()` avec 100% de logique testable en unit. Timeline endpoint testé en integration. Composants frontend testés avec React Testing Library. Coverage cible ≥ 80% par module.
- [X] **III. UX Consistency**: Tous les libellés via `react-intl`. Classes conditionnelles via `cn()`. Mobile-first (≤375px). Feedback immédiat sur recatégorisation (optimistic update RTK Query). États vides et erreurs avec messages i18n.
- [X] **IV. Performance**: SLOs documentés (`GET /api/transactions` p95 < 500ms, `PATCH` p95 < 200ms). Keyset pagination évite les full-scans. Cache TTL 10s pour les règles de catégorisation (évite N+1 sur batch import). Index `categoryId` ajoutés sur les deux tables.
- [ ] **Violations**: Aucune violation. La migration en 2 étapes (004a + 004b) est intentionnelle pour garantir le zero-downtime.

## Project Structure

### Documentation (this feature)

```text
specs/004-transactions/
├── plan.md              ← Ce fichier
├── research.md          ← Phase 0 — décisions techniques
├── data-model.md        ← Phase 1 — schéma Prisma + migrations
├── quickstart.md        ← Phase 1 — scénarios d'intégration
├── contracts/
│   └── openapi.yaml     ← Phase 1 — API REST complète
└── tasks.md             ← Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code

```text
packages/db/
├── prisma/
│   ├── schema.prisma                              MODIFIÉ — Category, CategoryRule, CategorySource enum
│   │                                              ManualExpense: -category enum, +categoryId FK, +categorySource
│   │                                              ImportedTransaction: +categoryId FK, +categorySource
│   ├── migrations/
│   │   ├── 20260224000000_004_add_categories/     NOUVEAU — Category table, FK, backfill
│   │   └── 20260224010000_004_drop_expense_category_enum/  NOUVEAU — drop enum
│   └── seed.ts                                    NOUVEAU — catégories système + fixtures dev

backend/
├── src/
│   ├── routes/
│   │   ├── transactions.router.ts                 NOUVEAU — GET /transactions, GET /transactions/:id, PATCH /transactions/:id/category
│   │   ├── categories.router.ts                   NOUVEAU — CRUD categories + CRUD rules
│   │   └── expenses.router.ts                     MODIFIÉ — remove ExpenseCategory, use categoryId
│   └── services/
│       ├── timeline.service.ts                    NOUVEAU — listTimeline() UNION ALL, getTransactionById()
│       ├── categorization.service.ts              NOUVEAU — matchRules() (pure), bulkCategorize(), cache TTL
│       └── import.service.ts                      MODIFIÉ — intégration bulkCategorize() après runReconciliation()
└── tests/
    ├── unit/services/
    │   ├── timeline.service.test.ts               NOUVEAU
    │   └── categorization.service.test.ts         NOUVEAU — matchRules() unit tests
    └── integration/routes/
        ├── transactions.router.test.ts            NOUVEAU
        └── categories.router.test.ts              NOUVEAU

frontend/
├── src/
│   ├── pages/
│   │   ├── TransactionsPage.tsx                   NOUVEAU — vue unifiée + filtres
│   │   └── CategoriesPage.tsx                     NOUVEAU — gestion catégories + règles
│   ├── components/
│   │   ├── UnifiedTransactionList.tsx             NOUVEAU — liste paginée avec scroll infini
│   │   ├── TransactionFilters.tsx                 NOUVEAU — période, catégorie, direction, recherche
│   │   ├── TransactionDetail.tsx                  NOUVEAU — drawer/modal détail + recatégorisation
│   │   ├── CategoryPicker.tsx                     NOUVEAU — sélecteur de catégorie réutilisable
│   │   ├── CategoryForm.tsx                       NOUVEAU — création/édition catégorie
│   │   └── CategoryRuleForm.tsx                   NOUVEAU — création/édition règle
│   ├── services/
│   │   └── transactionsApi.ts                     NOUVEAU — RTK Query endpoints (listTransactions, updateCategory, CRUD categories/rules)
│   ├── store/
│   │   └── transactionsSlice.ts                   NOUVEAU — état des filtres actifs (date range, categoryId, direction, search)
│   └── i18n/
│       ├── fr.json                                MODIFIÉ — nouvelles clés transactions.*, categories.*
│       └── en.json                                MODIFIÉ — idem
└── tests/unit/
    ├── components/
    │   ├── UnifiedTransactionList.test.tsx         NOUVEAU
    │   ├── TransactionFilters.test.tsx             NOUVEAU
    │   └── CategoryForm.test.tsx                  NOUVEAU
    └── services/
        └── transactionsApi.test.tsx               NOUVEAU
```

**Structure Decision**: Option 2 (Web application). Séparation stricte backend/frontend/packages/db conforme au CLAUDE.md.

## Complexity Tracking

> Aucune violation de la Constitution.

| Décision | Justification |
|----------|---------------|
| `$queryRaw` UNION ALL | Seule approche permettant un keyset cursor correct sur deux tables hétérogènes. Risque: typage manuel `UnifiedRow[]` — mitigé par TypeScript strict + types explicites. |
| Migration en 2 phases (004a + 004b) | Zero-downtime : 004a ajoute les colonnes nullable + backfill (déployable sans interruption), 004b rend non-nullable et drop l'enum (déployable après vérification). Alternative one-shot rejetée car elle nécessiterait un downtime ou une migration non-réversible en cas d'échec du backfill. |

## Clés i18n à créer

### Namespace `transactions.*`

```json
{
  "transactions.title": "Transactions",
  "transactions.empty": "Aucune transaction. Importez un relevé ou saisissez une dépense.",
  "transactions.filter.period": "Période",
  "transactions.filter.category": "Catégorie",
  "transactions.filter.direction": "Type",
  "transactions.filter.direction.debit": "Dépenses",
  "transactions.filter.direction.credit": "Entrées",
  "transactions.filter.search": "Rechercher...",
  "transactions.filter.reset": "Réinitialiser",
  "transactions.filter.noResults": "Aucune transaction ne correspond aux filtres.",
  "transactions.source.imported": "Importé",
  "transactions.source.manual": "Manuel",
  "transactions.category.none": "Non catégorisée",
  "transactions.category.source.auto": "Catégorisé automatiquement",
  "transactions.category.source.manual": "Catégorisé manuellement",
  "transactions.totals.debit": "Dépenses",
  "transactions.totals.credit": "Entrées"
}
```

### Namespace `categories.*`

```json
{
  "categories.title": "Catégories",
  "categories.system": "Catégories système",
  "categories.custom": "Mes catégories",
  "categories.create": "Nouvelle catégorie",
  "categories.edit": "Modifier",
  "categories.delete": "Supprimer",
  "categories.delete.confirm": "Supprimer la catégorie «{name}» ? {count} transaction(s) seront décatégorisées.",
  "categories.delete.system.forbidden": "Les catégories système ne peuvent pas être supprimées.",
  "categories.rules.title": "Règles de catégorisation",
  "categories.rules.create": "Nouvelle règle",
  "categories.rules.keyword": "Mot-clé",
  "categories.rules.category": "Catégorie cible",
  "categories.rules.delete": "Supprimer la règle",
  "categories.rules.system.forbidden": "Les règles système ne peuvent pas être supprimées."
}
```

## SLOs par endpoint

| Endpoint | SLO (p95) | Notes |
|----------|-----------|-------|
| `GET /api/transactions` | < 500 ms | UNION ALL + keyset cursor, index userId sur les deux tables |
| `GET /api/transactions/:id` | < 100 ms | Lookup par id sur une seule table (fallback si non trouvé) |
| `PATCH /api/transactions/:id/category` | < 200 ms | Simple UPDATE Prisma |
| `GET /api/categories` | < 100 ms | Petite table, cacheable côté client |
| `POST/PATCH/DELETE /api/categories` | < 200 ms | Simple CRUD Prisma |
| `GET /api/categories/rules` | < 100 ms | Petite table |
| `POST/PATCH/DELETE /api/categories/rules` | < 200 ms | Simple CRUD + cache invalidation |
