# Data Model: Technical Stack Definition

**Feature**: 001-define-tech-stack
**Date**: 2026-02-21
**Note**: This feature defines project structure rather than business domain entities.
The "model" here is the repository scaffold — file layout, config files, and their relationships.

---

## Repository Scaffold Model

### Root Level

| File / Dir | Type | Purpose |
|---|---|---|
| `package.json` | Config | Root scripts entry point; `private: true`; `packageManager` pin |
| `pnpm-workspace.yaml` | Config | Declares `["frontend", "backend", "packages/*"]` as workspace packages |
| `vercel.json` | Config | Routing Vercel — SPA frontend + `/api/*` → backend handler |
| `pnpm-lock.yaml` | Lock | Committed; ensures reproducible installs across all envs |
| `.nvmrc` | Config | Pins Node.js version (`22`); read by nvm/fnm/volta |
| `tsconfig.base.json` | Config | Shared strict TypeScript base (no env-specific lib) |
| `biome.json` | Config | Single Biome config (lint + format) covering entire repo |
| `.github/workflows/ci.yml` | CI | lint + typecheck + test jobs on push/PR |
| `.gitignore` | Config | node_modules, dist, .env |
| `.env.example` | Docs | Template for required env vars (committed, no secrets) |

---

### `packages/db/` Package — `@kasa/db`

| File / Dir | Type | Purpose |
|---|---|---|
| `package.json` | Config | `name: "@kasa/db"`, deps: prisma, @prisma/adapter-pg |
| `tsconfig.json` | Config | Extends `../../tsconfig.base.json` |
| `prisma/schema.prisma` | Schema | Source de vérité — `output = "../generated/client"` |
| `prisma/migrations/` | Migrations | Historique committed |
| `src/client.ts` | Source | `PrismaClient` singleton via `globalThis` memoization |
| `src/index.ts` | Source | `export { prisma }` + `export * from '../generated/client'` |
| `generated/client/` | Generated | Gitignored — régénéré via `pnpm db:generate` |

**Consommation** :
- Backend : `import { prisma, type User } from '@kasa/db'` (client + types)
- Frontend : `import type { User, Post } from '@kasa/db'` (types uniquement, tree-shakeable)

---

### `frontend/` Package

| File / Dir | Type | Purpose |
|---|---|---|
| `package.json` | Config | react, vite, @vitejs/plugin-react-swc, tailwindcss, @tailwindcss/vite, @testing-library/react |
| `tsconfig.json` | Config | Extends `../tsconfig.base.json`; adds `jsx`, DOM lib |
| `vite.config.ts` | Config | Vite + React plugin + Vitest inline config |
| `index.html` | Entry | Vite HTML entry point |
| `src/main.tsx` | Source | React DOM render entry |
| `src/app.tsx` | Source | Root `<App />` component + router setup |
| `src/styles/globals.css` | Source | `@import "tailwindcss"` — Tailwind v4 entry |
| `src/components/` | Source | Reusable, presentational UI components |
| `src/pages/` | Source | Route-level page components |
| `src/hooks/` | Source | Custom React hooks |
| `src/services/` | Source | API client functions (fetch wrappers, typed responses) |
| `tests/unit/` | Tests | Component + hook unit tests (jsdom) |
| `tests/integration/` | Tests | Page-level user-flow tests (jsdom + RTL) |

**tsconfig.json overrides**:
```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "moduleResolution": "bundler"
  }
}
```

---

### `backend/` Package

| File / Dir | Type | Purpose |
|---|---|---|
| `package.json` | Config | Koa, @koa/router, Prisma, zod, tsx deps; local scripts |
| `tsconfig.json` | Config | Extends `../tsconfig.base.json`; adds `@types/node` |
| `vitest.config.ts` | Config | Vitest node environment + coverage thresholds |
| `prisma/schema.prisma` | Schema | Single source of truth for all data models |
| `prisma/migrations/` | Migrations | Auto-generated migration history (committed) |
| `src/index.ts` | Source | App bootstrap: calls `app.listen()` |
| `src/app.ts` | Source | Koa app factory (exported for testing without listen) |
| `src/config.ts` | Source | Env var schema (zod) + parsed config export |
| `src/db.ts` | Source | PrismaClient singleton |
| `src/routes/` | Source | `@koa/router` route files, grouped by domain |
| `src/middleware/` | Source | Error handler, request logger, auth (future) |
| `src/services/` | Source | Business logic; domain services called by routes |
| `tests/unit/` | Tests | Service + middleware tests (Prisma mocked) |
| `tests/integration/` | Tests | HTTP route tests via supertest + test database |

**tsconfig.json overrides**:
```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ES2022"],
    "moduleResolution": "node16",
    "types": ["node"]
  }
}
```

> `backend/src/app.ts` exporte `app.callback()` comme default export pour compatibilité Vercel Functions.

---

## Configuration Dependency Graph

```text
tsconfig.base.json
├── frontend/tsconfig.json   (extends base + DOM + JSX + bundler resolution)
└── backend/tsconfig.json    (extends base + Node types + node16 resolution)

eslint.config.ts (root)
├── imported by frontend/ ESLint (package-local override array)
└── imported by backend/ ESLint (package-local override array)

prisma/schema.prisma
└── generates → backend/node_modules/.prisma/client  (Prisma typed client)
    └── imported by → src/db.ts → src/services/ → src/routes/

pnpm-workspace.yaml
├── frontend/  (workspace package)
└── backend/   (workspace package)
    └── may reference shared types via workspace: protocol if needed
```

---

## Environment Variables Model

All env vars MUST be validated via zod in `backend/src/config.ts` at startup.

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | yes | — | PostgreSQL connection string (production/dev) |
| `DATABASE_URL_TEST` | CI only | — | Separate DB for integration tests |
| `PORT` | no | `3000` | HTTP server port |
| `NODE_ENV` | no | `development` | `development` / `production` / `test` |
| `CORS_ORIGIN` | no | `http://localhost:5173` | Allowed frontend origin for CORS |

Frontend environment variables (Vite `VITE_*` prefix, public):

| Variable | Required | Default | Description |
|---|---|---|---|
| `VITE_API_URL` | no | `http://localhost:3000` | Backend API base URL |
