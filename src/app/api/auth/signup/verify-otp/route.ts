import { NextResponse } from "next/server";
import { createSession, verifySignupOtpRecord } from "@/lib/auth";
import { initializeLedgerForNewOrganization } from "@/lib/qbo-db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email ?? "");
    const otpCode = String(body.otpCode ?? "");

    const verified = await verifySignupOtpRecord({ email, otpCode });
    if (!verified.ok || !verified.user || !verified.organization) {
      return NextResponse.json(
        { error: verified.error || "Verification failed." },
        { status: 400 }
      );
    }

    if (!verified.joinedExistingOrg) {
      await initializeLedgerForNewOrganization({
        organization: {
          id: verified.organization.id,
          name: verified.organization.name,
          slug: verified.organization.slug,
        },
        ownerInfo: {
          id: verified.user.id,
          name: verified.user.fullName,
          email: verified.user.email,
        },
      });
    }

    await createSession(verified.user.id, verified.organization.id);

    return NextResponse.json({
      success: true,
      redirectTo: "/dashboard",
      organizationName: verified.organization.name,
      role: verified.role,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to verify OTP and initialize account.",
      },
      { status: 500 }
    );
  }
}
