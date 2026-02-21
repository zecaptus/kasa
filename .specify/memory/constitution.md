<!--
## Sync Impact Report

**Version**: template → 1.0.0 → 1.1.0
**Bump rationale**: MINOR — Technology & Stack Constraints section filled (was TODO).

### v1.0.0 (2026-02-21)
- Initial ratification; 4 principles defined; TODO(STACK) deferred.

### v1.1.0 (2026-02-21)
- TODO(STACK) resolved: TypeScript monorepo, React+Tailwind frontend, Koa backend, Prisma ORM.
- Deferred TODOs resolved: none remaining.

### v1.2.0 (2026-02-21)
- ESLint + Prettier replaced by Biome (single tool: lint + format, Rust-based, zero config split).

### Templates
- `.specify/templates/plan-template.md` ✅ updated (Constitution Check gates filled)
- `.specify/templates/spec-template.md` ⚠ no change required
- `.specify/templates/tasks-template.md` ⚠ no change required
- `.specify/templates/checklist-template.md` ⚠ no change required
-->

# Kasa Constitution

## Core Principles

### I. Code Quality

All code merged into the main branch MUST meet the following non-negotiable standards:

- Code MUST pass static analysis (linter + formatter) with zero warnings; CI MUST block on failure.
- Functions MUST have a single, clearly stated responsibility; cyclomatic complexity MUST NOT exceed 10.
- Public APIs and exported symbols MUST be explicitly typed; implicit `any` or equivalent is forbidden.
- Code reviews MUST verify readability, naming clarity, and absence of dead code before merge.
- Dependencies MUST be pinned to exact versions in lock files; unpinned ranges are not permitted
  in production manifests.

**Rationale**: Consistent code quality reduces onboarding friction, prevents technical debt, and ensures
long-term maintainability across all contributors.

### II. Testing Standards

Testing is a first-class deliverable, not an afterthought.

- Every new feature or bug fix MUST include tests before the implementation is merged.
- Unit tests MUST cover all core business logic with a minimum 80% statement coverage per module.
- Integration tests MUST be written for any cross-module communication, external API calls,
  or database interactions.
- Tests MUST be deterministic: flaky tests MUST be fixed or removed immediately — no retries
  to mask failures.
- The full test suite MUST pass in CI on every push; no merge is permitted with a failing test.

**Rationale**: Test-first discipline catches regressions early, documents expected behavior, and gives
contributors confidence to refactor without fear.

### III. User Experience Consistency

All user-facing surfaces MUST deliver a coherent, predictable experience.

- UI components and interactions MUST follow the project's established design system;
  ad-hoc styles are forbidden without design-system amendment.
- Error messages MUST be human-readable and actionable — no raw stack traces or error codes
  exposed to end users.
- Navigation and information hierarchy MUST be consistent across all screens, pages, or commands.
- Accessibility standards (WCAG 2.1 AA for web, or equivalent for CLI/native) MUST be met
  for all new user-facing interfaces.
- Breaking changes to user-facing behavior MUST be flagged in specs and reviewed before implementation.

**Rationale**: UX consistency builds user trust and reduces support burden; violations erode perceived
product quality disproportionately to their technical cost.

### IV. Performance Requirements

Performance targets are constraints, not aspirations.

- Response times MUST meet defined SLOs; each feature MUST specify its SLO in `plan.md`
  before implementation begins — unmeasured performance is not acceptable.
- Performance regressions MUST be detected via benchmarks in CI; a regression exceeding 10%
  vs. the established baseline MUST block merge.
- Expensive operations (N+1 queries, unbounded loops, synchronous blocking I/O) are FORBIDDEN
  without explicit justification documented in the plan's Complexity Tracking table.
- Memory and resource usage MUST be profiled for any feature processing large datasets
  or high request volumes.

**Rationale**: Performance requirements defined upfront prevent costly rewrites and ensure the product
meets user expectations under real-world conditions.

## Technology & Stack Constraints

Kasa is a **TypeScript monorepo** containing two independently buildable packages.

| Layer | Technology | Notes |
|---|---|---|
| Language | TypeScript (strict mode) | Both frontend and backend |
| Runtime | Node.js (LTS) | Version pinned via `.nvmrc` or `.tool-versions` |
| Frontend | React + Tailwind CSS | `frontend/` package |
| Backend | Koa | `backend/` package — `app.callback()` pour Vercel |
| ORM / DB access | Prisma (`@kasa/db`) | Package partagé — types consommés par front + back |
| Database | PostgreSQL (default) | Amendable during planning if requirements differ |
| Package manager | pnpm workspaces | Monorepo tooling; lock file committed |
| Linter + Formatter | Biome | Single tool (lint + format); `biome ci` blocks CI; zero-issue policy |
| Type checker | `tsc --noEmit` (strict) | Blocks CI on any error |
| Testing | Vitest (unit + integration) | Coverage threshold ≥ 80% per module |
| CI | GitHub Actions | Runs check, typecheck, test on every push/PR |
| Deployment | Vercel | Frontend SPA + Backend Koa handler |
| Repository | GitHub | https://github.com/zecaptus/kasa.git |

**Stability rule**: The stack above MUST remain stable across features. Introducing a new
technology requires a formal constitution amendment (PR → peer review → version bump)
with a documented migration plan.

## Development Workflow

- All work MUST be done on feature branches; direct commits to `main` are forbidden.
- Every feature MUST have a `spec.md`, `plan.md`, and `tasks.md` before implementation begins,
  produced via `/speckit.specify`, `/speckit.plan`, and `/speckit.tasks` respectively.
- Constitution compliance MUST be verified at the start of each plan (Constitution Check gate
  in `plan.md`) and again after Phase 1 design.
- Pull requests MUST reference the relevant spec and confirm principle compliance before
  review is requested.
- Amendments to this constitution MUST be proposed via PR, reviewed by at least one peer,
  version-bumped, and propagated across dependent templates.

## Governance

This constitution supersedes all other project conventions. In case of conflict, the constitution governs.

- **Amendment procedure**: Propose via PR → peer review → version bump → template propagation.
- **Versioning policy**: MAJOR for removed or redefined principles; MINOR for new principles
  or sections; PATCH for wording clarifications or typo fixes.
- **Compliance review**: Each feature plan MUST include a Constitution Check gate. Violations
  require documented justification in the Complexity Tracking table in `plan.md`.
- **Enforcement**: CI MUST enforce Code Quality and Testing Standards gates automatically.
  UX Consistency and Performance gates are verified during plan review and PR review.

**Version**: 1.2.0 | **Ratified**: 2026-02-21 | **Last Amended**: 2026-02-21
