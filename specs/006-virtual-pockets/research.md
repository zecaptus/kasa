# Research: 006-virtual-pockets

## 1. Account Linking Strategy

**Decision**: Pockets store an `accountLabel String` field that matches the `accountLabel` field
on `ImportedTransaction`. No foreign key to a dedicated Account model is introduced.

**Rationale**: Accounts are not first-class Prisma entities in this codebase — they are derived
by grouping `ImportedTransaction` rows by `accountLabel`. Introducing a separate `Account` model
would require a schema migration that breaks the existing account-derivation architecture and is
out of scope for Phase 5. Storing `accountLabel` directly on `Pocket` is consistent with how
`dashboard.service.ts` already identifies accounts.

**Implication for FR-006 (balance check)**: When validating a new allocation, the service
computes the account's available balance as:
```
available = SUM(ImportedTransaction credit - debit WHERE userId AND accountLabel)
           - SUM(PocketMovement ALLOCATION - WITHDRAWAL WHERE pocket.userId AND pocket.accountLabel)
```
This requires two queries but no schema change beyond the new Pocket models.

**Alternatives considered**:
- New `Account` model with FK from both `ImportedTransaction` and `Pocket` → too large a
  refactor, deferred to a future phase.

---

## 2. Dashboard Integration: Separate Endpoint vs. Extended Dashboard

**Decision**: Separate `GET /api/pockets` endpoint, called in parallel with
`GET /api/dashboard` by the frontend.

**Rationale**: The pockets feature has its own management page (`/cagnottes`) which needs the
same data. A single dedicated endpoint serves both the dashboard and the management page without
duplicating logic inside the dashboard service. RTK Query calls both endpoints in parallel on
the dashboard page — wall-clock cost is the same as a single extended endpoint. Cache
invalidation is also simpler: pocket mutations only invalidate `'Pocket'` tags, not the entire
dashboard cache.

**Alternatives considered**:
- Extend `GET /api/dashboard` to embed pockets per account → couples dashboard service to
  pockets service; invalidates the full dashboard cache on every pocket mutation.

---

## 3. Pocket Movement Direction — Enum vs. Signed Amount

**Decision**: Store movements with a `direction` enum (`ALLOCATION` | `WITHDRAWAL`) and an
`amount` field that is always positive (`Decimal > 0`).

**Rationale**: This mirrors the existing pattern for `ImportedTransaction` where `debit` and
`credit` are separate positive-value fields. It makes SQL aggregations straightforward
(`SUM CASE WHEN direction = 'ALLOCATION'`) and avoids ambiguity around negative zero or sign
conventions.

**Alternatives considered**:
- Single signed `amount` field (positive = allocation, negative = withdrawal) → simpler schema
  but requires careful sign handling throughout and is inconsistent with existing codebase style.

---

## 4. Allocated Amount — Derived vs. Materialised

**Decision**: The `allocatedAmount` of a pocket is always derived at query time as
`SUM(ALLOCATION amounts) - SUM(WITHDRAWAL amounts)` from its movements. It is never stored
as a column.

**Rationale**: Materialising the value would require keeping it in sync with every movement
write — a classic consistency risk. The movement log is the source of truth. Given the expected
volume (dozens of movements per pocket at most), recomputing on read is negligible in cost.

---

## 5. API Structure

**Decision**: Seven REST endpoints under `/api/pockets`:
- `GET /api/pockets` — list all pockets for the user (with computed `allocatedAmount` and progress)
- `POST /api/pockets` — create a pocket
- `GET /api/pockets/:id` — single pocket detail + paginated movement history
- `PATCH /api/pockets/:id` — update name, goal, color
- `DELETE /api/pockets/:id` — delete pocket (with all movements)
- `POST /api/pockets/:id/movements` — add an allocation or withdrawal
- `DELETE /api/pockets/:id/movements/:movementId` — delete a single movement (correction use case)

**Rationale**: Standard REST CRUD for pockets. Movement creation and deletion are sub-resources
of a pocket, which is the natural hierarchy. A `DELETE` on an individual movement allows
correcting errors without needing a separate "edit movement" flow.

---

## 6. Colour Palette

**Decision**: Use the same 6-colour system palette already seeded in `Category` colours:
`#22c55e`, `#3b82f6`, `#f59e0b`, `#ec4899`, `#8b5cf6`, `#94a3b8`. No custom hex input.

**Rationale**: Reusing the existing palette keeps visual consistency with category colours
shown elsewhere in the UI. The palette is already understood by the design system.
