# Feature Specification: Cagnottes — Virtual Savings Pockets

**Feature Branch**: `006-virtual-pockets`
**Created**: 2026-02-23
**Status**: Draft
**Input**: User description: "passe à la tache 006 de la roadmap"

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Create a Savings Pocket (Priority: P1)

As a user, I want to create a named savings pocket linked to any of my bank accounts, set a
goal amount, and choose a colour, so I can earmark part of my savings for a specific purpose
(e.g., holidays, emergency fund, car purchase).

**Why this priority**: A pocket must exist before any allocation, progress tracking, or
dashboard display is possible. This is the foundation of the entire feature.

**Independent Test**: Create a new pocket with a name, goal amount, and colour; verify it
appears in the pocket list for the selected account. Delivers standalone value as the minimum
viable savings-tracking unit.

**Acceptance Scenarios**:

1. **Given** I am on the pockets page for any of my accounts, **When** I fill in a pocket name, goal amount, and colour and submit, **Then** the new pocket appears in the list for that account with the correct name, goal, colour, and a progress of 0 %.
2. **Given** I am creating a pocket, **When** I submit without a name, **Then** an error message is shown and the pocket is not created.
3. **Given** I am creating a pocket, **When** I submit without a goal amount or with a non-positive amount, **Then** an error message is shown and the pocket is not created.
4. **Given** I have an existing pocket, **When** I edit its name, goal, or colour and save, **Then** the pocket reflects the updated values.
5. **Given** I have a pocket with no movements, **When** I delete it, **Then** it is permanently removed and no longer appears in the list.
6. **Given** I have a pocket with existing movements, **When** I attempt to delete it, **Then** the system warns me that all movement history will be lost and requires confirmation.

---

### User Story 2 — Allocate or Withdraw Funds (Priority: P2)

As a user, I want to manually allocate an amount from my savings account into a pocket, or
withdraw an amount back out, so I can track exactly how much of my savings is reserved for each
goal.

**Why this priority**: Pockets are only useful once money can be assigned to them. Progress
tracking and the dashboard view both depend on allocations being recorded.

**Independent Test**: Allocate an amount to a pocket; verify the pocket's allocated amount
increases and the movement is recorded in its history. Withdraw; verify the allocated amount
decreases accordingly.

**Acceptance Scenarios**:

1. **Given** I have a pocket with a goal of €1 000 and €0 allocated, **When** I allocate €200, **Then** the pocket shows €200 allocated, progress is 20 %, and a movement entry of +€200 appears in the history.
2. **Given** I have a pocket with €200 allocated, **When** I withdraw €50, **Then** the pocket shows €150 allocated, and a movement entry of −€50 appears in the history.
3. **Given** I try to allocate a non-positive amount, **When** I submit the form, **Then** an error is shown and no movement is recorded.
4. **Given** I try to withdraw more than the currently allocated amount, **When** I submit, **Then** an error is shown explaining the pocket does not have sufficient allocated funds.
5. **Given** I allocate an amount that would make the total across all pockets exceed the linked account's balance, **When** I submit, **Then** the allocation is rejected with an error message that shows the maximum allocatable amount (account balance minus already-allocated amounts across all pockets for that account).

---

### User Story 3 — Track Progress Visually (Priority: P3)

As a user, I want each pocket to display a visual progress indicator showing how much of the
goal has been reached, so I can see at a glance how close I am to my savings target.

**Why this priority**: Visual progress is the primary motivational feedback mechanism. Without
it, pockets are just labelled numbers; with it, they communicate achievement and distance to goal.

**Independent Test**: With a pocket at 60 % of its goal, verify the progress bar visually
represents approximately 60 % and the numeric ratio (e.g., "€600 / €1 000") is displayed.

**Acceptance Scenarios**:

1. **Given** a pocket with €600 allocated out of a €1 000 goal, **When** I view the pocket card, **Then** a progress bar at 60 % is shown alongside the label "€600 / €1 000".
2. **Given** a pocket that has reached its goal (100 %), **When** I view the card, **Then** the progress bar is full and a visual indicator (e.g., distinct colour or icon) signals goal achievement.
3. **Given** a pocket with €0 allocated, **When** I view the card, **Then** the progress bar is empty and shows 0 % without errors.
4. **Given** a pocket where allocations exceed the goal (> 100 %), **When** I view the card, **Then** the bar is shown at 100 % (capped) and the actual allocated amount is displayed.

---

### User Story 4 — Dashboard Integration (Priority: P4)

As a user, I want to see my pocket cards nested visually under their respective account card
on the dashboard, so I get a consolidated view of my savings and sub-goals in one place without
navigating away.

**Why this priority**: The dashboard is the primary daily touchpoint. Integrating pockets there
completes the savings picture alongside account balances — but requires the pocket feature to
already exist (P1–P3).

**Independent Test**: With at least one pocket linked to an account, open the dashboard and
verify pocket cards appear nested beneath the corresponding account card, each showing the
pocket name, allocated amount, and progress.

**Acceptance Scenarios**:

1. **Given** I have two pockets linked to the same account, **When** I open the dashboard, **Then** both pocket cards appear beneath that account card, each showing the pocket name, allocated amount, progress bar, and goal.
2. **Given** I have pockets linked to different accounts, **When** I view the dashboard, **Then** each account card shows only its own nested pocket cards.
3. **Given** I have no pockets, **When** I view the dashboard, **Then** account cards appear without nested pocket cards (no empty-state clutter).
4. **Given** I am on a mobile screen (≤375 px), **When** I view the dashboard, **Then** pocket cards stack below their account card without horizontal overflow.

---

### User Story 5 — Movement History (Priority: P5)

As a user, I want to see a chronological list of all allocations and withdrawals for a given
pocket, so I can audit how it has been used over time and understand its current balance.

**Why this priority**: History provides transparency and accountability. It is the last story
because it enriches an already-functional feature rather than unlocking new capabilities.

**Independent Test**: After several allocations and withdrawals on a pocket, open its history
view and verify each movement appears with its amount, direction, and date in reverse
chronological order.

**Acceptance Scenarios**:

1. **Given** a pocket with 3 movements (two allocations, one withdrawal), **When** I open the movement history, **Then** I see 3 entries in reverse chronological order, each showing date, direction, and amount.
2. **Given** a pocket with no movements, **When** I open the history, **Then** an empty state is shown ("No movements yet").
3. **Given** a pocket with more than 20 movements, **When** I view the history, **Then** movements are paginated or loadable in batches without loading all at once.

---

### Edge Cases

- What if the linked account no longer has transactions (e.g., was imported once and not updated)? → Pockets can still be managed; they are independent of import activity.
- What if the goal amount is changed after allocations? → The progress percentage recalculates against the new goal; existing allocations are unchanged.
- What if the user has no accounts yet (no imported transactions)? → The pocket creation form shows a message inviting the user to import a bank statement first.
- What if two pockets for the same account reach 100 % simultaneously? → Both display goal achievement independently.
- What if a withdrawal brings allocated amount to exactly 0 but movements still exist? → The pocket remains with 0 allocated and full history preserved.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST allow users to create a savings pocket with a name (required), a goal amount (required, positive), a colour (required, from a predefined palette), and a linked account (required, chosen from accounts present in the user's transaction data).
- **FR-002**: The system MUST allow users to edit the name, goal amount, and colour of an existing pocket.
- **FR-003**: The system MUST allow users to delete a pocket; if the pocket has existing movements, the user MUST confirm the deletion before it is executed.
- **FR-004**: The system MUST allow users to record an allocation (positive movement) or a withdrawal (negative movement) against a pocket, with a required amount and an optional note.
- **FR-005**: Withdrawals MUST be rejected if the requested amount exceeds the current allocated balance of the pocket.
- **FR-006**: When a new allocation would cause the total allocated across all pockets for an account to exceed that account's current balance, the system MUST reject the allocation with a clear error message indicating how much headroom remains. No over-allocation is permitted.
- **FR-007**: Each pocket MUST display a progress indicator showing the ratio of allocated amount to goal amount, capped visually at 100 %.
- **FR-008**: The system MUST display pocket cards nested beneath their linked account card on the dashboard.
- **FR-009**: The system MUST maintain a complete movement history for each pocket, including amount, direction (allocation / withdrawal), date, and optional note.
- **FR-010**: Movement history MUST be displayed in reverse chronological order.
- **FR-011**: All monetary amounts MUST use the user's preferred locale and currency format.
- **FR-012**: All user-facing text strings MUST be internationalised; no hardcoded copy is permitted.
- **FR-013**: The pockets interface MUST meet WCAG 2.1 AA accessibility standards.

### Key Entities

- **Pocket**: A virtual savings sub-account linked to a bank account. Attributes: name, goal amount, current allocated amount (derived from movements), colour, linked account label, creation date.
- **PocketMovement**: A single allocation or withdrawal against a pocket. Attributes: amount (always positive), direction (allocation or withdrawal), date, optional note, pocket reference.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can create a new pocket with name, goal, and colour in under 60 seconds.
- **SC-002**: After recording an allocation or withdrawal, the pocket's progress indicator updates immediately without requiring a page reload.
- **SC-003**: On the dashboard, pocket cards appear nested under their linked account card within the normal dashboard load time (≤ 1.5 s P95).
- **SC-004**: 100 % of monetary values displayed use the user's locale-specific currency format.
- **SC-005**: Movement history for a pocket with up to 100 entries loads in under 1 second.
- **SC-006**: The pockets interface passes WCAG 2.1 AA automated accessibility checks with zero violations.

## Assumptions

- Pockets can be linked to any account present in the user's transaction data (identified by `accountLabel`); no account type is privileged — any account (checking, savings, Livret A, etc.) can hold pockets.
- The "allocated amount" of a pocket is the sum of all its movements (allocations minus withdrawals); it is derived, not stored directly.
- Pockets are user-scoped: each user sees only their own pockets.
- There is no limit on the number of pockets per account.
- The colour palette is predefined by the design system (6–10 colours); custom hex input is out of scope.
- Icons/emoji for pockets are out of scope for this phase (colour only, per roadmap "couleur/icône" — deferred).
- Over-allocation is blocked (FR-006, Option A confirmed 2026-02-23).
