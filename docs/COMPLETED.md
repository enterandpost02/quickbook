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

## Phase 13 — Administrator Credentials (`enterandpost02@gmail.com`), Employee Mailer & RBAC Automation
- **Designated Primary Administrator Credentials:**
  - Configured actual production admin account `enterandpost02@gmail.com` with password `Standard@1122` in [`src/lib/auth.ts`](../src/lib/auth.ts) and [`src/app/(auth)/actions.ts`](../src/app/(auth)/actions.ts).
  - Implemented `ensureAdminUserInDb()` to automatically seed or update the user in PostgreSQL with salted scrypt password hashing and link them as `owner` to the primary organization.
  - Enhanced [`src/app/(auth)/login/page.tsx`](../src/app/(auth)/login/page.tsx) with prefilled credentials and a 1-click "Auto-fill" admin credentials banner for effortless sign-in.
  - Executed [`scripts/seed-admin.ts`](../scripts/seed-admin.ts) and verified live database user creation in Supabase PostgreSQL.
- **Automated Employee Invitation Email Dispatcher (`src/lib/mailer.ts`):**
  - Built transactional email module [`src/lib/mailer.ts`](../src/lib/mailer.ts) sending official invitations directly from `enterandpost02@gmail.com` (`"QuickBooks Online <enterandpost02@gmail.com>"`).
  - Designed responsive HTML email template featuring Intuit QuickBooks branding, role descriptions (`Company Owner`, `Staff Bookkeeper`, `Accountant Read-Only`), and one-click direct sign-in links.
  - Added support for live Gmail SMTP via `GMAIL_APP_PASSWORD` or `SMTP_PASS` with graceful fallback to logged simulated delivery if credentials are not yet configured.
- **Team Management & Employee UI in AuditLogView:**
  - Updated `AuditLogView` in [`src/components/qbo/qbo-views.tsx`](../src/components/qbo/qbo-views.tsx) with a prominent banner highlighting automated email dispatch from `enterandpost02@gmail.com`.
  - Added `Send Invite Email` form action and individual `Resend Email` buttons on team member rows.
  - Handled `invite_team_member` and `resend_invite_email` actions in [`src/app/api/qbo/route.ts`](../src/app/api/qbo/route.ts).
- **Automated Test Suite Expansion (20/20 Passing Tests):**
  - Added **Test 20** in [`src/lib/__tests__/qbo-engine.test.ts`](../src/lib/__tests__/qbo-engine.test.ts) verifying admin credentials matching, seeded owner presence, team member invite creation, email payload generation from `enterandpost02@gmail.com`, and read-only RBAC mutation blocking.
- **Verified Production Build:**
  - `npm run build` compiled all 8 static and dynamic routes (`/`, `/_not-found`, `/api/qbo`, `/dashboard`, `/login`, `/signup`) with 0 errors.

## Phase 14 — Dedicated Logout Flow, Route Protection & Robust RBAC Authorization
- **Accessible Logout Controls:**
  - Built dedicated **"Sign Out / Log Out"** buttons in both the top-right user profile dropdown and the bottom of the left dark navigation sidebar in [`src/components/qbo/qbo-workspace.tsx`](../src/components/qbo/qbo-workspace.tsx).
  - Created [`src/app/api/auth/logout/route.ts`](../src/app/api/auth/logout/route.ts) supporting both `POST` and `GET` requests to delete the database session record from PostgreSQL, delete the `qb_session` cookie, and redirect to `/login`.
- **Route Protection & Authentication Guards:**
  - Protected [`src/app/page.tsx`](../src/app/page.tsx): Unauthenticated users are redirected to `/login`, while authenticated users are redirected to `/dashboard`.
  - Protected [`src/app/(dashboard)/dashboard/page.tsx`](../src/app/(dashboard)/dashboard/page.tsx): Uses `getCurrentAuth()` to verify session validity, pass the authenticated user into `QboWorkspace`, and automatically synchronize the company ledger's `activeRole` with the user's authorized role.
- **Backend & API Authorization (RBAC Enforcement):**
  - Added `assertIsOwner()` in [`src/lib/qbo-store.ts`](../src/lib/qbo-store.ts) to strictly guard administrative operations: `wipeAllCompanyTransactions()` and `setPeriodLockDate()` cannot be executed by staff or accountants.
  - Added authorization guards in [`src/app/api/qbo/route.ts`](../src/app/api/qbo/route.ts) returning HTTP 403 Forbidden if an accountant attempts non-read operations or if staff attempts owner-only actions.
- **Verified Production Build & Tests:**
  - 20/20 automated tests passing (`npm test`).
  - Next.js 16 production build succeeded across all 9 routes (`/`, `/_not-found`, `/api/auth/logout`, `/api/qbo`, `/dashboard`, `/login`, `/signup`).

## Phase 15 — Role Switch Bug Fix & Dynamic Team Member Visibility
- **Fixed Role Switching Error:**
  - Updated [`src/app/api/qbo/route.ts`](../src/app/api/qbo/route.ts) to handle both `switch_role` and `set_active_role` actions, resolving the 400 "Unknown action" error when switching active user role.
- **Dynamic Team Member Visibility (No Ghost Users):**
  - Updated [`src/components/qbo/qbo-workspace.tsx`](../src/components/qbo/qbo-workspace.tsx) and [`src/components/qbo/qbo-views.tsx`](../src/components/qbo/qbo-views.tsx): Roles with no invited user are completely omitted from the user menu and role switchers.
  - If a company only has 1 user (the Owner), it shows that 1 user cleanly without displaying non-existent Staff or Accountant options.
  - When real employees are invited in Team Settings, they appear with their actual name, email, and assigned role.
- **Owner Sanitization & Clean Books Reset:**
  - Executed [`scripts/sanitize-db-team.ts`](../scripts/sanitize-db-team.ts) and added runtime sanitization in [`src/lib/qbo-db.ts`](../src/lib/qbo-db.ts) to replace old demo owner names with `Enter & Post Admin` (`enterandpost02@gmail.com`).
  - Updated `wipeAllCompanyTransactions()` in [`src/lib/qbo-store.ts`](../src/lib/qbo-store.ts) to reset team members strictly to the active Owner (`Enter & Post Admin`), removing demo team members when wiping books for live use.

## Phase 16 — Rebranding to 'Pro E Books' & Mobile Responsiveness
- **Complete Rebranding to 'Pro E Books':**
  - Updated application title, metadata, and logo headers to **Pro E Books** (`Pro E Books — Cloud Accounting & Financial Management`) across [`src/app/layout.tsx`](../src/app/layout.tsx) and [`src/app/(auth)/layout.tsx`](../src/app/(auth)/layout.tsx).
  - Updated authentication pages ([`src/app/(auth)/login/page.tsx`](../src/app/(auth)/login/page.tsx)) to "Pro E Books Admin Credentials", "Sign In to Pro E Books", and "New to Pro E Books?".
  - Updated workspace brand logo ([`src/components/qbo/qbo-workspace.tsx`](../src/components/qbo/qbo-workspace.tsx)) to `Pro E Books` with emerald branding and `Cloud Accounting` subtitle.
  - Updated balance labels across all account tables, banking widgets, register headers, and reconcile displays to "In Pro E Books" and "Pro E Books Balance".
  - Updated modal titles and CSV import dialogs ([`src/components/qbo/qbo-modals.tsx`](../src/components/qbo/qbo-modals.tsx)) to "Pro E Books - Create New" and "Upload Bank Statement CSV into Pro E Books".
  - Updated email notification templates ([`src/lib/mailer.ts`](../src/lib/mailer.ts)) with sender name "Pro E Books", subjects ("You've been invited to join ... on Pro E Books"), and HTML email headers.
- **Mobile & Small-Screen Responsiveness:**
  - Replaced fixed-width left rail with responsive desktop sidebar (`hidden lg:flex w-60`) and mobile slide-out drawer (`fixed inset-0 z-50 lg:hidden`) with backdrop blur and close (`X`) button.
  - Added mobile hamburger menu button (`lg:hidden`) to the top application header.
  - Added mobile Quick Create (`+`) button directly in the header for small screens so mobile users can immediately access creation forms.
  - Added expandable mobile search bar toggled by a search icon button on screens `< 640px`.
  - Added horizontal scroll containment (`overflow-x-auto w-full min-w-[500px..700px]`) across all 15+ data tables (Invoices, Estimates, Customers, Products, Expenses, Bills, Vendors, Chart of Accounts, Journal Entries, Trial Balance, Aging Summaries, General Ledger, Reconciliations, Audit Logs, and Teams).
  - Made summary metric cards stack flexibly (`grid grid-cols-1 sm:grid-cols-3` and `sm:grid-cols-2 lg:grid-cols-4`).
  - Adjusted main viewport padding (`p-3 sm:p-5 lg:p-6 min-w-0 overflow-x-hidden`) to eliminate horizontal screen overflow and blowout on mobile devices (320px–420px viewports).
- **Verified Production Build & Tests:**
  - 20/20 automated unit tests passing (`npm test`).
  - Next.js 16 production build succeeded across all 9 routes with 0 errors (`npm run build`).

## Phase 17 — Single-File Complete Company Backup (.CSV) Export
- **Comprehensive Single-File CSV Backup:**
  - Implemented `exportFullCompanyCsv()` in [`src/components/qbo/qbo-views.tsx`](../src/components/qbo/qbo-views.tsx) that compiles every single company record into one structured, RFC 4180-compliant `.CSV` spreadsheet file.
  - Sections included with dedicated headers and formatted currency:
    1. **Metadata Banner:** Company Name, Export Timestamp, Base Currency, Locked Through Date, Record Counts.
    2. **Chart of Accounts:** Account ID, Code, Name, Classification, Detail Type, Balance USD, Bank Balance USD.
    3. **Customers Directory:** Customer ID, Display Name, First/Last Name, Company, Email, Phone, Tax ID, Address, Open Balance USD.
    4. **Vendors Directory:** Vendor ID, Display Name, Tax ID / EIN, Default Expense Category, Contact info, Mailing Address, Open Bill Balance USD.
    5. **Products & Services:** SKU, Item Name, Type, Description, Income Account ID/Name, Sales Price / Rate USD.
    6. **Invoices:** Invoice ID, Number, Customer ID/Name, Invoice Date, Due Date, Subtotal, Sales Tax, Total Amount, Balance Due, Status, and detailed Line Items breakdown.
    7. **Estimates & Quotes:** Estimate ID, Number, Customer ID/Name, Date, Expiration Date, Total Amount, Status, Converted Invoice ID.
    8. **Expenses & Vendor Bills:** Expense ID, Type, Ref #, Date, Due Date, Vendor ID/Name, Payment Account, Category Account, Description/Memo, Amount, Status.
    9. **General Journal Entries:** Double-entry journal records showing Entry ID, Entry #, Date, Source Type, Memo, Line ID, Account ID, Code, Name, Description, Entity, Debit USD, Credit USD, Reversal links.
    10. **Bank Feed Transactions:** Transaction ID, Bank Account ID, Date, Description, Amount, Direction (Money In / Money Out), Status, Payee, Suggested Account ID, Match links.
    11. **Bank Reconciliations:** Reconciliation ID, Bank Account Name, Statement Date, Cleared Count, Ending Balance, Reconciled Timestamp.
    12. **Team Members & RBAC:** Member ID, Name, Email, Role, Status.
    13. **Security Audit Trail Logs:** Log ID, Timestamp, User, Action, Event Details, Amount.
  - Added primary **"Export Full Company Backup (.CSV)"** download button in both the top toolbar and bottom action row of the **Audit, Teams & Security** view.
  - Maintained optional **.JSON** backup button for raw database restoration.
- **Verified Production Build & Tests:**
  - 20/20 automated tests passing (`npm test`).
  - Next.js 16.4.3 production build (`npm run build`) succeeded across all 9 routes.
  - Code remains local (NOT pushed to GitHub as requested).
