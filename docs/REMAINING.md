# Remaining Features & Next Roadmap Items

> **Maintenance Rule:** Update this document every time a feature is completed or new scope is identified.

## 1. Current Status
- **Static / In-Memory Mode & CSV Workflow:** **100% Complete** across all 9 phases (`Phase 0` – `Phase 9`) with a full QuickBooks Online UI clone, manual entry modals, multi-bank CSV import/export, financial reports, reconciliation, RBAC roles, and 10/10 passing automated tests.

## 2. Remaining Features for Production / Live Cloud Deployment

### A. Live PostgreSQL (Neon / Supabase) Persistence Layer
- [x] Extend `src/db/schema.ts` and `drizzle/` migrations to persist ledger tables (`accounts`, `journal_entries`, `journal_lines`, `bank_transactions`, `organization_ledger_state`) in PostgreSQL.
- [x] Add automatic storage adapter (`src/lib/qbo-db.ts`) that uses cloud PostgreSQL when `DATABASE_URL` is configured in `.env.local` or embedded PGlite PostgreSQL in `.local-db` automatically.
- [x] Connect live **Supabase PostgreSQL** `DATABASE_URL` in `.env.local` and run `npm run db:migrate` to create and seed all tables in the cloud database.

### B. Advanced Reporting & Accounting Enhancements
- [ ] **Date-Range & Cash vs. Accrual Basis Filtering:** Filter Profit & Loss, Balance Sheet, and General Ledger reports by custom start/end dates and toggle between Accrual Basis and Cash Basis.
- [ ] **Sales Tax Calculation on Invoices:** Automatically calculate and post a separate `Sales Tax Payable (2200)` credit line on taxable invoice line items using `salesTaxRatePercent`.
- [ ] **Bank Feed Deposit Matching to Open Invoices:** Allow matching an imported positive bank CSV row directly against an open Invoice (`A/R 1100`) or `Undeposited Funds (1050)` in one click.
- [ ] **Receipt File Upload & Attachment Preview:** Attach PDF/image receipts to Expenses and Vendor Bills.
- [ ] **Recurring Invoices & Scheduled Reminders:** Configure recurring monthly/weekly invoice templates.

### C. External Third-Party Integrations (When Ready for Live APIs)
- [ ] **Live Bank Feeds via Plaid Link:** Connect live bank accounts via Plaid OAuth and webhook sync in addition to CSV uploads.
- [ ] **Live LLM Categorization Endpoint:** Optional Gemini / OpenAI API integration to augment the deterministic AI Auto-Categorizer for novel merchant descriptions.
- [ ] **Stripe Payment Links & Email Delivery:** Generate live Stripe Checkout links on invoices and send transactional invoice emails via Resend/SendGrid.
- [ ] **Production Observability & Rate Limiting:** Add Sentry error tracking and API rate limiting for public SaaS launch.
