import { NextResponse } from "next/server";
import {
  categorizeBankTransaction,
  convertEstimateToInvoice,
  createAccount,
  createEstimate,
  createExpenseOrBill,
  createInvoice,
  createProductService,
  createRule,
  createTransfer,
  excludeBankTransaction,
  finishReconciliation,
  getComputedQboState,
  getRawStore,
  importBankCsvRows,
  inviteTeamMember,
  payVendorBill,
  postJournalEntry,
  receiveInvoicePayment,
  resetQboStore,
  reverseJournalEntry,
  runAiAutoCategorizer,
  setActiveRole,
  setPeriodLockDate,
} from "@/lib/qbo-store";
import { loadQboStoreFromDb, persistQboStoreToDb } from "@/lib/qbo-db";

export async function GET() {
  const { state } = await loadQboStoreFromDb();
  return NextResponse.json(state);
}

export async function POST(request: Request) {
  try {
    const { organizationId } = await loadQboStoreFromDb();
    const body = await request.json();
    const { action, payload } = body;

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
      case "categorize_all_suggested": {
        const store = getRawStore();
        const pendingWithSuggestion = store.bankTransactions.filter(
          (t) =>
            t.status === "for_review" &&
            t.suggestedAccountId &&
            (!payload?.bankAccountId || t.bankAccountId === payload.bankAccountId)
        );
        for (const tx of pendingWithSuggestion) {
          if (tx.suggestedAccountId) {
            categorizeBankTransaction({
              transactionId: tx.id,
              categoryAccountId: tx.suggestedAccountId,
              payee: tx.payee,
            });
          }
        }
        break;
      }
      case "exclude_bank_tx": {
        excludeBankTransaction(payload.transactionId);
        break;
      }
      case "import_csv": {
        const result = importBankCsvRows(payload);
        await persistQboStoreToDb(organizationId);
        const state = getComputedQboState();
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
        inviteTeamMember(payload);
        break;
      }
      case "reset_demo": {
        resetQboStore();
        break;
      }
      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    await persistQboStoreToDb(organizationId);
    const state = getComputedQboState();
    return NextResponse.json(state);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unexpected accounting error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
