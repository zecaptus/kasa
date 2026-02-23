# Research: 005-dashboard

## 1. Charting Library

**Decision**: Recharts via shadcn/ui chart wrapper (`pnpm dlx shadcn@latest add chart`)

**Rationale**:
- shadcn charts copy the component source into the project — no additional runtime dependency
  beyond `recharts` itself; no new CSS framework introduced.
- CSS variable theming integrates cleanly with Tailwind CSS 4's CSS-first approach: chart
  palette colours are defined once in `globals.css` as `--color-chart-*` variables and flow
  through chart components without prop-drilling colour strings.
- SVG rendering is preferable to canvas for this use case: DOM-addressable elements allow
  `aria-label` attributes directly on chart containers, CSS transitions, and tooltips that
  participate in the normal focus order.
- Native grouped `<BarChart>` with multiple `<Bar>` children handles the current-month vs.
  previous-month by category comparison without custom rendering.
- `SpendingChart` will be wrapped in `React.lazy()` + `<Suspense>` so Recharts (~140 KB
  gzipped) does not inflate the initial page bundle — important for the PWA SLO.
- Known caveat: Recharts emits console warnings under React 19 Strict Mode double-render;
  these are dev-only and disappear in production.

**Alternatives considered**:
- **Nivo** (`@nivo/bar`): ~200–300 KB gzipped (no tree-shaking); React Spring animation issues
  under Strict Mode. Disqualified on bundle size for a PWA.
- **Chart.js + react-chartjs-2**: Best tree-shaking story (~30–50 KB); however canvas rendering
  requires offscreen fallback tables to meet WCAG 2.1 AA and has known StrictMode double-mount
  canvas context errors. Ruled out.
- **Tremor**: Adds a full component system on top of Recharts. Over-scoped for this feature.

---

## 2. Account Identification in Transaction Data

**Decision**: Add `accountLabel String @default("")` to `ImportedTransaction`. Value is extracted
from the SG CSV pre-header at parse time; fallback is the upload filename (without extension).

**Background**: The current schema has no account identifier. The SG CSV format includes
metadata rows *before* the column header row (e.g., `Libellé du compte ; Compte courant`).
The existing parser already reads these rows (via `relax_column_count: true`) but ignores them.

**Implementation**: The parser will scan pre-header rows for patterns:
1. Row matching `Libellé du compte` → use the second cell as `accountLabel`.
2. Row matching `Numéro de compte` → use the second cell as fallback.
3. Neither found → derive label from filename: strip `.csv`, replace `_`/`-` with spaces.

Empty `accountLabel` (existing rows after migration default) is treated as "Compte principal" in
the UI (i18n key `dashboard.account.default`).

**Migration**: Single additive column `account_label TEXT NOT NULL DEFAULT ''` on
`imported_transaction`. Existing dedup constraint `@@unique([userId, accountingDate, label, debit,
credit])` is unaffected.

**Alternatives considered**:
- New `Account` model with FK on `ImportSession` and `ImportedTransaction` → over-engineered for
  Phase 4; Phase 5 (cagnottes) will revisit and may introduce this model.
- User-provided account name at upload time → extra form field in existing import UX, more
  disruptive; deferred to Phase 5.
- Group by `ImportSession.filename` → multiple sessions for the same account appear as separate
  "accounts"; unreliable for long-term use.

---

## 3. Aggregation Strategy

**Decision**: All financial aggregations computed server-side in PostgreSQL via Prisma
`$queryRaw`; three queries run in parallel with `Promise.all`.

**Rationale**: The SLO is 1.5 s P95. Fetching all transactions to the client for JavaScript
aggregation would require transferring potentially thousands of rows over a mobile connection —
incompatible with PWA constraints. PostgreSQL `SUM`/`GROUP BY` on indexed columns
(`userId`, `accountingDate`) executes in milliseconds. Running the three aggregation queries
concurrently (global summary, per-account, category comparison) minimises wall-clock time.

---

## 4. API Design

**Decision**: Single `GET /api/dashboard` endpoint returning all dashboard data in one response.

**Rationale**: Three separate endpoints would require three parallel RTK Query calls, adding
frontend complexity and at minimum three TCP round-trips on mobile. A single endpoint:
- Runs the three internal queries in parallel on the server.
- Returns one JSON payload — one cache entry in RTK Query.
- Uses RTK Query `keepUnusedDataFor: 60` (60-second TTL); dashboard is read-only so stale data
  within 60 s is acceptable.
- No cache invalidation strategy needed (dashboard is computed from existing transaction data
  already managed by `transactionsApi`).

---

## 5. ManualExpenses in the Dashboard

**Decision**: Manual expenses contribute to the **global summary** (monthly spending + net cash
flow) but do **not** appear on per-account cards.

**Rationale**: Manual expenses have no `accountLabel`; they represent cash or untracked spending.
Including them in the global totals gives an accurate net cash flow, while keeping them off account
cards avoids misleading per-account balance calculations. The 5 most recent items in each account
card are sourced exclusively from `ImportedTransaction` for that `accountLabel`.

---

## 6. Category Comparison Grouping

**Decision**: Top 9 categories by total spending in the current month; remaining categories
grouped as "Other". Both months use the same top-9 set (derived from the current month) so the
chart legend is stable.

**Rationale**: Using the current month's top-9 as the reference ensures the chart always shows
the most relevant categories. Previous-month data is mapped onto the same category slots;
categories present only in the previous month appear in "Other".
