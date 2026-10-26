"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
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
  hashPassword,
  requireAuth,
  slugifyOrganizationName,
  verifyPassword,
} from "@/lib/auth";

export interface AuthActionState {
  error?: string;
}

export async function signupAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const organizationName = String(formData.get("organizationName") ?? "").trim();
  const baseCurrency = String(formData.get("baseCurrency") ?? "USD")
    .trim()
    .toUpperCase();

  if (!fullName || !email || !password || !organizationName) {
    return { error: "All fields are required." };
  }

  if (!email.includes("@")) {
    return { error: "Please enter a valid email address." };
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters long." };
  }

  const db = await getDb();

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing.length > 0) {
    return { error: "An account with this email already exists." };
  }

  const passwordHash = hashPassword(password);
  const slug = slugifyOrganizationName(organizationName);

  const created = await db.transaction(async (tx) => {
    const [newUser] = await tx
      .insert(users)
      .values({
        email,
        fullName,
        passwordHash,
      })
      .returning();

    const [newOrg] = await tx
      .insert(organizations)
      .values({
        name: organizationName,
        slug,
        baseCurrency: baseCurrency || "USD",
      })
      .returning();

    await tx.insert(organizationMembers).values({
      organizationId: newOrg.id,
      userId: newUser.id,
      role: "owner",
    });

    return { user: newUser, org: newOrg };
  });

  await createSession(created.user.id, created.org.id);
  redirect("/dashboard");
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
    return { error: "Please enter both email and password." };
  }

  const db = await getDb();

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return { error: "Invalid email or password." };
  }

  const memberships = await db
    .select()
    .from(organizationMembers)
    .where(eq(organizationMembers.userId, user.id))
    .limit(1);

  const firstMembership = memberships[0];
  if (!firstMembership) {
    return { error: "No organization is linked to this user account." };
  }

  await createSession(user.id, firstMembership.organizationId);
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

  const allowed = auth.memberships.some(
    (m) => m.organization.id === targetOrgId
  );
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
      })
      .returning();

    await tx.insert(organizationMembers).values({
      organizationId: org.id,
      userId: auth.user.id,
      role: "owner",
    });

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
