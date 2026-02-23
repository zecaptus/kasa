# Kasa

Application de gestion de dépenses personnelles avec import CSV et réconciliation automatique des transactions bancaires.

## Technologies

### Stack
- **Frontend**: React 19 + TypeScript 5.7 (strict) + Vite 6
- **Backend**: Koa 2 + Node.js 22 LTS
- **Database**: PostgreSQL 16 via Prisma 6
- **State Management**: Redux Toolkit + RTK Query
- **Styling**: Tailwind CSS 4
- **i18n**: react-intl (FormatJS)
- **Testing**: Vitest 3 avec couverture v8 ≥ 80%
- **Code Quality**: Biome (lint + format)

### Sécurité & Auth
- Argon2id pour le hashing des mots de passe
- JWT avec rotation de refresh tokens (httpOnly cookies)
- Protection anti-brute-force avec verrouillage temporaire
- Validation des données avec Zod

## Structure du Projet

```
kasa/                        # monorepo pnpm
├── packages/
│   └── db/                  # @kasa/db — Prisma partagé
│       ├── prisma/
│       │   ├── schema.prisma
│       │   └── migrations/
│       └── src/
├── frontend/                # React 19 + Tailwind CSS 4
│   ├── src/
│   │   ├── components/      # Composants réutilisables
│   │   ├── pages/           # Pages routes
│   │   ├── services/        # API client (RTK Query)
│   │   ├── store/           # Redux state management
│   │   ├── i18n/            # Traductions (FR/EN)
│   │   └── hooks/           # Custom React hooks
│   └── tests/
└── backend/                 # Koa 2 + PostgreSQL
    ├── src/
    │   ├── app.ts           # Koa app factory
    │   ├── routes/          # API endpoints par domaine
    │   ├── services/        # Business logic
    │   ├── middleware/      # Auth, upload, error handling
    │   └── config.ts        # Validation env (Zod)
    └── tests/
```

## Installation

### Prérequis
- Node.js 22 LTS
- PostgreSQL 16
- pnpm 9+

### Setup

```bash
# Cloner le repo
git clone https://github.com/zecaptus/kasa.git
cd kasa

# Installer les dépendances
pnpm install

# Configurer les variables d'environnement
cp backend/.env.example backend/.env
# Éditer backend/.env avec vos valeurs (DATABASE_URL, JWT_SECRET, etc.)

# Appliquer les migrations
pnpm --filter @kasa/db run db:migrate

# Générer le client Prisma
pnpm --filter @kasa/db run db:generate
```

## Démarrage

```bash
# Development (frontend + backend en parallèle)
pnpm dev

# Frontend seul (port 5173)
pnpm --filter @kasa/frontend dev

# Backend seul (port 3000)
pnpm --filter @kasa/backend dev
```

## Commandes

```bash
# Vérification de code
pnpm check              # Biome lint + format check
pnpm check:fix          # Biome auto-fix

# Type checking
pnpm typecheck          # TypeScript toutes les packages

# Tests
pnpm test               # Vitest avec couverture

# Build production
pnpm build              # Build frontend + backend

# Base de données
pnpm --filter @kasa/db run db:migrate    # Appliquer migrations
pnpm --filter @kasa/db run db:generate   # Régénérer client Prisma
pnpm --filter @kasa/db run db:studio     # Prisma Studio
```

## Features

### ✅ Authentification (002-user-management)
- Inscription avec validation de mot de passe fort
- Connexion avec rotation de refresh tokens
- Protection anti-brute-force
- Gestion de profil utilisateur
- Support multilingue (FR/EN)
- Dark mode

### ✅ Import et Réconciliation CSV (003-csv-import)
- Import de relevés bancaires Société Générale (formats 4 et 5 colonnes)
- Support du nouveau format SG "Date de l'opération" avec formules Excel
- Détection automatique de format CSV
- Déduplication des transactions
- Champ `detail` séparé pour meilleure identification
- Réconciliation automatique avec matching intelligent
- Matching basé sur:
  - Similarité de date (fenêtre de ±7 jours)
  - Similarité de montant (tolérance 0.5%)
  - Similarité de libellé (algorithme fuzzy)
- Statuts: UNRECONCILED, RECONCILED, IGNORED
- Interface de validation manuelle pour candidats ambigus
- Compteurs de réconciliation en temps réel

### 🎨 UX/UI
- Design system cohérent avec tokens Kasa
- Formulaires lisibles et accessibles
- Feedback visuel pour toutes les actions
- Gestion d'erreurs avec messages i18n
- Transitions et animations fluides

## Conventions de Code

- **TypeScript strict mode** partout — pas de `any`
- **Biome** pour lint + format — complexité ≤ 10, zéro issue
- **Coverage ≥ 80%** pour tous les modules
- **Tailwind CSS 4** — CSS-first, pas de config JS
- **API types** importés depuis `@kasa/db` (frontend ne touche jamais `prisma` directement)
- **Env vars** validées via Zod au démarrage — jamais de `process.env` direct

## Architecture

### Backend (Koa)
- `app.ts` exporte factory (pas de `listen`) pour tests supertest
- Validation Zod pour toutes les entrées utilisateur
- Services métier isolés (pas de logique dans routes)
- Transactions Prisma pour opérations multi-tables
- Middleware d'erreur centralisé

### Frontend (React)
- Redux Toolkit pour state global
- RTK Query pour API calls (reauth automatique)
- React Router v7 avec ProtectedRoute
- Composants fonctionnels + hooks
- Props validation stricte TypeScript

### Database (Prisma)
- Migrations committées et versionnées
- Indexes sur colonnes fréquemment requêtées
- Cascade deletes pour intégrité référentielle
- Types Decimal pour montants financiers

## Roadmap

Voir [.specify/memory/constitution.md](https://github.com/zecaptus/kasa/blob/main/.specify/memory/constitution.md) pour les principes du projet.

Features futures potentielles:
- Export de rapports (PDF, Excel)
- Tableaux de bord et visualisations
- Budget et alertes
- Support multi-banques
- Application mobile

## Contribution

Ce projet suit les [principes de constitution](https://github.com/zecaptus/kasa/blob/main/.specify/memory/constitution.md):

1. **Code Quality**: TypeScript strict, Biome zero-issue, coverage ≥80%
2. **Testing Standards**: TDD, tests significatifs, pas de mocks excessifs
3. **UX Consistency**: Design system cohérent, feedback immédiat, accessibilité
4. **Performance**: Lazy loading, optimisation bundle, indexes DB

## License

MIT

---

🤖 Built with [Claude Code](https://claude.com/claude-code)
