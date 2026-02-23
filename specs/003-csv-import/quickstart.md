# Quickstart: CSV Import & Transaction Reconciliation

**Branch**: `003-csv-import`
**Prérequis**: Phase 1 (`002-user-management`) mergée sur `main`

---

## 1. Installation des dépendances

```bash
# Depuis la racine du monorepo
pnpm install

# Nouvelles dépendances backend à ajouter manuellement si pas encore dans package.json
pnpm --filter backend add csv-parse iconv-lite talisman @koa/multer
pnpm --filter backend add -D @types/multer
```

---

## 2. Migration de la base de données

```bash
# Appliquer la migration (ajoute ImportSession, ImportedTransaction, ManualExpense, Reconciliation)
pnpm --filter @kasa/db run db:migrate

# Régénérer le client Prisma (types partagés front + back)
pnpm --filter @kasa/db run db:generate
```

> La migration SQL est dans `packages/db/prisma/migrations/`.
> Ne jamais éditer les fichiers de migration générés.

---

## 3. Variables d'environnement

Aucune variable supplémentaire requise pour cette feature. Les vars de Phase 1 suffisent :

```bash
DATABASE_URL=postgresql://...
JWT_SECRET=...
JWT_REFRESH_SECRET=...
```

---

## 4. Lancer le projet en développement

```bash
# Frontend (port 5173) + Backend (port 3000) en parallèle
pnpm dev
```

Le backend proxie `/api/*` vers Koa. Le frontend Vite proxie `/api` vers `localhost:3000` (configuré dans `vite.config.ts`).

---

## 5. Lancer les tests

```bash
# Tous les packages avec coverage
pnpm test

# Backend uniquement
pnpm --filter backend test

# Frontend uniquement
pnpm --filter frontend test

# Watch mode (backend)
pnpm --filter backend exec vitest --watch
```

Seuil minimal : **≥ 80 % de couverture par module** (enforced par `vitest.config.ts`).

---

## 6. Lint + Format

```bash
# Check (lecture seule — utilisé en CI)
pnpm check

# Auto-fix
pnpm check:fix

# Typecheck strict
pnpm typecheck
```

---

## 7. Tester l'import CSV manuellement

### Option A — Via curl

```bash
# Se connecter d'abord (récupérer le cookie de session)
curl -c cookies.txt -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"motdepasse"}'

# Uploader un fichier CSV SG
curl -b cookies.txt -X POST http://localhost:3000/api/import/csv \
  -F "file=@/chemin/vers/export.csv"
```

### Option B — Via l'interface

1. `pnpm dev` → ouvrir `http://localhost:5173`
2. Se connecter avec un compte existant
3. Naviguer vers la page Import
4. Glisser-déposer un fichier CSV SG ou utiliser le file picker

### Format CSV SG attendu

```
Numéro de compte;12345678901
Date de comptabilisation;Date de valeur;Libellé;Débit;Crédit
15/01/2025;15/01/2025;PAIEMENT PAR CARTE 14/01/25 CARREFOUR MARKET;42,50;
14/01/2025;14/01/2025;VIR SEPA RECU DE DUPONT JEAN SALAIRE;;2500,00
```

Encodage attendu : Windows-1252 (ou UTF-8 avec BOM).

---

## 8. Structure des fichiers source

```
backend/src/
├── routes/
│   ├── import.router.ts          # POST /import/csv, GET /import/sessions[/:id]
│   │                             # PATCH /import/transactions/:id
│   └── expenses.router.ts        # GET/POST /expenses, DELETE /expenses/:id
├── services/
│   ├── csvParser.service.ts      # Parsing SG CSV (format detection, iconv, csv-parse)
│   ├── bankLabelMatcher.ts       # Algorithme talisman : tokenSetRatio + bigramDice
│   ├── reconciliation.service.ts # Moteur de rapprochement (compare N×M, auto-match)
│   └── import.service.ts         # Orchestration : parse → dedup → save → reconcile
└── middleware/
    └── upload.ts                 # @koa/multer config (memoryStorage, 5 MB limit)

packages/db/prisma/
└── schema.prisma                 # + ImportSession, ImportedTransaction,
                                  #   ManualExpense, Reconciliation

frontend/src/
├── pages/
│   ├── ImportPage.tsx            # Upload CSV + liste des sessions
│   └── ReconciliationPage.tsx    # Révision transactions, résolution ambiguïtés
├── components/
│   ├── CsvDropzone.tsx           # Zone drag-and-drop
│   ├── ExpenseForm.tsx           # Formulaire dépense manuelle
│   ├── TransactionList.tsx       # Liste transactions avec statuts
│   ├── ReconciliationCard.tsx    # Carte transaction + candidats matching
│   └── ImportSummary.tsx         # Barre de résumé (reconciled/unreconciled/etc.)
├── services/
│   ├── importApi.ts              # RTK Query endpoints import
│   └── expensesApi.ts            # RTK Query endpoints expenses
└── store/
    └── importSlice.ts            # État UI session active, filtres
```

---

## 9. Vérification Constitution (rappel)

Avant chaque PR :

- [ ] `pnpm check` — zéro warning Biome
- [ ] `pnpm typecheck` — zéro erreur TypeScript strict
- [ ] `pnpm test` — coverage ≥ 80 % sur tous les modules modifiés
- [ ] Aucune chaîne UI en dur (tout via `react-intl`)
- [ ] Tous les appels API frontend via RTK Query (`src/services/`)
- [ ] Classes conditionnelles via `cn()` uniquement
- [ ] Mobile-first : layout ≤ 375 px en premier

---

## 10. Contrat API

Voir [`contracts/openapi.yaml`](./contracts/openapi.yaml) pour la spécification complète.

Endpoints principaux :

| Méthode | Path | Description |
|---|---|---|
| `POST` | `/api/import/csv` | Upload + import fichier CSV |
| `GET` | `/api/import/sessions` | Liste des sessions d'import |
| `GET` | `/api/import/sessions/:id` | Détail d'une session |
| `PATCH` | `/api/import/transactions/:id` | Marquer ignorée / non-réconciliée |
| `GET` | `/api/expenses` | Liste dépenses manuelles |
| `POST` | `/api/expenses` | Créer dépense manuelle |
| `DELETE` | `/api/expenses/:id` | Supprimer dépense |
| `POST` | `/api/reconciliation/confirm` | Confirmer un rapprochement |
| `DELETE` | `/api/reconciliation/:id` | Annuler un rapprochement |
