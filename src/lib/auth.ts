import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, asc, eq, gt } from "drizzle-orm";
import { getDb } from "@/db";
import {
  emailOtps,
  organizations,
  organizationMembers,
  sessions,
  teamInvitations,
  users,
  type Organization,
  type OrganizationRole,
  type User,
} from "@/db/schema";
import type { QboTeamMember } from "@/lib/qbo-store";
import { sendSignupOtpEmail } from "@/lib/mailer";

export const SESSION_COOKIE_NAME = "qb_session";
export const ACTIVE_ORG_COOKIE_NAME = "qbo_active_org_id";
const SESSION_DURATION_DAYS = 30;
const OTP_EXPIRY_MINUTES = 10;
const MAX_OTP_ATTEMPTS = 5;

/**
 * Platform Super Admin ("Godfather of the Software").
 * Reserved strictly for global platform administration — never injected as the owner of customer companies.
 */
export const DEFAULT_ADMIN = {
  email: "enterandpost02@gmail.com",
  password: "Standard@1122",
  fullName: "Platform Super Admin",
};

export function isSuperAdminEmail(email: string): boolean {
  return email.trim().toLowerCase() === DEFAULT_ADMIN.email.toLowerCase();
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derivedKey}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, key] = storedHash.split(":");
  if (!salt || !key) return false;
  const keyBuffer = Buffer.from(key, "hex");
  const derivedBuffer = crypto.scryptSync(password, salt, 64);
  if (keyBuffer.length !== derivedBuffer.length) return false;
  return crypto.timingSafeEqual(keyBuffer, derivedBuffer);
}

function hashSessionToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function generateOtpCode(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

export function hashOtpCode(email: string, otpCode: string): string {
  const normalized = `${email.trim().toLowerCase()}:${otpCode.trim()}`;
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

export function verifyOtpHash(
  email: string,
  otpCode: string,
  storedHash: string
): boolean {
  const computed = hashOtpCode(email, otpCode);
  const a = Buffer.from(computed, "hex");
  const b = Buffer.from(storedHash, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function slugifyOrganizationName(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const suffix = crypto.randomBytes(3).toString("hex");
  return `${base || "business"}-${suffix}`;
}

/**
 * Ensures the Platform Super Admin (`enterandpost02@gmail.com`) exists in `users`
 * with `isSuperAdmin = true`. Also guarantees at least one fallback workspace organization
 * exists so `sessions.active_organization_id` always has a valid FK target.
 */
export async function ensureAdminUserInDb(): Promise<{
  user: User;
  org: Organization;
}> {
  const db = await getDb();
  const email = DEFAULT_ADMIN.email.toLowerCase();
  const password = DEFAULT_ADMIN.password;
  const fullName = DEFAULT_ADMIN.fullName;

  const existingUsers = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  let adminUser = existingUsers[0];
  if (!adminUser) {
    const [inserted] = await db
      .insert(users)
      .values({
        email,
        fullName,
        passwordHash: hashPassword(password),
        isSuperAdmin: true,
        emailVerified: true,
        isSuspended: false,
      })
      .returning();
    adminUser = inserted;
  } else {
    const needsPassUpdate = !verifyPassword(password, adminUser.passwordHash);
    if (
      !adminUser.isSuperAdmin ||
      adminUser.isSuspended ||
      !adminUser.emailVerified ||
      needsPassUpdate ||
      adminUser.fullName === "Craig Carlson"
    ) {
      const [updated] = await db
        .update(users)
        .set({
          fullName,
          isSuperAdmin: true,
          emailVerified: true,
          isSuspended: false,
          ...(needsPassUpdate ? { passwordHash: hashPassword(password) } : {}),
        })
        .where(eq(users.id, adminUser.id))
        .returning();
      adminUser = updated;
    }
  }

  // Ensure Super Admin is detached from tenant organization_members rows (Super Admin accesses globally via isSuperAdmin)
  await db
    .delete(organizationMembers)
    .where(eq(organizationMembers.userId, adminUser.id));

  let [primaryOrg] = await db
    .select()
    .from(organizations)
    .orderBy(asc(organizations.createdAt))
    .limit(1);

  if (!primaryOrg) {
    const [newOrg] = await db
      .insert(organizations)
      .values({
        name: "Demo Sandbox Company",
        slug: slugifyOrganizationName("Demo Sandbox Company"),
        baseCurrency: "USD",
        planStatus: "active",
      })
      .returning();
    primaryOrg = newOrg;
  }

  return { user: adminUser, org: primaryOrg };
}

export async function createSessionRecordInDb(
  userId: string,
  organizationId: string
): Promise<{ rawToken: string; expiresAt: Date }> {
  const db = await getDb();
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashSessionToken(rawToken);
  const expiresAt = new Date(
    Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000
  );

  await db.insert(sessions).values({
    tokenHash,
    userId,
    activeOrganizationId: organizationId,
    expiresAt,
  });

  return { rawToken, expiresAt };
}

export async function createSession(
  userId: string,
  organizationId: string
): Promise<string> {
  const { rawToken, expiresAt } = await createSessionRecordInDb(
    userId,
    organizationId
  );

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, rawToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
  cookieStore.set(ACTIVE_ORG_COOKIE_NAME, organizationId, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });

  return rawToken;
}

export async function destroyCurrentSession(): Promise<void> {
  try {
    const cookieStore = await cookies();
    const rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (rawToken) {
      const db = await getDb();
      const tokenHash = hashSessionToken(rawToken);
      await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
    }
    cookieStore.delete(SESSION_COOKIE_NAME);
    cookieStore.delete(ACTIVE_ORG_COOKIE_NAME);
  } catch {
    // Ignore when called outside a Next.js cookie context
  }
}

export interface AuthContext {
  sessionId: string;
  user: Pick<
    User,
    | "id"
    | "email"
    | "fullName"
    | "isSuperAdmin"
    | "emailVerified"
    | "isSuspended"
    | "createdAt"
  >;
  isSuperAdmin: boolean;
  organization: Organization;
  role: OrganizationRole;
  memberships: Array<{
    organization: Organization;
    role: OrganizationRole;
  }>;
}

export async function resolveAuthFromRawToken(
  rawToken: string
): Promise<AuthContext | null> {
  if (!rawToken) return null;

  const tokenHash = hashSessionToken(rawToken);
  const db = await getDb();
  const now = new Date();

  const sessionRows = await db
    .select({
      session: sessions,
      user: users,
      organization: organizations,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .innerJoin(
      organizations,
      eq(sessions.activeOrganizationId, organizations.id)
    )
    .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, now)))
    .limit(1);

  const row = sessionRows[0];
  if (!row) return null;

  const isSuper =
    Boolean(row.user.isSuperAdmin) || isSuperAdminEmail(row.user.email);

  // Non-super-admin users who are suspended or unverified cannot authenticate
  if (!isSuper && (row.user.isSuspended || !row.user.emailVerified)) {
    return null;
  }

  if (isSuper) {
    const allOrgs = await db
      .select()
      .from(organizations)
      .orderBy(asc(organizations.createdAt));

    const activeOrg =
      allOrgs.find((o) => o.id === row.organization.id) ??
      row.organization ??
      allOrgs[0];

    return {
      sessionId: row.session.id,
      user: {
        id: row.user.id,
        email: row.user.email,
        fullName: row.user.fullName,
        isSuperAdmin: true,
        emailVerified: true,
        isSuspended: false,
        createdAt: row.user.createdAt,
      },
      isSuperAdmin: true,
      organization: activeOrg,
      role: "owner",
      memberships: allOrgs.map((org) => ({
        organization: org,
        role: "owner" as OrganizationRole,
      })),
    };
  }

  // Regular user (Owner / Staff / Accountant): strictly load active memberships in non-suspended organizations
  const userMembershipsRaw = await db
    .select({
      organization: organizations,
      role: organizationMembers.role,
    })
    .from(organizationMembers)
    .innerJoin(
      organizations,
      eq(organizationMembers.organizationId, organizations.id)
    )
    .where(eq(organizationMembers.userId, row.user.id));

  const activeOrgMemberships = userMembershipsRaw.filter(
    (m) => !m.organization.isSuspended
  );

  if (activeOrgMemberships.length === 0) {
    return null;
  }

  let activeMembership = activeOrgMemberships.find(
    (m) => m.organization.id === row.organization.id
  );

  // If current session org was suspended or revoked, fall back to user's first valid membership
  if (!activeMembership) {
    activeMembership = activeOrgMemberships[0];
    await db
      .update(sessions)
      .set({ activeOrganizationId: activeMembership.organization.id })
      .where(eq(sessions.id, row.session.id));
  }

  return {
    sessionId: row.session.id,
    user: {
      id: row.user.id,
      email: row.user.email,
      fullName: row.user.fullName,
      isSuperAdmin: false,
      emailVerified: row.user.emailVerified,
      isSuspended: row.user.isSuspended,
      createdAt: row.user.createdAt,
    },
    isSuperAdmin: false,
    organization: activeMembership.organization,
    role: activeMembership.role,
    memberships: activeOrgMemberships,
  };
}

export async function getCurrentAuth(): Promise<AuthContext | null> {
  let rawToken: string | undefined;
  try {
    const cookieStore = await cookies();
    rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  } catch {
    return null;
  }
  if (!rawToken) return null;
  return resolveAuthFromRawToken(rawToken);
}

export async function requireAuth(): Promise<AuthContext> {
  const auth = await getCurrentAuth();
  if (!auth) {
    redirect("/login");
  }
  return auth;
}

export async function requireSuperAdmin(): Promise<AuthContext> {
  const auth = await getCurrentAuth();
  if (!auth) {
    redirect("/login");
  }
  if (!auth.isSuperAdmin) {
    redirect("/dashboard");
  }
  return auth;
}

// ============================================================================
// 2-Step Email OTP Signup & Verification Engine
// ============================================================================

export interface RequestSignupOtpInput {
  fullName: string;
  email: string;
  password: string;
  organizationName?: string;
  baseCurrency?: string;
  inviteToken?: string;
}

export interface RequestSignupOtpResult {
  ok: boolean;
  error?: string;
  email?: string;
  organizationName?: string;
  invitedRole?: OrganizationRole;
  expiresInSeconds?: number;
  simulated?: boolean;
  simulatedOtpCode?: string;
}

export async function requestSignupOtp(
  input: RequestSignupOtpInput
): Promise<RequestSignupOtpResult> {
  const fullName = input.fullName.trim();
  const email = input.email.trim().toLowerCase();
  const password = input.password;
  const baseCurrency = (input.baseCurrency || "USD").trim().toUpperCase();
  const inviteToken = input.inviteToken?.trim() || undefined;

  if (!fullName) {
    return { ok: false, error: "Please enter your full name." };
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Please enter a valid email address." };
  }
  if (isSuperAdminEmail(email)) {
    return {
      ok: false,
      error: "This email is reserved for the Platform Super Administrator. Please sign in directly.",
    };
  }
  if (!password || password.length < 8) {
    return {
      ok: false,
      error: "Password must be at least 8 characters long.",
    };
  }

  const db = await getDb();

  // Check if a user account with this email already exists
  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existingUser) {
    return {
      ok: false,
      error: "An account with this email already exists. Please sign in instead.",
    };
  }

  let resolvedOrgName = (input.organizationName || "").trim();
  let invitedRole: OrganizationRole | undefined;

  if (inviteToken) {
    const [inv] = await db
      .select({
        invitation: teamInvitations,
        organization: organizations,
      })
      .from(teamInvitations)
      .innerJoin(
        organizations,
        eq(teamInvitations.organizationId, organizations.id)
      )
      .where(
        and(
          eq(teamInvitations.token, inviteToken),
          eq(teamInvitations.status, "pending"),
          gt(teamInvitations.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!inv) {
      return {
        ok: false,
        error: "This team invitation link is invalid or has expired.",
      };
    }
    if (inv.invitation.email.toLowerCase() !== email) {
      return {
        ok: false,
        error: `This invitation was issued for ${inv.invitation.email}. Please use that email address.`,
      };
    }
    resolvedOrgName = inv.organization.name;
    invitedRole = inv.invitation.role;
  } else {
    // Also check if there is a pending team invitation for this email when no token was in URL
    if (!resolvedOrgName) {
      const [pendingInviteByEmail] = await db
        .select({
          invitation: teamInvitations,
          organization: organizations,
        })
        .from(teamInvitations)
        .innerJoin(
          organizations,
          eq(teamInvitations.organizationId, organizations.id)
        )
        .where(
          and(
            eq(teamInvitations.email, email),
            eq(teamInvitations.status, "pending"),
            gt(teamInvitations.expiresAt, new Date())
          )
        )
        .limit(1);

      if (pendingInviteByEmail) {
        resolvedOrgName = pendingInviteByEmail.organization.name;
        invitedRole = pendingInviteByEmail.invitation.role;
      }
    }

    if (!resolvedOrgName) {
      return {
        ok: false,
        error: "Please enter your Business / Organization name.",
      };
    }
  }

  const otpCode = generateOtpCode();
  const otpHash = hashOtpCode(email, otpCode);
  const passwordHash = hashPassword(password);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await db
    .insert(emailOtps)
    .values({
      email,
      otpHash,
      fullName,
      passwordHash,
      organizationName: resolvedOrgName,
      baseCurrency,
      inviteToken: inviteToken ?? null,
      attempts: 0,
      expiresAt,
    })
    .onConflictDoUpdate({
      target: emailOtps.email,
      set: {
        otpHash,
        fullName,
        passwordHash,
        organizationName: resolvedOrgName,
        baseCurrency,
        inviteToken: inviteToken ?? null,
        attempts: 0,
        expiresAt,
        createdAt: new Date(),
      },
    });

  const mailResult = await sendSignupOtpEmail({
    to: email,
    recipientName: fullName,
    otpCode,
    organizationName: resolvedOrgName,
    expiresInMinutes: OTP_EXPIRY_MINUTES,
  });

  return {
    ok: true,
    email,
    organizationName: resolvedOrgName,
    invitedRole,
    expiresInSeconds: OTP_EXPIRY_MINUTES * 60,
    simulated: mailResult.simulated,
    simulatedOtpCode: mailResult.simulated ? otpCode : undefined,
  };
}

export interface VerifySignupOtpResult {
  ok: boolean;
  error?: string;
  user?: User;
  organization?: Organization;
  role?: OrganizationRole;
  joinedExistingOrg?: boolean;
}

export async function verifySignupOtpRecord(input: {
  email: string;
  otpCode: string;
}): Promise<VerifySignupOtpResult> {
  const email = input.email.trim().toLowerCase();
  const otpCode = input.otpCode.trim().replace(/\s+/g, "");

  if (!email || !/^\d{6}$/.test(otpCode)) {
    return {
      ok: false,
      error: "Please enter a valid 6-digit verification code.",
    };
  }

  const db = await getDb();
  const [pending] = await db
    .select()
    .from(emailOtps)
    .where(eq(emailOtps.email, email))
    .limit(1);

  if (!pending) {
    return {
      ok: false,
      error: "No pending verification found for this email. Please request a new code.",
    };
  }

  if (pending.expiresAt <= new Date()) {
    await db.delete(emailOtps).where(eq(emailOtps.id, pending.id));
    return {
      ok: false,
      error: "Verification code has expired. Please request a new 6-digit code.",
    };
  }

  if (pending.attempts >= MAX_OTP_ATTEMPTS) {
    await db.delete(emailOtps).where(eq(emailOtps.id, pending.id));
    return {
      ok: false,
      error: "Maximum verification attempts exceeded. Please request a new code.",
    };
  }

  const isMatch = verifyOtpHash(email, otpCode, pending.otpHash);
  if (!isMatch) {
    const nextAttempts = pending.attempts + 1;
    if (nextAttempts >= MAX_OTP_ATTEMPTS) {
      await db.delete(emailOtps).where(eq(emailOtps.id, pending.id));
      return {
        ok: false,
        error: "Too many incorrect attempts. Please request a fresh verification code.",
      };
    }
    await db
      .update(emailOtps)
      .set({ attempts: nextAttempts })
      .where(eq(emailOtps.id, pending.id));
    return {
      ok: false,
      error: `Invalid verification code. ${MAX_OTP_ATTEMPTS - nextAttempts} attempt(s) remaining.`,
    };
  }

  // Re-check user doesn't exist already
  const [alreadyRegistered] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (alreadyRegistered) {
    await db.delete(emailOtps).where(eq(emailOtps.id, pending.id));
    return {
      ok: false,
      error: "Account already exists. Please sign in.",
    };
  }

  // Check if joining an existing organization via inviteToken or pending email invitation
  let matchedInvite:
    | {
        invitation: typeof teamInvitations.$inferSelect;
        organization: Organization;
      }
    | undefined;

  if (pending.inviteToken) {
    const [invRow] = await db
      .select({
        invitation: teamInvitations,
        organization: organizations,
      })
      .from(teamInvitations)
      .innerJoin(
        organizations,
        eq(teamInvitations.organizationId, organizations.id)
      )
      .where(
        and(
          eq(teamInvitations.token, pending.inviteToken),
          eq(teamInvitations.status, "pending")
        )
      )
      .limit(1);
    matchedInvite = invRow;
  }

  const created = await db.transaction(async (tx) => {
    const [newUser] = await tx
      .insert(users)
      .values({
        email,
        fullName: pending.fullName,
        passwordHash: pending.passwordHash,
        isSuperAdmin: false,
        emailVerified: true,
        isSuspended: false,
      })
      .returning();

    let targetOrg: Organization;
    let assignedRole: OrganizationRole = "owner";
    let joinedExistingOrg = false;

    if (matchedInvite) {
      targetOrg = matchedInvite.organization;
      assignedRole = matchedInvite.invitation.role;
      joinedExistingOrg = true;

      await tx.insert(organizationMembers).values({
        organizationId: targetOrg.id,
        userId: newUser.id,
        role: assignedRole,
      });

      await tx
        .update(teamInvitations)
        .set({ status: "accepted" })
        .where(eq(teamInvitations.id, matchedInvite.invitation.id));
    } else {
      const slug = slugifyOrganizationName(pending.organizationName);
      const [newOrg] = await tx
        .insert(organizations)
        .values({
          name: pending.organizationName,
          slug,
          baseCurrency: pending.baseCurrency || "USD",
          ownerEmail: email,
          isSuspended: false,
          planStatus: "active",
        })
        .returning();

      await tx.insert(organizationMembers).values({
        organizationId: newOrg.id,
        userId: newUser.id,
        role: "owner",
      });

      targetOrg = newOrg;
      assignedRole = "owner";
      joinedExistingOrg = false;
    }

    await tx.delete(emailOtps).where(eq(emailOtps.id, pending.id));

    return {
      user: newUser,
      organization: targetOrg,
      role: assignedRole,
      joinedExistingOrg,
    };
  });

  return {
    ok: true,
    user: created.user,
    organization: created.organization,
    role: created.role,
    joinedExistingOrg: created.joinedExistingOrg,
  };
}

// ============================================================================
// Real Database Team Management (Owner -> Staff / Accountant / Co-Owner)
// ============================================================================

export async function getOrganizationTeamRosterFromDb(
  organizationId: string
): Promise<QboTeamMember[]> {
  const db = await getDb();

  const [memberRows, pendingInviteRows] = await Promise.all([
    db
      .select({
        memberId: organizationMembers.id,
        userId: users.id,
        fullName: users.fullName,
        email: users.email,
        isSuperAdmin: users.isSuperAdmin,
        role: organizationMembers.role,
      })
      .from(organizationMembers)
      .innerJoin(users, eq(organizationMembers.userId, users.id))
      .where(eq(organizationMembers.organizationId, organizationId))
      .orderBy(asc(organizationMembers.createdAt)),
    db
      .select()
      .from(teamInvitations)
      .where(
        and(
          eq(teamInvitations.organizationId, organizationId),
          eq(teamInvitations.status, "pending"),
          gt(teamInvitations.expiresAt, new Date())
        )
      )
      .orderBy(asc(teamInvitations.createdAt)),
  ]);

  const roster: QboTeamMember[] = [];
  const seenEmails = new Set<string>();

  for (const m of memberRows) {
    // Never expose the Platform Super Admin in customer company team rosters
    if (m.isSuperAdmin || isSuperAdminEmail(m.email)) continue;
    const lower = m.email.toLowerCase();
    seenEmails.add(lower);
    roster.push({
      id: m.userId,
      name: m.fullName,
      email: lower,
      role: m.role,
      status: "Active",
    });
  }

  for (const inv of pendingInviteRows) {
    const lower = inv.email.toLowerCase();
    if (seenEmails.has(lower) || isSuperAdminEmail(lower)) continue;
    seenEmails.add(lower);
    roster.push({
      id: `inv-${inv.id}`,
      name: inv.fullName,
      email: lower,
      role: inv.role,
      status: "Invited",
    });
  }

  return roster;
}

export async function provisionOrInviteTeamMemberInDb(input: {
  organizationId: string;
  invitedByUserId: string;
  name: string;
  email: string;
  role: OrganizationRole;
  initialPassword?: string;
}): Promise<{
  member: QboTeamMember;
  inviteToken?: string;
  provisionedDirectly: boolean;
}> {
  const cleanName = input.name.trim();
  const cleanEmail = input.email.trim().toLowerCase();
  const cleanPassword = input.initialPassword?.trim() || "";

  if (!cleanName || !cleanEmail || !cleanEmail.includes("@")) {
    throw new Error("Valid team member name and email are required.");
  }
  if (isSuperAdminEmail(cleanEmail)) {
    throw new Error(
      "This email belongs to the Platform Administrator and cannot be added as a tenant employee."
    );
  }
  if (cleanPassword && cleanPassword.length < 8) {
    throw new Error(
      "Initial password must be at least 8 characters (or leave blank to send an email invite link)."
    );
  }

  const db = await getDb();

  // Check if user already exists on the platform
  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, cleanEmail))
    .limit(1);

  if (existingUser) {
    // Upsert membership in this organization
    const [existingMem] = await db
      .select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, input.organizationId),
          eq(organizationMembers.userId, existingUser.id)
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
        userId: existingUser.id,
        role: input.role,
      });
    }

    // Revoke any old pending invites for this email in this org
    await db
      .update(teamInvitations)
      .set({ status: "accepted" })
      .where(
        and(
          eq(teamInvitations.organizationId, input.organizationId),
          eq(teamInvitations.email, cleanEmail),
          eq(teamInvitations.status, "pending")
        )
      );

    return {
      member: {
        id: existingUser.id,
        name: existingUser.fullName,
        email: existingUser.email,
        role: input.role,
        status: "Active",
      },
      provisionedDirectly: true,
    };
  }

  // User does not exist yet: if Owner supplied an initialPassword, create verified user immediately!
  if (cleanPassword) {
    const createdUser = await db.transaction(async (tx) => {
      const [u] = await tx
        .insert(users)
        .values({
          email: cleanEmail,
          fullName: cleanName,
          passwordHash: hashPassword(cleanPassword),
          isSuperAdmin: false,
          emailVerified: true,
          isSuspended: false,
        })
        .returning();

      await tx.insert(organizationMembers).values({
        organizationId: input.organizationId,
        userId: u.id,
        role: input.role,
      });

      return u;
    });

    return {
      member: {
        id: createdUser.id,
        name: createdUser.fullName,
        email: createdUser.email,
        role: input.role,
        status: "Active",
      },
      provisionedDirectly: true,
    };
  }

  // Otherwise create a pending invitation token so the employee verifies via Email OTP on /signup
  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  // Mark older pending invites for same org+email as revoked
  await db
    .update(teamInvitations)
    .set({ status: "revoked" })
    .where(
      and(
        eq(teamInvitations.organizationId, input.organizationId),
        eq(teamInvitations.email, cleanEmail),
        eq(teamInvitations.status, "pending")
      )
    );

  const [inv] = await db
    .insert(teamInvitations)
    .values({
      organizationId: input.organizationId,
      email: cleanEmail,
      fullName: cleanName,
      role: input.role,
      token,
      invitedByUserId: input.invitedByUserId,
      status: "pending",
      expiresAt,
    })
    .returning();

  return {
    member: {
      id: `inv-${inv.id}`,
      name: cleanName,
      email: cleanEmail,
      role: input.role,
      status: "Invited",
    },
    inviteToken: token,
    provisionedDirectly: false,
  };
}

export async function updateTeamMemberRoleInDb(input: {
  organizationId: string;
  email: string;
  role: OrganizationRole;
}): Promise<void> {
  const db = await getDb();
  const cleanEmail = input.email.trim().toLowerCase();

  const [u] = await db
    .select()
    .from(users)
    .where(eq(users.email, cleanEmail))
    .limit(1);

  if (u) {
    await db
      .update(organizationMembers)
      .set({ role: input.role })
      .where(
        and(
          eq(organizationMembers.organizationId, input.organizationId),
          eq(organizationMembers.userId, u.id)
        )
      );
  }

  await db
    .update(teamInvitations)
    .set({ role: input.role })
    .where(
      and(
        eq(teamInvitations.organizationId, input.organizationId),
        eq(teamInvitations.email, cleanEmail),
        eq(teamInvitations.status, "pending")
      )
    );
}

export async function removeTeamMemberFromDb(input: {
  organizationId: string;
  email: string;
  actingUserId: string;
}): Promise<void> {
  const db = await getDb();
  const cleanEmail = input.email.trim().toLowerCase();

  const [u] = await db
    .select()
    .from(users)
    .where(eq(users.email, cleanEmail))
    .limit(1);

  if (u) {
    if (u.id === input.actingUserId) {
      throw new Error("You cannot remove your own active Owner account.");
    }
    await db
      .delete(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, input.organizationId),
          eq(organizationMembers.userId, u.id)
        )
      );
    // Invalidate sessions pointing to this organization for the removed user
    await db
      .delete(sessions)
      .where(
        and(
          eq(sessions.userId, u.id),
          eq(sessions.activeOrganizationId, input.organizationId)
        )
      );
  }

  await db
    .update(teamInvitations)
    .set({ status: "revoked" })
    .where(
      and(
        eq(teamInvitations.organizationId, input.organizationId),
        eq(teamInvitations.email, cleanEmail),
        eq(teamInvitations.status, "pending")
      )
    );
}
