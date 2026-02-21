# Quickstart: Kasa Development Environment

**Feature**: 001-define-tech-stack
**Last updated**: 2026-02-21

---

## Prerequisites

Install the following before cloning:

| Tool | Version | Install |
|---|---|---|
| Node.js | 22 LTS | [https://nodejs.org](https://nodejs.org) or via `nvm`/`fnm`/`volta` |
| pnpm | 9 | `npm install -g pnpm@9` |
| Git | any | system package manager |
| PostgreSQL | 16 | [https://postgresql.org](https://postgresql.org) or Docker |

> **Tip**: The repository includes a `.nvmrc` file. If you use `nvm`, run `nvm use` in the
> repo root to automatically switch to the correct Node version.

---

## 1. Clone & Install

```bash
git clone https://github.com/zecaptus/kasa.git kasa
cd kasa
pnpm install
```

`pnpm install` installs all dependencies for both `frontend/` and `backend/` in one step
via pnpm workspaces. A single `pnpm-lock.yaml` ensures reproducible installs.

---

## 2. Configure Environment

```bash
cp .env.example backend/.env
```

Edit `backend/.env` and set at minimum:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/kasa_dev"
DATABASE_URL_TEST="postgresql://USER:PASSWORD@localhost:5432/kasa_test"
```

The backend will fail to start if `DATABASE_URL` is missing or invalid (zod validation
at startup).

---

## 3. Set Up the Database

```bash
# Apply all migrations to the development database
pnpm --filter @kasa/db run db:migrate

# (Optional) Seed development data
pnpm --filter @kasa/db run db:seed
```

---

## 4. Start Development Servers

```bash
# Start both frontend (port 5173) and backend (port 3000) in parallel
pnpm dev
```

Or start each independently:

```bash
# Frontend only — HMR dev server
pnpm --filter frontend run dev

# Backend only — tsx watch (auto-restarts on change)
pnpm --filter backend run dev
```

---

## 5. Verify Quality Gates (Green State)

Run this before your first commit to confirm everything is working:

```bash
pnpm check       # Biome — lint + format check, must exit 0
pnpm typecheck   # tsc --noEmit — must exit 0
pnpm test        # Vitest — all tests pass, coverage ≥ 80%
```

All three commands must pass on a clean clone. If any fails on the initial scaffold, it is
a setup bug — do not proceed until resolved.

---

## 6. Common Commands Reference

| Command | What it does |
|---|---|
| `pnpm dev` | Start frontend + backend dev servers |
| `pnpm check` | Biome lint + format check (entire repo) |
| `pnpm check:fix` | Biome auto-fix lint + format issues |
| `pnpm typecheck` | Type-check all packages (`tsc --noEmit`) |
| `pnpm test` | Run all tests with coverage |
| `pnpm test:watch` | Interactive test watch mode |
| `pnpm build` | Production build (both packages) |
| `pnpm --filter @kasa/db run db:migrate` | Apply DB migrations (dev) |
| `pnpm --filter @kasa/db run db:generate` | Regenerate Prisma client after schema change |
| `pnpm --filter @kasa/db run db:studio` | Open Prisma Studio (visual DB browser, dev only) |

---

## Prisma Workflow

After modifying `backend/prisma/schema.prisma`:

```bash
# 1. Create and apply a new migration
pnpm --filter @kasa/db run db:migrate
# Prisma prompts for a migration name

# 2. Regenerate the TypeScript client
pnpm --filter @kasa/db run db:generate

# 3. Verify types compile
pnpm typecheck
```

---

## Troubleshooting

**`pnpm install` fails**
- Ensure Node.js 22 is active (`node -v`).
- Delete `node_modules/` at root and both packages, then re-run `pnpm install`.

**Backend fails to start with env error**
- Check `backend/.env` exists and `DATABASE_URL` is a valid PostgreSQL connection string.
- Confirm PostgreSQL is running and the database exists.

**`pnpm test` fails with coverage threshold error**
- A module's test coverage dropped below 80%. Add tests for uncovered lines before proceeding.

**`pnpm check` reports `any` usage or formatting issues**
- Run `pnpm check:fix` to auto-fix formatting. For `any` violations, replace with the correct
  type or `unknown` — the constitution forbids implicit `any`.

**Prisma client out of sync**
- Run `pnpm --filter @kasa/db run db:generate` after any schema change.

---

## Branch Protection (GitHub — one-time setup)

After pushing to GitHub, configure branch protection on `main`:

1. Go to **Settings → Branches → Add rule** for `main`
2. Enable: **Require status checks to pass before merging**
3. Add required checks:
   - `Lint & Format (Biome)` (job: `check`)
   - `Type Check` (job: `typecheck`)
   - `Tests & Coverage` (job: `test`)
4. Enable: **Dismiss stale pull request approvals when new commits are pushed**
5. Enable: **Require branches to be up to date before merging**

Once set, CI must be green on all three jobs before any PR can be merged.

---

## Editor Setup (VS Code)

For instant feedback on type errors and formatting violations:

1. **Install recommended extensions**: VS Code will prompt automatically (`.vscode/extensions.json` is included).
   Or install manually:
   - [`biomejs.biome`](https://marketplace.visualstudio.com/items?itemName=biomejs.biome) — Biome linter + formatter
   - [`ms-vscode.vscode-typescript-next`](https://marketplace.visualstudio.com/items?itemName=ms-vscode.vscode-typescript-next) — Latest TypeScript language server

2. The `.vscode/settings.json` configures:
   - **Format on save**: Biome auto-formats every file on `Ctrl+S`
   - **TypeScript SDK**: Uses the workspace's TypeScript (same version as CI)

3. **Verify it works**:
   - Open any `.ts` file and introduce a type error → red squiggle should appear in < 2s
   - Save the file → Biome should fix formatting instantly
   - If the squiggle doesn't appear, run **TypeScript: Select TypeScript Version** from the command palette and choose "Use Workspace Version"
