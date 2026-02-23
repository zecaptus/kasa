# Feature Specification: CSV Import & Transaction Reconciliation

**Feature Branch**: `003-csv-import`
**Created**: 2026-02-22
**Status**: Draft
**Input**: User description: "Phase 2 de la roadmap : import CSV SG + saisie manuelle + rapprochement automatique des transactions"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Import CSV Bank Statement (Priority: P1)

An authenticated user downloads their monthly bank statement as a CSV file from SG's online banking portal and uploads it to Kasa. The system parses the file, normalises the transactions, and displays them in a list ready for reconciliation.

**Why this priority**: Without imported bank data, the reconciliation feature has no value. This is the entry point for all subsequent workflows.

**Independent Test**: Can be tested by uploading a valid SG CSV file and verifying that all transactions appear correctly in the import summary with amounts, dates, and labels preserved.

**Acceptance Scenarios**:

1. **Given** a logged-in user with a valid SG CSV export, **When** they upload the file via the import page, **Then** the system displays the parsed transaction list (amount, date, label) from the file.
2. **Given** a logged-in user uploads a CSV that was previously imported, **When** the system detects duplicate transactions (matched by amount + date + label), **Then** duplicates are skipped and the user sees a summary of new vs. skipped entries.
3. **Given** a logged-in user uploads a file that cannot be parsed as a valid SG CSV, **Then** the system displays a clear error describing the expected format.
4. **Given** a logged-in user uploads a file exceeding 5 MB, **Then** the system rejects the file immediately with a size limit error.

---

### User Story 2 - Manual Expense Entry (Priority: P2)

An authenticated user records a cash purchase or any expense not reflected in their bank statement by manually entering the amount, label, date, and category. These expenses are stored in Kasa and become candidates for reconciliation with future or past CSV imports.

**Why this priority**: Users often have expenses outside the bank statement (cash, split payments). Manual entry completes the expense picture and enables accurate reconciliation.

**Independent Test**: Can be tested in isolation by creating a manual expense and verifying it appears in the expense list with all fields saved correctly — no CSV import required.

**Acceptance Scenarios**:

1. **Given** a logged-in user on the manual entry page, **When** they submit a valid form (amount, label, date, category), **Then** the expense is saved and appears in their expense list.
2. **Given** a logged-in user submits the form with a required field empty, **Then** the system shows a per-field validation error and does not save.
3. **Given** a logged-in user enters a non-positive amount, **Then** the system rejects the entry with a validation error.

---

### User Story 3 - Automatic Reconciliation (Priority: P3)

After a CSV import, the system automatically attempts to match each imported transaction with an existing manual expense using amount, date proximity, and label similarity. High-confidence, unambiguous matches are automatically marked as reconciled without user action.

**Why this priority**: Most bank transactions correspond directly to a known manual expense. The system should handle clear matches automatically to minimise user effort.

**Independent Test**: Can be tested by importing a CSV that contains transactions matching pre-existing manual expenses, and verifying that unambiguous pairs are automatically marked as reconciled.

**Acceptance Scenarios**:

1. **Given** a CSV transaction and a manual expense with identical amount, date difference ≤ 3 days, and sufficiently similar label, and no other manual expense matches, **When** reconciliation runs, **Then** the pair is automatically marked as reconciled.
2. **Given** a CSV transaction with no plausible manual expense match, **When** reconciliation runs, **Then** the transaction remains "unreconciled".
3. **Given** a CSV transaction previously marked as "ignored", **When** reconciliation runs, **Then** the transaction is excluded from automatic matching.

---

### User Story 4 - Ambiguity Resolution (Priority: P4)

When automatic reconciliation finds multiple manual expenses that could match a given CSV transaction, the system presents the candidate matches to the user. The user selects the correct match or dismisses all suggestions.

**Why this priority**: Ambiguous cases require human judgment. Without this flow, incorrect auto-matches would undermine user trust in the data.

**Independent Test**: Can be tested by creating two manual expenses with identical amounts on similar dates, importing a matching CSV transaction, and verifying the system prompts the user to choose between them.

**Acceptance Scenarios**:

1. **Given** a CSV transaction with multiple plausible manual expense matches, **When** the user views the reconciliation interface, **Then** the system presents all candidate matches ranked by confidence.
2. **Given** the disambiguation interface is shown, **When** the user selects a match, **Then** the pair is marked as reconciled and removed from the pending queue.
3. **Given** the disambiguation interface is shown, **When** the user dismisses all suggestions, **Then** the CSV transaction returns to "unreconciled" and the manual expenses remain available for future matching.

---

### User Story 5 - Transaction Status Management (Priority: P5)

A user reviews all transactions from an import session and can manually change any transaction's status: marking a CSV transaction as "ignored" (e.g., internal account transfers), or undoing an incorrect reconciliation.

**Why this priority**: Some bank transactions are not expenses (inter-account transfers, refunds). Users also need the ability to correct mistakes made by auto-matching.

**Independent Test**: Can be tested by marking a reconciled pair as unreconciled, verifying both items return to "unreconciled" status and are available for re-matching.

**Acceptance Scenarios**:

1. **Given** an unreconciled CSV transaction, **When** the user marks it as "ignored", **Then** it is removed from the pending reconciliation list and counts as excluded.
2. **Given** a reconciled pair, **When** the user undoes the reconciliation, **Then** both the CSV transaction and the manual expense return to "unreconciled" status.
3. **Given** the user views the import summary, **When** all transactions have a final status (reconciled or ignored), **Then** the import session is displayed as complete.

---

### Edge Cases

- CSV file is empty (no data rows, header only)
- CSV file contains rows with missing required fields (no amount or no date)
- Two rows in the same CSV have identical amount, date, and label (genuine duplicate entries in source)
- Two manual expenses have identical amount, date, and label (user accidentally entered the same expense twice)
- Re-importing a CSV where some transactions were already reconciled — existing reconciliations must not be reset
- A manual expense that matched a CSV transaction is deleted — the linked reconciliation must be invalidated
- CSV file with dates in an unexpected format or locale

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow authenticated users to upload a CSV file exported from SG online banking via a drag-and-drop or file picker interface.
- **FR-002**: System MUST parse the uploaded CSV and extract for each row: amount, date, and label at minimum.
- **FR-003**: System MUST validate the file format on upload and reject files that are not parseable as an SG CSV export, showing a descriptive error message.
- **FR-004**: System MUST reject files exceeding 5 MB with a clear size-limit error before parsing.
- **FR-005**: System MUST deduplicate imported transactions — if a transaction with the same amount, date, and label already exists for the user, it is skipped. The user is shown a summary (new vs. skipped count).
- **FR-006**: Users MUST be able to manually enter an expense providing: amount (positive number, in euros), label (free text), date, and category (selected from a predefined list).
- **FR-007**: System MUST validate all manual expense fields and surface per-field errors for incomplete or invalid submissions.
- **FR-008**: System MUST automatically attempt to match each unreconciled imported transaction against all unreconciled manual expenses in the user's account (global scope, no date-window restriction on candidates), using: exact amount match, date difference ≤ 3 days, and label similarity score. Reconciliation MUST be triggered automatically after each CSV import completes AND after each manual expense is saved.
- **FR-009**: System MUST automatically mark a transaction–expense pair as reconciled when exactly one manual expense qualifies as a high-confidence match (unique and unambiguous).
- **FR-010**: System MUST flag a CSV transaction as "awaiting user review" when two or more manual expenses are plausible matches, and present the candidates to the user ordered by confidence.
- **FR-011**: Users MUST be able to select one candidate from the disambiguation list to confirm a reconciliation, or dismiss all candidates to leave the transaction unreconciled.
- **FR-012**: Users MUST be able to mark any CSV transaction as "ignored" to exclude it from reconciliation permanently.
- **FR-013**: Users MUST be able to undo any reconciliation, returning both items to "unreconciled" status.
- **FR-014**: System MUST display a reconciliation summary per import session: total imported, reconciled, awaiting review, unreconciled, ignored.
- **FR-015**: All import and reconciliation data MUST be strictly scoped to the authenticated user — no cross-user data access is possible.
- **FR-016**: Users MUST be able to delete a manual expense. If the expense is linked to a reconciliation, that reconciliation MUST be automatically invalidated and the associated imported transaction returned to "unreconciled" status.

### Key Entities

- **ImportedTransaction**: A bank transaction extracted from a CSV upload — amount, date, label, import timestamp, reconciliation status (unreconciled / reconciled / ignored).
- **ManualExpense**: A user-entered expense — amount, label, date, category, reconciliation status (unreconciled / reconciled).
- **Reconciliation**: Links one ImportedTransaction to one ManualExpense — records whether matched automatically or user-confirmed, and the match confidence score.
- **ImportSession**: Groups all transactions from a single CSV upload — tracks source filename, import date, and overall completion status. The uploaded file itself is not retained; only the parsed transactions are persisted. Multiple ImportSessions can be active (incomplete) simultaneously for the same user.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user with a valid SG CSV export can complete the full upload-to-reconciliation-summary workflow in under 5 minutes for a typical monthly statement (≤ 50 transactions).
- **SC-002**: The automatic reconciliation engine correctly identifies at least 80% of true matching pairs without requiring user intervention.
- **SC-003**: Re-importing the same CSV file never creates duplicate transaction entries.
- **SC-004**: Users can resolve all pending ambiguous matches from a typical import session in under 2 minutes.
- **SC-005**: 90% of first-time users successfully complete a CSV import without needing external documentation.

## Assumptions

- The SG CSV export has a consistent, parseable structure (fixed columns for amount, date, label). Exact column names and encoding will be confirmed against a real export sample during planning.
- Manual expenses use a predefined, fixed category list for this phase (e.g. Food, Transport, Housing, Health, Entertainment, Other). User-defined categories are deferred to Phase 3 (Transactions).
- A "high-confidence" automatic match requires: amount exactly equal, date difference ≤ 3 days, and label similarity above an implementation-defined threshold. The exact threshold is an implementation-level decision.
- Transactions genuinely identical in the source file (same amount + date + label appearing twice) are treated as two distinct transactions and both are imported.
- All monetary amounts are in euros (€). Multi-currency support is out of scope for this phase.
- Maximum supported file size is 5 MB, sufficient for 12+ months of a typical individual bank statement.
- The uploaded CSV file is not stored after parsing. Only the extracted transaction data is persisted. This minimises exposure of sensitive financial data and simplifies GDPR compliance.

## Clarifications

### Session 2026-02-22

- Q: À quel moment le moteur de rapprochement s'exécute-t-il ? → A: Les deux — après chaque import CSV ET après chaque saisie de dépense manuelle (option C).
- Q: Que fait-on du fichier CSV après parsing et import des transactions ? → A: Supprimé immédiatement après parsing — seules les transactions extraites sont persistées (option A).
- Q: La suppression d'une dépense manuelle est-elle dans le périmètre de cette phase ? → A: Oui — suppression autorisée avec invalidation automatique de toute réconciliation liée (option A).
- Q: Quelles dépenses manuelles sont candidates au rapprochement d'une transaction CSV ? → A: Toutes les dépenses manuelles non réconciliées du compte, quelle que soit leur date (option A).
- Q: Un utilisateur peut-il avoir plusieurs sessions d'import actives simultanément ? → A: Oui — plusieurs sessions peuvent coexister sans restriction (option A).

## Dependencies

- Phase 1 — `002-user-management`: Users must be authenticated. All import and expense data is scoped per user.

## Out of Scope

- Import from formats other than SG CSV (other banks, OFX, QIF, open banking API)
- Automatic creation of a manual expense from an unmatched CSV transaction
- Category management (add / edit / delete categories) — deferred to Phase 3
- Bulk operations (bulk ignore, bulk reconcile)
- Export of reconciliation results
- Multi-account management (multiple bank accounts per user)
