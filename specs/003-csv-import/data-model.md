# Data Model: CSV Import & Transaction Reconciliation

**Branch**: `003-csv-import`
**Phase**: 1 — Design
**Date**: 2026-02-22

---

## Vue d'ensemble

4 nouveaux modèles Prisma dans `packages/db/prisma/schema.prisma` :

| Modèle | Rôle |
|---|---|
| `ImportSession` | Regroupe toutes les transactions d'un upload CSV |
| `ImportedTransaction` | Une ligne du fichier CSV parsée |
| `ManualExpense` | Dépense saisie manuellement par l'utilisateur |
| `Reconciliation` | Lien 1-à-1 entre ImportedTransaction et ManualExpense |

2 nouveaux enums :

| Enum | Valeurs |
|---|---|
| `ReconciliationStatus` | `UNRECONCILED`, `RECONCILED`, `IGNORED` |
| `ExpenseCategory` | `FOOD`, `TRANSPORT`, `HOUSING`, `HEALTH`, `ENTERTAINMENT`, `OTHER` |

---

## Diagramme des relations

```
User (existant)
├── ImportSession (1:N)
│   └── ImportedTransaction (1:N)
│       └── Reconciliation (0..1 : 1)
└── ManualExpense (1:N)
    └── Reconciliation (0..1 : 1)
```

---

## Schéma Prisma

### Enums

```prisma
enum ReconciliationStatus {
  UNRECONCILED
  RECONCILED
  IGNORED
}

enum ExpenseCategory {
  FOOD          // Alimentation
  TRANSPORT     // Transport
  HOUSING       // Logement
  HEALTH        // Santé
  ENTERTAINMENT // Loisirs
  OTHER         // Autre
}
```

### ImportSession

```prisma
model ImportSession {
  id         String   @id @default(cuid())
  userId     String
  filename   String
  importedAt DateTime @default(now())

  user         User                  @relation(fields: [userId], references: [id], onDelete: Cascade)
  transactions ImportedTransaction[]

  @@index([userId, importedAt])
}
```

### ImportedTransaction

```prisma
model ImportedTransaction {
  id             String               @id @default(cuid())
  sessionId      String
  userId         String
  accountingDate DateTime             @db.Date
  valueDate      DateTime?            @db.Date
  label          String
  debit          Decimal?             @db.Decimal(12, 2)
  credit         Decimal?             @db.Decimal(12, 2)
  status         ReconciliationStatus @default(UNRECONCILED)
  createdAt      DateTime             @default(now())

  session        ImportSession  @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  user           User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  reconciliation Reconciliation?

  // Clé de déduplication sur re-import : même transaction = même combinaison
  @@unique([userId, accountingDate, label, debit, credit], name: "dedup_key")
  @@index([userId, status])
  @@index([sessionId])
}
```

### ManualExpense

```prisma
model ManualExpense {
  id        String          @id @default(cuid())
  userId    String
  amount    Decimal         @db.Decimal(12, 2)
  label     String          @db.VarChar(255)
  date      DateTime        @db.Date
  category  ExpenseCategory
  createdAt DateTime        @default(now())
  updatedAt DateTime        @updatedAt

  user           User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  reconciliation Reconciliation?

  @@index([userId, date])
}
```

### Reconciliation

```prisma
model Reconciliation {
  id                    String   @id @default(cuid())
  importedTransactionId String   @unique
  manualExpenseId       String   @unique
  confidenceScore       Float    // 0.0–1.0 (score du matcher au moment du rapprochement)
  isAutoMatched         Boolean  @default(false)
  reconciledAt          DateTime @default(now())

  importedTransaction ImportedTransaction @relation(fields: [importedTransactionId], references: [id], onDelete: Cascade)
  manualExpense       ManualExpense       @relation(fields: [manualExpenseId], references: [id], onDelete: Cascade)
}
```

### Relation User — ajouts

```prisma
// À ajouter au modèle User existant :
importSessions       ImportSession[]
importedTransactions ImportedTransaction[]
manualExpenses       ManualExpense[]
```

---

## Transitions d'état

### ImportedTransaction.status

```
UNRECONCILED ──── match auto (score ≥ 0.85, unique) ────────────→ RECONCILED
UNRECONCILED ──── user confirme candidat ───────────────────────→ RECONCILED
UNRECONCILED ──── user marque ignorée ──────────────────────────→ IGNORED
RECONCILED   ──── user annule (DELETE Reconciliation) ──────────→ UNRECONCILED
RECONCILED   ──── ManualExpense supprimée (cascade) ────────────→ UNRECONCILED (service layer)
IGNORED      ──── user retire l'ignore ─────────────────────────→ UNRECONCILED
```

### ManualExpense (état déduit de la présence d'une Reconciliation)

```
Créée sans Reconciliation ──── match auto / user confirme ───→ Liée (Reconciliation créée)
Liée ──── user annule réconciliation (DELETE Reconciliation) ─→ Non liée
Liée ──── expense supprimée (hard delete) ───────────────────→ [expense + Reconciliation supprimées]
                                                               + ImportedTransaction.status → UNRECONCILED (service layer)
```

---

## Règles de validation

| Champ | Règle |
|---|---|
| `ImportedTransaction.debit` | Null ou valeur positive ; `debit` et `credit` mutuellement exclusifs (exactement l'un est non-null) |
| `ImportedTransaction.credit` | Idem ci-dessus |
| `ManualExpense.amount` | Decimal > 0 |
| `ManualExpense.label` | Non-vide, max 255 caractères |
| `ManualExpense.date` | Date valide |
| `Reconciliation.confidenceScore` | Float ∈ [0.0, 1.0] |

---

## Stratégie d'index

| Index | Justification |
|---|---|
| `ImportedTransaction(userId, status)` | Pattern principal du moteur de réconciliation : récupérer tous les UNRECONCILED d'un utilisateur |
| `ImportedTransaction(sessionId)` | Fetch toutes les transactions d'une session pour le résumé |
| `ImportSession(userId, importedAt)` | Lister les sessions par utilisateur, ordre anti-chronologique |
| `ManualExpense(userId, date)` | Lister les dépenses par utilisateur avec filtrage temporel |
| `Reconciliation.importedTransactionId` | `@unique` — lookup rapide par transaction |
| `Reconciliation.manualExpenseId` | `@unique` — lookup rapide par dépense |

---

## Notes importantes

- **Pas d'ID unique SG** : le CSV SG n'exporte pas d'identifiant unique par transaction. La clé de déduplication composite `@@unique([userId, accountingDate, label, debit, credit])` est le seul mécanisme de détection des re-imports.
- **Précision décimale** : `@db.Decimal(12, 2)` — supports jusqu'à 9 999 999 999,99 € (finance personnelle largement couverte).
- **Date sans heure** : `@db.Date` — le CSV SG n'inclut pas l'heure. Évite les bugs de fuseau horaire.
- **Suppression ManualExpense** : le service doit réinitialiser `ImportedTransaction.status → UNRECONCILED` **avant** la suppression dans une transaction Prisma atomique, car la cascade supprime la `Reconciliation` mais ne met pas à jour le statut de la transaction parente.
- **Sessions multiples simultanées** : pas de contrainte d'unicité ni de FK inter-sessions — le moteur de réconciliation opère sur **tous** les UNRECONCILED d'un userId, toutes sessions confondues (Q4 : scope global).
