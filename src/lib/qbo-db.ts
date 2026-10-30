import { asc, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "@/db";
import {
  accounts,
  bankTransactions,
  journalEntries,
  journalLines,
  organizationLedgerState,
  organizationMembers,
  organizations,
} from "@/db/schema";
import {
  createFreshCompanyData,
  getComputedQboState,
  getRawStore,
  hydrateQboStore,
  type ComputedQboState,
  type InitialOwnerInfo,
  type QboStoreData,
} from "@/lib/qbo-store";
import {
  ensureAdminUserInDb,
  getOrganizationTeamRosterFromDb,
  isSuperAdminEmail,
} from "@/lib/auth";

export const ACTIVE_ORG_COOKIE = "qbo_active_org_id";

export type OrgSummary = { id: string; name: string; slug: string };

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

export async function resetQboDbCacheForTests(): Promise<void> {
  if (globalCache.initPromise) {
    await globalCache.initPromise.catch(() => {});
  }
  if (globalCache.syncQueueByOrgId) {
    await Promise.allSettled(Array.from(globalCache.syncQueueByOrgId.values()));
  }
  globalCache.initialized = false;
  globalCache.initPromise = undefined;
  globalCache.orgs = undefined;
  globalCache.ledgersByOrgId = new Map();
  globalCache.syncQueueByOrgId = new Map();
}

export function evictOrganizationFromCache(organizationId: string): void {
  if (globalCache.orgs) {
    globalCache.orgs = globalCache.orgs.filter((o) => o.id !== organizationId);
  }
  getLedgersMap().delete(organizationId);
  getSyncQueueMap().delete(organizationId);
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

function sanitizeLegacyTeamMembers(ledger: QboStoreData): void {
  if (!ledger.teamMembers) {
    ledger.teamMembers = [];
  }
  ledger.teamMembers = ledger.teamMembers.filter(
    (m) => !isSuperAdminEmail(m.email)
  );
  if (ledger.teamMembers.length === 0) {
    ledger.teamMembers = [
      {
        id: "tm-1",
        name: "Company Owner",
        email: "owner@company.local",
        role: "owner",
        status: "Active",
      },
    ];
  }
}

/**
 * Warms the in-memory multi-company cache from PostgreSQL once per server lifecycle.
 * Never creates sample or demo organizations when the database is empty.
 */
async function ensureCacheInitialized(): Promise<void> {
  if (globalCache.initialized && globalCache.orgs) {
    return;
  }
  if (globalCache.initPromise) {
    await globalCache.initPromise;
    return;
  }

  globalCache.initPromise = (async () => {
    try {
      await ensureAdminUserInDb();
    } catch (authInitErr) {
      console.warn(
        "[AuthInit] Warning: Could not ensure default admin in DB:",
        authInitErr
      );
    }
    const db = await getDb();
    const [allOrgs, allSnapshots] = await Promise.all([
      db.select().from(organizations).orderBy(asc(organizations.createdAt)),
      db.select().from(organizationLedgerState),
    ]);

    const ledgersMap = getLedgersMap();

    globalCache.orgs = allOrgs.map((o) => ({
      id: o.id,
      name: o.name,
      slug: o.slug,
    }));

    for (const snap of allSnapshots) {
      if (snap.stateJson) {
        const ledger = snap.stateJson;
        sanitizeLegacyTeamMembers(ledger);
        ledgersMap.set(snap.organizationId, ledger);
      }
    }

    for (const org of globalCache.orgs) {
      if (!ledgersMap.has(org.id)) {
        const fallback = createFreshCompanyData(org.name);
        ledgersMap.set(org.id, fallback);
        enqueueBackgroundDbSync(org.id, fallback);
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
 * Registers a newly created organization (e.g. from OTP Signup or Admin Console)
 * immediately into the warm cache and persists its fresh $0.00 ledger to PostgreSQL.
 */
export async function initializeLedgerForNewOrganization(input: {
  organization: OrgSummary;
  ownerInfo: InitialOwnerInfo;
}): Promise<QboStoreData> {
  const initialData = createFreshCompanyData(
    input.organization.name,
    input.ownerInfo
  );

  const cloned = structuredClone(initialData);
  // Pre-seed ledgersMap before cache init so ensureCacheInitialized doesn't synthesize a duplicate fallback
  getLedgersMap().set(input.organization.id, cloned);

  await ensureCacheInitialized();

  const existingOrgs = globalCache.orgs ?? [];
  if (!existingOrgs.some((o) => o.id === input.organization.id)) {
    globalCache.orgs = [...existingOrgs, input.organization];
  }
  getLedgersMap().set(input.organization.id, cloned);

  await enqueueBackgroundDbSync(input.organization.id, cloned);
  return cloned;
}

/**
 * Loads the requested organization's Pro E Books store, keeping team roster synced
 * with PostgreSQL `organization_members` & `team_invitations` and scoping visible
 * organizations to `allowedOrgIds` when specified.
 */
export async function loadQboStoreFromDb(
  requestedOrgId?: string,
  options?: {
    allowedOrgIds?: string[];
  }
): Promise<{
  organizationId: string;
  state: ComputedQboState;
  storageMode: "cloud-postgres" | "local-pglite";
}> {
  await ensureCacheInitialized();

  const storageMode = process.env.DATABASE_URL?.trim()
    ? "cloud-postgres"
    : "local-pglite";

  let allOrgs = globalCache.orgs ?? [];
  const cookieOrgId = await getActiveOrgCookieSafe();
  const targetOrgId = requestedOrgId || cookieOrgId;

  // If targetOrgId was just created in DB and isn't in cache yet, fetch it on demand
  if (targetOrgId && !allOrgs.some((o) => o.id === targetOrgId)) {
    const db = await getDb();
    const [dbOrg] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, targetOrgId))
      .limit(1);
    if (dbOrg) {
      const summary: OrgSummary = {
        id: dbOrg.id,
        name: dbOrg.name,
        slug: dbOrg.slug,
      };
      allOrgs = [...allOrgs, summary];
      globalCache.orgs = allOrgs;

      const [dbSnap] = await db
        .select()
        .from(organizationLedgerState)
        .where(eq(organizationLedgerState.organizationId, dbOrg.id))
        .limit(1);
      if (dbSnap?.stateJson) {
        sanitizeLegacyTeamMembers(dbSnap.stateJson);
        getLedgersMap().set(dbOrg.id, dbSnap.stateJson);
      }
    }
  }

  const allowedSet = options?.allowedOrgIds
    ? new Set(options.allowedOrgIds)
    : null;
  const scopedOrgs = allowedSet
    ? allOrgs.filter((o) => allowedSet.has(o.id))
    : allOrgs;

  const candidateList = scopedOrgs.length > 0 ? scopedOrgs : allOrgs;
  const activeOrg =
    candidateList.find((o) => o.id === targetOrgId) ?? candidateList[0];

  if (!activeOrg) {
    throw new Error("No active organization workspace found.");
  }

  const ledgersMap = getLedgersMap();
  let orgData = ledgersMap.get(activeOrg.id);
  if (!orgData) {
    orgData = createFreshCompanyData(activeOrg.name);
    ledgersMap.set(activeOrg.id, orgData);
  }

  // Synchronize teamMembers with real PostgreSQL memberships & pending invitations
  try {
    const dbRoster = await getOrganizationTeamRosterFromDb(activeOrg.id);
    if (dbRoster.length > 0) {
      orgData.teamMembers = dbRoster;
    } else {
      sanitizeLegacyTeamMembers(orgData);
    }
  } catch {
    sanitizeLegacyTeamMembers(orgData);
  }

  orgData.companyName = activeOrg.name;
  hydrateQboStore(orgData);

  const computed = getComputedQboState();
  return {
    organizationId: activeOrg.id,
    state: {
      ...computed,
      activeOrganizationId: activeOrg.id,
      organizations: scopedOrgs,
    },
    storageMode,
  };
}

/**
 * Creates a brand-new isolated company for an authenticated Owner (or Super Admin),
 * binds their ownership in `organization_members`, updates the cache, and persists to PostgreSQL.
 */
export async function createOrganizationInDb(input: {
  name: string;
  industry?: string;
  taxId?: string;
  ownerUserId?: string;
  ownerInfo?: InitialOwnerInfo;
}): Promise<string> {
  await ensureCacheInitialized();
  const db = await getDb();

  const cleanName = input.name.trim() || "New Business LLC";
  const slug = slugifyCompanyName(cleanName);

  const initialData = createFreshCompanyData(cleanName, input.ownerInfo);

  if (input.industry || input.taxId) {
    initialData.auditLogs.unshift({
      id: `aud-profile-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: `${input.ownerInfo?.name || "Company Owner"} (OWNER)`,
      action: "Company Profile Configured",
      details: [
        input.industry ? `Industry: ${input.industry}` : "",
        input.taxId ? `Tax ID: ${input.taxId}` : "",
      ]
        .filter(Boolean)
        .join(" · "),
    });
  }

  const [newOrg] = await db
    .insert(organizations)
    .values({
      name: cleanName,
      slug,
      baseCurrency: "USD",
      fiscalYearStartMonth: 1,
      lockedThroughDate: initialData.lockedThroughDate,
      ownerEmail: input.ownerInfo?.email?.toLowerCase() ?? null,
      isSuspended: false,
      planStatus: "active",
    })
    .returning();

  if (input.ownerUserId) {
    await db.insert(organizationMembers).values({
      organizationId: newOrg.id,
      userId: input.ownerUserId,
      role: "owner",
    });
  }

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
 * background flush to PostgreSQL, scoping `organizations` to `allowedOrgIds` if provided.
 */
export function saveQboStoreFast(
  organizationId: string,
  customData?: QboStoreData,
  allowedOrgIds?: string[]
): ComputedQboState {
  const data = customData ?? getRawStore();
  const cloned = structuredClone(data);
  getLedgersMap().set(organizationId, cloned);

  enqueueBackgroundDbSync(organizationId, cloned);

  const allOrgs = globalCache.orgs ?? [];
  const allowedSet = allowedOrgIds ? new Set(allowedOrgIds) : null;
  const scopedOrgs = allowedSet
    ? allOrgs.filter((o) => allowedSet.has(o.id))
    : allOrgs;

  const computed = getComputedQboState();
  return {
    ...computed,
    activeOrganizationId: organizationId,
    organizations: scopedOrgs,
  };
}

function enqueueBackgroundDbSync(
  organizationId: string,
  snapshot: QboStoreData
): Promise<void> {
  const queueMap = getSyncQueueMap();
  const prev = queueMap.get(organizationId) ?? Promise.resolve();
  const next = prev
    .catch(() => {})
    .then(() => persistQboStoreToDb(organizationId, snapshot))
    .catch((err) => {
      console.error("[qbo-db] Background PostgreSQL sync error:", err);
    });
  queueMap.set(organizationId, next);
  return next;
}

/**
 * Atomically flushes the organization's state to PostgreSQL (`organization_ledger_state`,
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

  await db.transaction(async (tx) => {
    await tx
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

    await tx
      .delete(journalLines)
      .where(eq(journalLines.organizationId, orgId));
    await tx
      .delete(bankTransactions)
      .where(eq(bankTransactions.organizationId, orgId));
    await tx
      .delete(journalEntries)
      .where(eq(journalEntries.organizationId, orgId));
    await tx.delete(accounts).where(eq(accounts.organizationId, orgId));

    if (data.accounts.length > 0) {
      await tx.insert(accounts).values(
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
      await tx.insert(journalEntries).values(
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
        await tx.insert(journalLines).values(allLines);
      }
    }

    if (data.bankTransactions.length > 0) {
      await tx.insert(bankTransactions).values(
        data.bankTransactions.map((txRow) => ({
          id: pk(txRow.id),
          organizationId: orgId,
          bankAccountId: pk(txRow.bankAccountId),
          date: txRow.date,
          description: txRow.description,
          payee: txRow.payee ?? null,
          amountCents: txRow.amountCents,
          status: txRow.status,
          suggestedAccountId: txRow.suggestedAccountId ?? null,
          matchedRuleName: txRow.matchedRuleName ?? null,
          aiConfidence: txRow.aiConfidence ?? null,
          aiReasoning: txRow.aiReasoning ?? null,
          postedJournalEntryId: txRow.postedJournalEntryId ?? null,
          fingerprint: txRow.fingerprint,
          reconciled: Boolean(txRow.reconciled),
        }))
      );
    }
  });
}
