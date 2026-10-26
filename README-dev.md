# Developer Context & Core Accounting Rules (`README-dev.md`)

> **Mandatory Reading for AI Coding Assistants:** Read this file at the start of every session before modifying schema, business logic, or UI components.

---

## 1. Tech Stack

- **Framework:** Next.js 16 (App Router, Server Components, Server Actions, `cacheComponents` with `export const instant = false` on cookie-gated segments) + TypeScript
- **Database:** PostgreSQL (Supabase Postgres via `DATABASE_URL`, with automatic local PGlite fallback in `.local-db` when `DATABASE_URL` is not configured)
- **Supabase Client:** `@supabase/supabase-js` configured in `src/lib/supabase.ts`
- **ORM & Migrations:** Drizzle ORM (`drizzle-orm/pg-core`) + `drizzle-kit` SQL migrations in `drizzle/`
- **Authentication:** Self-contained email/password + HTTP-only cookie sessions stored directly in Drizzle PostgreSQL tables (`users`, `sessions`)
- **Styling & UI:** Tailwind CSS v4 + `shadcn/ui` components + `lucide-react` icons

---

## 2. Folder Structure

```text
├── drizzle/                        # Reviewed SQL migration files (NEVER modify DB without a migration)
├── src/
│   ├── app/
│   │   ├── (auth)/                 # Public authentication routes (/login, /signup)
│   │   ├── (dashboard)/            # Authenticated app shell & routes (/dashboard, etc.)
│   │   ├── layout.tsx              # Root layout
│   │   └── page.tsx                # Root redirect (/dashboard or /login)
│   ├── components/
│   │   ├── ui/                     # shadcn/ui primitives (button, card, input, label, etc.)
│   │   └── layout/                 # Sidebar, header, organization switcher
│   ├── db/
│   │   ├── schema.ts               # Drizzle PostgreSQL schema (organizations, users, sessions, ledger...)
│   │   ├── index.ts                # Drizzle database connection (Supabase Postgres or local PGlite)
│   │   └── migrate.ts              # Migration runner
│   └── lib/
│       ├── auth.ts                 # Password hashing, session management, requireAuth() + active org
│       ├── money.ts                # Integer-cents formatting and parsing helpers
│       ├── supabase.ts             # Supabase client helper
│       └── utils.ts                # Tailwind class merging (cn)
├── PLAN.md                         # 9-phase build plan and progress checklist
├── README-dev.md                   # This file — core architecture and accounting invariants
└── drizzle.config.ts               # Drizzle Kit configuration
```

---

## 3. Core Accounting & Security Invariants (Non-Negotiable)

1. **Money is ALWAYS stored as integer cents (`bigint` / `integer` in Postgres, `number` or `bigint` in TS).**
   - Never use `float`, `real`, `double precision`, or JavaScript floating-point math for money calculations.
   - Example: `$125.50` is stored as `12550`.
   - Convert to formatted strings (`$125.50`) only at the display boundary using `src/lib/money.ts`.

2. **Posted journal entries are NEVER edited or deleted.**
   - Once a journal entry has status `'posted'`, its header and lines are immutable.
   - Corrections must **always** create a new reversing journal entry (`reverses_entry_id`) that zeroes out the original debits and credits, followed by a new correcting entry if needed.

3. **Every journal entry MUST balance (`SUM(debits) === SUM(credits)`).**
   - Every line has a non-negative `debit_cents` and `credit_cents` where exactly one side is `> 0` and the other is `0`.
   - `postEntry()` must validate inside a single database transaction that:
     - The entry has at least 2 lines.
     - Every line belongs to an account in the same `organization_id`.
     - Total debits equal total credits (`totalDebitsCents === totalCreditsCents > 0`).
     - The entry date does not fall in a locked period (`organizations.locked_through_date`).

4. **Strict Multi-Tenant Data Isolation (`organization_id`).**
   - Every business table (`accounts`, `journal_entries`, `bank_transactions`, `customers`, `invoices`, `vendors`, `bills`, etc.) MUST have a non-nullable `organization_id` foreign key referencing `organizations.id`.
   - **Every single database query, mutation, and report MUST filter by the authenticated user's verified `organization_id`.**

5. **Migrations Only.**
   - Never alter database tables ad-hoc. Always update `src/db/schema.ts`, generate a SQL migration file in `drizzle/`, review the SQL, and apply it cleanly.

6. **Living Documentation (Mandatory Update Rule).**
   - After every single task, feature addition, or bug fix, you **MUST** update the 4 living documentation files in `docs/`:
     - [`docs/COMPLETED.md`](./docs/COMPLETED.md) — Short bullet points of everything completed.
     - [`docs/RULES.md`](./docs/RULES.md) — Core accounting, security, and engineering rules.
     - [`docs/REMAINING.md`](./docs/REMAINING.md) — Remaining features to build.
     - [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — System architecture and double-entry data flow.
