# CLAUDE.md — Project Context

Always read [`README-dev.md`](./README-dev.md), [`PLAN.md`](./PLAN.md), and the 4 living documentation files in [`docs/`](./docs/) at the start of every session. Also respect [`AGENTS.md`](./AGENTS.md) for Next.js 16 documentation in `node_modules/next/dist/docs/`.

## Living Documentation (MUST Update After Every Task)
1. [`docs/COMPLETED.md`](./docs/COMPLETED.md) — Short bullet points of all completed features and changes.
2. [`docs/RULES.md`](./docs/RULES.md) — Core accounting, security, and workflow rules.
3. [`docs/REMAINING.md`](./docs/REMAINING.md) — Features remaining to be built.
4. [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — System architecture, folder structure, and double-entry data flow.

## Non-Negotiable Rules
1. **Money is stored as integer cents** (`12550` = `$125.50`). Never use floating-point numbers for money storage or arithmetic.
2. **Posted journal entries are never edited or deleted.** Corrections require a reversing journal entry.
3. **Every journal entry must balance** (`SUM(debit_cents) === SUM(credit_cents)`), verified inside a database transaction via `postEntry()`.
4. **Tenant isolation:** Every domain table includes `organization_id`, and every query filters by the active authenticated `organization_id`.
5. **Migrations only:** Never change the database without generating and reviewing a migration file in `drizzle/`.
6. **Always update the 4 `/docs` files** (`COMPLETED.md`, `RULES.md`, `REMAINING.md`, `ARCHITECTURE.md`) after every task.
