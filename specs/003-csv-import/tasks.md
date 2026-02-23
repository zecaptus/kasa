# Tasks: CSV Import & Transaction Reconciliation

**Input**: Design documents from `specs/003-csv-import/`
**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ contracts/openapi.yaml ✅ quickstart.md ✅

**Tests**: Inclus — requis par la Constitution (≥ 80 % de couverture par module, Principe II).

**Organisation**: tâches groupées par user story pour permettre implémentation et test indépendants.

## Format: `[ID] [P?] [Story?] Description — fichier`

- **[P]**: Parallélisable (fichier différent, pas de dépendance incomplète)
- **[Story]**: User story cible (US1–US5 mappés sur spec.md)
- Chemins absolus depuis la racine du monorepo

---

## Phase 1: Setup

**Objectif**: Installer les nouvelles dépendances backend et préparer la structure des répertoires.

- [x] T001 Installer les dépendances backend : `pnpm --filter backend add csv-parse iconv-lite talisman @koa/multer` et `pnpm --filter backend add -D @types/multer` — `backend/package.json`
- [x] T002 [P] Créer les sous-répertoires manquants : `backend/tests/unit/services/` et `backend/tests/integration/routes/` s'ils n'existent pas — `backend/tests/`

**Checkpoint**: Dépendances installées, structure prête.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Objectif**: Schéma Prisma et migration. Aucune user story ne peut démarrer avant la complétion de cette phase.

**⚠️ CRITIQUE**: Le client Prisma régénéré (`@kasa/db`) fournit les types TypeScript partagés front + back.

- [x] T003 Ajouter les enums `ReconciliationStatus` et `ExpenseCategory` au schéma Prisma — `packages/db/prisma/schema.prisma`
- [x] T004 Ajouter les modèles `ImportSession`, `ImportedTransaction`, `ManualExpense`, `Reconciliation` au schéma Prisma (avec index et contrainte `@@unique` dedup) — `packages/db/prisma/schema.prisma`
- [x] T005 Ajouter les champs de relation à `User` : `importSessions`, `importedTransactions`, `manualExpenses` — `packages/db/prisma/schema.prisma`
- [x] T006 Générer la migration Prisma : `pnpm --filter @kasa/db run db:migrate` (nom suggéré : `002_csv_import`) — `packages/db/prisma/migrations/`
- [x] T007 Régénérer le client Prisma : `pnpm --filter @kasa/db run db:generate` — `packages/db/src/`

**Checkpoint**: Migration appliquée, types Prisma disponibles dans tout le monorepo.

---

## Phase 3: User Story 1 — Import CSV Bank Statement (Priority: P1) 🎯 MVP

**Objectif**: Un utilisateur authentifié peut uploader un fichier CSV SG et voir la liste des transactions parsées dans une session d'import. Les doublons sont détectés sur re-import.

**Test indépendant**: Uploader `fixtures/sg-sample.csv` via `POST /api/import/csv`, vérifier que les transactions apparaissent dans la réponse avec montants, dates et libellés corrects. Re-uploader le même fichier, vérifier que le compteur `skipped` est non-nul.

### Tests — User Story 1

- [x] T008 [P] [US1] Écrire les tests unitaires pour `csvParser.service.ts` (format 5 colonnes, format 4 colonnes, encodage Windows-1252, ligne preamble, ligne footer, fichier vide, champs manquants) — `backend/tests/unit/services/csvParser.service.test.ts`
- [x] T009 [P] [US1] Écrire le test d'intégration pour `POST /api/import/csv` (upload valide, fichier trop grand, format invalide, dedup sur re-upload) avec fixture CSV SG — `backend/tests/integration/routes/import.router.test.ts`

### Implémentation — Backend User Story 1

- [x] T010 [US1] Créer le middleware d'upload `@koa/multer` (memoryStorage, limite 5 MB, field name `file`) — `backend/src/middleware/upload.ts`
- [x] T011 [US1] Implémenter `csvParser.service.ts` : détection encodage (Windows-1252 / UTF-8 BOM), scan header pour détecter format 5-col vs 4-col, parse avec `csv-parse` + `iconv-lite`, normalisation montants (`,` → `.`), skip footer, retourner `ParsedTransaction[]` — `backend/src/services/csvParser.service.ts`
- [x] T012 [US1] Implémenter `import.service.ts` : méthode `importCsv(userId, filename, buffer)` — parse → dedup via `@@unique` Prisma upsert → créer `ImportSession` + `ImportedTransaction[]` → retourner session avec compteurs new/skipped — `backend/src/services/import.service.ts`
- [x] T013 [US1] Implémenter `import.router.ts` : `POST /import/csv` (multer + importCsv), `GET /import/sessions` (cursor pagination), `GET /import/sessions/:id` (avec transactions) — `backend/src/routes/import.router.ts`
- [x] T014 [US1] Enregistrer `importRouter` dans l'application Koa (prefix `/api`) — `backend/src/app.ts`

### Implémentation — Frontend User Story 1

- [x] T015 [P] [US1] Ajouter les clés i18n import dans les deux fichiers (libellés page import, drag-drop, messages erreur format/taille, labels sessions) — `frontend/src/i18n/en.json` et `frontend/src/i18n/fr.json`
- [x] T016 [P] [US1] Implémenter les endpoints RTK Query pour l'import (`uploadCsv`, `getSessions`, `getSession`) — `frontend/src/services/importApi.ts`
- [x] T017 [P] [US1] Implémenter `importSlice.ts` (état UI : session active, filtre statut courant) — `frontend/src/store/importSlice.ts`
- [x] T018 [US1] Implémenter `CsvDropzone.tsx` (drag-and-drop zone + file picker, feedback upload en cours, message d'erreur accessible, mobile-first) — `frontend/src/components/CsvDropzone.tsx`
- [x] T019 [US1] Implémenter `ImportSummary.tsx` (barre compteurs : total / réconcilié / en attente / non-réconcilié / ignoré) — `frontend/src/components/ImportSummary.tsx`
- [x] T020 [US1] Implémenter `TransactionList.tsx` (liste paginée de transactions avec badge de statut, date et montant formatés via `react-intl`) — `frontend/src/components/TransactionList.tsx`
- [x] T021 [US1] Implémenter `ImportPage.tsx` (CsvDropzone + liste des sessions + ImportSummary par session, RTK Query hooks) — `frontend/src/pages/ImportPage.tsx`
- [x] T022 [US1] Ajouter la route `/import` dans le router (protected), ajouter le lien dans `NavBar.tsx` — `frontend/src/app.tsx` et `frontend/src/components/NavBar.tsx`
- [x] T023 [US1] Écrire le test unitaire pour `CsvDropzone.tsx` (rendu, callback upload, état erreur) — `frontend/tests/unit/components/CsvDropzone.test.tsx`

**Checkpoint**: Import CSV fonctionnel end-to-end — upload → liste transactions → dedup sur re-import. Testable sans aucune autre user story.

---

## Phase 4: User Story 2 — Manual Expense Entry (Priority: P2)

**Objectif**: Un utilisateur peut saisir une dépense manuelle (montant, libellé, date, catégorie) qui est persistée et apparaît dans sa liste. Il peut la supprimer (suppression hard + invalidation future réconciliation).

**Test indépendant**: Créer une dépense via `POST /api/expenses`, vérifier qu'elle apparaît dans `GET /api/expenses`. Supprimer via `DELETE /api/expenses/:id`, vérifier 404 en re-fetching.

### Tests — User Story 2

- [x] T024 [P] [US2] Écrire le test d'intégration pour `POST /expenses` (création valide, validation champs manquants, montant invalide), `GET /expenses` (pagination, filtres date/catégorie), `DELETE /expenses/:id` (suppression existante, 404 inexistante) — `backend/tests/integration/routes/expenses.router.test.ts`

### Implémentation — Backend User Story 2

- [x] T025 [US2] Ajouter dans `import.service.ts` les méthodes `createExpense(userId, input)` et `deleteExpense(userId, expenseId)` (deleteExpense : transaction Prisma atomique — reset `ImportedTransaction.status → UNRECONCILED` si liée, puis delete Reconciliation + ManualExpense) — `backend/src/services/import.service.ts`
- [x] T026 [US2] Implémenter `expenses.router.ts` : `GET /expenses` (cursor pagination, filtres from/to/category), `POST /expenses` (validation + createExpense), `DELETE /expenses/:id` (deleteExpense) — `backend/src/routes/expenses.router.ts`
- [x] T027 [US2] Enregistrer `expensesRouter` dans l'application Koa (prefix `/api`) — `backend/src/app.ts`

### Implémentation — Frontend User Story 2

- [x] T028 [P] [US2] Ajouter les clés i18n dépenses (libellés formulaire, catégories, messages validation, confirmation suppression) — `frontend/src/i18n/en.json` et `frontend/src/i18n/fr.json`
- [x] T029 [P] [US2] Implémenter les endpoints RTK Query pour les dépenses (`getExpenses`, `createExpense`, `deleteExpense`) — `frontend/src/services/expensesApi.ts`
- [x] T030 [US2] Implémenter `ExpenseForm.tsx` (champs montant / libellé / date / catégorie, validation inline, mobile-first, toutes chaînes via react-intl) — `frontend/src/components/ExpenseForm.tsx`
- [x] T031 [US2] Créer `ReconciliationPage.tsx` (layout initial : ExpenseForm + liste des dépenses manuelles avec bouton suppression) — `frontend/src/pages/ReconciliationPage.tsx`
- [x] T032 [US2] Ajouter la route `/reconciliation` dans le router (protected), ajouter le lien dans `NavBar.tsx` — `frontend/src/app.tsx` et `frontend/src/components/NavBar.tsx`
- [x] T033 [US2] Écrire le test unitaire pour `ExpenseForm.tsx` (rendu, validation, submit) — `frontend/tests/unit/components/ExpenseForm.test.tsx`

**Checkpoint**: Saisie et suppression de dépenses manuelles fonctionnelles. Testable sans réconciliation.

---

## Phase 5: User Story 3 — Automatic Reconciliation (Priority: P3)

**Objectif**: Après chaque import CSV et après chaque saisie de dépense, le moteur rapproche automatiquement les paires à haute confiance (score ≥ 0,85, match unique). Les paires ambiguës sont collectées pour review.

**Test indépendant**: Créer une dépense "Loyer mars", importer un CSV contenant "VIR SEPA LOYER MARS" du même montant. Vérifier que la transaction est marquée `RECONCILED` avec `isAutoMatched: true` dans la réponse.

### Tests — User Story 3

- [x] T034 [P] [US3] Écrire les tests unitaires pour `bankLabelMatcher.ts` (15 paires de labels couvrant : match exact, préfixe SEPA, sous-ensemble, faute de frappe, pas de match, seuils 0,85/0,60) — `backend/tests/unit/services/bankLabelMatcher.test.ts`
- [x] T035 [P] [US3] Écrire les tests unitaires pour `reconciliation.service.ts` (auto-match unique, match ambigu → candidates, aucun match, transaction IGNORED exclue, déclenchement après import et après expense) — `backend/tests/unit/services/reconciliation.service.test.ts`

### Implémentation — Backend User Story 3

- [x] T036 [US3] Implémenter `bankLabelMatcher.ts` : pipeline de normalisation (NFD + diacritiques + lowercase + ponctuation), strip préfixes SEPA/CFONB, tokenSetRatio, bigramDice via `talisman/metrics/dice`, `matchBankLabel(bankRaw, userLabel): MatchResult` — `backend/src/services/bankLabelMatcher.ts`
- [x] T037 [US3] Implémenter `reconciliation.service.ts` : `runReconciliation(userId)` — fetch tous les `UNRECONCILED` ImportedTransactions + toutes les ManualExpenses non-réconciliées, matrice N×M de scores, auto-match si score ≥ 0,85 + unique, collecter les ambiguës (plusieurs candidats ≥ 0,60), retourner `{ autoReconciled, awaitingReview }` — `backend/src/services/reconciliation.service.ts`
- [x] T038 [US3] Intégrer le déclenchement de `runReconciliation` dans `import.service.ts` : appel après `importCsv` (post-persist) ET après `createExpense` — `backend/src/services/import.service.ts`

### Implémentation — Frontend User Story 3

- [x] T039 [P] [US3] Ajouter les clés i18n réconciliation (auto-match, en attente, confiance haute/plausible, bouton annuler) — `frontend/src/i18n/en.json` et `frontend/src/i18n/fr.json`
- [x] T040 [US3] Implémenter `ReconciliationCard.tsx` (afficher une transaction : libellé, montant, date, badge statut `RECONCILED`/`UNRECONCILED`/`IGNORED`, indicateur `auto-matched`) — `frontend/src/components/ReconciliationCard.tsx`
- [x] T041 [US3] Mettre à jour `ReconciliationPage.tsx` pour afficher la liste des transactions importées via `TransactionList` + `ReconciliationCard`, avec résumé `ImportSummary` — `frontend/src/pages/ReconciliationPage.tsx`
- [x] T042 [US3] Mettre à jour `importApi.ts` pour consommer `reconciliationResults` dans la réponse `POST /expenses` (invalider le cache session concernée) — `frontend/src/services/importApi.ts`

**Checkpoint**: Le moteur de rapprochement automatique est actif — les paires claires sont traitées sans intervention utilisateur.

---

## Phase 6: User Story 4 — Ambiguity Resolution (Priority: P4)

**Objectif**: Quand plusieurs dépenses manuelles correspondent à une transaction CSV, l'utilisateur voit les candidats classés par confiance et choisit le bon match (ou les écarte tous).

**Test indépendant**: Créer deux dépenses de même montant à dates proches, importer un CSV avec une transaction correspondante. Vérifier que la transaction est `UNRECONCILED` avec une liste `candidates` non-vide. Confirmer un candidat via `POST /reconciliation/confirm`, vérifier statut `RECONCILED`.

### Tests — User Story 4

- [x] T043 [P] [US4] Écrire le test d'intégration pour `POST /reconciliation/confirm` (confirmation valide, déjà réconcilié → 400, transaction inconnue → 404) — `backend/tests/integration/routes/expenses.router.test.ts`

### Implémentation — Backend User Story 4

- [x] T044 [US4] Ajouter `confirmReconciliation(userId, importedTransactionId, manualExpenseId)` dans `reconciliation.service.ts` (vérifier ownership, vérifier les deux items UNRECONCILED, créer `Reconciliation` avec `isAutoMatched: false`, setter `ImportedTransaction.status → RECONCILED`, transaction atomique) — `backend/src/services/reconciliation.service.ts`
- [x] T045 [US4] Ajouter `POST /reconciliation/confirm` dans `expenses.router.ts` — `backend/src/routes/expenses.router.ts`

### Implémentation — Frontend User Story 4

- [x] T046 [P] [US4] Ajouter les clés i18n résolution ambiguïté (titre "Plusieurs correspondances", "Sélectionner", "Écarter", score confiance) — `frontend/src/i18n/en.json` et `frontend/src/i18n/fr.json`
- [x] T047 [US4] Étendre `ReconciliationCard.tsx` : afficher la liste des candidats (libellé dépense, score, badge confiance) avec boutons "Sélectionner" / "Écarter tous", appel `useConfirmReconciliationMutation` — `frontend/src/components/ReconciliationCard.tsx`
- [x] T048 [US4] Ajouter `confirmReconciliation` mutation dans `expensesApi.ts` (invalider cache session + expenses après succès) — `frontend/src/services/importApi.ts`

**Checkpoint**: Les cas ambigus sont résolubles — l'utilisateur peut sélectionner ou écarter les candidats.

---

## Phase 7: User Story 5 — Transaction Status Management (Priority: P5)

**Objectif**: Un utilisateur peut marquer une transaction comme ignorée (transfert interne), la dés-ignorer, ou annuler une réconciliation (les deux items reviennent à UNRECONCILED).

**Test indépendant**: Marquer une transaction `IGNORED` via `PATCH /import/transactions/:id`. Vérifier qu'elle n'apparaît plus dans la liste en attente. Annuler une réconciliation via `DELETE /reconciliation/:id`, vérifier que les deux items reviennent à `UNRECONCILED`.

### Tests — User Story 5

- [x] T049 [P] [US5] Écrire le test d'intégration pour `PATCH /import/transactions/:id` (IGNORED, UNRECONCILED, statut invalide → 400) et `DELETE /reconciliation/:id` (annulation + reset statuts, id inconnu → 404) — `backend/tests/integration/routes/import.router.test.ts`

### Implémentation — Backend User Story 5

- [x] T050 [US5] Implémenter le handler `PATCH /import/transactions/:id` dans `import.router.ts` (vérifier ownership, autoriser seulement `IGNORED`/`UNRECONCILED`, rejeter si transaction déjà `RECONCILED` et demande `IGNORED`) — `backend/src/routes/import.router.ts`
- [x] T051 [US5] Ajouter `undoReconciliation(userId, reconciliationId)` dans `reconciliation.service.ts` (transaction atomique : delete Reconciliation + set ImportedTransaction.status → UNRECONCILED) — `backend/src/services/reconciliation.service.ts`
- [x] T052 [US5] Ajouter `DELETE /reconciliation/:id` dans `expenses.router.ts` — `backend/src/routes/expenses.router.ts`

### Implémentation — Frontend User Story 5

- [x] T053 [P] [US5] Ajouter les clés i18n gestion statut (libellés boutons "Ignorer", "Dés-ignorer", "Annuler le rapprochement", confirmation) — `frontend/src/i18n/en.json` et `frontend/src/i18n/fr.json`
- [x] T054 [US5] Ajouter les actions de statut dans `ReconciliationCard.tsx` : bouton "Ignorer" (sur UNRECONCILED), bouton "Dés-ignorer" (sur IGNORED), bouton "Annuler" (sur RECONCILED) avec mutations RTK Query correspondantes — `frontend/src/components/ReconciliationCard.tsx`
- [x] T055 [US5] Ajouter `updateTransactionStatus` mutation et `undoReconciliation` mutation dans `importApi.ts` (invalider cache session après succès) — `frontend/src/services/importApi.ts`

**Checkpoint**: Toutes les transitions de statut sont accessibles depuis l'interface. Feature complète.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Objectif**: Qualité finale, conformité Constitution, validation des SLOs.

- [x] T056 [P] Mettre à jour `CLAUDE.md` section Active Technologies (csv-parse, iconv-lite, talisman, @koa/multer — feature 003-csv-import) — `CLAUDE.md`
- [x] T057 [P] Mettre à jour `importSlice.ts` dans le store index pour l'exposer aux composants — `frontend/src/store/index.ts`
- [x] T058 Lancer `pnpm check:fix` et corriger tous les warnings Biome sur les nouveaux fichiers — tous les fichiers modifiés
- [x] T059 Lancer `pnpm typecheck` et corriger toutes les erreurs TypeScript strict mode — tous les fichiers modifiés
- [x] T060 Lancer `pnpm test` et vérifier couverture ≥ 80 % sur : `csvParser.service.ts`, `bankLabelMatcher.ts`, `reconciliation.service.ts`, `import.service.ts` — rapport coverage Vitest
- [x] T061 Écrire le test de performance dans le test unitaire `reconciliation.service.test.ts` : matrice 200×200 doit s'exécuter en < 1 s — `backend/tests/unit/services/reconciliation.service.test.ts`
- [x] T062 Ajouter une fixture CSV de test réaliste (≥ 20 lignes, format 5-col SG) pour les tests d'intégration — `backend/tests/fixtures/sg-sample.csv`

---

## Dépendances & Ordre d'exécution

### Dépendances inter-phases

```
Phase 1 (Setup)
  └── Phase 2 (Foundational) ─────────────────────────── BLOQUE toutes les US
        ├── Phase 3 (US1 — CSV Import)
        │     └── Phase 5 (US3 — Auto-Reconciliation)  ← dépend de US1 (import.service.ts)
        ├── Phase 4 (US2 — Manual Expense)
        │     └── Phase 6 (US4 — Ambiguity Resolution) ← dépend de US2 (expenses.router.ts)
        └── Phase 7 (US5 — Status Management)          ← dépend de US1 + US4
              └── Phase 8 (Polish)
```

### Dépendances dans chaque User Story

| Phase | Ordre |
|---|---|
| US1 | T008-T009 [P] → T010 → T011 → T012 → T013 → T014 (backend) ‖ T015-T017 [P] → T018 → T019 → T020 → T021 → T022 → T023 (frontend) |
| US2 | T024 [P] → T025 → T026 → T027 (backend) ‖ T028-T029 [P] → T030 → T031 → T032 → T033 (frontend) |
| US3 | T034-T035 [P] → T036 → T037 → T038 (backend) ‖ T039 [P] → T040 → T041 → T042 (frontend) |
| US4 | T043 → T044 → T045 (backend) ‖ T046 [P] → T047 → T048 (frontend) |
| US5 | T049 → T050 → T051 → T052 (backend) ‖ T053 [P] → T054 → T055 (frontend) |

---

## Exemples d'exécution en parallèle

### Phase 2 (Foundational — séquentiel car même fichier schema.prisma)

```
T003 → T004 → T005 → T006 → T007
```

### Phase 3 (US1 — backend et frontend en parallèle)

```
Parallel batch 1:
  Task: "Tests csvParser (T008)" [backend/tests]
  Task: "Test intégration import router (T009)" [backend/tests]

Sequential backend:
  T010 csvParser.service.ts
  T011 import.service.ts
  T012 import.router.ts
  T013 app.ts

Parallel batch frontend (démarre dès T007 terminé):
  Task: "Clés i18n import (T015)"
  Task: "importApi.ts RTK Query (T016)"
  Task: "importSlice.ts (T017)"
Then sequential: T018 → T019 → T020 → T021 → T022 → T023
```

### Phase 5 (US3 — tests en parallèle)

```
Parallel batch tests:
  Task: "Tests bankLabelMatcher (T034)"
  Task: "Tests reconciliation.service (T035)"

Sequential implementation:
  T036 bankLabelMatcher.ts
  T037 reconciliation.service.ts
  T038 wire trigger in import.service.ts
```

---

## Stratégie d'implémentation

### MVP (User Story 1 uniquement)

1. Phase 1 + Phase 2 (Setup + Fondations)
2. Phase 3 (US1 — Import CSV)
3. **STOP & VALIDER** : uploader un CSV SG réel, vérifier les transactions dans l'UI
4. Déployer / démontrer

### Livraison incrémentale

| Incrément | Valeur livrée |
|---|---|
| Setup + Foundational | Base de données prête, types disponibles |
| + US1 | Import CSV fonctionnel — on peut voir ses transactions |
| + US2 | Saisie manuelle — on peut enregistrer ses dépenses cash |
| + US3 | Rapprochement auto — les paires claires se traitent seules |
| + US4 | Résolution ambiguïtés — tous les cas sont résolubles |
| + US5 | Gestion statuts — contrôle total sur chaque transaction |

### Stratégie équipe (parallèle)

Après Phase 2 :
- **Dev A** : US1 (backend csvParser + import + router)
- **Dev B** : US2 (backend expenses router + frontend ExpenseForm)
- Sync avant US3 (les deux services se retrouvent dans import.service.ts)

---

## Récapitulatif

| Phase | User Story | Tâches | Parallélisables |
|---|---|---|---|
| 1 Setup | — | T001–T002 | 1 |
| 2 Foundational | — | T003–T007 | 0 (même fichier) |
| 3 US1 | Import CSV (P1) | T008–T023 | 5 |
| 4 US2 | Saisie Manuelle (P2) | T024–T033 | 2 |
| 5 US3 | Réconciliation Auto (P3) | T034–T042 | 2 |
| 6 US4 | Résolution Ambiguïtés (P4) | T043–T048 | 1 |
| 7 US5 | Gestion Statuts (P5) | T049–T055 | 1 |
| 8 Polish | — | T056–T062 | 2 |
| **Total** | | **62 tâches** | **14 [P]** |
