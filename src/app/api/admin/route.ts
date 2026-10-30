import { NextResponse } from "next/server";
import { getCurrentAuth } from "@/lib/auth";
import {
  adminCreateOrAssignUser,
  adminCreateOrganizationAndOwner,
  adminDeleteOrganization,
  adminDeleteUser,
  adminResetUserPassword,
  adminRevokeUserSessions,
  adminToggleOrganizationSuspension,
  adminToggleUserSuspension,
  adminUpdateMembershipRole,
  getPlatformAdminOverview,
} from "@/lib/admin";

export async function GET() {
  const auth = await getCurrentAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!auth.isSuperAdmin) {
    return NextResponse.json(
      { error: "Forbidden: Platform Super Admin privileges required." },
      { status: 403 }
    );
  }

  const overview = await getPlatformAdminOverview();
  return NextResponse.json(overview);
}

export async function POST(request: Request) {
  try {
    const auth = await getCurrentAuth();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!auth.isSuperAdmin) {
      return NextResponse.json(
        { error: "Forbidden: Platform Super Admin privileges required." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, payload } = body;

    switch (action) {
      case "toggle_org_suspension": {
        await adminToggleOrganizationSuspension(
          String(payload.organizationId),
          Boolean(payload.suspend)
        );
        break;
      }

      case "delete_organization": {
        await adminDeleteOrganization(String(payload.organizationId));
        break;
      }

      case "create_org_and_owner": {
        await adminCreateOrganizationAndOwner({
          organizationName: String(payload.organizationName ?? ""),
          baseCurrency: String(payload.baseCurrency ?? "USD"),
          ownerName: String(payload.ownerName ?? ""),
          ownerEmail: String(payload.ownerEmail ?? ""),
          ownerPassword: String(payload.ownerPassword ?? ""),
          template: payload.template === "sample" ? "sample" : "empty",
        });
        break;
      }

      case "toggle_user_suspension": {
        await adminToggleUserSuspension(
          String(payload.userId),
          Boolean(payload.suspend)
        );
        break;
      }

      case "reset_user_password": {
        await adminResetUserPassword(
          String(payload.userId),
          String(payload.newPassword ?? "")
        );
        break;
      }

      case "create_or_assign_user": {
        await adminCreateOrAssignUser({
          fullName: String(payload.fullName ?? ""),
          email: String(payload.email ?? ""),
          password: String(payload.password ?? ""),
          organizationId: String(payload.organizationId ?? ""),
          role: payload.role,
        });
        break;
      }

      case "update_membership_role": {
        await adminUpdateMembershipRole({
          userId: String(payload.userId),
          organizationId: String(payload.organizationId),
          role: payload.role,
        });
        break;
      }

      case "revoke_user_sessions": {
        await adminRevokeUserSessions(String(payload.userId));
        break;
      }

      case "delete_user": {
        await adminDeleteUser(String(payload.userId));
        break;
      }

      default:
        return NextResponse.json(
          { error: `Unknown admin action: ${action}` },
          { status: 400 }
        );
    }

    const overview = await getPlatformAdminOverview();
    return NextResponse.json(overview);
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Unexpected Super Admin operation error.",
      },
      { status: 400 }
    );
  }
}
