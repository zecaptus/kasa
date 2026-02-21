# Tasks: Technical Stack Definition

**Input**: Design documents from `/specs/001-define-tech-stack/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/cli.md ✅, quickstart.md ✅

**Tests**: No test tasks generated — spec.md does not request TDD approach for scaffolding.

**Organization**: Tasks grouped by user story to enable independent implementation and verification.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on concurrent tasks)
- **[Story]**: User story label (US1, US2, US3)
- Exact file paths included in every description

---

## Phase 1: Setup (Monorepo Scaffold)

**Purpose**: Create root-level structure so pnpm workspaces can be initialized.

- [x] T001 Create root `package.json` (`private: true`, `packageManager: "pnpm@9"`, root scripts: `check`, `check:fix`, `typecheck`, `test`, `test:watch`, `build`, `dev`) at `package.json`
- [x] T002 [P] Create `pnpm-workspace.yaml` (packages: `["frontend", "backend", "packages/*"]`) at `pnpm-workspace.yaml`
- [x] T003 [P] Create `.nvmrc` with content `22` (Node.js 22 LTS) at `.nvmrc`
- [x] T004 [P] Create `.gitignore` (entries: `node_modules/`, `dist/`, `.env`, `**/generated/client/`, `**/coverage/`) at `.gitignore`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared configs that ALL packages depend on, plus the `@kasa/db` shared Prisma package consumed by both `frontend/` and `backend/`.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T005 Create `tsconfig.base.json` (strict TypeScript base: `strict`, `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, `exactOptionalPropertyTypes`, `isolatedModules`, `skipLibCheck`) at `tsconfig.base.json`
- [x] T006 [P] Create `biome.json` (Biome 2.x — schema `2.4.2`, `"root": true`, `vcs.useIgnoreFile: true`, `defaultBranch: "main"`, lint rules: `noUnusedVariables`, `noUnusedImports`, `noExplicitAny`, `noExcessiveCognitiveComplexity` maxAllowedComplexity=10, formatter: 2-space indent, lineWidth 100, single quotes; override: disable `noExplicitAny` in `*.test.*` files) at `biome.json`
- [x] T007 [P] Create `packages/db/package.json` (name: `"@kasa/db"`, deps: `prisma`, `@prisma/client`, private: true, scripts: `db:generate`, `db:migrate`, `db:migrate:deploy`, `db:studio`, `db:seed`) at `packages/db/package.json`
- [x] T008 Create `packages/db/tsconfig.json` (extends `../../tsconfig.base.json`, compilerOptions: `moduleResolution: "node16"`, `lib: ["ES2022"]`) at `packages/db/tsconfig.json`
- [x] T009 Create `packages/db/prisma/schema.prisma` (generator: `prisma-client-js`, output: `"../generated/client"`, datasource: postgresql, url: `env("DATABASE_URL")`) at `packages/db/prisma/schema.prisma`
- [x] T010 [P] Create `packages/db/src/client.ts` (PrismaClient singleton via `globalThis` memoization pattern — import from `../generated/client`) at `packages/db/src/client.ts`
- [x] T011 Create `packages/db/src/index.ts` (`export { prisma } from './client'` + `export * from '../generated/client'`) at `packages/db/src/index.ts`

**Checkpoint**: Foundation ready — shared TypeScript base, Biome config, and `@kasa/db` package in place. User story implementation can now begin.

---

## Phase 3: User Story 1 — Environment Setup from Scratch (Priority: P1) 🎯 MVP

**Goal**: A developer cloning the project can run `pnpm install` then `pnpm check`, `pnpm typecheck`, `pnpm test` — all passing — by following the quickstart guide.

**Independent Test**: On a clean machine with Node.js 22 + pnpm 9 installed, run:
```bash
git clone https://github.com/zecaptus/kasa.git && cd kasa
pnpm install
pnpm check       # exit 0
pnpm typecheck   # exit 0
pnpm build       # exit 0
```
All commands must exit 0 on the first run.

### Implementation for User Story 1

- [x] T012 [P] [US1] Create `frontend/package.json` (name: `"frontend"`, deps: `react@19`, `react-dom@19`; devDeps: `vite@6`, `@vitejs/plugin-react-swc`, `@tailwindcss/vite`, `tailwindcss@4`, `typescript@5.7`, `@types/react`, `@types/react-dom`, `vitest`, `@vitest/coverage-v8`, `@testing-library/react`, `@testing-library/user-event`, `jsdom`; workspace dep: `@kasa/db`) at `frontend/package.json`
- [x] T013 [P] [US1] Create `frontend/tsconfig.json` (extends `../tsconfig.base.json`; compilerOptions: `jsx: "react-jsx"`, `lib: ["ES2022", "DOM", "DOM.Iterable"]`, `moduleResolution: "bundler"`; include: `src`) at `frontend/tsconfig.json`
- [x] T014 [P] [US1] Create `frontend/vite.config.ts` (plugins: `[react(), tailwindcss()]`; test: vitest config with `environment: "jsdom"`, coverage provider `v8`, thresholds `statements/branches/functions/lines: 80`, exclude `['tests/**', '*.config.ts', 'src/main.tsx']`) at `frontend/vite.config.ts`
- [x] T015 [P] [US1] Create `frontend/index.html` (Vite HTML entry — script type module pointing to `src/main.tsx`) at `frontend/index.html`
- [x] T016 [US1] Create `frontend/src/main.tsx` (React 19 `createRoot` entry — renders `<App />` into `#root`) at `frontend/src/main.tsx`
- [x] T017 [P] [US1] Create `frontend/src/app.tsx` (minimal root `App` component returning placeholder `<div>Kasa</div>`) at `frontend/src/app.tsx`
- [x] T018 [P] [US1] Create `frontend/src/styles/globals.css` (`@import "tailwindcss"` + empty `@theme {}` block) at `frontend/src/styles/globals.css`
- [x] T019 [P] [US1] Create `backend/package.json` (name: `"backend"`, deps: `koa@2`, `@koa/router`, `@koa/bodyparser`, `zod`; devDeps: `tsx`, `typescript@5.7`, `@types/node`, `@types/koa`, `@types/koa__router`, `@types/koa__bodyparser`, `vitest`, `@vitest/coverage-v8`, `supertest`, `@types/supertest`; workspace dep: `@kasa/db`; scripts: `dev`, `build`, `start`, `typecheck`, `test`, `test:watch`) at `backend/package.json`
- [x] T020 [P] [US1] Create `backend/tsconfig.json` (extends `../tsconfig.base.json`; compilerOptions: `lib: ["ES2022"]`, `moduleResolution: "node16"`, `types: ["node"]`; include: `src`) at `backend/tsconfig.json`
- [x] T021 [P] [US1] Create `backend/vitest.config.ts` (environment: `"node"`, coverage provider `v8`, thresholds `statements/branches/functions/lines: 80`, exclude `['tests/**', '*.config.ts', 'src/index.ts']`) at `backend/vitest.config.ts`
- [x] T022 [US1] Create `backend/src/config.ts` (zod schema validating `DATABASE_URL` required, `DATABASE_URL_TEST` optional, `PORT` default 3000, `NODE_ENV` default `"development"`, `CORS_ORIGIN` default `"http://localhost:5173"` — `export const config = schema.parse(process.env)`) at `backend/src/config.ts`
- [x] T023 [US1] Create `backend/src/app.ts` (Koa factory function `createApp()`: register `@koa/bodyparser`, placeholder error-handler middleware; `export default createApp().callback()` for Vercel compat) at `backend/src/app.ts`
- [x] T024 [US1] Create `backend/src/index.ts` (imports `config` from `./config`, imports `createApp` from `./app`; calls `app.listen(config.PORT)` with startup log) at `backend/src/index.ts`
- [x] T025 [P] [US1] Create empty directory scaffolding with `.gitkeep` files: `frontend/src/components/`, `frontend/src/pages/`, `frontend/src/hooks/`, `frontend/src/services/`, `frontend/tests/unit/`, `frontend/tests/integration/`
- [x] T026 [P] [US1] Create empty directory scaffolding with `.gitkeep` files: `backend/src/routes/`, `backend/src/middleware/`, `backend/src/services/`, `backend/tests/unit/`, `backend/tests/integration/`, `packages/db/prisma/migrations/`
- [x] T027 [P] [US1] Create `.env.example` with all env vars commented and documented: `DATABASE_URL`, `DATABASE_URL_TEST`, `PORT`, `NODE_ENV`, `CORS_ORIGIN`, `VITE_API_URL` at `.env.example`
- [x] T028 [US1] Run `pnpm install` from repo root to generate and commit `pnpm-lock.yaml` at `pnpm-lock.yaml`
- [x] T029 [US1] Validate US1 checkpoint: run `pnpm check && pnpm typecheck && pnpm build` from repo root — all must exit 0; fix any issues before proceeding

**Checkpoint**: User Story 1 complete — any developer can clone and reach green quality gates following `specs/001-define-tech-stack/quickstart.md`.

---

## Phase 4: User Story 2 — Automated Quality Enforcement (Priority: P2)

**Goal**: Every push and pull request triggers CI automatically; a deliberate lint violation blocks merge before any human review.

**Independent Test**: Push a branch containing `const x = 1` (unused variable — Biome will error) → CI job `check` fails with "Found 1 error(s)" and the PR is blocked from merge.

### Implementation for User Story 2

- [x] T030 [US2] Create `.github/workflows/ci.yml` (trigger: push to all branches + PR targeting `main`; 3 parallel jobs: `check` — `pnpm install --frozen-lockfile && pnpm check`; `typecheck` — `pnpm install --frozen-lockfile && pnpm typecheck`; `test` — `pnpm install --frozen-lockfile && pnpm test`; all jobs use `actions/setup-node` with `cache: 'pnpm'`) at `.github/workflows/ci.yml`
- [x] T031 [US2] Update `specs/001-define-tech-stack/quickstart.md` — add a "Branch Protection" section documenting the required GitHub settings: require all 3 CI jobs to pass before merge, dismiss stale reviews on push

**Checkpoint**: User Story 2 complete — CI pipeline is live and enforces all quality gates automatically on every PR.

---

## Phase 5: User Story 3 — Instant Local Feedback Loop (Priority: P3)

**Goal**: An editor configured with the language server highlights type errors within 2 seconds and formats on save without manual intervention.

**Independent Test**: Open VS Code in the repo root → introduce `const x: number = "hello"` in any `.ts` file → red squiggle appears in < 2s; save the file → Biome auto-formats instantly.

### Implementation for User Story 3

- [x] T032 [P] [US3] Create `.vscode/settings.json` (`"editor.defaultFormatter": "biomejs.biome"`, `"editor.formatOnSave": true`, `"editor.codeActionsOnSave": { "source.fixAll.biome": "explicit" }`, `"typescript.tsdk": "node_modules/typescript/lib"`) at `.vscode/settings.json`
- [x] T033 [P] [US3] Create `.vscode/extensions.json` (`"recommendations": ["biomejs.biome", "ms-vscode.vscode-typescript-next"]`) at `.vscode/extensions.json`
- [x] T034 [US3] Update `specs/001-define-tech-stack/quickstart.md` — add an "Editor Setup" section: install VS Code extensions from `.vscode/extensions.json`, verify format-on-save triggers Biome, verify TypeScript language server uses workspace version

**Checkpoint**: User Story 3 complete — editor gives type-error and format feedback within 2 seconds of file modification.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final deployment config, validation, and remote setup.

- [x] T035 [P] Create `vercel.json` at repo root (rewrites: `[{ "source": "/api/(.*)", "destination": "/backend/src/app.ts" }]`) at `vercel.json`
- [x] T036 [P] Final end-to-end validation: run `pnpm check && pnpm typecheck && pnpm build` — all must exit 0; run `pnpm dev` and verify frontend starts on `localhost:5173` and backend on `localhost:3000`
- [x] T037 Verify git remote is set to `https://github.com/zecaptus/kasa.git` (`git remote -v`); set if missing (`git remote add origin https://github.com/zecaptus/kasa.git`)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Requires Phase 1 complete — blocks all user stories
- **US1 (Phase 3)**: Requires Phase 2 complete — MVP; blocks US2 and US3 (need installable workspace)
- **US2 (Phase 4)**: Requires US1 complete (CI needs a working `pnpm install` + passing quality gates)
- **US3 (Phase 5)**: Requires US1 complete (editor needs valid tsconfig.json and biome.json); parallel with US2
- **Polish (Phase 6)**: Requires US1 complete; T035/T036 parallel; T037 can run anytime

### User Story Dependencies

- **US1 (P1)**: Depends only on Foundational (Phase 2)
- **US2 (P2)**: Depends on US1 (CI must be able to run `pnpm install --frozen-lockfile`)
- **US3 (P3)**: Depends on US1 (tsconfig.json and biome.json must exist for language server); **parallel with US2**

### Within Each User Story

- Package `package.json` and `tsconfig.json` files can be created in parallel (T012–T013, T019–T020)
- Application source files (T016–T018, T022–T024) depend on their package config existing
- T028 (`pnpm install`) must come after all `package.json` files are created
- T029 (validation) must come after T028

### Parallel Opportunities

- **Phase 1**: T002, T003, T004 parallel with each other (all independent of T001 once root dir exists)
- **Phase 2**: T005 and T006 parallel; T007 parallel with T005/T006; T008–T011 sequential (T010 parallel with T008/T009 setup)
- **Phase 3 (US1)**:
  - T012, T013, T014, T015 parallel (all `frontend/` config, no interdependency)
  - T019, T020, T021 parallel (all `backend/` config)
  - T017, T018 parallel (different frontend src files)
  - T025, T026, T027 parallel (different directories/files)
- **Phase 4 + 5**: T030/T031 and T032/T033/T034 run in parallel (different concerns)
- **Phase 6**: T035 and T036 parallel with T037

---

## Parallel Example: User Story 1 (Frontend + Backend)

```bash
# Stream 1 — frontend config (parallel):
Task T012: Create frontend/package.json
Task T013: Create frontend/tsconfig.json
Task T014: Create frontend/vite.config.ts
Task T015: Create frontend/index.html

# Stream 2 — backend config (parallel with Stream 1):
Task T019: Create backend/package.json
Task T020: Create backend/tsconfig.json
Task T021: Create backend/vitest.config.ts

# Stream 3 — scaffolding (parallel with Streams 1+2):
Task T025: frontend/ directory scaffolding
Task T026: backend/ directory scaffolding
Task T027: .env.example

# Then sequentially (depends on all package.json files):
Task T016 → T017 → T018  (frontend src)
Task T022 → T023 → T024  (backend src)
Task T028                  (pnpm install)
Task T029                  (validation)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T004)
2. Complete Phase 2: Foundational (T005–T011) ← CRITICAL, blocks all stories
3. Complete Phase 3: User Story 1 (T012–T029)
4. **STOP and VALIDATE**: `pnpm check && pnpm typecheck && pnpm build` all green
5. Any contributor can now set up the project from scratch ✅

### Incremental Delivery

1. Setup + Foundational → Monorepo skeleton exists
2. Add User Story 1 → Fully installable and lintable workspace (MVP!)
3. Add User Story 2 → CI enforces quality on every push
4. Add User Story 3 → Editor gives instant feedback in development
5. Polish → Deployment config and remote verification

### Parallel Team Strategy

With 2 developers after Phase 2 is done:

- **Developer A**: US1 (environment + packages) → T012–T029
- **Developer B**: Can start US3 editor config (T032–T033) once biome.json exists
- Both merge, then US2 (T030) is added on top

---

## Notes

- [P] tasks involve different files and have no dependency on each other within their phase
- Each user story phase ends with an explicit **Checkpoint** that can be validated independently
- `packages/db/generated/client/` is gitignored — `pnpm db:generate` regenerates it
- Never commit `.env` — only `.env.example` is committed
- The Prisma schema starts empty (generator + datasource only); business models are added in future features
- `backend/src/app.ts` exports `app.callback()` as default — this is the Vercel Functions handler
- US2 and US3 can be worked in parallel once US1 is complete
