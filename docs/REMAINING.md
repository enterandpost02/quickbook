# Remaining Features & Next Roadmap Items

> **Maintenance Rule:** Update this document every time a feature is completed or new scope is identified.

## 1. Current Status
- **Static / In-Memory Mode & CSV Workflow:** **100% Complete** across all 9 phases (`Phase 0` – `Phase 9`) with a full QuickBooks Online UI clone, manual entry modals, multi-bank CSV import/export, financial reports, reconciliation, RBAC roles, and 10/10 passing automated tests.

## 2. Remaining Features for Production / Live Cloud Deployment

### A. Live PostgreSQL (Neon / Supabase) Persistence Layer
- [x] Extend `src/db/schema.ts` and `drizzle/` migrations to persist ledger tables (`accounts`, `journal_entries`, `journal_lines`, `bank_transactions`, `organization_ledger_state`) in PostgreSQL.
- [x] Add automatic storage adapter (`src/lib/qbo-db.ts`) that uses cloud PostgreSQL when `DATABASE_URL` is configured in `.env.local` or embedded PGlite PostgreSQL in `.local-db` automatically.
- [x] Connect live **Supabase PostgreSQL** `DATABASE_URL` in `.env.local` and run `npm run db:migrate` to create and seed all tables in the cloud database.
- [x] **Production Data Reset & Clean Books Tooling:** One-click sample data wiper in sidebar and security views allowing instant clearing of static transactions for live production books.
- [x] **New Company Modal UI & Business Metadata:** Industry selector, Tax ID / EIN, and default $0.00 Fresh Company option.
- [x] **Next.js 16 Production Build Verification for Vercel:** Zero build or prerender errors on Turbopack build.

### B. Advanced Reporting & Accounting Enhancements
- [x] **Date-Range & Cash vs. Accrual Basis Filtering:** Filter Profit & Loss, Balance Sheet, Trial Balance, A/R & A/P Aging, and General Ledger reports by custom start/end dates and toggle between Accrual Basis and Cash Basis with exact integer-cent balance invariants.
- [x] **Period Comparison Mode (Previous Period & Previous Year):** Compare Profit & Loss, Balance Sheet, and Trial Balance side-by-side with prior period/year columns, exact dollar changes, and percent variance.
- [x] **Reports Center Filter Toolbar:** Date presets, custom date pickers, Basis selector, Entity/Payee filter, GL Account filter, and Zero-balance row toggle.
- [x] **Top Global Search Bar (`Ctrl+K` / `/`):** Fast multi-entity search across transactions, customers, vendors, invoices, bills, chart of accounts, and dollar amounts.
- [x] **Customer & Vendor Profile Enhancements:** First & Last name, Company, Tax ID (SSN/EIN/1099), structured Address, and optional default expense category.
- [x] **Sales Tax Calculation on Invoices:** Automatically calculate and post a separate `Sales Tax Payable (2200)` credit line on taxable invoice line items using `salesTaxRatePercent`.
- [x] **Bank Feed Deposit & Outflow Matching to Open Invoices & Bills:** Match imported bank CSV rows directly against open Customer Invoices (`A/R 1100`) or open Vendor Bills (`A/P 2000`) in one click without double-counting revenue or expenses.
- [x] **Create New Customer & New Vendor UI Modals:** Create new Customer and Vendor profiles directly from `+ New` Quick Create and the Sales/Expenses tabs.
- [x] **User Profile & Session Header Menu:** Top-right user session menu linking active company role switching with `/login` and `/signup`.
- [x] **Primary Administrator Account & Auto-Seeding:** Configured production user `enterandpost02@gmail.com` with password `Standard@1122` and auto-seeding.
- [x] **Automated Employee Invitation Mailer:** Branded invitation emails dispatched from `enterandpost02@gmail.com` via Nodemailer / Gmail SMTP.
- [ ] **Receipt File Upload & Attachment Preview:** Attach PDF/image receipts to Expenses and Vendor Bills.
- [ ] **Recurring Invoices & Scheduled Reminders:** Configure recurring monthly/weekly invoice templates.

### C. External Third-Party Integrations (When Ready for Live APIs)
- [ ] **Live Bank Feeds via Plaid Link:** Connect live bank accounts via Plaid OAuth and webhook sync in addition to CSV uploads.
- [ ] **Live LLM Categorization Endpoint:** Optional Gemini / OpenAI API integration to augment the deterministic AI Auto-Categorizer for novel merchant descriptions.
- [ ] **Stripe Payment Links & Email Delivery:** Generate live Stripe Checkout links on invoices and send transactional invoice emails via Resend/SendGrid.
- [ ] **Production Observability & Rate Limiting:** Add Sentry error tracking and API rate limiting for public SaaS launch.
