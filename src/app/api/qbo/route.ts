import { NextResponse } from "next/server";
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
  resetQboStore,
  reverseJournalEntry,
  runAiAutoCategorizer,
  setActiveRole,
  setPeriodLockDate,
  wipeAllCompanyTransactions,
} from "@/lib/qbo-store";
import {
  createOrganizationInDb,
  loadQboStoreFromDb,
  saveQboStoreFast,
  setActiveOrgCookieSafe,
} from "@/lib/qbo-db";
import { sendTeamInviteEmail } from "@/lib/mailer";
import { getCurrentAuth } from "@/lib/auth";

export async function GET() {
  const { state } = await loadQboStoreFromDb();
  return NextResponse.json(state);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, payload } = body;

    if (action === "switch_organization") {
      await setActiveOrgCookieSafe(payload.organizationId);
      const { state } = await loadQboStoreFromDb(payload.organizationId);
      return NextResponse.json(state);
    }

    if (action === "create_organization") {
      const newOrgId = await createOrganizationInDb({
        name: payload.name,
        template: payload.template ?? "empty",
        industry: payload.industry,
        taxId: payload.taxId,
      });
      const { state } = await loadQboStoreFromDb(newOrgId);
      return NextResponse.json(state);
    }

    const { organizationId } = await loadQboStoreFromDb();

    // Verify authenticated user authorization (RBAC)
    const auth = await getCurrentAuth();
    if (auth) {
      if (auth.role === "accountant") {
        if (action === "set_active_role" && payload?.role !== "accountant") {
          return NextResponse.json(
            { error: "Forbidden: Accountants cannot elevate their role to owner or staff." },
            { status: 403 }
          );
        }
        if (action !== "set_active_role") {
          return NextResponse.json(
            { error: "Forbidden: Accountant role is strictly read-only and cannot mutate company records." },
            { status: 403 }
          );
        }
      }

      if (auth.role === "staff") {
        const ownerOnlyActions = ["wipe_transactions", "set_period_lock", "create_organization"];
        if (ownerOnlyActions.includes(action)) {
          return NextResponse.json(
            { error: `Forbidden: Only Company Owners can perform '${action}'.` },
            { status: 403 }
          );
        }
      }
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
        const state = saveQboStoreFast(organizationId);
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
      case "set_active_role": {
        setActiveRole(payload.role);
        break;
      }
      case "invite_team_member": {
        const member = inviteTeamMember(payload);
        const origin = new URL(request.url).origin;
        const mailResult = await sendTeamInviteEmail({
          to: payload.email,
          recipientName: payload.name,
          role: payload.role,
          companyName: getRawStore().companyName,
          inviterName: "Enter & Post Admin",
          inviterEmail: "enterandpost02@gmail.com",
          appUrl: origin,
        });
        const state = saveQboStoreFast(organizationId);
        return NextResponse.json({ ...state, inviteEmailResult: mailResult });
      }
      case "resend_invite_email": {
        const rawStore = getRawStore();
        const member = rawStore.teamMembers.find(
          (m) => m.id === payload.memberId || m.email === payload.email
        );
        if (!member) {
          throw new Error("Team member not found");
        }
        const origin = new URL(request.url).origin;
        const mailResult = await sendTeamInviteEmail({
          to: member.email,
          recipientName: member.name,
          role: member.role,
          companyName: rawStore.companyName,
          inviterName: "Enter & Post Admin",
          inviterEmail: "enterandpost02@gmail.com",
          appUrl: origin,
        });
        const state = saveQboStoreFast(organizationId);
        return NextResponse.json({ ...state, inviteEmailResult: mailResult });
      }
      case "reset_demo": {
        resetQboStore();
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

    const state = saveQboStoreFast(organizationId);
    return NextResponse.json(state);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unexpected accounting error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
