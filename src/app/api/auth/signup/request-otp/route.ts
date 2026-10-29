import { NextResponse } from "next/server";
import { requestSignupOtp } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await requestSignupOtp({
      fullName: String(body.fullName ?? ""),
      email: String(body.email ?? ""),
      password: String(body.password ?? ""),
      organizationName: body.organizationName
        ? String(body.organizationName)
        : undefined,
      baseCurrency: body.baseCurrency ? String(body.baseCurrency) : "USD",
      inviteToken: body.inviteToken ? String(body.inviteToken) : undefined,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      email: result.email,
      organizationName: result.organizationName,
      invitedRole: result.invitedRole,
      expiresInSeconds: result.expiresInSeconds,
      simulated: result.simulated,
      simulatedOtpCode: result.simulated ? result.simulatedOtpCode : undefined,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to dispatch verification code.",
      },
      { status: 500 }
    );
  }
}
