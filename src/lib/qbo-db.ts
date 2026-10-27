import { asc, eq } from "drizzle-orm";
import { cookies } from "next/headers";
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
  createFreshCompanyData,
  createInitialSeedData,
  getComputedQboState,
  getRawStore,
  hydrateQboStore,
  resetQboStore,
  type ComputedQboState,
  type QboStoreData,
} from "@/lib/qbo-store";

const DEFAULT_ORG_SLUG = "craigs-design-and-landscaping";
export const ACTIVE_ORG_COOKIE = "qbo_active_org_id";

function slugifyCompanyName(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${base || "company"}-${Date.now().toString().slice(-5)}`;
}

async function getActiveOrgCookieSafe(): Promise<string | undefined> {
  try {
    const store = await cookies();
    return store.get(ACTIVE_ORG_COOKIE)?.value;
  } catch {
    return undefined;
  }
}

export async function setActiveOrgCookieSafe(orgId: string): Promise<void> {
  try {
    const store = await cookies();
    store.set(ACTIVE_ORG_COOKIE, orgId, {
      httpOnly: false,
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  } catch {
    // Ignore when called outside a Next.js request context (e.g. CLI scripts)
  }
}

/**
 * Ensures at least the default organization exists in PostgreSQL, loads the active
 * organization's QuickBooks ledger, and returns all organizations for the company switcher.
 */
export async function loadQboStoreFromDb(requestedOrgId?: string): Promise<{
  organizationId: string;
  state: ComputedQboState;
  storageMode: "cloud-postgres" | "local-pglite";
}> {
  const db = await getDb();
  const storageMode = process.env.DATABASE_URL?.trim()
    ? "cloud-postgres"
    : "local-pglite";

  let allOrgs = await db
    .select()
    .from(organizations)
    .orderBy(asc(organizations.createdAt));

  if (allOrgs.length === 0) {
    const seed = createInitialSeedData();
    const [createdDefault] = await db
      .insert(organizations)
      .values({
        name: seed.companyName,
        slug: DEFAULT_ORG_SLUG,
        baseCurrency: "USD",
        fiscalYearStartMonth: 1,
        lockedThroughDate: seed.lockedThroughDate,
      })
      .returning();
    await persistQboStoreToDb(createdDefault.id, seed);
    allOrgs = [createdDefault];
  }

  const cookieOrgId = await getActiveOrgCookieSafe();
  const targetOrgId = requestedOrgId || cookieOrgId;
  const activeOrg =
    allOrgs.find((o) => o.id === targetOrgId) ?? allOrgs[0];

  const [existingLedger] = await db
    .select()
    .from(organizationLedgerState)
    .where(eq(organizationLedgerState.organizationId, activeOrg.id))
    .limit(1);

  if (existingLedger?.stateJson) {
    hydrateQboStore({
      ...existingLedger.stateJson,
      companyName: activeOrg.name,
    });
  } else {
    const seed =
      activeOrg.slug === DEFAULT_ORG_SLUG
        ? resetQboStore()
        : createFreshCompanyData(activeOrg.name);
    hydrateQboStore(seed);
    await persistQboStoreToDb(activeOrg.id, seed);
  }

  const computed = getComputedQboState();
  return {
    organizationId: activeOrg.id,
    state: {
      ...computed,
      activeOrganizationId: activeOrg.id,
      organizations: allOrgs.map((o) => ({
        id: o.id,
        name: o.name,
        slug: o.slug,
      })),
    },
    storageMode,
  };
}

/**
 * Creates a brand-new isolated company (organization) in PostgreSQL and switches to it.
 */
export async function createOrganizationInDb(input: {
  name: string;
  template: "empty" | "sample";
}): Promise<string> {
  const db = await getDb();
  const cleanName = input.name.trim() || "New Business LLC";
  const slug = slugifyCompanyName(cleanName);

  const initialData =
    input.template === "sample"
      ? createInitialSeedData(cleanName)
      : createFreshCompanyData(cleanName);

  const [newOrg] = await db
    .insert(organizations)
    .values({
      name: cleanName,
      slug,
      baseCurrency: "USD",
      fiscalYearStartMonth: 1,
      lockedThroughDate: initialData.lockedThroughDate,
    })
    .returning();

  hydrateQboStore(initialData);
  await persistQboStoreToDb(newOrg.id, initialData);
  await setActiveOrgCookieSafe(newOrg.id);

  return newOrg.id;
}

/**
 * Persists the current QuickBooks store into PostgreSQL tables (`accounts`,
 * `journal_entries`, `journal_lines`, `bank_transactions`, and `organization_ledger_state`)
 * scoped by `organization_id` with tenant-prefixed relational IDs so multiple
 * companies never collide on primary keys.
 */
export async function persistQboStoreToDb(
  organizationId: string,
  customData?: QboStoreData
): Promise<void> {
  const db = await getDb();
  const data = customData ?? getRawStore();
  const orgId = organizationId;
  const pk = (rawId: string) => `${orgId}:${rawId}`;

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
        id: pk(a.id),
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
        id: pk(je.id),
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
        id: pk(l.id),
        organizationId: orgId,
        journalEntryId: pk(je.id),
        accountId: pk(l.accountId),
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
        id: pk(tx.id),
        organizationId: orgId,
        bankAccountId: pk(tx.bankAccountId),
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
