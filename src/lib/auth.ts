import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, gt } from "drizzle-orm";
import { getDb } from "@/db";
import {
  organizations,
  organizationMembers,
  sessions,
  users,
  type Organization,
  type OrganizationRole,
  type User,
} from "@/db/schema";

const SESSION_COOKIE_NAME = "qb_session";
const SESSION_DURATION_DAYS = 30;

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

export async function createSession(
  userId: string,
  organizationId: string
): Promise<string> {
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

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, rawToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });

  return rawToken;
}

export async function destroyCurrentSession(): Promise<void> {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (rawToken) {
    const db = await getDb();
    const tokenHash = hashSessionToken(rawToken);
    await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
  }
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export interface AuthContext {
  sessionId: string;
  user: Pick<User, "id" | "email" | "fullName" | "createdAt">;
  organization: Organization;
  role: OrganizationRole;
  memberships: Array<{
    organization: Organization;
    role: OrganizationRole;
  }>;
}

export async function getCurrentAuth(): Promise<AuthContext | null> {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
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

  // Load all organizations this user belongs to and verify active membership
  const userMemberships = await db
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

  const activeMembership = userMemberships.find(
    (m) => m.organization.id === row.organization.id
  );

  if (!activeMembership) {
    return null;
  }

  return {
    sessionId: row.session.id,
    user: {
      id: row.user.id,
      email: row.user.email,
      fullName: row.user.fullName,
      createdAt: row.user.createdAt,
    },
    organization: activeMembership.organization,
    role: activeMembership.role,
    memberships: userMemberships,
  };
}

export async function requireAuth(): Promise<AuthContext> {
  const auth = await getCurrentAuth();
  if (!auth) {
    redirect("/login");
  }
  return auth;
}
