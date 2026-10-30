import nodemailer from "nodemailer";

export const DEFAULT_SENDER_EMAIL = "enterandpost02@gmail.com";
export const DEFAULT_SENDER_NAME = "Pro E Books";

export interface SendInviteEmailParams {
  to: string;
  recipientName: string;
  role: "owner" | "staff" | "accountant";
  companyName: string;
  inviterName?: string;
  inviterEmail?: string;
  inviteToken?: string;
  hasInitialPassword?: boolean;
  appUrl?: string;
}

export interface SendInviteEmailResult {
  success: boolean;
  messageId?: string;
  simulated: boolean;
  from: string;
  to: string;
  subject: string;
  role: string;
  inviteLink: string;
  previewSnippet: string;
  error?: string;
}

export interface SendOtpEmailParams {
  to: string;
  recipientName: string;
  otpCode: string;
  organizationName: string;
  expiresInMinutes?: number;
}

export interface SendOtpEmailResult {
  success: boolean;
  messageId?: string;
  simulated: boolean;
  from: string;
  to: string;
  subject: string;
  error?: string;
}

function getSmtpConfig() {
  const fromEmail =
    process.env.GMAIL_USER ||
    process.env.SMTP_USER ||
    DEFAULT_SENDER_EMAIL;
  const fromHeader = `"${DEFAULT_SENDER_NAME}" <${fromEmail}>`;
  const rawPass =
    process.env.GMAIL_APP_PASSWORD ||
    process.env.SMTP_PASS ||
    process.env.EMAIL_PASSWORD;
  const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
  const smtpPort = Number(process.env.SMTP_PORT || 465);
  const smtpPass =
    rawPass && smtpHost.includes("gmail.com")
      ? rawPass.replace(/\s+/g, "")
      : rawPass;

  return {
    fromEmail,
    fromHeader,
    smtpPass,
    smtpHost,
    smtpPort,
  };
}

function getRoleDescription(role: "owner" | "staff" | "accountant"): {
  title: string;
  summary: string;
  badgeColor: string;
} {
  switch (role) {
    case "owner":
      return {
        title: "Company Owner (Administrator)",
        summary:
          "Full administrative permissions to manage company settings, invite employees, close books, and post entries.",
        badgeColor: "#2CA01C",
      };
    case "staff":
      return {
        title: "Staff Bookkeeper",
        summary:
          "Permissions to record customer invoices, receive payments, enter vendor bills, categorize bank feeds, and reconcile accounts.",
        badgeColor: "#0077C5",
      };
    case "accountant":
      return {
        title: "Accountant / External Auditor (Read-Only)",
        summary:
          "Audit-only permissions to inspect General Ledger, Trial Balance, Profit & Loss, Balance Sheet, and Security Audit Logs.",
        badgeColor: "#6B7280",
      };
  }
}

export async function sendSignupOtpEmail(
  params: SendOtpEmailParams
): Promise<SendOtpEmailResult> {
  const { fromEmail, fromHeader, smtpPass, smtpHost, smtpPort } = getSmtpConfig();
  const expiresMinutes = params.expiresInMinutes ?? 10;
  const subject = `${params.otpCode} is your Pro E Books verification code`;

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F4F5F8; margin: 0; padding: 24px; color: #1E252B; }
    .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #E5E7EB; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { background: #1E252B; padding: 22px 28px; text-align: left; border-bottom: 4px solid #2CA01C; }
    .header-logo { color: #ffffff; font-size: 20px; font-weight: bold; letter-spacing: -0.5px; }
    .header-logo span { color: #2CA01C; }
    .body { padding: 32px 28px; }
    h1 { font-size: 20px; font-weight: 700; color: #111827; margin: 0 0 12px; }
    p { font-size: 14px; line-height: 1.6; color: #4B5563; margin: 0 0 16px; }
    .otp-box { background: #F0FDF4; border: 2px dashed #2CA01C; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
    .otp-code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #166534; }
    .otp-note { font-size: 12px; color: #6B7280; margin-top: 8px; }
    .footer { background: #F9FAFB; padding: 18px 28px; border-top: 1px solid #E5E7EB; font-size: 12px; color: #9CA3AF; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="header-logo">Pro <span>E Books</span></div>
    </div>
    <div class="body">
      <h1>Verify your email address</h1>
      <p>Hello <strong>${params.recipientName}</strong>,</p>
      <p>
        Enter the 6-digit verification code below to verify your email and activate
        <strong>${params.organizationName}</strong> on Pro E Books:
      </p>
      <div class="otp-box">
        <div class="otp-code">${params.otpCode}</div>
        <div class="otp-note">Expires in ${expiresMinutes} minutes · Do not share this code with anyone</div>
      </div>
      <p style="font-size: 12px; color: #6B7280;">
        If you did not request a Pro E Books account, you can safely ignore this message.
      </p>
    </div>
    <div class="footer">
      Sent securely by Pro E Books Cloud Accounting (${fromEmail})
    </div>
  </div>
</body>
</html>
  `.trim();

  if (smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        service: smtpHost.includes("gmail") ? "gmail" : undefined,
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: fromEmail,
          pass: smtpPass,
        },
      });

      const info = await transporter.sendMail({
        from: fromHeader,
        to: params.to,
        subject,
        html: htmlBody,
        text: `Hello ${params.recipientName},\n\nYour Pro E Books verification code for ${params.organizationName} is: ${params.otpCode}\n\nThis code expires in ${expiresMinutes} minutes.`,
      });

      return {
        success: true,
        messageId: info.messageId,
        simulated: false,
        from: fromEmail,
        to: params.to,
        subject,
      };
    } catch (sendError) {
      console.error("[Mailer] Failed to send OTP via SMTP:", sendError);
      return {
        success: true,
        simulated: true,
        from: fromEmail,
        to: params.to,
        subject,
        error:
          sendError instanceof Error ? sendError.message : String(sendError),
      };
    }
  }

  console.log(`[Mailer] Signup OTP dispatched to ${params.to}: ${params.otpCode}`);
  return {
    success: true,
    simulated: true,
    from: fromEmail,
    to: params.to,
    subject,
  };
}

export async function sendTeamInviteEmail(
  params: SendInviteEmailParams
): Promise<SendInviteEmailResult> {
  const { fromEmail, fromHeader, smtpPass, smtpHost, smtpPort } = getSmtpConfig();
  const subject = `You've been invited to join ${params.companyName} on Pro E Books`;
  const roleInfo = getRoleDescription(params.role);

  const baseUrl =
    params.appUrl ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";

  const inviterDisplay = params.inviterName || "Your Company Owner";
  const inviterContact = params.inviterEmail || fromEmail;

  const inviteLink =
    params.inviteToken && !params.hasInitialPassword
      ? `${baseUrl}/signup?invite=${encodeURIComponent(
          params.inviteToken
        )}&email=${encodeURIComponent(params.to)}&name=${encodeURIComponent(
          params.recipientName
        )}`
      : `${baseUrl}/login`;

  const actionLabel =
    params.inviteToken && !params.hasInitialPassword
      ? "Accept Invitation & Verify Account"
      : "Sign In to Pro E Books";

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F4F5F8; margin: 0; padding: 24px; color: #1E252B; }
    .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #E5E7EB; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { background: #1E252B; padding: 24px; text-align: left; border-bottom: 4px solid #2CA01C; }
    .header-logo { color: #ffffff; font-size: 20px; font-weight: bold; letter-spacing: -0.5px; }
    .header-logo span { color: #2CA01C; }
    .body { padding: 32px 28px; }
    h1 { font-size: 20px; font-weight: 700; color: #111827; margin: 0 0 16px; }
    p { font-size: 14px; line-height: 1.6; color: #4B5563; margin: 0 0 16px; }
    .role-box { background: #F9FAFB; border: 1px solid #E5E7EB; border-left: 4px solid ${roleInfo.badgeColor}; border-radius: 8px; padding: 16px; margin: 20px 0; }
    .role-title { font-size: 14px; font-weight: 700; color: #111827; margin-bottom: 4px; }
    .role-desc { font-size: 13px; color: #6B7280; margin: 0; }
    .btn-container { text-align: center; margin: 28px 0; }
    .btn { display: inline-block; background-color: #2CA01C; color: #ffffff !important; text-decoration: none; font-weight: 700; font-size: 14px; padding: 13px 28px; border-radius: 9999px; }
    .footer { background: #F9FAFB; padding: 20px 28px; border-top: 1px solid #E5E7EB; font-size: 12px; color: #9CA3AF; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="header-logo">Pro <span>E Books</span></div>
    </div>
    <div class="body">
      <h1>Welcome to the team, ${params.recipientName}!</h1>
      <p>
        <strong>${inviterDisplay}</strong> (<a href="mailto:${inviterContact}">${inviterContact}</a>)
        has invited you to access the company ledger for <strong>${params.companyName}</strong>.
      </p>

      <div class="role-box">
        <div class="role-title">Assigned Role: ${roleInfo.title}</div>
        <div class="role-desc">${roleInfo.summary}</div>
      </div>

      <div class="btn-container">
        <a href="${inviteLink}" class="btn">${actionLabel}</a>
      </div>

      <p style="font-size: 12px; color: #6B7280;">
        Access link: <a href="${inviteLink}">${inviteLink}</a> using your email <strong>${params.to}</strong>.
      </p>
    </div>
    <div class="footer">
      This invitation was dispatched via Pro E Books Team Management (${fromEmail}).
      <br>If you were not expecting this message, you can safely ignore this email.
    </div>
  </div>
</body>
</html>
  `.trim();

  const previewSnippet = `Invited ${params.recipientName} (${params.to}) as ${roleInfo.title} to ${params.companyName}. Sent from ${fromEmail}.`;

  if (smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        service: smtpHost.includes("gmail") ? "gmail" : undefined,
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: fromEmail,
          pass: smtpPass,
        },
      });

      const info = await transporter.sendMail({
        from: fromHeader,
        to: params.to,
        subject,
        html: htmlBody,
        text: `Hello ${params.recipientName},\n\n${inviterDisplay} invited you to join ${params.companyName} as ${roleInfo.title}.\n\nContinue here: ${inviteLink}\n\nSent from ${fromEmail}`,
      });

      return {
        success: true,
        messageId: info.messageId,
        simulated: false,
        from: fromEmail,
        to: params.to,
        subject,
        role: params.role,
        inviteLink,
        previewSnippet,
      };
    } catch (sendError) {
      console.error("[Mailer] Failed to send via SMTP:", sendError);
      return {
        success: true,
        simulated: true,
        from: fromEmail,
        to: params.to,
        subject,
        role: params.role,
        inviteLink,
        previewSnippet: `${previewSnippet} (SMTP fallback: check GMAIL_APP_PASSWORD)`,
        error:
          sendError instanceof Error ? sendError.message : String(sendError),
      };
    }
  }

  console.log(`[Mailer] Invitation dispatched to ${params.to} from ${fromEmail}:`);
  console.log(`[Mailer] Subject: ${subject}`);
  console.log(`[Mailer] Invite Link: ${inviteLink}`);

  return {
    success: true,
    simulated: true,
    from: fromEmail,
    to: params.to,
    subject,
    role: params.role,
    inviteLink,
    previewSnippet,
  };
}
