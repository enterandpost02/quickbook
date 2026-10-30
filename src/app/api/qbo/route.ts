import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { sessions } from "@/db/schema";
import {
  categorizeAllSuggested,
  categorizeBankTransaction,
  convertEstimateToInvoice,
  createAccount,
  createCustomer,
  createEstimate,
  createExpenseOrBill,
  createInvoice,
  createProductService,
  createRule,
  createTransfer,
  createVendor,
  excludeBankTransaction,
  finishReconciliation,
  getRawStore,
  importBankCsvRows,
  inviteTeamMember,
  matchBankTransaction,
  payVendorBill,
  postJournalEntry,
  receiveInvoicePayment,
  removeTeamMemberFromStore,
  resetQboStore,
  reverseJournalEntry,
  runAiAutoCategorizer,
  setActiveRole,
  setPeriodLockDate,
  updateTeamMemberRoleInStore,
  wipeAllCompanyTransactions,
} from "@/lib/qbo-store";
import {
  createOrganizationInDb,
  loadQboStoreFromDb,
  saveQboStoreFast,
  setActiveOrgCookieSafe,
} from "@/lib/qbo-db";
import { sendTeamInviteEmail } from "@/lib/mailer";
import {
  getCurrentAuth,
  provisionOrInviteTeamMemberInDb,
  removeTeamMemberFromDb,
  updateTeamMemberRoleInDb,
} from "@/lib/auth";

export async function GET() {
  const auth = await getCurrentAuth();
  if (!auth) {
    return NextResponse.json(
      { error: "Unauthorized: Please sign in to access your books." },
      { status: 401 }
    );
  }

  if (auth.isSuperAdmin) {
    return NextResponse.json(
      {
        error:
          "Forbidden: Platform Super Admin manages tenants and users from /admin and cannot open customer ledgers or workspaces.",
      },
      { status: 403 }
    );
  }

  const allowedOrgIds = auth.memberships.map((m) => m.organization.id);

  const { state } = await loadQboStoreFromDb(auth.organization.id, {
    allowedOrgIds,
  });
  state.activeRole = auth.role;
  return NextResponse.json(state);
}

export async function POST(request: Request) {
  try {
    const auth = await getCurrentAuth();
    if (!auth) {
      return NextResponse.json(
        { error: "Unauthorized: Your session has expired. Please sign in again." },
        { status: 401 }
      );
    }

    if (auth.isSuperAdmin) {
      return NextResponse.json(
        {
          error:
            "Forbidden: Platform Super Admin manages tenants and users from /admin and cannot open or modify customer ledgers or workspaces.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, payload, previewRole } = body;

    const allowedOrgIds = auth.memberships.map((m) => m.organization.id);

    if (action === "switch_organization") {
      const targetOrgId = String(payload?.organizationId ?? "");
      if (!targetOrgId) {
        return NextResponse.json(
          { error: "Organization ID is required." },
          { status: 400 }
        );
      }

      const targetMembership = auth.memberships.find(
        (m) => m.organization.id === targetOrgId
      );
      if (!targetMembership) {
        return NextResponse.json(
          { error: "Forbidden: You do not have access to that organization." },
          { status: 403 }
        );
      }

      const db = await getDb();
      await db
        .update(sessions)
        .set({ activeOrganizationId: targetOrgId })
        .where(eq(sessions.id, auth.sessionId));

      await setActiveOrgCookieSafe(targetOrgId);
      const { state } = await loadQboStoreFromDb(targetOrgId, {
        allowedOrgIds,
      });
      state.activeRole = targetMembership.role;
      return NextResponse.json(state);
    }

    if (action === "create_organization") {
      if (auth.role !== "owner") {
        return NextResponse.json(
          {
            error:
              "Forbidden: Only Company Owners can create new client organizations.",
          },
          { status: 403 }
        );
      }

      const newOrgId = await createOrganizationInDb({
        name: payload.name,
        template: payload.template ?? "empty",
        industry: payload.industry,
        taxId: payload.taxId,
        ownerUserId: auth.user.id,
        ownerInfo: {
          id: auth.user.id,
          name: auth.user.fullName,
          email: auth.user.email,
        },
      });

      const db = await getDb();
      await db
        .update(sessions)
        .set({ activeOrganizationId: newOrgId })
        .where(eq(sessions.id, auth.sessionId));

      const updatedAllowedOrgIds = [...allowedOrgIds, newOrgId];
      const { state } = await loadQboStoreFromDb(newOrgId, {
        allowedOrgIds: updatedAllowedOrgIds,
      });
      state.activeRole = "owner";
      return NextResponse.json(state);
    }

    const { organizationId } = await loadQboStoreFromDb(auth.organization.id, {
      allowedOrgIds,
    });

    // Strict Server-Side Role-Based Authorization (RBAC)
    const effectiveRole = auth.role;
    const isRoleSwitchAction =
      action === "set_active_role" || action === "switch_role";

    if (effectiveRole === "accountant") {
      if (isRoleSwitchAction && payload?.role !== "accountant") {
        return NextResponse.json(
          {
            error:
              "Forbidden: Accountants cannot elevate their role to owner or staff.",
          },
          { status: 403 }
        );
      }
      if (!isRoleSwitchAction) {
        return NextResponse.json(
          {
            error:
              "Forbidden: Accountant role is strictly read-only and cannot mutate company records.",
          },
          { status: 403 }
        );
      }
    }

    if (effectiveRole === "staff") {
      if (isRoleSwitchAction && payload?.role === "owner") {
        return NextResponse.json(
          {
            error:
              "Forbidden: Staff Bookkeepers cannot elevate their role to Company Owner.",
          },
          { status: 403 }
        );
      }

      const ownerOnlyActions = [
        "wipe_transactions",
        "reset_demo",
        "set_period_lock",
        "create_organization",
        "invite_team_member",
        "resend_invite_email",
        "update_team_member_role",
        "remove_team_member",
      ];
      if (ownerOnlyActions.includes(action)) {
        return NextResponse.json(
          { error: `Forbidden: Only Company Owners can perform '${action}'.` },
          { status: 403 }
        );
      }
    }

    // Bind authenticated user's verified role into the store before running mutations
    // Owners / Super Admins may optionally preview staff/accountant permissions in their UI
    const validPreviewRole =
      previewRole === "owner" ||
      previewRole === "staff" ||
      previewRole === "accountant"
        ? (previewRole as "owner" | "staff" | "accountant")
        : undefined;
    const executionRole =
      effectiveRole === "owner" && validPreviewRole && !isRoleSwitchAction
        ? validPreviewRole
        : effectiveRole;

    if (!isRoleSwitchAction) {
      getRawStore().activeRole = executionRole;
    }

    switch (action) {
      case "post_journal_entry": {
        postJournalEntry(payload);
        break;
      }
      case "reverse_journal_entry": {
        reverseJournalEntry(payload.entryId);
        break;
      }
      case "categorize_bank_tx": {
        categorizeBankTransaction(payload);
        break;
      }
      case "match_bank_tx": {
        matchBankTransaction(payload);
        break;
      }
      case "create_customer": {
        createCustomer(payload);
        break;
      }
      case "create_vendor": {
        createVendor(payload);
        break;
      }
      case "categorize_all_suggested": {
        categorizeAllSuggested(payload?.bankAccountId);
        break;
      }
      case "exclude_bank_tx": {
        excludeBankTransaction(payload.transactionId);
        break;
      }
      case "import_csv": {
        const result = importBankCsvRows(payload);
        const state = saveQboStoreFast(
          organizationId,
          undefined,
          allowedOrgIds
        );
        state.activeRole = effectiveRole;
        return NextResponse.json({ ...state, importResult: result });
      }
      case "create_invoice": {
        createInvoice(payload);
        break;
      }
      case "create_estimate": {
        createEstimate(payload);
        break;
      }
      case "convert_estimate": {
        convertEstimateToInvoice(payload.estimateId);
        break;
      }
      case "create_product_service": {
        createProductService(payload);
        break;
      }
      case "create_transfer": {
        createTransfer(payload);
        break;
      }
      case "set_period_lock": {
        setPeriodLockDate(payload.lockedThroughDate ?? null);
        break;
      }
      case "receive_invoice_payment": {
        receiveInvoicePayment(payload);
        break;
      }
      case "create_expense": {
        createExpenseOrBill(payload);
        break;
      }
      case "pay_bill": {
        payVendorBill(payload);
        break;
      }
      case "create_account": {
        createAccount(payload);
        break;
      }
      case "create_rule": {
        createRule(payload);
        break;
      }
      case "reconcile": {
        finishReconciliation(payload);
        break;
      }
      case "run_ai_categorizer": {
        runAiAutoCategorizer();
        break;
      }
      case "switch_role":
      case "set_active_role": {
        setActiveRole(payload.role);
        break;
      }
      case "invite_team_member": {
        const dbInvite = await provisionOrInviteTeamMemberInDb({
          organizationId,
          invitedByUserId: auth.user.id,
          name: payload.name,
          email: payload.email,
          role: payload.role,
          initialPassword: payload.initialPassword,
        });

        inviteTeamMember({
          id: dbInvite.member.id,
          name: dbInvite.member.name,
          email: dbInvite.member.email,
          role: dbInvite.member.role,
          status: dbInvite.member.status,
        });

        const origin = new URL(request.url).origin;
        const mailResult = await sendTeamInviteEmail({
          to: dbInvite.member.email,
          recipientName: dbInvite.member.name,
          role: dbInvite.member.role,
          companyName: getRawStore().companyName,
          inviterName: auth.user.fullName,
          inviterEmail: auth.user.email,
          inviteToken: dbInvite.inviteToken,
          hasInitialPassword: dbInvite.provisionedDirectly,
          appUrl: origin,
        });
        const state = saveQboStoreFast(
          organizationId,
          undefined,
          allowedOrgIds
        );
        state.activeRole = effectiveRole;
        return NextResponse.json({
          ...state,
          inviteEmailResult: mailResult,
          provisionedDirectly: dbInvite.provisionedDirectly,
        });
      }
      case "update_team_member_role": {
        await updateTeamMemberRoleInDb({
          organizationId,
          email: payload.email,
          role: payload.role,
        });
        updateTeamMemberRoleInStore({
          memberId: payload.memberId,
          email: payload.email,
          role: payload.role,
        });
        break;
      }
      case "remove_team_member": {
        await removeTeamMemberFromDb({
          organizationId,
          email: payload.email,
          actingUserId: auth.user.id,
        });
        removeTeamMemberFromStore({
          memberId: payload.memberId,
          email: payload.email,
        });
        break;
      }
      case "resend_invite_email": {
        const rawStore = getRawStore();
        const member = rawStore.teamMembers.find(
          (m) => m.id === payload.memberId || m.email === payload.email
        );
        if (!member) {
          throw new Error("Team member not found");
        }
        const reInvite = await provisionOrInviteTeamMemberInDb({
          organizationId,
          invitedByUserId: auth.user.id,
          name: member.name,
          email: member.email,
          role: member.role,
        });
        const origin = new URL(request.url).origin;
        const mailResult = await sendTeamInviteEmail({
          to: member.email,
          recipientName: member.name,
          role: member.role,
          companyName: rawStore.companyName,
          inviterName: auth.user.fullName,
          inviterEmail: auth.user.email,
          inviteToken: reInvite.inviteToken,
          hasInitialPassword: reInvite.provisionedDirectly,
          appUrl: origin,
        });
        const state = saveQboStoreFast(
          organizationId,
          undefined,
          allowedOrgIds
        );
        state.activeRole = effectiveRole;
        return NextResponse.json({ ...state, inviteEmailResult: mailResult });
      }
      case "reset_demo": {
        resetQboStore(
          auth.isSuperAdmin
            ? undefined
            : {
                id: auth.user.id,
                name: auth.user.fullName,
                email: auth.user.email,
              }
        );
        break;
      }
      case "wipe_transactions": {
        wipeAllCompanyTransactions();
        break;
      }
      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    const state = saveQboStoreFast(organizationId, undefined, allowedOrgIds);
    if (!isRoleSwitchAction) {
      state.activeRole = executionRole;
    }
    return NextResponse.json(state);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unexpected accounting error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
