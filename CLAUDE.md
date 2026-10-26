# CLAUDE.md — Project Context

Always read [`README-dev.md`](./README-dev.md) and [`PLAN.md`](./PLAN.md) at the start of every session. Also respect [`AGENTS.md`](./AGENTS.md) for Next.js 16 documentation in `node_modules/next/dist/docs/`.

## Non-Negotiable Rules
1. **Money is stored as integer cents** (`12550` = `$125.50`). Never use floating-point numbers for money storage or arithmetic.
2. **Posted journal entries are never edited or deleted.** Corrections require a reversing journal entry.
3. **Every journal entry must balance** (`SUM(debit_cents) === SUM(credit_cents)`), verified inside a database transaction via `postEntry()`.
4. **Tenant isolation:** Every domain table includes `organization_id`, and every query filters by the active authenticated `organization_id`.
5. **Migrations only:** Never change the database without generating and reviewing a migration file in `drizzle/`.
