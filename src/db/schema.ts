import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
  date,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { QboStoreData } from "@/lib/qbo-store";

export type OrganizationRole = "owner" | "staff" | "accountant";

export const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  baseCurrency: text("base_currency").notNull().default("USD"),
  fiscalYearStartMonth: integer("fiscal_year_start_month").notNull().default(1),
  lockedThroughDate: date("locked_through_date"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  fullName: text("full_name").notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const organizationMembers = pgTable(
  "organization_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").$type<OrganizationRole>().notNull().default("owner"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("organization_members_org_user_idx").on(
      table.organizationId,
      table.userId
    ),
  ]
);

export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  tokenHash: text("token_hash").notNull().unique(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  activeOrganizationId: uuid("active_organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ============================================================================
// Phase 1–9 Multi-Tenant Accounting Ledger Tables (All Money in Integer Cents)
// ============================================================================

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  code: text("code").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  detailType: text("detail_type").notNull(),
  normalBalance: text("normal_balance").notNull(), // 'debit' | 'credit'
  bankBalanceCents: integer("bank_balance_cents"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const journalEntries = pgTable("journal_entries", {
  id: text("id").primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  entryNumber: text("entry_number").notNull(),
  date: text("date").notNull(),
  memo: text("memo").notNull(),
  sourceType: text("source_type").notNull(),
  sourceId: text("source_id"),
  reversesEntryId: text("reverses_entry_id"),
  reversedByEntryId: text("reversed_by_entry_id"),
  reconciled: boolean("reconciled").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const journalLines = pgTable("journal_lines", {
  id: text("id").primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  journalEntryId: text("journal_entry_id")
    .notNull()
    .references(() => journalEntries.id, { onDelete: "cascade" }),
  accountId: text("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "restrict" }),
  accountCode: text("account_code").notNull(),
  accountName: text("account_name").notNull(),
  description: text("description").notNull(),
  debitCents: integer("debit_cents").notNull().default(0),
  creditCents: integer("credit_cents").notNull().default(0),
  entityName: text("entity_name"),
});

export const bankTransactions = pgTable("bank_transactions", {
  id: text("id").primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  bankAccountId: text("bank_account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  description: text("description").notNull(),
  payee: text("payee"),
  amountCents: integer("amount_cents").notNull(),
  status: text("status").notNull().default("for_review"),
  suggestedAccountId: text("suggested_account_id"),
  matchedRuleName: text("matched_rule_name"),
  aiConfidence: integer("ai_confidence"),
  aiReasoning: text("ai_reasoning"),
  postedJournalEntryId: text("posted_journal_entry_id"),
  fingerprint: text("fingerprint").notNull(),
  reconciled: boolean("reconciled").notNull().default(false),
});

export const organizationLedgerState = pgTable("organization_ledger_state", {
  organizationId: uuid("organization_id")
    .primaryKey()
    .references(() => organizations.id, { onDelete: "cascade" }),
  stateJson: jsonb("state_json").$type<QboStoreData>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type OrganizationMember = typeof organizationMembers.$inferSelect;
export type Session = typeof sessions.$inferSelect;
