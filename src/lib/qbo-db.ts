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

type OrgSummary = { id: string; name: string; slug: string };

type GlobalMultiOrgCache = {
  initialized?: boolean;
  initPromise?: Promise<void>;
  orgs?: OrgSummary[];
  ledgersByOrgId?: Map<string, QboStoreData>;
  syncQueueByOrgId?: Map<string, Promise<void>>;
};

const globalCache = globalThis as unknown as GlobalMultiOrgCache;

function getLedgersMap(): Map<string, QboStoreData> {
  if (!globalCache.ledgersByOrgId) {
    globalCache.ledgersByOrgId = new Map();
  }
  return globalCache.ledgersByOrgId;
}

function getSyncQueueMap(): Map<string, Promise<void>> {
  if (!globalCache.syncQueueByOrgId) {
    globalCache.syncQueueByOrgId = new Map();
  }
  return globalCache.syncQueueByOrgId;
}

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
    // Ignore when called outside a Next.js request context
  }
}

/**
 * Warms the in-memory multi-company cache from Supabase PostgreSQL once per server lifecycle.
 * After initial warm-up, reads and mutations execute in < 2ms with background write-behind to Supabase.
 */
async function ensureCacheInitialized(): Promise<void> {
  if (globalCache.initialized && globalCache.orgs && globalCache.orgs.length > 0) {
    return;
  }
  if (globalCache.initPromise) {
    await globalCache.initPromise;
    return;
  }

  globalCache.initPromise = (async () => {
    const db = await getDb();
    const [allOrgs, allSnapshots] = await Promise.all([
      db.select().from(organizations).orderBy(asc(organizations.createdAt)),
      db.select().from(organizationLedgerState),
    ]);

    const ledgersMap = getLedgersMap();

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

      globalCache.orgs = [
        {
          id: createdDefault.id,
          name: createdDefault.name,
          slug: createdDefault.slug,
        },
      ];
      ledgersMap.set(createdDefault.id, structuredClone(seed));
      enqueueBackgroundDbSync(createdDefault.id, seed);
    } else {
      globalCache.orgs = allOrgs.map((o) => ({
        id: o.id,
        name: o.name,
        slug: o.slug,
      }));

      for (const snap of allSnapshots) {
        if (snap.stateJson) {
          ledgersMap.set(snap.organizationId, snap.stateJson);
        }
      }

      for (const org of globalCache.orgs) {
        if (!ledgersMap.has(org.id)) {
          const fallback =
            org.slug === DEFAULT_ORG_SLUG
              ? createInitialSeedData(org.name)
              : createFreshCompanyData(org.name);
          ledgersMap.set(org.id, fallback);
          enqueueBackgroundDbSync(org.id, fallback);
        }
      }
    }

    globalCache.initialized = true;
  })();

  try {
    await globalCache.initPromise;
  } finally {
    globalCache.initPromise = undefined;
  }
}

/**
 * Loads the active organization's QuickBooks store in < 2ms from the warm cache
 * (hydrating from Supabase on cold start).
 */
export async function loadQboStoreFromDb(requestedOrgId?: string): Promise<{
  organizationId: string;
  state: ComputedQboState;
  storageMode: "cloud-postgres" | "local-pglite";
}> {
  await ensureCacheInitialized();

  const storageMode = process.env.DATABASE_URL?.trim()
    ? "cloud-postgres"
    : "local-pglite";

  const allOrgs = globalCache.orgs ?? [];
  const cookieOrgId = await getActiveOrgCookieSafe();
  const targetOrgId = requestedOrgId || cookieOrgId;
  const activeOrg =
    allOrgs.find((o) => o.id === targetOrgId) ?? allOrgs[0];

  const ledgersMap = getLedgersMap();
  let orgData = ledgersMap.get(activeOrg.id);
  if (!orgData) {
    orgData =
      activeOrg.slug === DEFAULT_ORG_SLUG
        ? resetQboStore()
        : createFreshCompanyData(activeOrg.name);
    ledgersMap.set(activeOrg.id, orgData);
  }

  orgData.companyName = activeOrg.name;
  hydrateQboStore(orgData);

  const computed = getComputedQboState();
  return {
    organizationId: activeOrg.id,
    state: {
      ...computed,
      activeOrganizationId: activeOrg.id,
      organizations: allOrgs,
    },
    storageMode,
  };
}

/**
 * Creates a brand-new isolated company, updates the in-memory cache immediately,
 * and persists to Supabase in the background.
 */
export async function createOrganizationInDb(input: {
  name: string;
  template: "empty" | "sample";
}): Promise<string> {
  await ensureCacheInitialized();
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

  const summary: OrgSummary = {
    id: newOrg.id,
    name: newOrg.name,
    slug: newOrg.slug,
  };
  globalCache.orgs = [...(globalCache.orgs ?? []), summary];

  const cloned = structuredClone(initialData);
  getLedgersMap().set(newOrg.id, cloned);
  hydrateQboStore(cloned);

  await setActiveOrgCookieSafe(newOrg.id);
  enqueueBackgroundDbSync(newOrg.id, cloned);

  return newOrg.id;
}

/**
 * Updates the in-memory cache immediately (< 1ms) and schedules a non-blocking
 * background flush to Supabase PostgreSQL so UI actions feel instantaneous.
 */
export function saveQboStoreFast(
  organizationId: string,
  customData?: QboStoreData
): ComputedQboState {
  const data = customData ?? getRawStore();
  const cloned = structuredClone(data);
  getLedgersMap().set(organizationId, cloned);

  // Fire-and-forget background sync to Supabase
  enqueueBackgroundDbSync(organizationId, cloned);

  const computed = getComputedQboState();
  return {
    ...computed,
    activeOrganizationId: organizationId,
    organizations: globalCache.orgs ?? [],
  };
}

function enqueueBackgroundDbSync(
  organizationId: string,
  snapshot: QboStoreData
): void {
  const queueMap = getSyncQueueMap();
  const prev = queueMap.get(organizationId) ?? Promise.resolve();
  const next = prev
    .catch(() => {})
    .then(() => persistQboStoreToDb(organizationId, snapshot))
    .catch((err) => {
      console.error("[qbo-db] Background Supabase sync error:", err);
    });
  queueMap.set(organizationId, next);
}

/**
 * Flushes the organization's state to PostgreSQL (`organization_ledger_state`,
 * `accounts`, `journal_entries`, `journal_lines`, `bank_transactions`).
 */
export async function persistQboStoreToDb(
  organizationId: string,
  customData?: QboStoreData
): Promise<void> {
  const db = await getDb();
  const data = customData ?? getRawStore();
  const orgId = organizationId;
  const pk = (rawId: string) => `${orgId}:${rawId}`;

  // 1. Single-query Upsert of JSONB snapshot (fastest durability guarantee)
  await db
    .insert(organizationLedgerState)
    .values({
      organizationId: orgId,
      stateJson: data,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: organizationLedgerState.organizationId,
      set: {
        stateJson: data,
        updatedAt: new Date(),
      },
    });

  // 2. Sync relational tables with minimal round-trips via Promise.all
  await Promise.all([
    db.delete(journalLines).where(eq(journalLines.organizationId, orgId)),
    db
      .delete(bankTransactions)
      .where(eq(bankTransactions.organizationId, orgId)),
  ]);
  await Promise.all([
    db.delete(journalEntries).where(eq(journalEntries.organizationId, orgId)),
    db.delete(accounts).where(eq(accounts.organizationId, orgId)),
  ]);

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

  const insertTasks: Promise<unknown>[] = [];

  if (data.journalEntries.length > 0) {
    insertTasks.push(
      db
        .insert(journalEntries)
        .values(
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
        )
        .then(async () => {
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
        })
    );
  }

  if (data.bankTransactions.length > 0) {
    insertTasks.push(
      db.insert(bankTransactions).values(
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
      )
    );
  }

  await Promise.all(insertTasks);
}
