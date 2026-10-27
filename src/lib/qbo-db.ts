import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import {
  accounts,
  bankTransactions,
  journalEntries,
  journalLines,
  organizationLedgerState,
  organizations,
} from "@/db/schema";
import {
  getComputedQboState,
  getRawStore,
  hydrateQboStore,
  resetQboStore,
  type ComputedQboState,
  type QboStoreData,
} from "@/lib/qbo-store";

const DEFAULT_ORG_SLUG = "craigs-design-and-landscaping";

/**
 * Ensures the default organization and its QuickBooks ledger exist in PostgreSQL,
 * hydrates the in-memory engine from PostgreSQL, and returns the organization ID.
 */
export async function loadQboStoreFromDb(): Promise<{
  organizationId: string;
  state: ComputedQboState;
  storageMode: "cloud-postgres" | "local-pglite";
}> {
  const db = await getDb();
  const storageMode = process.env.DATABASE_URL?.trim()
    ? "cloud-postgres"
    : "local-pglite";

  let [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.slug, DEFAULT_ORG_SLUG))
    .limit(1);

  if (!org) {
    const seed = getRawStore();
    [org] = await db
      .insert(organizations)
      .values({
        name: seed.companyName,
        slug: DEFAULT_ORG_SLUG,
        baseCurrency: "USD",
        fiscalYearStartMonth: 1,
        lockedThroughDate: seed.lockedThroughDate,
      })
      .returning();
  }

  const [existingLedger] = await db
    .select()
    .from(organizationLedgerState)
    .where(eq(organizationLedgerState.organizationId, org.id))
    .limit(1);

  if (existingLedger?.stateJson) {
    hydrateQboStore(existingLedger.stateJson);
  } else {
    const seed = resetQboStore();
    await persistQboStoreToDb(org.id, seed);
  }

  return {
    organizationId: org.id,
    state: getComputedQboState(),
    storageMode,
  };
}

/**
 * Persists the current QuickBooks store into PostgreSQL tables (`accounts`,
 * `journal_entries`, `journal_lines`, `bank_transactions`, and `organization_ledger_state`)
 * inside a database transaction scoped by `organization_id`.
 */
export async function persistQboStoreToDb(
  organizationId?: string,
  customData?: QboStoreData
): Promise<void> {
  const db = await getDb();
  const data = customData ?? getRawStore();

  let orgId = organizationId;
  if (!orgId) {
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.slug, DEFAULT_ORG_SLUG))
      .limit(1);
    if (!org) return;
    orgId = org.id;
  }

  // Upsert organization ledger snapshot
  const [existing] = await db
    .select({ organizationId: organizationLedgerState.organizationId })
    .from(organizationLedgerState)
    .where(eq(organizationLedgerState.organizationId, orgId))
    .limit(1);

  if (existing) {
    await db
      .update(organizationLedgerState)
      .set({
        stateJson: data,
        updatedAt: new Date(),
      })
      .where(eq(organizationLedgerState.organizationId, orgId));
  } else {
    await db.insert(organizationLedgerState).values({
      organizationId: orgId,
      stateJson: data,
      updatedAt: new Date(),
    });
  }

  // Sync relational PostgreSQL tables scoped by organization_id
  await db
    .delete(journalLines)
    .where(eq(journalLines.organizationId, orgId));
  await db
    .delete(journalEntries)
    .where(eq(journalEntries.organizationId, orgId));
  await db
    .delete(bankTransactions)
    .where(eq(bankTransactions.organizationId, orgId));
  await db.delete(accounts).where(eq(accounts.organizationId, orgId));

  if (data.accounts.length > 0) {
    await db.insert(accounts).values(
      data.accounts.map((a) => ({
        id: a.id,
        organizationId: orgId,
        code: a.code,
        name: a.name,
        type: a.type,
        detailType: a.detailType,
        normalBalance: a.normalBalance,
        bankBalanceCents: a.bankBalanceCents ?? null,
        isActive: a.isActive,
      }))
    );
  }

  if (data.journalEntries.length > 0) {
    await db.insert(journalEntries).values(
      data.journalEntries.map((je) => ({
        id: je.id,
        organizationId: orgId,
        entryNumber: je.entryNumber,
        date: je.date,
        memo: je.memo,
        sourceType: je.sourceType,
        sourceId: je.sourceId ?? null,
        reversesEntryId: je.reversesEntryId ?? null,
        reversedByEntryId: je.reversedByEntryId ?? null,
        reconciled: Boolean(je.reconciled),
      }))
    );

    const allLines = data.journalEntries.flatMap((je) =>
      je.lines.map((l) => ({
        id: l.id,
        organizationId: orgId,
        journalEntryId: je.id,
        accountId: l.accountId,
        accountCode: l.accountCode,
        accountName: l.accountName,
        description: l.description,
        debitCents: l.debitCents,
        creditCents: l.creditCents,
        entityName: l.entityName ?? null,
      }))
    );

    if (allLines.length > 0) {
      await db.insert(journalLines).values(allLines);
    }
  }

  if (data.bankTransactions.length > 0) {
    await db.insert(bankTransactions).values(
      data.bankTransactions.map((tx) => ({
        id: tx.id,
        organizationId: orgId,
        bankAccountId: tx.bankAccountId,
        date: tx.date,
        description: tx.description,
        payee: tx.payee ?? null,
        amountCents: tx.amountCents,
        status: tx.status,
        suggestedAccountId: tx.suggestedAccountId ?? null,
        matchedRuleName: tx.matchedRuleName ?? null,
        aiConfidence: tx.aiConfidence ?? null,
        aiReasoning: tx.aiReasoning ?? null,
        postedJournalEntryId: tx.postedJournalEntryId ?? null,
        fingerprint: tx.fingerprint,
        reconciled: Boolean(tx.reconciled),
      }))
    );
  }
}
