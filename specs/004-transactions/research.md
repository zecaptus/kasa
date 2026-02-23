# Research: 004-transactions

**Date**: 2026-02-23
**Branch**: `004-transactions`

---

## D1 — Vue unifiée : stratégie de requête multi-table

### Decision
`$queryRaw<T>` PostgreSQL `UNION ALL` avec pagination par keyset composite `(date DESC, id ASC)`.

### Rationale
- **Option rejetée — Option 2 (deux requêtes Prisma mergées en mémoire)** : Le curseur de pagination sur deux tables hétérogènes ne peut pas être implémenté correctement avec `cursor: { id }` de Prisma car le point de coupure tombe à des offsets différents dans chaque table selon la distribution des dates. La pagination dégénère en offset-scan, et les filtres asymétriques (ex: `detail` ILIKE n'existe que sur `ImportedTransaction`) sont incorrects.
- **Option rejetée — Option 3 (vue matérialisée / table `Transaction`)** : Nécessite une migration + triggers de synchronisation sur toutes les opérations write sur les deux tables sources. Coût en maintenance disproportionné pour une app mono-utilisateur avec quelques centaines à milliers de lignes par an.
- **Option retenue — UNION ALL via `$queryRaw`** : PostgreSQL traite le `UNION ALL` dans un seul plan de requête. Avec un keyset composite `(date, id)`, la pagination est stable et correcte même si plusieurs transactions partagent la même date. Les filtres (ILIKE, plage de dates, categoryId) s'appliquent uniformément dans les deux branches.

### Cursor encoding
Le curseur est un objet `{ date: "YYYY-MM-DD", id: "cuid" }` sérialisé en base64url dans la réponse HTTP. La condition keyset dans le `WHERE` est :
```sql
(date < :cursor_date) OR (date = :cursor_date AND id > :cursor_id)
```
Le paramètre `:cursor_id` n'est pas lié au type de transaction — il est utilisé uniquement pour l'ordre stable.

### Text search
ILIKE (`label ILIKE '%keyword%'`) dans les deux branches. Acceptable pour < 10 000 lignes par utilisateur. Une extension `pg_trgm` avec index GIN peut être ajoutée en Phase 5+ si les performances se dégradent.

### SQL injection safety
Utiliser `Prisma.sql` tagged template (jamais `$queryRawUnsafe`) pour tous les fragments conditionnels dynamiques. `Prisma.empty` pour les fragments optionnels.

### Alternatives considérées
| Approche | Verdict |
|----------|---------|
| Dual Prisma queries + merge in JS | Rejeté : cursor pagination incorrecte, asymétrie des filtres |
| Materialized `Transaction` table | Rejeté : sync triggers, coût maintenance |
| `UNION ALL $queryRaw` | **Retenu** |
| View PostgreSQL | Équivalent à Option 3, même problème |

---

## D2 — Migration : de l'enum `ExpenseCategory` vers un modèle `Category` flexible

### Decision
Migration en 3 phases. L'enum `ExpenseCategory` est supprimé. Le système de catégories est entièrement remplacé par un modèle `Category` avec `isSystem` + `userId?` sur la même table.

### Phase A — Ajout de la table `Category` + FK nullable + backfill
Une seule migration SQL qui :
1. Crée la table `Category` avec 6 lignes système (IDs fixes, slug stable : `food`, `transport`, etc.)
2. Ajoute `categoryId String?` sur `ManualExpense` et `ImportedTransaction`
3. Backfille `ManualExpense.categoryId` depuis l'ancienne colonne enum via `LOWER(category::text)` → slug → id

### Phase B — Suppression de l'enum
Une seconde migration SQL qui :
1. Vérifie que plus aucun `categoryId IS NULL` (guard)
2. Rend `ManualExpense.categoryId` non-nullable
3. DROP COLUMN `category` sur `ManualExpense`
4. DROP TYPE `"ExpenseCategory"`

### Seeding
Les 6 catégories système sont insérées **dans la migration SQL** (pas dans `prisma/seed.ts`). Raison : `prisma migrate deploy` en production n'exécute pas le seed script ; les données structurelles doivent être dans la migration pour garantir leur présence en production.

Un `prisma/seed.ts` sera créé pour les données de développement (utilisateur de test + transactions d'exemple).

### Schéma `Category`
```prisma
model Category {
  id        String   @id @default(cuid())
  name      String
  slug      String   // lowercase stable: food, transport, housing, health, entertainment, other
  color     String   @default("#94a3b8")
  isSystem  Boolean  @default(false)
  userId    String?  // NULL = système
  createdAt DateTime @default(now())

  @@unique([slug, userId])   // NULLS NOT DISTINCT en PostgreSQL 15+
  @@index([userId])
}
```

`onDelete: SetNull` sur les FK `ManualExpense.categoryId` et `ImportedTransaction.categoryId` : si une catégorie est supprimée, les transactions concernées passent à `NULL` (= "Non catégorisée") sans cascade.

### Alternatives considérées
| Approche | Verdict |
|----------|---------|
| Deux tables `SystemCategory` + `UserCategory` | Rejeté : jointures inutiles, complexité sans bénéfice à cette échelle |
| Garder l'enum + ajouter FK | Rejeté : duplication de données, deux sources de vérité |
| Un champ `@virtual` calculé | Non supporté par Prisma sans extension |
| **`isSystem bool + userId nullable`** | **Retenu** : simple, expressif, couvre tous les cas |

---

## D3 — Moteur de catégorisation automatique

### Decision
Scan linéaire ordonné sur un tableau de règles en mémoire (TTL 10 s par userId), avec `CategorySource` enum (`NONE / AUTO / MANUAL`) pour protéger les catégorisations manuelles.

### Algorithme de matching
- Comparaison `normalize(label).includes(normalize(keyword))` — contains insensible à la casse et aux accents
- Réutilise la fonction `normalize()` de `bankLabelMatcher.ts` (NFD → strip diacritics → lowercase → collapse spaces)
- Les règles sont pré-triées : règles utilisateur (`isSystem=false`) en premier, puis règles système, par `createdAt ASC` comme tiebreaker
- **Première règle matchante gagne** — aucun second pass nécessaire

Un trie (Aho-Corasick) est rejeté : overkill pour < 500 règles, pas adapté au contains substring, complexité d'implémentation non justifiée à cette échelle.

### Protection du choix manuel : `CategorySource`
```prisma
enum CategorySource {
  NONE    // non catégorisée — moteur s'applique
  AUTO    // catégorisée automatiquement — moteur peut réévaluer à chaque import
  MANUAL  // catégorisée manuellement — moteur ne touche JAMAIS
}
```

Lors d'un ré-import CSV, le moteur recatégorise les transactions `NONE` et `AUTO`, mais jamais `MANUAL`.

### Cache des règles
`Map<userId, { rules, loadedAt }>` avec TTL 10 secondes. Invalidé explicitement à chaque mutation (create/update/delete) d'une règle. Un seul fetch DB pour tout le batch d'un import.

### Modèle `CategoryRule`
```prisma
model CategoryRule {
  id         String   @id @default(cuid())
  userId     String?  // NULL = règle système
  keyword    String   @db.VarChar(100)
  categoryId String   // FK → Category
  isSystem   Boolean  @default(false)
  createdAt  DateTime @default(now())

  @@index([userId])
  @@index([isSystem])
}
```

### Intégration dans `import.service.ts`
Après `runReconciliation(userId)`, appeler `bulkCategorizeTransactions(userId, newTransactions)`. Les nouvelles transactions ont `categorySource = NONE` → le moteur les traite toutes.

### Alternatives considérées
| Approche | Verdict |
|----------|---------|
| Trie / Aho-Corasick | Rejeté : overkill pour < 500 règles |
| Patterns regex en BDD | Rejeté : surface ReDoS, UX hostile pour non-développeurs |
| Catégorisation via API externe (ML) | Hors scope phase 4 |
| **Scan linéaire + normalize() + TTL cache** | **Retenu** : simple, testable, performant à cette échelle |

---

## Synthèse des décisions techniques

| # | Décision | Choix retenu |
|---|----------|-------------|
| D1 | Requête vue unifiée | `$queryRaw` UNION ALL + keyset cursor (date, id) |
| D2 | Migration categories | 3-phase : ajout FK + backfill → drop enum |
| D3 | Moteur catégorisation | Scan linéaire + `CategorySource` NONE/AUTO/MANUAL |
| D4 | Pagination | Cursor-based keyset composite (date DESC, id ASC) |
| D5 | Text search | ILIKE dans les deux branches UNION ALL |
| D6 | Cache règles | Map<userId, TTL 10s> invalidé sur mutations |
