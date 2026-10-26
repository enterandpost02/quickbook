# Accounting web app build plan

Oct 26, 2026 · @Enterandpost

A launchable QuickBooks-like app takes about 3–4 months for one developer with an AI coding assistant, with a usable bookkeeping MVP after Phase 3 (around week 4–5). Stack: Next.js + TypeScript, PostgreSQL, Drizzle, Tailwind + shadcn/ui. Each phase builds on the last; tick a phase's "Done when" box to track progress.

## Phase 0 — Setup (2–3 days)

**Build:** Next.js + TypeScript project, Postgres (Neon or Supabase), Drizzle, Tailwind + shadcn/ui, auth, and an `organizations` table so each business's data is separate from day one.

**AI tip:** Before writing any code, create a project context file (`CLAUDE.md` or `README-dev.md`) covering your stack, folder structure and the core rules: money is stored as integer cents, posted entries are never edited, and every entry must balance. Have the assistant read it at the start of each session.

- [ ] Done when: you can sign up, log in and see an empty dashboard.

## Phase 1 — Ledger core (1 week)

**Build:** chart of accounts (a default set of about 30 accounts), `journal_entries` + `journal_lines`, and one `postEntry()` function that validates the entry, checks debits = credits and saves it inside a database transaction. Corrections use reversal entries, never edits.

**AI tip:** Ask the AI to write the tests first: balanced entries pass, unbalanced ones fail, reversals zero out. Read every line of this code yourself, because everything else depends on it.

- [ ] Done when: tests pass and you can manually create journal entries in a simple form.

## Phase 2 — Bank import + categorization (1–2 weeks)

This is the most-used feature in QuickBooks.

**Build:** CSV upload with column mapping (date, description, amount) and duplicate detection, a "For review" list with an account dropdown, posting on confirm, and categorization rules ("description contains X → account Y").

**AI tip:** Collect 3–4 real CSV exports from different banks and give them to the AI as test files. Formats vary more than you'd expect.

- [ ] Done when: you can import a month of real bank data and categorize all of it.

## Phase 3 — Reports (1 week)

**Build:** Profit & Loss, Balance Sheet and General Ledger, with date ranges, cash vs accrual basis, and CSV/PDF export.

**AI tip:** Give the AI a small set of transactions with correct totals you worked out by hand, and have it build the reports to match. Never trust report numbers you haven't checked yourself.

- [ ] Done when: the balance sheet always balances, and the P&L matches your manual math.

**Milestone: usable bookkeeping MVP.** Get 3–5 real users (freelancers or small shops) testing it now.

## Phase 4 — Reconciliation + period lock (1 week)

**Build:** a reconcile screen (enter the statement ending balance, tick cleared transactions until the difference is $0.00), a reconciliation history, and locking of closed periods.

- [ ] Done when: you can reconcile a real month and can't accidentally change a locked month.

## Phase 5 — Customers + invoicing (2 weeks)

**Build:** customers, products/services, invoices and estimates, PDF and email sending, recording payments received (with Undeposited Funds), an A/R aging report, and matching deposits from bank imports to invoices.

- [ ] Done when: you can send an invoice, record payment and see it flow into the reports.

## Phase 6 — Vendors, expenses + bills (1–2 weeks)

**Build:** vendors, expenses with receipt upload, bills and bill payments, an A/P aging report, and sales tax rates.

- [ ] Done when: you can track what the business owes and has paid.

## Phase 7 — Teams + trust (1 week)

**Build:** multiple users with roles (owner, staff, accountant), an audit log of who did what, recurring invoices, a settings page and full data export.

- [ ] Done when: an accountant can be invited and can see everything without being able to delete it.

## Phase 8 — Automation + your edge (2–3 weeks)

**Build:** live bank feeds through Plaid, AI auto-categorization that shows its reasoning, payment links on invoices (Stripe), a background job worker for syncing and reminders, and import from QuickBooks.

**AI tip:** For AI categorization, give the model the transaction plus the user's past categorizations of similar ones, and have it return an account and a reason. Require the user to approve suggestions at first.

- [ ] Done when: a new bank transaction arrives on its own and comes with a suggested category and reason.

## Phase 9 — Launch readiness (1 week)

**Build:** security review (data isolation between organizations, input validation), automated backups, error monitoring (Sentry), rate limiting, a landing page and pricing/billing.

**AI tip:** Ask the assistant to audit every database query for a missing `organization_id` filter. That bug would show one business's books to another.

- [ ] Done when: the security audit is clean, backups restore, and a stranger can sign up and pay.

## Working with an AI assistant

These four rules apply in every phase.

- **Small tasks.** Ask for one screen or one function at a time, not "build invoicing."
- **Migrations only.** Never let the AI change the database without a migration file you review.
- **Commit often.** Commit after each working step so you can roll back bad AI changes.
- **You own the money logic.** The AI can write it, but you verify the debits, credits and totals.
