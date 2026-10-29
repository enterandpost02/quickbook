import { NextResponse } from "next/server";
import { and, eq, gt } from "drizzle-orm";
import { getDb } from "@/db";
import { organizations, teamInvitations } from "@/db/schema";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = (searchParams.get("token") || "").trim();
  if (!token) {
    return NextResponse.json({ valid: false }, { status: 400 });
  }

  const db = await getDb();
  const [row] = await db
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
        eq(teamInvitations.token, token),
        eq(teamInvitations.status, "pending"),
        gt(teamInvitations.expiresAt, new Date())
      )
    )
    .limit(1);

  if (!row) {
    return NextResponse.json({
      valid: false,
      error: "This invitation link is invalid or has expired.",
    });
  }

  return NextResponse.json({
    valid: true,
    email: row.invitation.email,
    fullName: row.invitation.fullName,
    role: row.invitation.role,
    organizationName: row.organization.name,
  });
}
