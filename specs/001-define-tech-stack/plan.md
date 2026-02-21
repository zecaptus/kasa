# Implementation Plan: Technical Stack Definition

**Branch**: `001-define-tech-stack` | **Date**: 2026-02-21 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-define-tech-stack/spec.md`

## Summary

Scaffold a TypeScript monorepo (pnpm workspaces) with two independently buildable packages:
`frontend/` (React 19 + Tailwind CSS + Vite) and `backend/` (Koa 2 + Prisma + PostgreSQL).
The setup enforces the four constitution principles via shared tooling: ESLint 9 + Prettier
(Code Quality), Vitest with ≥80% coverage thresholds (Testing Standards), GitHub Actions CI
(automated enforcement), and response-time SLOs defined per future feature (Performance).

## Technical Context

**Language/Version**: TypeScript 5.7 (strict) — Node.js 22 LTS
**Primary Dependencies**:
- Frontend: React 19, Tailwind CSS 4 + @tailwindcss/vite, Vite 6, @testing-library/react
- Backend: Koa 2, @koa/router, @koa/bodyparser, tsx (dev runner)
- DB package: Prisma 6 + @prisma/adapter-pg, PostgreSQL 16
- Shared: pnpm 9 workspaces, Biome 2.x (lint + format), Vitest 3

**Deployment**: Vercel — frontend (Vite/SPA auto-detected) + backend (Koa via `app.callback()`)
**Repository**: https://github.com/zecaptus/kasa.git

**Storage**: PostgreSQL 16 via Prisma ORM (schema = single source of truth)
**Testing**: Vitest 3 (unit + integration) — frontend: jsdom, backend: supertest
**Target Platform**: Linux server (backend), modern browsers ES2022+ (frontend)
**Project Type**: monorepo/web (2 packages: frontend + backend)
**Performance Goals**: Quality-gate commands complete in < 60s locally; future API SLOs defined per feature in plan.md
**Constraints**: TypeScript strict mode, ESLint zero-warnings, ≥80% statement coverage per module
**Scale/Scope**: 2-package monorepo; no turborepo/nx needed at this scale (pnpm workspaces sufficient)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **I. Code Quality**: Biome (lint + format) + `tsc --noEmit --strict` configured at root. Complexity budget (≤10) enforced via Biome lint rule. Single `biome.json` covers both packages.
- [x] **II. Testing Standards**: Vitest configured with `coverage.thresholds.statements = 80` per package. Test commands documented in quickstart.md.
- [x] **III. UX Consistency**: N/A for this feature — project scaffolding has no end-user interface. See Complexity Tracking for justification.
- [x] **IV. Performance**: SC-002 in spec: quality-gate commands < 60s. Future API SLOs defined per feature. Baseline: fresh install on standard machine.
- [x] **Violations**: UX gate N/A justified below.

## Project Structure

### Documentation (this feature)

```text
specs/001-define-tech-stack/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (project scaffold as "model")
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (package.json scripts interface)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
kasa/                          # repo root — github.com/zecaptus/kasa
├── package.json               # root scripts + pnpm workspaces
├── pnpm-workspace.yaml        # packages: ["frontend", "backend", "packages/*"]
├── pnpm-lock.yaml             # lock file (committed)
├── .nvmrc                     # Node.js 22 LTS
├── tsconfig.base.json         # TypeScript strict base partagé
├── biome.json                 # Biome 2.x — lint + format (root: true)
├── vercel.json                # routing frontend (SPA) + backend (Koa handler)
├── .github/
│   └── workflows/
│       └── ci.yml             # check + typecheck + test
│
├── packages/
│   └── db/                    # @kasa/db — Prisma partagé front + back
│       ├── package.json       # name: "@kasa/db"
│       ├── tsconfig.json      # extends ../../tsconfig.base.json
│       ├── prisma/
│       │   ├── schema.prisma  # source de vérité (output: "../generated/client")
│       │   └── migrations/    # committed
│       ├── src/
│       │   ├── client.ts      # PrismaClient singleton (globalThis)
│       │   └── index.ts       # export { prisma } + export * from generated types
│       └── generated/client/  # gitignored — régénéré via db:generate
│
├── frontend/
│   ├── package.json           # deps: react, vite, @tailwindcss/vite, @kasa/db
│   ├── tsconfig.json          # extends ../../tsconfig.base.json + DOM + JSX
│   ├── vite.config.ts         # plugins: [react(), tailwindcss()]
│   ├── src/
│   │   ├── main.tsx
│   │   ├── app.tsx
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/          # fetch typé — types importés depuis @kasa/db
│   │   └── styles/globals.css # @import "tailwindcss" + @theme
│   └── tests/{unit,integration}/
│
└── backend/
    ├── package.json           # deps: koa, @koa/router, @koa/bodyparser, zod, tsx, @kasa/db
    ├── tsconfig.json          # extends ../../tsconfig.base.json + Node types
    ├── vitest.config.ts
    ├── src/
    │   ├── index.ts           # app.listen() — dev/prod
    │   ├── app.ts             # Koa factory — export default pour Vercel
    │   ├── config.ts          # zod env validation
    │   ├── routes/
    │   ├── middleware/
    │   └── services/
    └── tests/{unit,integration}/
```

**Structure Decision**: Monorepo 3 packages — `packages/db` (Prisma partagé), `frontend` (app
Vite), `backend` (Koa API). Vercel déploie le frontend comme SPA et le backend via handler
Koa exporté. Voir Complexity Tracking.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| UX Consistency gate N/A | Feature de scaffolding sans interface utilisateur | Correct handling — pas un contournement |
| Monorepo (3 packages) | `packages/db` requis pour partager types Prisma entre front et back | Sans package partagé, les types seraient dupliqués ou importés de façon non-typesafe |
| Koa sur Vercel via callback | Vercel supporte Node.js handlers — `app.callback()` expose le même handler HTTP | Refactoring complet en serverless functions cassserait l'architecture Koa et les tests existants |
