# kasa Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-02-23

## Active Technologies
- PostgreSQL 16 via Prisma 6 — 4 new models (ImportSession, ImportedTransaction, ManualExpense, Reconciliation) (003-csv-import)
- csv-parse + iconv-lite + talisman + @koa/multer — CSV parsing, encoding, similarity matching, file upload (003-csv-import)
- TypeScript 5.7 (strict mode), Node.js 22 LTS + Koa 2 + @koa/router (backend), React 19 + RTK Query (frontend), Prisma 6 + PostgreSQL 16 (004-transactions)
- PostgreSQL 16 — 2 nouveaux modèles (`Category`, `CategoryRule`), 2 migrations (004-transactions)
- TypeScript 5.7 (strict mode), Node.js 22 LTS + Recharts 2.x via shadcn chart wrapper (frontend), Koa 2 + @koa/router (backend), React 19 + RTK Query, Prisma 6 + PostgreSQL 16, react-intl (005-dashboard)
- PostgreSQL 16 — 1 additive migration (new `account_label` column on `imported_transaction`) (005-dashboard)

- TypeScript 5.7 (strict) — Node.js 22 LTS (001-define-tech-stack)
- argon2 + jsonwebtoken — auth backend (002-user-management)
- react-router v7 + async-mutex — frontend routing + reauth (002-user-management)
- react-intl (FormatJS) + Redux Toolkit + RTK Query — i18n + state management (002-user-management)
- RefreshToken model + enum Locale — Prisma schema (002-user-management)

## Project Structure

```text
kasa/                        # repo root (pnpm monorepo) — github.com/zecaptus/kasa
├── packages/
│   └── db/                  # @kasa/db — Prisma partagé (types front + back)
│       ├── prisma/schema.prisma  # source de vérité
│       ├── src/client.ts    # PrismaClient singleton
│       └── src/index.ts     # export { prisma } + types générés
├── frontend/                # React 19 + Tailwind CSS 4 + Vite 6
│   ├── src/
│   │   ├── components/      # reusable UI components
│   │   ├── pages/           # route-level components
│   │   ├── hooks/           # custom React hooks
│   │   ├── services/        # API client (typed fetch — types from @kasa/db)
│   │   └── styles/globals.css
│   └── tests/{unit,integration}/
└── backend/                 # Koa 2 + PostgreSQL 16
    ├── src/
    │   ├── app.ts           # Koa app factory (export default app.callback() pour Vercel)
    │   ├── index.ts         # server bootstrap (listen)
    │   ├── config.ts        # env validation via zod
    │   ├── routes/          # @koa/router handlers by domain
    │   ├── middleware/      # error handler, logger, auth
    │   └── services/        # business logic
    └── tests/{unit,integration}/
```

## Commands

```bash
pnpm install          # install all workspace deps
pnpm dev              # start frontend (5173) + backend (3000) in parallel
pnpm check            # Biome lint + format check (entire repo)
pnpm check:fix        # Biome auto-fix lint + format
pnpm typecheck        # tsc --noEmit all packages
pnpm test             # Vitest all packages with coverage
pnpm build            # production build

# Database (@kasa/db package)
pnpm --filter @kasa/db run db:migrate   # apply migrations (dev)
pnpm --filter @kasa/db run db:generate  # regenerate Prisma client
```

## Code Style

- TypeScript strict mode everywhere — no `any`, explicit return types on public APIs
- Biome — single tool for lint + format; `biome.json` at repo root; complexity ≤ 10; zero-issue policy
- Tailwind CSS 4 — CSS-first, no `tailwind.config.js`
- Vitest 3 — coverage ≥ 80% per module (v8 provider)

## Recent Changes
- 005-dashboard: Added TypeScript 5.7 (strict mode), Node.js 22 LTS + Recharts 2.x via shadcn chart wrapper (frontend), Koa 2 + @koa/router (backend), React 19 + RTK Query, Prisma 6 + PostgreSQL 16, react-intl
- 004-transactions: Added TypeScript 5.7 (strict mode), Node.js 22 LTS + Koa 2 + @koa/router (backend), React 19 + RTK Query (frontend), Prisma 6 + PostgreSQL 16
- 003-csv-import: Added TypeScript 5.7 (strict) — Node.js 22 LTS


<!-- MANUAL ADDITIONS START -->
## Key Conventions

- **Avant chaque commit** : toujours lancer `pnpm check` et corriger les erreurs Biome avant de committer.

- `backend/src/app.ts` exports the Koa app factory (no `listen`); `src/index.ts` calls `listen`.
  This separation is required for supertest-based integration tests.
- `backend/src/app.ts` also exports `app.callback()` as default for Vercel Functions.
- All env vars are validated via zod at `backend/src/config.ts` startup — never access `process.env` directly elsewhere.
- Prisma schema lives in `packages/db/prisma/schema.prisma`; migrations committed in `packages/db/prisma/migrations/`.
- Frontend API calls go through `src/services/` — no raw `fetch` in components or hooks.
- Frontend imports Prisma types via `import type { ... } from '@kasa/db'` — never imports `prisma` client.
- Constitution lives at `.specify/memory/constitution.md` (v1.2.0) — 4 principles: Code Quality, Testing Standards, UX Consistency, Performance.
<!-- MANUAL ADDITIONS END -->
