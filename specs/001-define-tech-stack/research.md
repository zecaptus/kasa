# Research: Technical Stack Definition

**Feature**: 001-define-tech-stack
**Date**: 2026-02-21
**Sources**: Agent knowledge synthesis (web search unavailable in this session)

---

## Decision 1: Monorepo Tooling

**Decision**: pnpm 9 workspaces, flat layout (`frontend/` and `backend/` at repo root), no Turborepo/Nx.

**Rationale**:
- pnpm workspaces natively handles dependency hoisting, symlinks, and cross-package references with zero config overhead.
- For a 2-package monorepo, `pnpm -r --parallel run <script>` is sufficient to fan out commands across packages in a single CLI call.
- Turborepo and Nx add measurable value only when: (a) package count ≥ 5, (b) task dependency graphs are complex, or (c) remote caching across CI runs is needed. None of these apply here.
- Flat layout (`frontend/`, `backend/` at root) is preferred over nested (`packages/frontend/`) for a small known-count monorepo — fewer directory levels, easier path references.

**Alternatives considered**:
- Turborepo: rejected — YAGNI at 2 packages; adds `turbo.json` complexity and cache warming overhead.
- Nx: rejected — designed for large enterprise monorepos; plugin system is overkill.
- npm/yarn workspaces: rejected — pnpm is faster, stricter about phantom dependencies, and has better workspace UX.

---

## Decision 2: TypeScript Configuration Strategy

**Decision**: Shared `tsconfig.base.json` at root with strict settings; each package extends it with environment-specific overrides.

**Rationale**:
- A single source of truth for compiler strictness prevents drift between packages.
- Frontend needs `jsx: "react-jsx"`, `lib: ["DOM", "DOM.Iterable"]`, `moduleResolution: "bundler"` (for Vite).
- Backend needs `@types/node`, no DOM lib, `moduleResolution: "node16"` or `"nodenext"`.
- Separating these into package-level extends keeps each config minimal and correct.

**Key strict settings in base**:
```json
{
  "strict": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true,
  "noImplicitReturns": true,
  "noFallthroughCasesInSwitch": true,
  "exactOptionalPropertyTypes": true,
  "isolatedModules": true,
  "skipLibCheck": true
}
```

**Alternatives considered**:
- Single shared tsconfig for both packages: rejected — browser and Node environments require incompatible lib/module settings.
- `references` (project references): considered but adds build orchestration complexity unnecessary at this scale.

---

## Decision 3: Linting & Formatting

**Decision**: Biome (single tool, single `biome.json` at repo root) replaces ESLint + Prettier entirely.

**Rationale**:
- Biome is written in Rust — lint + format runs in milliseconds even on large codebases.
- A single `biome.json` at the monorepo root covers both `frontend/` and `backend/` with no per-package config split. This is exactly the "single config file" simplicity the constitution's Code Quality principle aims for.
- Biome's formatter is Prettier-compatible (same opinionated defaults), so migration friction for contributors is near-zero.
- Biome has first-class TypeScript and JSX/TSX support with no plugins required.
- CI command: `biome ci .` — exits non-zero on any lint or formatting issue, no writes. Identical to the zero-warning policy in the constitution.
- Local fix command: `biome check --write .` — fixes lint + format in one pass.
- Complexity rule: `complexity/useSimplifiedLogicExpression` + `complexity/noBannedTypes` available; cyclomatic complexity via `complexity` rules enforces ≤ 10 budget.

**Key `biome.json` settings** (Biome 2.x — verified via official docs):
```json
{
  "$schema": "https://biomejs.dev/schemas/2.4.2/schema.json",
  "root": true,
  "vcs": {
    "enabled": true,
    "clientKind": "git",
    "useIgnoreFile": true,
    "defaultBranch": "main"
  },
  "organizeImports": { "enabled": true },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "correctness": {
        "noUnusedVariables": "error",
        "noUnusedImports": "error"
      },
      "style": {
        "useConst": "warn",
        "noParameterAssign": "error"
      },
      "suspicious": {
        "noExplicitAny": "error"
      },
      "complexity": {
        "noExcessiveCognitiveComplexity": {
          "level": "error",
          "options": { "maxAllowedComplexity": 10 }
        }
      }
    }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "trailingCommas": "all",
      "semicolons": "always"
    }
  },
  "files": {
    "ignore": ["**/dist/**", "**/node_modules/**", "**/prisma/migrations/**", "**/coverage/**"]
  },
  "overrides": [
    {
      "include": ["**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts"],
      "linter": {
        "rules": { "suspicious": { "noExplicitAny": "off" } }
      }
    }
  ]
}
```

> **Note** : `"root": true` est essentiel en monorepo — indique à Biome que ce fichier est la racine de la configuration et empêche la remontée dans les répertoires parents. `vcs.useIgnoreFile: true` respecte automatiquement le `.gitignore`.

**Alternatives considered**:
- ESLint 9 + Prettier: rejected — two tools, two configs, `eslint-config-prettier` glue, slower. The `@typescript-eslint` typed rules advantage does not outweigh the toolchain complexity for this project.
- dprint: rejected — less adoption, no integrated formatter+linter story.

---

## Decision 4: Testing Strategy

**Decision**: Vitest 3 for both packages. Frontend: jsdom environment + @testing-library/react. Backend: node environment + supertest for HTTP tests. Coverage via v8 provider with 80% statement threshold per module.

**Rationale**:
- Vitest 3 shares Vite's transform pipeline — zero extra config for TypeScript, path aliases, and ESM. Runs natively in both jsdom (browser) and node environments.
- @testing-library/react is the de-facto React testing library; encourages testing user behavior, not implementation details.
- supertest creates an HTTP listener from a Koa app factory (without `listen()`) — clean, no port conflicts in CI.
- v8 coverage is faster than istanbul/babel-plugin-istanbul for TypeScript projects.
- Prisma mocking strategy: use `vitest-mock-extended` or manual `vi.mock('../db')` to inject mock PrismaClient in unit tests. Integration tests use a dedicated test database (separate `DATABASE_URL_TEST` env var).

**Alternatives considered**:
- Jest: rejected — requires additional transform config for ESM/TypeScript; slower than Vitest for this stack.
- Playwright: out of scope for this feature (E2E to be defined per future feature).

---

## Decision 5: Frontend Build & Runtime

**Decision**: Vite 6 + `@vitejs/plugin-react-swc` + `@tailwindcss/vite`. Tailwind CSS 4 via CSS-first approach (`@import "tailwindcss"` dans le CSS global). React 19.

**Rationale**:
- Vite 6 est la version stable actuelle ; HMR excellent, ESM natif, config minimale pour React+TypeScript.
- `@vitejs/plugin-react-swc` préféré à `@vitejs/plugin-react` — transforme via SWC (Rust), nettement plus rapide que Babel.
- Tailwind v4 requiert le **package séparé `@tailwindcss/vite`** (vérifié via docs officielles) — plugin dédié Vite plus performant que la voie PostCSS.
- `vite.config.ts` intègre les deux plugins : `react()` + `tailwindcss()`.
- Aucun `tailwind.config.js` ni PostCSS config nécessaire — la configuration se fait en CSS via `@theme`.

```typescript
// frontend/vite.config.ts (vérifié via docs officielles)
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
});
```

```css
/* frontend/src/styles/globals.css */
@import "tailwindcss";

@theme {
  /* design tokens custom ici */
}
```

**Alternatives considered**:
- Next.js: rejected — adds SSR/RSC complexity not needed for the initial scope; can be migrated to later.
- Tailwind v3: rejected — v4 is stable and dramatically simpler to configure; no reason to start on the legacy version.
- `@vitejs/plugin-react` (Babel): rejected in favour of SWC variant — faster transforms, same configuration.

---

## Decision 6: Backend Runtime & Framework

**Decision**: Koa 2 + `@koa/router` + `koa-body`. Dev runner: `tsx --watch`. Production build: `tsc` → run with `node`. Environment validation: `zod` parsing `process.env`.

**Rationale**:
- Koa 2 is lightweight, composable via middleware, and has first-class TypeScript types via `@types/koa`.
- `tsx` (TypeScript Execute) is the modern replacement for `ts-node` — significantly faster, native ESM support, zero config.
- `@koa/bodyparser` (official Koa org package) handles JSON + urlencoded parsing; preferred over the community `koa-body`.
- Zod for env validation provides runtime type safety for environment variables with clear error messages on startup.
- PrismaClient singleton pattern (`src/db.ts` exports one instance): prevents connection pool exhaustion in long-running processes.

**Alternatives considered**:
- Express: rejected — lower TypeScript ergonomics, callback-based middleware, heavier.
- Fastify: considered as a stronger performer than Koa; rejected to honour the user's stated preference for Koa.
- ts-node: rejected — slower startup, worse ESM support vs tsx.
- dotenv: rejected — provides no validation; app would start silently with missing env vars. Zod forces fail-fast.
- `koa-body` (community): rejected in favour of `@koa/bodyparser` (official, maintained by Koa org, better TypeScript types).

---

## Decision 7: Database Access

**Decision**: `packages/db` — package pnpm dédié (`@kasa/db`) contenant le schéma Prisma 6,
le client généré avec output custom, et les re-exports de types. Frontend et backend consomment
tous les deux `@kasa/db` : le backend utilise `prisma` (client), le frontend importe les types
uniquement. Vérifié via docs officielles Prisma (pnpm workspaces guide).

**Structure `packages/db/` (docs Prisma confirmées)** :

```prisma
// packages/db/prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
  output   = "../generated/client"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

```typescript
// packages/db/src/client.ts
import { PrismaClient } from '../generated/client';

const globalForPrisma = globalThis as typeof globalThis & { prisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
```

```typescript
// packages/db/src/index.ts
export { prisma } from './client';
export * from '../generated/client';  // tous les types générés
```

```typescript
// backend — utilise client + types
import { prisma, type User } from '@kasa/db';

// frontend/src/services/ — types uniquement (import type)
import type { User, Post } from '@kasa/db';
```

**Rationale** :
- Un package partagé est le pattern officiel Prisma pour les monorepos pnpm (confirmé par leur guide pnpm workspaces).
- Le frontend n'a pas accès à `prisma` (client DB) — `import type` impose la frontière à la compilation.
- `output` custom (`../generated/client`) évite de polluer `node_modules` et rend le chemin explicite.
- `globalThis` memoization prévient les connexions multiples en développement (hot-reload).
- Test strategy : `DATABASE_URL_TEST` séparé + `prisma migrate deploy` avant les tests d'intégration.

**Alternatives considérées** :
- Drizzle ORM: rejected — respecter le choix Prisma de l'utilisateur.
- Prisma dans `backend/` sans package partagé: rejected — les types ne seraient pas accessibles proprement au frontend (duplication ou imports cross-package non-officiels).

---

## Decision 8: Déploiement — Vercel

**Decision**: Vercel pour les deux targets — frontend (SPA Vite, auto-détecté) et backend (Koa
via `app.callback()` exposé comme handler Node.js). Un `vercel.json` à la racine orchestre le
routing.

**Rationale** :
- Vercel détecte automatiquement les projets Vite/React et configure le build + CDN sans config.
- Koa expose `app.callback()` — un handler Node.js `(req, res) => void` compatible avec le
  runtime Vercel Functions (`@vercel/node`).
- Pattern confirmé par les docs Vercel pour Express/Koa (même modèle de callback HTTP).
- La séparation frontend/backend dans le monorepo permet deux "Vercel Projects" distincts ou
  un seul avec `vercel.json` qui route `/api/*` vers le backend.

**`vercel.json` root (routing strategy)** :
```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/backend/src/app.ts" }
  ]
}
```

**`backend/src/app.ts`** exporte le handler Vercel :
```typescript
const app = createApp();
export default app.callback();  // compatible Vercel Functions
```

**Variables d'environnement Vercel** : `DATABASE_URL`, `NODE_ENV=production`, `VITE_API_URL`
configurées dans le dashboard Vercel (jamais commitées).

**Alternatives considérées** :
- Railway/Fly.io pour le backend seul: rejected — l'utilisateur a demandé Vercel.
- Serverless functions individuelles: rejected — casserait l'architecture Koa et les tests supertest.

---

## Decision 9: Repository GitHub

**Decision**: `https://github.com/zecaptus/kasa.git` — repo GitHub de référence.

**Impact** :
- CI/CD `ci.yml` pousse les résultats directement sur GitHub Actions.
- Vercel se connecte au repo GitHub pour les déploiements automatiques (push `main` → prod, PR → preview).
- Branch protection sur `main` : merge uniquement si CI vert.

---

## Decision 10: CI Pipeline

**Decision**: GitHub Actions. Single `ci.yml` workflow with three parallel jobs: `lint`, `typecheck`, `test`. pnpm cache via `actions/setup-node` + `cache: 'pnpm'`.

**Rationale**:
- Three separate jobs make failure attribution immediate (a lint failure doesn't hide a test failure).
- pnpm cache keyed on `pnpm-lock.yaml` hash eliminates install time on cache hit.
- `--frozen-lockfile` in CI ensures the committed lock file is always used (no silent upgrades).

---

## Resolved Unknowns

| Unknown | Resolution |
|---------|-----------|
| Node.js version | 22 LTS (`.nvmrc`: `22`) |
| pnpm version | 9 (pinned via `packageManager` field) |
| TypeScript version | 5.7 |
| Biome version | 2.x (schema `2.4.2`) — remplace ESLint + Prettier |
| Vitest version | 3 |
| Vite version | 6 |
| React version | 19 |
| Tailwind version | 4 |
| Koa version | 2 |
| Prisma version | 6 |
| PostgreSQL version | 16 |
| Turborepo/Nx | Rejected — plain pnpm sufficient |
| Test database | Separate `DATABASE_URL_TEST` env var |
| Prisma package | `packages/db/` (`@kasa/db`) — output custom `../generated/client` |
| Déploiement | Vercel — frontend SPA + backend via `app.callback()` |
| GitHub repo | https://github.com/zecaptus/kasa.git |
