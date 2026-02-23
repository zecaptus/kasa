# Quickstart: 004-transactions

**Branch**: `004-transactions`
**Date**: 2026-02-23

Scénarios d'intégration pour valider la feature. Chaque scénario peut être exécuté de manière indépendante.

---

## Scénario 1 — Vue unifiée paginée

**Pré-requis** : Utilisateur authentifié avec des transactions importées et des dépenses manuelles.

```http
### Première page
GET /api/transactions?limit=20
Authorization: Bearer <token>

### Réponse attendue
HTTP 200
{
  "transactions": [
    {
      "id": "cuid_it_001",
      "type": "IMPORTED_TRANSACTION",
      "date": "2026-02-18",
      "label": "CARTE X1306 17/02",
      "detail": "CARTE X1306 17/02 ROMCOCO",
      "amount": 26.01,
      "direction": "debit",
      "status": "UNRECONCILED",
      "categoryId": "cat_system_food",
      "categorySource": "AUTO",
      "category": { "id": "cat_system_food", "name": "Alimentation", "slug": "food", "color": "#22c55e", "isSystem": true }
    },
    {
      "id": "cuid_me_001",
      "type": "MANUAL_EXPENSE",
      "date": "2026-02-17",
      "label": "Loyer février",
      "detail": null,
      "amount": 1200.00,
      "direction": null,
      "status": null,
      "categoryId": "cat_system_housing",
      "categorySource": "MANUAL",
      "category": { "id": "cat_system_housing", "name": "Logement", "slug": "housing", "color": "#f59e0b", "isSystem": true }
    }
  ],
  "nextCursor": "eyJkYXRlIjoiMjAyNi0wMi0xMCIsImlkIjoiY3VpZF9pdF8wMjAifQ",
  "totals": { "debit": 526.01, "credit": 50.00 }
}

### Page suivante (avec curseur)
GET /api/transactions?limit=20&cursor=eyJkYXRlIjoiMjAyNi0wMi0xMCIsImlkIjoiY3VpZF9pdF8wMjAifQ
Authorization: Bearer <token>

### Dernière page (nextCursor = null)
{
  "transactions": [...],
  "nextCursor": null,
  "totals": { "debit": 1250.00, "credit": 2550.00 }
}
```

**Vérifications** :
- `transactions` triées par `date` décroissant
- `IMPORTED_TRANSACTION` et `MANUAL_EXPENSE` mélangées dans la liste
- `nextCursor` non-null si plus de résultats, `null` sinon

---

## Scénario 2 — Filtrage et recherche

```http
### Filtre par période
GET /api/transactions?from=2026-01-01&to=2026-01-31
Authorization: Bearer <token>
# → Seules les transactions de janvier 2026

### Filtre par catégorie
GET /api/transactions?categoryId=cat_system_food
Authorization: Bearer <token>
# → Toutes les transactions Alimentation

### Filtre transactions non catégorisées
GET /api/transactions?categoryId=none
Authorization: Bearer <token>
# → Toutes les transactions avec categoryId = null

### Filtre débit uniquement
GET /api/transactions?direction=debit
Authorization: Bearer <token>
# → Seulement les dépenses (debit), ManualExpense exclus car direction=null

### Recherche texte
GET /api/transactions?search=CARREFOUR
Authorization: Bearer <token>
# → Transactions dont label OU detail contient "CARREFOUR" (insensible casse)

### Combinaison de filtres
GET /api/transactions?from=2026-01-01&to=2026-01-31&categoryId=cat_system_food&search=MARCHE
Authorization: Bearer <token>
# → Transactions alimentaires de janvier contenant "MARCHE"
```

**Vérifications** :
- Résultat vide → `{ "transactions": [], "nextCursor": null, "totals": { "debit": 0, "credit": 0 } }`
- Les filtres sont cumulatifs (AND)
- `totals` reflète uniquement les résultats filtrés de la page courante

---

## Scénario 3 — Catégorisation manuelle d'une transaction

```http
### Recatégoriser une transaction ImportedTransaction
PATCH /api/transactions/cuid_it_001/category
Authorization: Bearer <token>
Content-Type: application/json
{
  "categoryId": "cat_system_transport"
}

### Réponse attendue
HTTP 200
{
  "id": "cuid_it_001",
  "categoryId": "cat_system_transport",
  "categorySource": "MANUAL",
  ...
}

### Vérifier la persistance (ré-import du même CSV ne doit pas écraser)
# Importer à nouveau le fichier CSV contenant cuid_it_001
POST /api/import/csv (FormData)
# → La transaction cuid_it_001 est skippée (déduplication) et sa catégorie MANUAL est préservée

### Supprimer la catégorie d'une transaction (reset à non catégorisée)
PATCH /api/transactions/cuid_it_001/category
Authorization: Bearer <token>
Content-Type: application/json
{
  "categoryId": null
}

### Réponse attendue
HTTP 200
{
  "categoryId": null,
  "categorySource": "NONE",
  ...
}
```

**Vérifications** :
- `categorySource` passe à `MANUAL` → protège contre la recatégorisation automatique
- `categoryId: null` remet à `NONE` → éligible à nouveau pour l'auto-catégorisation
- Transaction absente → HTTP 404

---

## Scénario 4 — Gestion des catégories personnalisées

```http
### Lister toutes les catégories (système + utilisateur)
GET /api/categories
Authorization: Bearer <token>

### Réponse attendue
HTTP 200
{
  "categories": [
    { "id": "cat_system_food", "name": "Alimentation", "isSystem": true, ... },
    { "id": "cat_system_transport", "name": "Transport", "isSystem": true, ... },
    { "id": "cuid_user_sport", "name": "Sport", "isSystem": false, "color": "#22c55e", ... }
  ]
}

### Créer une catégorie personnalisée
POST /api/categories
Authorization: Bearer <token>
Content-Type: application/json
{ "name": "Sport", "color": "#22c55e" }

### Réponse attendue
HTTP 201
{ "id": "cuid_user_sport", "name": "Sport", "slug": "sport", "color": "#22c55e", "isSystem": false, ... }

### Conflit : même nom déjà existant
POST /api/categories
{ "name": "Sport", "color": "#3b82f6" }
# → HTTP 409 { "error": "Category with this name already exists" }

### Renommer
PATCH /api/categories/cuid_user_sport
{ "name": "Fitness & Sport" }
# → HTTP 200, name mis à jour

### Supprimer (avec transactions affectées)
DELETE /api/categories/cuid_user_sport
# → HTTP 200 { "affectedTransactions": 5 }
# → Les 5 transactions passent à categoryId = null

### Tenter de supprimer une catégorie système
DELETE /api/categories/cat_system_food
# → HTTP 403 { "error": "Cannot delete a system category" }
```

---

## Scénario 5 — Gestion des règles de catégorisation

```http
### Lister les règles (système + utilisateur)
GET /api/categories/rules
Authorization: Bearer <token>

### Réponse attendue
HTTP 200
{
  "rules": [
    { "id": "rule_user_001", "keyword": "NETFLIX", "categoryId": "cat_system_entertainment", "isSystem": false, ... },
    { "id": "rule_sys_001", "keyword": "CARREFOUR", "categoryId": "cat_system_food", "isSystem": true, ... }
  ]
}

### Créer une règle personnalisée
POST /api/categories/rules
Authorization: Bearer <token>
Content-Type: application/json
{ "keyword": "SALLE DE SPORT", "categoryId": "cuid_user_sport" }

### Réponse attendue
HTTP 201
{ "id": "rule_user_002", "keyword": "SALLE DE SPORT", "categoryId": "cuid_user_sport", "isSystem": false, ... }

### Modifier une règle
PATCH /api/categories/rules/rule_user_002
{ "keyword": "SALLE SPORT" }
# → HTTP 200

### Supprimer une règle (pas de recatégorisation rétroactive)
DELETE /api/categories/rules/rule_user_002
# → HTTP 204 — les transactions déjà catégorisées par cette règle restent inchangées

### Tenter de supprimer une règle système
DELETE /api/categories/rules/rule_sys_001
# → HTTP 403 { "error": "Cannot delete a system rule" }
```

---

## Scénario 6 — Auto-catégorisation lors d'un import CSV

```http
### Import d'un CSV contenant des transactions avec libellés connus
POST /api/import/csv
Content-Type: multipart/form-data
file: <csv_file>

### Comportement attendu :
# Transaction "CARTE CARREFOUR MARKET" → categoryId = cat_system_food, categorySource = AUTO
# Transaction "VIR NETFLIX" → categoryId = cat_system_entertainment, categorySource = AUTO (si règle user "NETFLIX")
# Transaction "PRELEVEMENT REF:XYZ" → categoryId = null, categorySource = NONE (aucune règle ne matche)

### Vérification via GET /api/transactions
GET /api/transactions?categoryId=none
# → Seules les transactions non catégorisées (NONE)

GET /api/transactions?categoryId=cat_system_food
# → Toutes les transactions Alimentation (dont celles auto-catégorisées)
```

**Vérifications** :
- Les transactions `MANUAL` existantes ne sont pas recatégorisées lors du ré-import
- Les transactions `AUTO` peuvent être recatégorisées si les règles changent
- Les transactions `NONE` sont catégorisées à chaque import si une règle correspond

---

## Données de test recommandées

```typescript
// prisma/seed.ts — à créer dans packages/db
import { prisma } from './src/client';

async function seed() {
  // Utilisateur de test
  const user = await prisma.user.upsert({
    where: { email: 'test@kasa.fr' },
    update: {},
    create: {
      email: 'test@kasa.fr',
      passwordHash: '<argon2id hash de "password123">',
      name: 'Test User',
      locale: 'FR',
    },
  });

  // Catégorie personnalisée
  await prisma.category.upsert({
    where: { slug_userId: { slug: 'sport', userId: user.id } },
    update: {},
    create: { name: 'Sport', slug: 'sport', color: '#22c55e', userId: user.id },
  });

  // Règle personnalisée
  await prisma.categoryRule.create({
    data: {
      keyword: 'SALLE DE SPORT',
      categoryId: '<id de la catégorie Sport>',
      userId: user.id,
    },
  });

  // Règles système (normalement insérées dans la migration SQL)
  // Insérées ici aussi pour prisma migrate reset en dev
  const systemCategories = [
    { id: 'cat_system_food', slug: 'food', name: 'Alimentation', color: '#22c55e' },
    { id: 'cat_system_transport', slug: 'transport', name: 'Transport', color: '#3b82f6' },
    { id: 'cat_system_housing', slug: 'housing', name: 'Logement', color: '#f59e0b' },
    { id: 'cat_system_health', slug: 'health', name: 'Santé', color: '#ec4899' },
    { id: 'cat_system_entertainment', slug: 'entertainment', name: 'Loisirs', color: '#8b5cf6' },
    { id: 'cat_system_other', slug: 'other', name: 'Autre', color: '#94a3b8' },
  ];

  for (const cat of systemCategories) {
    await prisma.category.upsert({
      where: { id: cat.id },
      update: {},
      create: { ...cat, isSystem: true },
    });
  }
}

seed();
```
