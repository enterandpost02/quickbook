"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import {
  organizationMembers,
  organizations,
  sessions,
  users,
} from "@/db/schema";
import {
  createSession,
  destroyCurrentSession,
  ensureAdminUserInDb,
  DEFAULT_ADMIN,
  isSuperAdminEmail,
  requireAuth,
  slugifyOrganizationName,
  verifyPassword,
} from "@/lib/auth";

export interface AuthActionState {
  error?: string;
}

export async function loginAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Please enter both your email address and password." };
  }

  const db = await getDb();

  // Ensure Platform Super Admin ("Godfather") exists in PostgreSQL when signing in
  if (isSuperAdminEmail(email) && password === DEFAULT_ADMIN.password) {
    await ensureAdminUserInDb();
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return { error: "Invalid email address or password." };
  }

  const isSuper = Boolean(user.isSuperAdmin) || isSuperAdminEmail(user.email);

  if (isSuper) {
    const adminEnsured = await ensureAdminUserInDb();
    await createSession(user.id, adminEnsured.org.id);
    redirect("/admin");
  }

  if (user.isSuspended) {
    return {
      error:
        "This user account has been suspended by the Platform Administrator. Please contact support.",
    };
  }

  if (!user.emailVerified) {
    return {
      error:
        "Your email address has not been verified yet. Please complete OTP verification on the signup page.",
    };
  }

  const userMemberships = await db
    .select({
      membership: organizationMembers,
      organization: organizations,
    })
    .from(organizationMembers)
    .innerJoin(
      organizations,
      eq(organizationMembers.organizationId, organizations.id)
    )
    .where(eq(organizationMembers.userId, user.id))
    .orderBy(asc(organizationMembers.createdAt));

  if (userMemberships.length === 0) {
    return {
      error:
        "No organization is linked to this account. Please contact your Company Owner or Platform Support.",
    };
  }

  const activeMemberships = userMemberships.filter(
    (m) => !m.organization.isSuspended
  );

  if (activeMemberships.length === 0) {
    return {
      error:
        "Your organization workspace is currently suspended by the Platform Administrator.",
    };
  }

  await createSession(user.id, activeMemberships[0].organization.id);
  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  await destroyCurrentSession();
  redirect("/login");
}

export async function switchOrganizationAction(
  formData: FormData
): Promise<void> {
  const targetOrgId = String(formData.get("organizationId") ?? "");
  const auth = await requireAuth();

  const allowed =
    auth.isSuperAdmin ||
    auth.memberships.some((m) => m.organization.id === targetOrgId);
  if (!allowed) {
    throw new Error("Unauthorized organization switch attempt.");
  }

  const db = await getDb();
  await db
    .update(sessions)
    .set({ activeOrganizationId: targetOrgId })
    .where(eq(sessions.id, auth.sessionId));

  revalidatePath("/dashboard");
}

export async function createOrganizationAction(
  formData: FormData
): Promise<void> {
  const auth = await requireAuth();
  if (!auth.isSuperAdmin && auth.role !== "owner") {
    throw new Error("Only Company Owners can create new organizations.");
  }

  const name = String(formData.get("name") ?? "").trim();
  const baseCurrency = String(formData.get("baseCurrency") ?? "USD")
    .trim()
    .toUpperCase();

  if (!name) return;

  const db = await getDb();
  const slug = slugifyOrganizationName(name);

  const newOrg = await db.transaction(async (tx) => {
    const [org] = await tx
      .insert(organizations)
      .values({
        name,
        slug,
        baseCurrency: baseCurrency || "USD",
        ownerEmail: auth.user.email,
        planStatus: "active",
      })
      .returning();

    if (!auth.isSuperAdmin) {
      await tx.insert(organizationMembers).values({
        organizationId: org.id,
        userId: auth.user.id,
        role: "owner",
      });
    }

    await tx
      .update(sessions)
      .set({ activeOrganizationId: org.id })
      .where(eq(sessions.id, auth.sessionId));

    return org;
  });

  if (newOrg) {
    revalidatePath("/dashboard");
  }
}
