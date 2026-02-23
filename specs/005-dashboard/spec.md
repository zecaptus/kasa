# Feature Specification: Dashboard — Financial Overview

**Feature Branch**: `005-dashboard`
**Created**: 2026-02-23
**Status**: Draft
**Input**: User description: "passe à la tache 005 de la roadmap"

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Global Financial Snapshot (Priority: P1)

As a user, I want to see my overall financial situation at a glance — total balance across all
accounts, total spending this month, and a budget indicator — so I immediately understand where I
stand without navigating anywhere.

**Why this priority**: This is the core value proposition of the dashboard. Without a summary
view, users have no single place to understand their finances. All other features (account cards,
chart) are secondary to this global overview.

**Independent Test**: Navigate to the dashboard and verify the global indicator block renders
with accurate aggregated totals. Delivers standalone value as the minimum viable dashboard.

**Acceptance Scenarios**:

1. **Given** I have accounts with transactions, **When** I open the dashboard, **Then** I see a global indicator block showing: total balance across all accounts, total spending for the current calendar month, and a budget indicator.
2. **Given** I have transactions spread across multiple accounts, **When** the dashboard loads, **Then** the total balance is the sum of all individual account balances.
3. **Given** it is the first day of the month with no transactions yet, **When** I view the dashboard, **Then** the monthly spending shows zero and the budget indicator reflects no spending.

---

### User Story 2 — Per-Account Balance Card (Priority: P2)

As a user, I want to see a dedicated card for each of my bank accounts showing its current
balance, the variation since last month, and the most recent transactions, so I can spot the
state of each account without leaving the dashboard.

**Why this priority**: Per-account visibility is essential once users have multiple accounts
(e.g., checking account and Livret A). It is the second most critical view after the global
summary.

**Independent Test**: Verify that each account detected in the transaction data has a card
displaying balance, monthly variation, and recent transactions. Delivers value independently.

**Acceptance Scenarios**:

1. **Given** I have two accounts with transactions, **When** I view the dashboard, **Then** I see one card per account, each showing: account name, current balance, monthly variation (amount and direction), and the 5 most recent transactions.
2. **Given** an account had a higher balance last month than this month, **When** viewing its card, **Then** the monthly variation is displayed as a negative amount with a downward visual indicator.
3. **Given** an account has no transactions in the current month, **When** viewing its card, **Then** the monthly variation shows zero and the recent transactions list shows the most recent available historical transactions.
4. **Given** an account balance is negative, **When** viewing its card, **Then** the negative value is clearly displayed with a distinct visual treatment (e.g., red colour).

---

### User Story 3 — Category Spending Comparison Chart (Priority: P3)

As a user, I want to see a chart comparing my spending by category this month versus last month,
so I can identify trends and notice unusual increases in any spending area.

**Why this priority**: The chart provides analytical depth beyond raw numbers. It is valuable only
once transactions are categorized, making it a third-priority enhancement.

**Independent Test**: Verify a chart appears with current month vs. previous month spending by
category. Delivers standalone analytical value even if only one month of data exists.

**Acceptance Scenarios**:

1. **Given** I have categorized transactions for both the current and previous calendar month, **When** I view the dashboard, **Then** I see a chart displaying spending per category for both months, side by side or grouped for easy comparison.
2. **Given** a category has spending only in the current month, **When** viewing the chart, **Then** that category is shown with its current-month value and zero for the previous month.
3. **Given** I have no categorized transactions at all, **When** viewing the chart section, **Then** an empty state message explains that no categorized transactions are available yet.
4. **Given** I have more than 10 spending categories, **When** viewing the chart, **Then** the top 9 categories by total spending are displayed individually and the remainder are grouped into an "Other" entry.

---

### User Story 4 — Responsive Layout (Priority: P4)

As a user opening the dashboard from my phone, I want the layout to adapt to my screen size so
all information is readable without horizontal scrolling.

**Why this priority**: Mobile usability is a baseline requirement for a personal finance app
that users consult frequently on the go.

**Independent Test**: Verify on a 375 px viewport that all cards, the global indicator, and the
chart stack in a single column with no horizontal overflow. Verify on ≥1024 px that a
multi-column grid appears.

**Acceptance Scenarios**:

1. **Given** I am viewing on a mobile screen (≤375 px wide), **When** I open the dashboard, **Then** all cards and the chart are stacked in a single column with no horizontal scroll.
2. **Given** I am viewing on a desktop screen (≥1024 px wide), **When** I open the dashboard, **Then** the global indicator and account cards are arranged in a multi-column grid layout.
3. **Given** I resize the window from desktop to mobile width, **When** the breakpoint is crossed, **Then** the layout transitions to single-column without any content being cut off.

---

### User Story 5 — Skeleton Loading States (Priority: P5)

As a user, I want to see skeleton placeholders while the dashboard data is loading, so the page
feels immediately responsive and I am not left staring at a blank screen.

**Why this priority**: Perceived performance directly affects user satisfaction. Skeleton loading
prevents layout shift and communicates that content is on its way.

**Independent Test**: Verify on a throttled network that skeleton placeholders appear within
200 ms of page open and are replaced by real content without layout shift.

**Acceptance Scenarios**:

1. **Given** dashboard data is being fetched, **When** I open the dashboard, **Then** skeleton placeholders are shown immediately in the shapes of the global indicator, account cards, and chart.
2. **Given** data has finished loading, **When** the dashboard renders, **Then** skeletons are replaced by actual content without any visible layout shift.
3. **Given** data fetching fails, **When** rendering completes, **Then** an error state is shown with a human-readable message and a retry action; no raw error codes or stack traces are exposed.

---

### Edge Cases

- What happens when the user has no transactions at all? → All balances show zero, account cards show "No transactions yet", chart shows empty state.
- What happens when the user has only one account? → A single account card is shown; the global balance equals that account's balance.
- What happens when account balances are negative? → Negative balances are displayed with a distinct visual indicator (red colour or explicit minus sign).
- What happens when the spending chart has more than 10 categories? → Top 9 categories shown individually; the rest grouped as "Other" sorted by total spending descending.
- What happens if data fetching fails? → Error state with retry action; no raw error details exposed to the user.
- What happens when the current month has no transactions? → Monthly spending shows zero, variation shows zero, recent transactions list shows historical entries.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST display a global financial indicator block containing: total balance across all accounts, total spending for the current calendar month, and a budget indicator.
- **FR-002**: The budget indicator MUST display the net cash flow for the current calendar month, calculated as total income transactions minus total expense transactions. This value is derived entirely from existing transaction data; no new user input or budget-setting feature is required.
- **FR-003**: The system MUST display one card per bank account, each showing: account name, current balance, monthly variation (amount and direction), and the 5 most recent transactions for that account sorted by date descending.
- **FR-004**: Negative account balances MUST be displayed with a visually distinct treatment (e.g., red colour).
- **FR-005**: The system MUST display a spending comparison chart showing total expenses grouped by category for the current calendar month versus the previous calendar month.
- **FR-006**: When the chart has more than 10 spending categories, the top 9 by total spending MUST be shown individually and all remaining categories MUST be grouped into a single "Other" entry.
- **FR-007**: The dashboard layout MUST be responsive: single-column on screens ≤375 px wide, multi-column grid on screens ≥1024 px wide.
- **FR-008**: The system MUST display skeleton loading placeholders while dashboard data is being fetched.
- **FR-009**: The system MUST display an error state with a human-readable message and a retry action when dashboard data fails to load; no raw error codes or stack traces may be shown.
- **FR-010**: All monetary amounts MUST be displayed using the user's preferred locale and currency format (symbol, decimal precision, thousands separator).
- **FR-011**: Every user-facing text string MUST be internationalised; no hardcoded copy is permitted in the interface.
- **FR-012**: The dashboard MUST meet WCAG 2.1 AA accessibility standards.

### Key Entities

- **Account**: A bank account identified from imported transaction data, with a name derived from the account field and a computed current balance.
- **Monthly Summary**: Aggregated financial data for a given calendar month — total spending, total income, balance variation per account.
- **Category Spending**: Total expenses grouped by category for a given calendar month, used to populate the comparison chart.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The dashboard is fully loaded and interactive in under 1.5 seconds at the 95th percentile under normal usage conditions.
- **SC-002**: Skeleton loading placeholders appear within 200 milliseconds of the dashboard being opened, eliminating any blank-screen period.
- **SC-003**: Users can identify their total financial balance and current month's spending within 5 seconds of opening the dashboard, without any additional navigation.
- **SC-004**: On a 375 px wide mobile screen, all dashboard content is fully accessible with no horizontal scrolling required.
- **SC-005**: The spending chart accurately reflects the categorized transactions for the current and previous months with zero discrepancy from the underlying transaction data.
- **SC-006**: 100% of monetary values displayed use the user's locale-specific currency format (correct symbol, decimal separator, and thousands separator).
- **SC-007**: The dashboard passes WCAG 2.1 AA automated accessibility checks with zero violations.

## Assumptions

- Accounts are inferred from imported transaction data; there is no separate account creation flow in this phase.
- "Current month" and "previous month" refer to calendar months, not rolling 30-day windows.
- Recent transactions on account cards show a maximum of 5 entries, sorted by date descending.
- The spending chart shows up to 10 categories individually; categories beyond 9 are grouped as "Other" sorted by total spending descending.
- If Phase 5 (cagnottes) is not yet implemented, account cards do not contain nested pocket sub-cards; pocket integration is deferred to Phase 5.
- The dashboard is read-only; no data editing or entry occurs on this page.
