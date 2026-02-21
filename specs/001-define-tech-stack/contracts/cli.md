# CLI Contracts: Developer Scripts Interface

**Feature**: 001-define-tech-stack
**Date**: 2026-02-21
**Note**: For a project scaffolding feature, "contracts" are the developer CLI commands
exposed via `package.json` scripts. These are the stable interface every contributor relies on.

---

## Root Package Scripts (monorepo-wide)

Run from repository root. All commands fan out to both `frontend/` and `backend/` in parallel
via `pnpm -r --parallel run <script>`.

| Command | Behaviour | CI Gate |
|---|---|---|
| `pnpm check` | `biome ci .` — lint + format check, entire repo | ✅ Blocks merge |
| `pnpm check:fix` | `biome check --write .` — lint + format auto-fix | Local only |
| `pnpm typecheck` | Runs `tsc --noEmit` in all packages | ✅ Blocks merge |
| `pnpm test` | Runs Vitest in run mode across all packages | ✅ Blocks merge |
| `pnpm test:watch` | Runs Vitest in watch mode across all packages | Local dev |
| `pnpm build` | Builds both packages for production | ✅ Blocks merge |
| `pnpm dev` | Starts frontend dev server + backend tsx watch | Local dev |

**Root `package.json` scripts block**:
```json
{
  "scripts": {
    "check":       "biome ci .",
    "check:fix":   "biome check --write .",
    "typecheck":   "pnpm -r --parallel run typecheck",
    "test":        "pnpm -r --parallel run test",
    "test:watch":  "pnpm -r --parallel run test:watch",
    "build":       "pnpm -r --parallel run build",
    "dev":         "pnpm -r --parallel run dev"
  }
}
```

> **Note**: `check` and `check:fix` run from the root and cover the entire monorepo in one pass.
> No per-package lint/format scripts are needed — Biome reads a single `biome.json` at root.

---

## Frontend Package Scripts

Run from `frontend/` or via `pnpm --filter frontend run <script>` from root.

| Command | Tool | Output |
|---|---|---|
| `pnpm dev` | `vite` | Dev server on `http://localhost:5173` with HMR |
| `pnpm build` | `vite build` | Production bundle in `frontend/dist/` |
| `pnpm preview` | `vite preview` | Serves `dist/` locally to verify production build |
| `pnpm typecheck` | `tsc --noEmit` | Type errors → exit 1 |
| `pnpm test` | `vitest run --coverage` | Runs all tests once, emits coverage report |
| `pnpm test:watch` | `vitest` | Interactive watch mode |

> Lint + format: use root-level `pnpm check` / `pnpm check:fix` (Biome covers the full repo).

---

## Backend Package Scripts

Run from `backend/` or via `pnpm --filter backend run <script>` from root.

| Command | Tool | Output |
|---|---|---|
| `pnpm dev` | `tsx watch src/index.ts` | Dev server on `http://localhost:3000` with auto-restart |
| `pnpm build` | `tsc` | Compiles to `backend/dist/` |
| `pnpm start` | `node dist/index.js` | Starts production server |
| `pnpm typecheck` | `tsc --noEmit` | Type errors → exit 1 |

> Lint + format: use root-level `pnpm check` / `pnpm check:fix` (Biome covers the full repo).
| `pnpm test` | `vitest run --coverage` | Runs all tests once, emits coverage report |
| `pnpm test:watch` | `vitest` | Interactive watch mode |
| `pnpm test` | `vitest run --coverage` | Runs all tests once, emits coverage report |
| `pnpm test:watch` | `vitest` | Interactive watch mode |

> Lint + format: use root-level `pnpm check` / `pnpm check:fix` (Biome covers the full repo).

---

## `@kasa/db` Package Scripts

Run via `pnpm --filter @kasa/db run <script>` from root.

| Command | Tool | Output |
|---|---|---|
| `pnpm db:migrate` | `prisma migrate dev` | Create + apply migration (dev) |
| `pnpm db:migrate:deploy` | `prisma migrate deploy` | Apply migrations sans prompt (CI/prod) |
| `pnpm db:generate` | `prisma generate` | Régénère le client dans `generated/client/` |
| `pnpm db:studio` | `prisma studio` | Ouvre Prisma Studio GUI (dev only) |
| `pnpm db:seed` | `tsx prisma/seed.ts` | Seed données de développement |

> Ces commandes sont aussi accessibles depuis la racine via `pnpm --filter @kasa/db run db:migrate`.

---

## CI Workflow Contract

**File**: `.github/workflows/ci.yml`
**Trigger**: push to any branch + pull_request targeting `main`

### Jobs (run in parallel)

```
ci.yml
├── job: check
│   └── pnpm install --frozen-lockfile
│   └── pnpm check          ← biome ci . (lint + format, entire repo)
│
├── job: typecheck
│   └── pnpm install --frozen-lockfile
│   └── pnpm typecheck
│
└── job: test
    └── pnpm install --frozen-lockfile
    └── prisma migrate deploy  (against DATABASE_URL_TEST)
    └── pnpm test
```

**Invariants**:
- `--frozen-lockfile` MUST be used in all CI install steps.
- All three jobs MUST pass before merge is allowed (branch protection rule).
- Coverage threshold failures MUST surface as test job failures (not warnings).

---

## Coverage Contract

Enforced via Vitest `coverage.thresholds` in each package's `vitest.config.ts`:

```typescript
coverage: {
  provider: 'v8',
  thresholds: {
    statements: 80,
    branches: 80,
    functions: 80,
    lines: 80,
  },
  exclude: ['tests/**', '*.config.ts', 'src/index.ts'],
}
```

A coverage threshold violation MUST cause `vitest run` to exit with a non-zero code,
blocking CI exactly like a failing test.
