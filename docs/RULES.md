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
- **Rule 5 — Accounting Equation Integrity (Accrual & Cash Basis, Any Date Range):**
  - At all times, across both **Accrual Basis** and **Cash Basis** and for any `[startDate, endDate]` filter (`computeReportsForFilter`), the Trial Balance must satisfy `Total Debits === Total Credits` and the Balance Sheet must satisfy `Total Assets === Total Liabilities + Equity (including Prior Retained Earnings + Current Period Net Income)`.
- **Rule 6 — Sales Tax & Bank Feed Matching Precision:**
  - Sales tax on invoices must be computed in integer cents (`Math.round((taxableSubtotalCents * taxRatePercent) / 100)`) and credited to `2200 Sales Tax Payable`.
  - Matching a bank feed deposit to an open Invoice (`sourceType: "invoice_payment"`) or a bank outflow to an open Vendor Bill (`sourceType: "bill_payment"`) must clear `1100 Accounts Receivable` or `2000 Accounts Payable` without double-counting revenue or expenses.
- **Rule 7 — Sub-Ledger, Bank Feed & Reconciliation Exactness:**
  - **Sub-Ledger vs. General Ledger:** Open Invoices (`arAging.totalCents` / `openInvoicesCents`) must always equal `1100 Accounts Receivable` GL balance, and Open Vendor Bills (`apAging.totalCents` / `openBillsCents`) must always equal `2000 Accounts Payable` GL balance, including after `reverseJournalEntry()` operations.
  - **Bank Balance vs. QuickBooks Balance:** `bankBalanceCents` is dynamically computed from `balanceCents` plus pending `"for_review"` bank feed items (`+pending` for debit-normal Bank accounts, `-pending` for credit-normal Credit Card accounts) so `bankBalanceCents === balanceCents` whenever `forReviewCount === 0`.
  - **Reconciliation Zero-Difference Guard:** `finishReconciliation()` enforces `clearedBalanceCents === endingBalanceCents` (`Difference === $0.00`) for both debit-normal Bank accounts and credit-normal Credit Card accounts.
- **Rule 8 — Period Comparison & Multi-Entity Search Integrity:**
  - Reports Period Comparison (`computeComparisonRange`) must support both month-aligned boundary shifting and arbitrary day-range shifting with whole-month awareness.
  - Comparative report variances (`diffCents = current - prior`) must use exact integer subtraction. Percentage changes must handle division-by-zero safely (`"—"` when prior period is $0.00).
  - Filtering reports by `entityName` filters journal transactions at the entry level, guaranteeing that `Debits === Credits` is preserved in every filtered view.
  - Global Search (`searchQboState`) must parse exact currency formats (`$1,250.00`, `425`, `90.50`) into integer cents and match across all 9 entity types with multi-term `AND` semantics and alias awareness.
- **Rule 9 — Production Data Reset & Chart of Accounts Preservation:**
  - Wiping company transactions (`wipeAllCompanyTransactions`) must clear all transactional data (journal entries, lines, bank feeds, invoices, bills, expenses, estimates, reconciliations, customers, and vendors) while strictly preserving all 31 standard Chart of Accounts.
  - Every account's `balanceCents` and `bankBalanceCents` must be reset to exactly `0`, leaving `Total Assets ($0.00) === Total Liabilities + Equity ($0.00)`.
- **Rule 10 — Production Authentication & Employee Invitation Delivery:**
  - The primary administrator email is `enterandpost02@gmail.com` with password `Standard@1122`, stored in PostgreSQL with salted scrypt hashing.
  - All employee and accountant invitation emails must be dispatched from `enterandpost02@gmail.com` (`DEFAULT_SENDER_EMAIL`) with role permissions and direct sign-in links.
  - If live SMTP credentials (`GMAIL_APP_PASSWORD` or `SMTP_PASS`) are set, delivery executes via Gmail SMTP; otherwise, delivery falls back gracefully to a logged simulated delivery with invitation links preserved so no action fails.

## 2. Security & Multi-Tenancy Rules
- **Organization Isolation (`organization_id`):**
  - Every database table and query in PostgreSQL/Drizzle must filter by `organization_id` so one business can never see or mutate another business's books.
- **Role-Based Access Control (RBAC):**
  - `owner`: Full read/write access, team management, period lock control, and sample data wiping (`assertIsOwner()` strictly guards administrative operations).
  - `staff`: Standard bookkeeping read/write access; cannot wipe transactions, close books, or invite other owners.
  - `accountant`: Strictly **Read-Only** (`assertCanWrite()` blocks all write mutations while allowing full inspection of reports, general ledger, and audit logs; privilege escalation blocked with HTTP 403).
- **Session Lifecycle & Route Protection:**
  - Pages `/` and `/dashboard` require an active session token (`qb_session`); unauthenticated users are redirected to `/login`.
  - Logging out immediately deletes the database session token in PostgreSQL and clears the `qb_session` cookie via `/api/auth/logout`.

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
