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
- Wrapped async Supabase data loading in [`src/app/(dashboard)/dashboard/page.tsx`](../src/app/(dashboard)/dashboard/page.tsx) with `<Suspense>` and `export const instant = false` to satisfy Next.js 16 `cacheComponents` streaming requirements.
- Optimized Supabase latency in [`src/lib/qbo-db.ts`](../src/lib/qbo-db.ts) and [`src/app/api/qbo/route.ts`](../src/app/api/qbo/route.ts) using an in-memory multi-company read-through cache (`ensureCacheInitialized`) and non-blocking write-behind persistence queue (`saveQboStoreFast` + `Promise.all` parallelized batch writes), eliminating 12+ sequential remote DB round-trips per click.

## Phase 10 — Cash vs. Accrual Basis, Date-Range Reports, Invoice Sales Tax, Bank Matching & Directory Modals
- **Report Date-Range Filters & Cash vs. Accrual Basis Engine (`computeReportsForFilter`):**
  - Added live **Accrual vs. Cash Basis** and **Date Range (`All Dates`, `October 2026`, `September 2026`, `Custom Range`)** filtering in [`src/lib/qbo-store.ts`](../src/lib/qbo-store.ts) and [`src/components/qbo/qbo-views.tsx`](../src/components/qbo/qbo-views.tsx).
  - Under **Cash Basis**, unpaid invoices (`A/R 1100`) and unpaid vendor bills (`A/P 2000`) are excluded until cash changes hands; `invoice_payment` and `bill_payment` entries map directly to their underlying Income/Sales Tax and Expense/COGS accounts with exact integer-cent allocation.
  - Under **Date-Range Filtering**, prior-period net income (`date < startDate`) automatically rolls into `3200 Retained Earnings (Prior to startDate)` so the Balance Sheet (`Total Assets === Total Liabilities + Total Equity`) and Trial Balance (`Debits === Credits`) remain 100% balanced for any date range.
- **Bank Feed Deposit & Payment Matching (`matchBankTransaction`):**
  - Added **Categorize vs. Match Invoice / Bill** toggle in the Banking Center (`"For review"` tab) with automatic **EXACT INVOICE / BILL MATCH** detection.
  - Matching a deposit to an open Invoice posts `Debit Bank / Credit A/R 1100` (`sourceType: "invoice_payment"`) and updates invoice `balanceDueCents` / `Paid` status without double-counting revenue.
  - Matching an outflow to an open Vendor Bill posts `Debit A/P 2000 / Credit Bank` (`sourceType: "bill_payment"`) and marks the bill `Paid` without double-counting expenses.
- **Automatic Sales Tax Calculation on Invoices (`createInvoice`):**
  - Added per-line `taxable` checkboxes, **Charge Sales Tax (`2200 Sales Tax Payable`)** toggle, and customizable `taxRatePercent` (default `8.25%`) in `CreateInvoiceModal` ([`src/components/qbo/qbo-modals.tsx`](../src/components/qbo/qbo-modals.tsx)).
  - Computes `taxCents = Math.round((taxableSubtotalCents * effectiveTaxRate) / 100)` in integer cents, credits `2200 Sales Tax Payable` for `taxCents`, credits `4000+ Income` for `subtotalCents`, and debits `1100 Accounts Receivable` for `subtotalCents + taxCents`.
- **Create New Customer & Create New Vendor Modals (`createCustomer`, `createVendor`):**
  - Added `CreateCustomerModal` and `CreateVendorModal` accessible from `+ New` Quick Create, the Sales & Invoices header (`+ New Customer`), and the Expenses & Vendors header (`+ New Vendor`).
- **Authenticated User Session & Role Switcher Menu:**
  - Added an interactive User Session & Company Profile dropdown on the top-right header avatar in [`src/components/qbo/qbo-workspace.tsx`](../src/components/qbo/qbo-workspace.tsx) showing active user details, role switcher (`Owner`, `Bookkeeper`, `Accountant`), and direct links to `/login` and `/signup`.
- **Expanded Automated Test Suite (16/16 Passing Tests):**
  - Added unit tests 11–16 in [`src/lib/__tests__/qbo-engine.test.ts`](../src/lib/__tests__/qbo-engine.test.ts) verifying integer-cent Sales Tax math, partial & full Bank Feed Invoice/Bill matching, Cash vs. Accrual basis & Date-Range report balance invariants, Customer/Vendor creation, Bank & Credit Card Reconciliation (`Difference === $0.00` enforcement), dynamic Bank Balance vs. QuickBooks GL Balance math, and Sub-Ledger (`arAging` / `apAging`) vs. General Ledger (`1100 A/R` / `2000 A/P`) equality before and after reversals.

## Phase 11 — Reports Center Comparison, Top Global Search & Enhanced Customer/Vendor Profiles
- **Reports Center Period Comparison & Multi-Dimensional Filtering:**
  - Added **Period Comparison Mode** (`None`, `Previous Period (PP)`, `Previous Year (PY)`, `Custom Comparison Range`) supporting month-aware and day-aligned shift calculations (`computeComparisonRange` in [`src/lib/qbo-store.ts`](../src/lib/qbo-store.ts)).
  - Renders 4 comparative columns on Profit & Loss and Balance Sheet: **Current Period ($)**, **Prior Period ($)**, **$ Change** (color-coded for income vs expense), and **% Change** (`+X.X%` / `—`).
  - Added Trial Balance comparison view showing Current Debit/Credit alongside Prior Debit/Credit.
  - Added filter options: Preset ranges (`All Dates`, `October 2026`, `September 2026`, `Q3 2026`, `Q4 2026`, `Year-to-Date 2026`), custom date pickers, Accrual vs Cash basis toggle, Entity/Payee filter (filtering by customer/vendor while preserving `Debits === Credits` journal equality), General Ledger Account filter, and **Hide zero-balance rows** toggle.
  - Enhanced **Export CSV** to automatically export comparative columns (`Current`, `Prior`, `Dollar Change`, `Percent Change`) when comparison mode is active.
- **Top Global QuickBooks Search Bar:**
  - Built universal search engine [`src/lib/qbo-search.ts`](../src/lib/qbo-search.ts) indexing all 9 entity types: Customers, Vendors, Invoices, Estimates, Expenses & Bills, Bank Transactions, Accounts (COA), Journal Entries, and Products & Services.
  - Supports multi-term `AND` semantics, prefix and word matching, invoice/estimate number aliases (`INV-1001`, `Invoice #1001`, `#1001`, `1001`), and exact integer-cent dollar amount matching (`$1,250.00`, `425`, `90.50`).
  - Built sticky top header search component in [`src/components/qbo/qbo-workspace.tsx`](../src/components/qbo/qbo-workspace.tsx) with keyboard shortcuts (`Ctrl+K`, `Cmd+K`, `/` to focus, `Escape` to close), categorized results dropdown with entity counts and formatted amount pills, and one-click navigation to the relevant tab.
- **Enhanced Customer & Vendor Profiles:**
  - Updated `QboCustomer` and `QboVendor` interfaces with optional `firstName`, `lastName`, `company`, `taxId` (EIN/SSN/1099), and structured `address` (`street`, `city`, `state`, `postalCode`, `country`).
  - Made `defaultExpenseAccountId` optional on `QboVendor` (allowing `"— Optional / Select per transaction —"`).
  - Updated `CreateCustomerModal` and `CreateVendorModal` in [`src/components/qbo/qbo-modals.tsx`](../src/components/qbo/qbo-modals.tsx) with comprehensive form inputs for first/last name, display name derivation, tax ID, email, phone, optional default category, and structured street/city/state/zip addresses.
  - Updated Customers and Vendors directory tables in [`src/components/qbo/qbo-views.tsx`](../src/components/qbo/qbo-views.tsx) to display Contact Name, Company, Tax ID badges, Default Category pills, formatted address, and contact info.
- **Expanded Automated Test Suite (18/18 Passing Tests):**
  - Added Tests 17 and 18 in [`src/lib/__tests__/qbo-engine.test.ts`](../src/lib/__tests__/qbo-engine.test.ts) verifying comparison date range shifting (whole month and arbitrary days), comparative reports variance math, double-entry invariants, customer/vendor profile fields, and global search query resolution across all record types.

## Phase 12 — Clean Production Data Controls, Redesigned New Company Modal & Vercel Readiness
- **Production Data Management & Clean Books Reset (`wipeAllCompanyTransactions`):**
  - Implemented `wipeAllCompanyTransactions()` in [`src/lib/qbo-store.ts`](../src/lib/qbo-store.ts) to instantly reset all journal entries, bank feed items, invoices, expenses, estimates, reconciliations, customers, and vendors while preserving the core 31 QuickBooks Chart of Accounts with clean `$0.00` balances.
  - Added one-click **"Wipe Sample Data ($0.00)"** action in the dark left sidebar with confirmation guard, allowing instant transformation of any demo company into clean production books.
  - Added a dedicated **"Production Data Management & Clean Books"** panel in the Audit Log & Security screen (`AuditLogView`) with live readiness badge, wipe controls, practice data reload, and full JSON backup export.
  - Wired `wipe_transactions` action through [`src/app/api/qbo/route.ts`](../src/app/api/qbo/route.ts) with immediate read-through cache synchronization and non-blocking PostgreSQL persistence.
- **Redesigned "+ Create New Company" Modal UI & Fields:**
  - Overhauled the modal in [`src/components/qbo/qbo-workspace.tsx`](../src/components/qbo/qbo-workspace.tsx): removed developer-centric jargon ("in Supabase"), added `Company Name *`, `Industry / Business Type` selector (9 real-world industries), `Tax ID / EIN` input, and an informative `Currency & Books: USD ($) · Fiscal Year: Jan – Dec` banner.
  - Set **"Fresh Company ($0.00 Balances)"** as the default recommended option for live accounting, with an option to select "Pre-loaded Practice Data" for onboarding.
  - Updated [`src/lib/qbo-db.ts`](../src/lib/qbo-db.ts) to persist `industry` and `taxId` directly into database organizations with automatic audit trail logging.
- **Automated Test Suite Expansion (19/19 Passing Tests):**
  - Added **Test 19** in [`src/lib/__tests__/qbo-engine.test.ts`](../src/lib/__tests__/qbo-engine.test.ts) verifying that `wipeAllCompanyTransactions()` wipes all transactional records, resets every account balance to `$0.00`, preserves double-entry equilibrium, and confirms `createFreshCompanyData()` generates an empty company with all 31 standard accounts.
- **Next.js 16 Production Build Verification for Vercel:**
  - Ran `npm run build` with Turbopack and verified successful static and dynamic page generation with zero prerendering or TypeScript errors.
