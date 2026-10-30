import { and, desc, eq, gt } from "drizzle-orm";
import { getDb } from "@/db";
import {
  emailOtps,
  organizationLedgerState,
  organizationMembers,
  organizations,
  sessions,
  teamInvitations,
  users,
  type OrganizationRole,
} from "@/db/schema";
import {
  ensureAdminUserInDb,
  hashPassword,
  isSuperAdminEmail,
  slugifyOrganizationName,
} from "@/lib/auth";
import {
  evictOrganizationFromCache,
  initializeLedgerForNewOrganization,
} from "@/lib/qbo-db";

export interface PlatformAdminOverview {
  kpis: {
    totalOrganizations: number;
    activeOrganizations: number;
    suspendedOrganizations: number;
    totalUsers: number;
    totalOwners: number;
    totalStaff: number;
    totalAccountants: number;
    suspendedUsers: number;
    activeSessionsCount: number;
    pendingOtpsCount: number;
    pendingInvitationsCount: number;
    totalInvoicesAcrossPlatform: number;
    totalJournalEntriesAcrossPlatform: number;
    totalBankTransactionsAcrossPlatform: number;
  };
  organizations: Array<{
    id: string;
    name: string;
    slug: string;
    baseCurrency: string;
    ownerEmail: string | null;
    ownerName: string | null;
    isSuspended: boolean;
    planStatus: string;
    createdAt: string;
    memberCount: number;
    accountsCount: number;
    invoicesCount: number;
    journalEntriesCount: number;
    bankTransactionsCount: number;
  }>;
  users: Array<{
    id: string;
    email: string;
    fullName: string;
    isSuperAdmin: boolean;
    emailVerified: boolean;
    isSuspended: boolean;
    createdAt: string;
    activeSessions: number;
    memberships: Array<{
      organizationId: string;
      organizationName: string;
      role: OrganizationRole;
    }>;
  }>;
  pendingOtps: Array<{
    id: string;
    email: string;
    fullName: string;
    organizationName: string;
    attempts: number;
    expiresAt: string;
  }>;
  pendingInvitations: Array<{
    id: string;
    email: string;
    fullName: string;
    role: OrganizationRole;
    organizationId: string;
    organizationName: string;
    expiresAt: string;
  }>;
}

export async function getPlatformAdminOverview(): Promise<PlatformAdminOverview> {
  const db = await getDb();
  const now = new Date();

  const [
    allOrgs,
    allUsers,
    allMembers,
    activeSessions,
    allSnapshots,
    activeOtps,
    activeInvites,
  ] = await Promise.all([
    db.select().from(organizations).orderBy(desc(organizations.createdAt)),
    db.select().from(users).orderBy(desc(users.createdAt)),
    db.select().from(organizationMembers),
    db.select().from(sessions).where(gt(sessions.expiresAt, now)),
    db.select().from(organizationLedgerState),
    db.select().from(emailOtps).where(gt(emailOtps.expiresAt, now)),
    db
      .select()
      .from(teamInvitations)
      .where(
        and(
          eq(teamInvitations.status, "pending"),
          gt(teamInvitations.expiresAt, now)
        )
      ),
  ]);

  const orgById = new Map(allOrgs.map((o) => [o.id, o]));
  const userById = new Map(allUsers.map((u) => [u.id, u]));
  const snapshotByOrgId = new Map(
    allSnapshots.map((s) => [s.organizationId, s.stateJson])
  );

  let totalInvoicesAcrossPlatform = 0;
  let totalJournalEntriesAcrossPlatform = 0;
  let totalBankTransactionsAcrossPlatform = 0;

  const orgRows = allOrgs.map((org) => {
    const orgMembers = allMembers.filter((m) => {
      if (m.organizationId !== org.id) return false;
      const u = userById.get(m.userId);
      return u ? !u.isSuperAdmin && !isSuperAdminEmail(u.email) : false;
    });
    const ownerMem = orgMembers.find((m) => m.role === "owner");
    const ownerUser = ownerMem ? userById.get(ownerMem.userId) : undefined;

    const snap = snapshotByOrgId.get(org.id);
    const accountsCount = snap?.accounts?.length ?? 31;
    const invoicesCount = snap?.invoices?.length ?? 0;
    const journalEntriesCount = snap?.journalEntries?.length ?? 0;
    const bankTransactionsCount = snap?.bankTransactions?.length ?? 0;

    totalInvoicesAcrossPlatform += invoicesCount;
    totalJournalEntriesAcrossPlatform += journalEntriesCount;
    totalBankTransactionsAcrossPlatform += bankTransactionsCount;

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      baseCurrency: org.baseCurrency,
      ownerEmail: ownerUser?.email ?? org.ownerEmail ?? null,
      ownerName: ownerUser?.fullName ?? null,
      isSuspended: org.isSuspended,
      planStatus: org.isSuspended ? "suspended" : org.planStatus,
      createdAt: org.createdAt.toISOString(),
      memberCount: orgMembers.length,
      accountsCount,
      invoicesCount,
      journalEntriesCount,
      bankTransactionsCount,
    };
  });

  const sessionsCountByUser = new Map<string, number>();
  for (const s of activeSessions) {
    sessionsCountByUser.set(
      s.userId,
      (sessionsCountByUser.get(s.userId) ?? 0) + 1
    );
  }

  let totalOwners = 0;
  let totalStaff = 0;
  let totalAccountants = 0;

  const userRows = allUsers.map((u) => {
    const isSuper = Boolean(u.isSuperAdmin) || isSuperAdminEmail(u.email);
    const memberships = allMembers
      .filter((m) => m.userId === u.id)
      .map((m) => ({
        organizationId: m.organizationId,
        organizationName: orgById.get(m.organizationId)?.name ?? "Unknown Org",
        role: m.role,
      }));

    if (!isSuper) {
      if (memberships.some((m) => m.role === "owner")) totalOwners++;
      else if (memberships.some((m) => m.role === "staff")) totalStaff++;
      else if (memberships.some((m) => m.role === "accountant"))
        totalAccountants++;
    }

    return {
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      isSuperAdmin: isSuper,
      emailVerified: u.emailVerified,
      isSuspended: u.isSuspended,
      createdAt: u.createdAt.toISOString(),
      activeSessions: sessionsCountByUser.get(u.id) ?? 0,
      memberships,
    };
  });

  return {
    kpis: {
      totalOrganizations: allOrgs.length,
      activeOrganizations: allOrgs.filter((o) => !o.isSuspended).length,
      suspendedOrganizations: allOrgs.filter((o) => o.isSuspended).length,
      totalUsers: allUsers.length,
      totalOwners,
      totalStaff,
      totalAccountants,
      suspendedUsers: allUsers.filter((u) => u.isSuspended).length,
      activeSessionsCount: activeSessions.length,
      pendingOtpsCount: activeOtps.length,
      pendingInvitationsCount: activeInvites.length,
      totalInvoicesAcrossPlatform,
      totalJournalEntriesAcrossPlatform,
      totalBankTransactionsAcrossPlatform,
    },
    organizations: orgRows,
    users: userRows,
    pendingOtps: activeOtps.map((o) => ({
      id: o.id,
      email: o.email,
      fullName: o.fullName,
      organizationName: o.organizationName,
      attempts: o.attempts,
      expiresAt: o.expiresAt.toISOString(),
    })),
    pendingInvitations: activeInvites.map((inv) => ({
      id: inv.id,
      email: inv.email,
      fullName: inv.fullName,
      role: inv.role,
      organizationId: inv.organizationId,
      organizationName:
        orgById.get(inv.organizationId)?.name ?? "Unknown Organization",
      expiresAt: inv.expiresAt.toISOString(),
    })),
  };
}

export async function adminToggleOrganizationSuspension(
  organizationId: string,
  suspend: boolean
): Promise<void> {
  const db = await getDb();
  await db
    .update(organizations)
    .set({
      isSuspended: suspend,
      planStatus: suspend ? "suspended" : "active",
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, organizationId));
}

export async function adminDeleteOrganization(
  organizationId: string
): Promise<void> {
  const db = await getDb();
  await db
    .update(sessions)
    .set({ activeOrganizationId: null })
    .where(eq(sessions.activeOrganizationId, organizationId));

  await db.delete(organizations).where(eq(organizations.id, organizationId));
  evictOrganizationFromCache(organizationId);
}

export async function adminCreateOrganizationAndOwner(input: {
  organizationName: string;
  baseCurrency?: string;
  ownerName: string;
  ownerEmail: string;
  ownerPassword: string;
}): Promise<{ organizationId: string; userId: string }> {
  const orgName = input.organizationName.trim();
  const ownerName = input.ownerName.trim();
  const ownerEmail = input.ownerEmail.trim().toLowerCase();
  const ownerPassword = input.ownerPassword;
  const baseCurrency = (input.baseCurrency || "USD").trim().toUpperCase();

  if (!orgName || !ownerName || !ownerEmail || !ownerEmail.includes("@")) {
    throw new Error("Organization name, owner name, and valid owner email are required.");
  }
  if (isSuperAdminEmail(ownerEmail)) {
    throw new Error("Cannot assign the Super Admin email as a customer owner.");
  }

  const db = await getDb();
  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, ownerEmail))
    .limit(1);

  if (!existingUser && (!ownerPassword || ownerPassword.length < 8)) {
    throw new Error("Owner password must be at least 8 characters for a new user.");
  }

  const created = await db.transaction(async (tx) => {
    let targetUser = existingUser;
    if (!targetUser) {
      const [insertedUser] = await tx
        .insert(users)
        .values({
          email: ownerEmail,
          fullName: ownerName,
          passwordHash: hashPassword(ownerPassword),
          isSuperAdmin: false,
          emailVerified: true,
          isSuspended: false,
        })
        .returning();
      targetUser = insertedUser;
    }

    const [insertedOrg] = await tx
      .insert(organizations)
      .values({
        name: orgName,
        slug: slugifyOrganizationName(orgName),
        baseCurrency,
        ownerEmail,
        isSuspended: false,
        planStatus: "active",
      })
      .returning();

    await tx.insert(organizationMembers).values({
      organizationId: insertedOrg.id,
      userId: targetUser.id,
      role: "owner",
    });

    return { org: insertedOrg, user: targetUser };
  });

  await initializeLedgerForNewOrganization({
    organization: {
      id: created.org.id,
      name: created.org.name,
      slug: created.org.slug,
    },
    ownerInfo: {
      id: created.user.id,
      name: created.user.fullName,
      email: created.user.email,
    },
  });

  return { organizationId: created.org.id, userId: created.user.id };
}

export async function adminToggleUserSuspension(
  userId: string,
  suspend: boolean
): Promise<void> {
  const db = await getDb();
  const [target] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!target) throw new Error("User not found.");
  if (target.isSuperAdmin || isSuperAdminEmail(target.email)) {
    throw new Error("Cannot suspend the Platform Super Administrator.");
  }

  await db
    .update(users)
    .set({ isSuspended: suspend })
    .where(eq(users.id, userId));

  if (suspend) {
    await db.delete(sessions).where(eq(sessions.userId, userId));
  }
}

export async function adminResetUserPassword(
  userId: string,
  newPassword: string
): Promise<void> {
  if (!newPassword || newPassword.length < 8) {
    throw new Error("New password must be at least 8 characters long.");
  }
  const db = await getDb();
  const [target] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!target) throw new Error("User not found.");
  if (target.isSuperAdmin || isSuperAdminEmail(target.email)) {
    throw new Error("Super Admin password cannot be altered from tenant user actions.");
  }

  await db
    .update(users)
    .set({ passwordHash: hashPassword(newPassword) })
    .where(eq(users.id, userId));
}

export async function adminCreateOrAssignUser(input: {
  fullName: string;
  email: string;
  password?: string;
  organizationId: string;
  role: OrganizationRole;
}): Promise<void> {
  const fullName = input.fullName.trim();
  const email = input.email.trim().toLowerCase();
  const password = input.password || "";

  if (!fullName || !email || !email.includes("@") || !input.organizationId) {
    throw new Error("Name, email, and target organization are required.");
  }
  if (isSuperAdminEmail(email)) {
    throw new Error("Super Admin already has unrestricted access to all organizations.");
  }

  const db = await getDb();
  let [targetUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!targetUser) {
    if (password.length < 8) {
      throw new Error("Password must be at least 8 characters for a new user.");
    }
    const [inserted] = await db
      .insert(users)
      .values({
        email,
        fullName,
        passwordHash: hashPassword(password),
        isSuperAdmin: false,
        emailVerified: true,
        isSuspended: false,
      })
      .returning();
    targetUser = inserted;
  }

  const [existingMem] = await db
    .select()
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, input.organizationId),
        eq(organizationMembers.userId, targetUser.id)
      )
    )
    .limit(1);

  if (existingMem) {
    await db
      .update(organizationMembers)
      .set({ role: input.role })
      .where(eq(organizationMembers.id, existingMem.id));
  } else {
    await db.insert(organizationMembers).values({
      organizationId: input.organizationId,
      userId: targetUser.id,
      role: input.role,
    });
  }
}

export async function adminUpdateMembershipRole(input: {
  userId: string;
  organizationId: string;
  role: OrganizationRole;
}): Promise<void> {
  const db = await getDb();
  await db
    .update(organizationMembers)
    .set({ role: input.role })
    .where(
      and(
        eq(organizationMembers.userId, input.userId),
        eq(organizationMembers.organizationId, input.organizationId)
      )
    );
}

export async function adminRevokeUserSessions(userId: string): Promise<void> {
  const db = await getDb();
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

export async function adminDeleteUser(userId: string): Promise<void> {
  const db = await getDb();
  const [target] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!target) throw new Error("User not found.");
  if (target.isSuperAdmin || isSuperAdminEmail(target.email)) {
    throw new Error("Cannot delete the Platform Super Administrator.");
  }

  await db.delete(users).where(eq(users.id, userId));
  await ensureAdminUserInDb();
}
