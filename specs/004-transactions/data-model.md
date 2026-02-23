# Data Model: 004-transactions

**Branch**: `004-transactions`
**Date**: 2026-02-23

---

## Nouveaux modèles

### Category

Catégorie de dépense. Remplace l'enum `ExpenseCategory`. Peut être prédéfinie par le système (non supprimable) ou créée par l'utilisateur.

| Champ | Type | Description |
|-------|------|-------------|
| `id` | `String` (cuid) | Identifiant unique |
| `name` | `String` | Nom affiché (ex: "Alimentation") |
| `slug` | `String` | Clé stable lowercase (ex: `food`) — sert au mapping depuis l'ancien enum et aux règles |
| `color` | `String` | Code couleur hex (ex: `#22c55e`). Défaut: `#94a3b8` |
| `isSystem` | `Boolean` | `true` = catégorie système non supprimable. Défaut: `false` |
| `userId` | `String?` | FK vers `User`. `NULL` pour les catégories système |
| `createdAt` | `DateTime` | Date de création |

**Contrainte** : `@@unique([slug, userId])` avec `NULLS NOT DISTINCT` — deux catégories système ne peuvent pas avoir le même slug; un utilisateur ne peut pas avoir deux catégories avec le même slug.

**Relations** :
- `user User?` — si `userId` non null, cascade delete
- `manualExpenses ManualExpense[]` — `onDelete: SetNull` (les transactions deviennent "Non catégorisées" si la catégorie est supprimée)
- `importedTransactions ImportedTransaction[]` — idem
- `rules CategoryRule[]`

**Catégories système pré-seedées** (IDs fixes dans la migration SQL) :

| slug | name | color |
|------|------|-------|
| `food` | Alimentation | `#22c55e` |
| `transport` | Transport | `#3b82f6` |
| `housing` | Logement | `#f59e0b` |
| `health` | Santé | `#ec4899` |
| `entertainment` | Loisirs | `#8b5cf6` |
| `other` | Autre | `#94a3b8` |

---

### CategoryRule

Règle de catégorisation automatique. Association mot-clé → catégorie cible. L'utilisateur peut créer ses propres règles (prioritaires sur les règles système).

| Champ | Type | Description |
|-------|------|-------------|
| `id` | `String` (cuid) | Identifiant unique |
| `userId` | `String?` | FK vers `User`. `NULL` pour les règles système |
| `keyword` | `String` (varchar 100) | Mot-clé à rechercher dans le libellé (insensible à la casse et aux accents) |
| `categoryId` | `String` | FK vers `Category` (cible de la règle) |
| `isSystem` | `Boolean` | `true` = règle système non supprimable. Défaut: `false` |
| `createdAt` | `DateTime` | Date de création (sert de tiebreaker : règle la plus ancienne gagne si deux mots-clés matchent) |

**Priorité** : règles utilisateur (`isSystem=false`) évaluées avant les règles système (`isSystem=true`). À priorité égale, la règle la plus ancienne (`createdAt ASC`) est prioritaire.

**Relations** :
- `user User?` — cascade delete si userId non null
- `category Category` — la catégorie cible

---

### CategorySource (enum)

Enum ajouté sur `ImportedTransaction` et `ManualExpense` pour distinguer l'origine de la catégorisation.

| Valeur | Description |
|--------|-------------|
| `NONE` | Non catégorisée — le moteur s'applique à l'import |
| `AUTO` | Catégorisée automatiquement — le moteur peut réévaluer à chaque import |
| `MANUAL` | Catégorisée manuellement par l'utilisateur — le moteur ne touche jamais cette transaction |

---

## Modifications des modèles existants

### ImportedTransaction (modifications)

Ajout de `categoryId` et `categorySource` :

```
+ categoryId     String?        // FK → Category, NULL = "Non catégorisée"
+ categorySource CategorySource @default(NONE)
+ category       Category?      @relation(onDelete: SetNull)
```

L'index existant `@@index([userId, status])` reste. Ajout de `@@index([categoryId])`.

### ManualExpense (modifications)

Suppression de `category ExpenseCategory` (enum, migration phase B). Ajout de `categoryId` et `categorySource` :

```
- category     ExpenseCategory   // SUPPRIMÉ en migration phase B
+ categoryId     String?        // FK → Category, NULL = "Non catégorisée"
+ categorySource CategorySource @default(NONE)
+ category       Category?      @relation(onDelete: SetNull)
```

Le backfill de `categoryId` depuis l'ancien champ `category` se fait dans la migration phase A.

---

## Vue unifiée (pas un modèle Prisma)

La **vue unifiée des transactions** n'est pas un nouveau modèle Prisma. C'est le résultat d'une requête `$queryRaw` UNION ALL entre `ImportedTransaction` et `ManualExpense`.

### Type `UnifiedTransaction` (TypeScript uniquement)

```typescript
type UnifiedTransactionType = 'IMPORTED_TRANSACTION' | 'MANUAL_EXPENSE';

interface UnifiedTransaction {
  id: string;
  type: UnifiedTransactionType;
  date: Date;                        // accountingDate (IT) ou date (ME)
  label: string;
  detail: string | null;             // IT seulement, null pour ME
  amount: Prisma.Decimal;            // debit (négatif) ou credit pour IT; amount pour ME
  direction: 'debit' | 'credit' | null; // null pour ME
  status: ReconciliationStatus | null;  // null pour ME
  categoryId: string | null;
  categorySource: CategorySource;
}
```

### Curseur de pagination

```typescript
interface TimelineCursor {
  date: string;  // "YYYY-MM-DD"
  id: string;    // cuid
}
// Sérialisé en base64url dans l'API : Buffer.from(JSON.stringify(cursor)).toString('base64url')
```

---

## Schéma Prisma complet (nouveaux modèles)

```prisma
enum CategorySource {
  NONE
  AUTO
  MANUAL
}

model Category {
  id        String   @id @default(cuid())
  name      String
  slug      String
  color     String   @default("#94a3b8")
  isSystem  Boolean  @default(false)
  userId    String?
  createdAt DateTime @default(now())

  user                 User?                 @relation(fields: [userId], references: [id], onDelete: Cascade)
  manualExpenses       ManualExpense[]
  importedTransactions ImportedTransaction[]
  rules                CategoryRule[]

  @@unique([slug, userId])
  @@index([userId])
}

model CategoryRule {
  id         String   @id @default(cuid())
  userId     String?
  keyword    String   @db.VarChar(100)
  categoryId String
  isSystem   Boolean  @default(false)
  createdAt  DateTime @default(now())

  user     User?    @relation(fields: [userId], references: [id], onDelete: Cascade)
  category Category @relation(fields: [categoryId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([isSystem])
}
```

---

## Plan de migration SQL

### Migration 004a — `20260224000000_004_add_categories`

1. `CREATE TABLE "Category"` avec les 6 catégories système (IDs fixes)
2. `ALTER TABLE "ManualExpense" ADD COLUMN "categoryId" TEXT` (nullable)
3. `ALTER TABLE "ImportedTransaction" ADD COLUMN "categoryId" TEXT` (nullable)
4. `ALTER TABLE "ManualExpense" ADD COLUMN "categorySource" TEXT DEFAULT 'NONE'`
5. `ALTER TABLE "ImportedTransaction" ADD COLUMN "categorySource" TEXT DEFAULT 'NONE'`
6. `CREATE TABLE "CategoryRule"` (vide, les règles système seront seedées via seed.ts)
7. Backfill : `UPDATE "ManualExpense" SET "categoryId" = c.id FROM "Category" c WHERE c.slug = LOWER(me.category::text)`
8. Indexes sur `categoryId` des deux tables

### Migration 004b — `20260224010000_004_drop_expense_category_enum`

1. Guard : vérification aucun `categoryId IS NULL` dans `ManualExpense`
2. `ALTER TABLE "ManualExpense" ALTER COLUMN "categoryId" SET NOT NULL`
3. `ALTER TABLE "ManualExpense" DROP COLUMN "category"`
4. `DROP TYPE "ExpenseCategory"`
