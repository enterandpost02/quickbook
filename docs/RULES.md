# Core Accounting, Engineering & Workflow Rules

> **Maintenance Rule:** Read this file at the start of every session and update all 4 `/docs` files (`COMPLETED.md`, `RULES.md`, `REMAINING.md`, `ARCHITECTURE.md`) after every task.

## 1. Non-Negotiable Accounting Rules
- **Rule 1 — Integer Cents Only:**
  - All monetary values in memory, API payloads, and database columns **MUST** be stored and computed as signed/unsigned **integer cents** (`$125.50` = `12550`).
  - Never use floating-point math (`0.1 + 0.2`) for ledger balances, invoice totals, or report aggregations.
  - Convert to formatted dollar strings (`formatCents()`) only at the UI presentation layer.
- **Rule 2 — Every Entry Must Balance (`Debits === Credits`):**
  - Every financial event (Manual Journal Entry, Bank Feed Categorization, Invoice, Payment, Expense, Bill, Bill Payment, or Transfer) must post a balanced Journal Entry where `SUM(debitCents) === SUM(creditCents) > 0`.
  - Each journal line must have either a positive `debitCents` OR a positive `creditCents` (never both, never negative).
- **Rule 3 — Immutable Posted Ledger Entries:**
  - Posted journal entries are **never edited or deleted in place**.
  - Any correction or voiding operation **MUST** create a reversing journal entry (`reverseJournalEntry()`) that swaps debits and credits and links `reversesEntryId` / `reversedByEntryId`.
- **Rule 4 — Closed Period Lock (`lockedThroughDate`):**
  - When books are closed through a date (`lockedThroughDate`), no journal entry or reversal may be posted on or before that date unless an Owner explicitly unlocks the period.
- **Rule 5 — Accounting Equation Integrity:**
  - At all times, the Trial Balance must satisfy `Total Debits === Total Credits` and the Balance Sheet must satisfy `Total Assets === Total Liabilities + Equity (including Net Income)`.

## 2. Security & Multi-Tenancy Rules
- **Organization Isolation (`organization_id`):**
  - Every database table and query in PostgreSQL/Drizzle must filter by `organization_id` so one business can never see or mutate another business's books.
- **Role-Based Access Control (RBAC):**
  - `owner`: Full read/write access, team management, and period lock control.
  - `staff`: Standard bookkeeping read/write access.
  - `accountant`: Strictly **Read-Only** (`assertCanWrite()` blocks all write mutations while allowing full inspection of reports, general ledger, and audit logs).

## 3. AI & Developer Workflow Rules
- **Living Documentation (Mandatory):**
  - Every time a feature or change is made, update:
    1. `docs/COMPLETED.md` (short bullet points of what was done)
    2. `docs/REMAINING.md` (what remains to be built)
    3. `docs/ARCHITECTURE.md` (if data flow, files, or schemas changed)
    4. `docs/RULES.md` (if new invariants or project rules are introduced)
- **Small, Verified Steps:**
  - Build and verify one module or screen at a time.
  - Run `npm test` after every accounting engine change to verify all double-entry invariants.
- **Migrations Only for Database Changes:**
  - Never alter PostgreSQL schemas without generating and reviewing a SQL migration file in `drizzle/`.
- **Commit Often:**
  - Make clean, atomic git commits after each working step so changes can be inspected or rolled back safely.
