# Completed Features & Work Log

> **Maintenance Rule:** Update this document with short bullet points every time a feature, fix, or phase is completed.

## Phase 0 — Project Setup & Foundation
- Configured **Next.js 16.4.3 (App Router + Turbopack)** with **TypeScript**, **Tailwind CSS v4**, and **shadcn/ui** primitives (`src/components/ui/*`).
- Designed multi-tenant **Drizzle ORM PostgreSQL schema** (`src/db/schema.ts`) and initial SQL migration (`drizzle/0000_phase_0_init_auth_and_orgs.sql`) with `organization_id` isolation.
- Built session authentication flow (`/login`, `/signup`, `/api/auth/*`) and integer-cents currency utilities (`src/lib/money.ts`).

## Phase 1 — Double-Entry Ledger Core
- Seeded **31 QuickBooks Online Chart of Accounts** across Banking, A/R, Current/Fixed Assets, A/P, Credit Cards, Equity, Income, COGS, and Operating Expenses (`src/lib/qbo-store.ts`).
- Implemented `postJournalEntry()` with strict integer-cents validation and `SUM(debits) === SUM(credits)` enforcement.
- Implemented immutable ledger entries and `reverseJournalEntry()` to swap debits/credits for corrections instead of editing posted entries.

## Phase 2 — Bank CSV Import & Auto-Categorization
- Built multi-format bank CSV parser (`src/lib/csv-parser.ts`) supporting single `Amount` columns, split `Money Out` / `Money In` columns, parentheses negatives `($125.00)`, quoted currency, and date normalization (`MM/DD/YYYY`, `YYYY-MM-DD`).
- Added 4 realistic bank CSV presets (`src/lib/sample-bank-csvs.ts`): **Chase Checking**, **Bank of America**, **American Express**, and **Wells Fargo**.
- Added SHA-like fingerprint duplicate detection (`bankAccountId + date + description + amountCents`).
- Built `"For review"`, `"Categorized"`, `"Excluded"`, and `"Auto-Categorization Rules"` tabs in the Banking Center UI.

## Phase 3 — Financial Reports Center
- Built real-time **Profit & Loss (Income Statement)** report (`Income - COGS = Gross Profit - Expenses = Net Income`).
- Built real-time **Balance Sheet** report dynamically rolling up Net Income into Equity so `Total Assets === Total Liabilities + Equity` always balances.
- Built **Trial Balance**, **Accounts Receivable (A/R) Aging Summary**, **Accounts Payable (A/P) Aging Summary**, and **General Ledger** reports.
- Added **CSV Export** and **Print / Save PDF** actions to the Reports Center.

## Phase 4 — Bank Reconciliation & Period Lock
- Built interactive **Reconcile** screen (`src/components/qbo/qbo-views.tsx`) where users enter a statement ending balance, tick cleared transactions until `Difference === $0.00`, and save reconciliation history.
- Built **Close the Books (`lockedThroughDate`)** period locking that blocks any journal entry or transaction dated on or before the lock date.

## Phase 5 — Customers, Estimates, Products & Invoicing
- Built **Customers Directory** and **Products & Services Catalog** (`Service`, `Non-Inventory`, `Inventory` items).
- Built **Create Invoice** modal (`Debit A/R 1100`, `Credit Income 4000+`) and one-click **Receive Payment** (`Debit Bank / Undeposited Funds`, `Credit A/R 1100`).
- Built **Create Estimate / Quote** modal and one-click **Convert Estimate to Invoice** workflow.

## Phase 6 — Vendors, Expenses, Bills & Transfers
- Built **Vendors Directory** with open payable balances.
- Built **Record Expense / Vendor Bill** modal supporting immediate cash/card expenses and `Accounts Payable (2000)` vendor bills.
- Added one-click **Pay Bill** (`Debit A/P 2000`, `Credit Bank 1000`) and **Bank-to-Bank Funds Transfer** modal.

## Phase 7 — Teams, Roles & Audit Trail
- Built chronological **Audit Log** recording every user action, timestamp, and dollar amount.
- Built **Team Members & Role-Based Access Control (RBAC)** supporting `Owner`, `Staff`, and `Accountant (Read-Only)` roles (`assertCanWrite()` blocks all mutations when in `Accountant` role).

## Phase 8 & 9 — AI Categorizer, Security Scorecard & Full Backup
- Built **AI Auto-Categorizer** (`runAiAutoCategorizer`) that populates suggested accounts, confidence scores (`AI 97%`), and human-readable reasoning on `"For review"` bank transactions.
- Built 6-point **Security & Accounting Integrity Audit Scorecard** and one-click **Full Company Backup (`.JSON`)** export.
- Added **10 automated unit & integration tests** (`src/lib/__tests__/qbo-engine.test.ts` via `npm test`) verifying balanced math, reversals, period locks, multi-bank CSV parsing, RBAC, and AI categorization.

## Database Integration — PostgreSQL + Drizzle ORM Persistence
- Extended [`src/db/schema.ts`](../src/db/schema.ts) with multi-tenant PostgreSQL ledger tables (`accounts`, `journal_entries`, `journal_lines`, `bank_transactions`, `organization_ledger_state`) scoped by `organization_id`.
- Generated SQL migration [`drizzle/0001_serious_misty_knight.sql`](../drizzle/0001_serious_misty_knight.sql).
- Created [`src/lib/qbo-db.ts`](../src/lib/qbo-db.ts) and wired `/dashboard` and `/api/qbo` to automatically load from and persist to PostgreSQL.
- Connected live **Supabase PostgreSQL (`ap-southeast-2` pooler)** via `.env.local`, applied all Drizzle migrations via `npm run db:migrate`, and seeded organization `5d1a3c33-c74c-419d-9001-af6d3ac54710` (**Craig's Design and Landscaping Services**, 31 accounts, 9 journal entries, 24 journal lines, 7 bank transactions).
- Built full **Multi-Company Switcher & "+ New Company" Creation Workflow** in [`src/components/qbo/qbo-workspace.tsx`](../src/components/qbo/qbo-workspace.tsx) and [`src/lib/qbo-db.ts`](../src/lib/qbo-db.ts) allowing unlimited isolated companies in Supabase (either **Fresh $0.00 Books** with 31 default accounts or **Pre-loaded Sample Data**) with tenant-prefixed relational primary keys (`${organizationId}:${id}`).
