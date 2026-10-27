import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  categorizeAllSuggested,
  categorizeBankTransaction,
  computeReportsForFilter,
  convertEstimateToInvoice,
  createCustomer,
  createInvoice,
  createTransfer,
  createVendor,
  finishReconciliation,
  getComputedQboState,
  importBankCsvRows,
  matchBankTransaction,
  payVendorBill,
  postJournalEntry,
  receiveInvoicePayment,
  resetQboStore,
  reverseJournalEntry,
  runAiAutoCategorizer,
  setActiveRole,
  setPeriodLockDate,
} from "../qbo-store";
import {
  computeRowAmountCents,
  normalizeDateString,
  parseCsvTextToPreview,
} from "../csv-parser";
import { BANK_CSV_PRESETS } from "../sample-bank-csvs";

describe("QuickBooks Double-Entry Accounting Engine & CSV Suite", () => {
  beforeEach(() => {
    resetQboStore();
  });

  it("1. Initial sample company Balance Sheet and Trial Balance are 100% balanced", () => {
    const state = getComputedQboState();
    assert.equal(state.reports.balanceSheet.isBalanced, true);
    assert.equal(
      state.reports.balanceSheet.totalAssetsCents,
      state.reports.balanceSheet.totalLiabilitiesAndEquityCents
    );
    assert.equal(state.reports.trialBalance.isBalanced, true);
    assert.equal(
      state.reports.trialBalance.totalDebitsCents,
      state.reports.trialBalance.totalCreditsCents
    );
  });

  it("2. Balanced manual journal entry passes and updates account balances in integer cents", () => {
    const before = getComputedQboState();
    const checkingBefore =
      before.accountsWithBalances.find((a) => a.id === "acc-1000")
        ?.balanceCents ?? 0;

    postJournalEntry({
      date: "2026-10-25",
      memo: "Owner cash injection",
      lines: [
        { accountId: "acc-1000", debitCents: 12550, creditCents: 0 },
        { accountId: "acc-3100", debitCents: 0, creditCents: 12550 },
      ],
    });

    const after = getComputedQboState();
    const checkingAfter =
      after.accountsWithBalances.find((a) => a.id === "acc-1000")
        ?.balanceCents ?? 0;
    assert.equal(checkingAfter - checkingBefore, 12550);
    assert.equal(after.reports.balanceSheet.isBalanced, true);
  });

  it("3. Unbalanced journal entry is rejected", () => {
    assert.throws(() => {
      postJournalEntry({
        date: "2026-10-25",
        memo: "Unbalanced entry",
        lines: [
          { accountId: "acc-1000", debitCents: 50000, creditCents: 0 },
          { accountId: "acc-4000", debitCents: 0, creditCents: 49999 },
        ],
      });
    }, /out of balance/);
  });

  it("4. Reversal entry swaps debits/credits and zeroes out net account effect", () => {
    const initial = getComputedQboState();
    const initialNetIncome = initial.reports.profitAndLoss.netIncomeCents;

    const entry = postJournalEntry({
      date: "2026-10-26",
      memo: "Accrued advertising expense",
      lines: [
        { accountId: "acc-6010", debitCents: 75000, creditCents: 0 },
        { accountId: "acc-1000", debitCents: 0, creditCents: 75000 },
      ],
    });

    const mid = getComputedQboState();
    assert.equal(
      mid.reports.profitAndLoss.netIncomeCents,
      initialNetIncome - 75000
    );

    reverseJournalEntry(entry.id, "2026-10-27");

    const finalState = getComputedQboState();
    assert.equal(
      finalState.reports.profitAndLoss.netIncomeCents,
      initialNetIncome
    );
    assert.equal(finalState.reports.balanceSheet.isBalanced, true);
  });

  it("5. Period lock (Close the Books) blocks postings on or before lockedThroughDate", () => {
    setPeriodLockDate("2026-09-30");
    assert.throws(() => {
      postJournalEntry({
        date: "2026-09-15",
        memo: "Backdated entry in closed period",
        lines: [
          { accountId: "acc-6010", debitCents: 10000, creditCents: 0 },
          { accountId: "acc-1000", debitCents: 0, creditCents: 10000 },
        ],
      });
    }, /Books are closed through 2026-09-30/);
  });

  it("6. Parses all 4 multi-bank CSV formats (Chase, BofA split columns, Amex parens, Wells Fargo quotes) and detects duplicates", () => {
    for (const preset of BANK_CSV_PRESETS) {
      const preview = parseCsvTextToPreview(preset.csvContent);
      assert.ok(
        preview.rawRows.length >= 3,
        `Expected rows for ${preset.bankName}`
      );

      const mappedRows = preview.rawRows.map((r) => ({
        date: normalizeDateString(r[preview.suggestedMapping.dateIndex] ?? ""),
        description: (r[preview.suggestedMapping.descriptionIndex] ?? "").trim(),
        amountCents: computeRowAmountCents(r, preview.suggestedMapping),
      }));

      const firstImport = importBankCsvRows({
        bankAccountId: preset.defaultAccountId,
        rows: mappedRows,
      });
      assert.equal(firstImport.importedCount, mappedRows.length);
      assert.equal(firstImport.duplicateCount, 0);

      // Re-importing the exact same CSV should detect 100% duplicates
      const secondImport = importBankCsvRows({
        bankAccountId: preset.defaultAccountId,
        rows: mappedRows,
      });
      assert.equal(secondImport.importedCount, 0);
      assert.equal(secondImport.duplicateCount, mappedRows.length);
    }
  });

  it("7. Categorizing bank feed items, converting estimates, and transferring funds keep Balance Sheet balanced", () => {
    categorizeBankTransaction({
      transactionId: "btx-1",
      categoryAccountId: "acc-5010",
      payee: "Hicks Hardware",
    });
    convertEstimateToInvoice("est-2001");
    createTransfer({
      fromAccountId: "acc-1000",
      toAccountId: "acc-1010",
      date: "2026-10-26",
      amountCents: 200000,
    });

    const state = getComputedQboState();
    assert.equal(state.reports.balanceSheet.isBalanced, true);
    assert.equal(state.reports.trialBalance.isBalanced, true);
  });

  it("8. Phase 7: Accountant (read-only) role can view reports but is blocked from posting or modifying entries", () => {
    setActiveRole("accountant");
    const state = getComputedQboState();
    assert.equal(state.activeRole, "accountant");
    assert.equal(state.reports.balanceSheet.isBalanced, true);

    assert.throws(() => {
      postJournalEntry({
        date: "2026-10-26",
        memo: "Unauthorized accountant write attempt",
        lines: [
          { accountId: "acc-6010", debitCents: 5000, creditCents: 0 },
          { accountId: "acc-1000", debitCents: 0, creditCents: 5000 },
        ],
      });
    }, /Permission denied: Accountant role is read-only/);
  });

  it("9. Phase 8: AI Auto-Categorizer populates suggestedAccountId, aiConfidence, and aiReasoning on imported bank transactions", () => {
    importBankCsvRows({
      bankAccountId: "acc-1000",
      rows: [
        {
          date: "2026-10-27",
          description: "SHELL GAS STATION #991 FLEET FUEL",
          amountCents: -7850,
        },
      ],
    });

    const result = runAiAutoCategorizer();
    assert.ok(result.analyzedCount >= 1);

    const state = getComputedQboState();
    const shellTx = state.bankTransactions.find((t) =>
      t.description.includes("SHELL GAS STATION")
    );
    assert.ok(shellTx);
    assert.equal(shellTx.suggestedAccountId, "acc-6020");
    assert.ok((shellTx.aiConfidence ?? 0) >= 90);
    assert.ok(shellTx.aiReasoning && shellTx.aiReasoning.length > 10);
  });

  it("10. Phase 9: Security & Accounting Integrity Audit passes 6/6 checks", () => {
    const state = getComputedQboState();
    assert.equal(state.securityAudit.allMoneyIntegerCents, true);
    assert.equal(state.securityAudit.allEntriesBalanced, true);
    assert.equal(state.securityAudit.balanceSheetBalanced, true);
    assert.equal(state.securityAudit.trialBalanceBalanced, true);
    assert.equal(state.securityAudit.periodLockConfigured, true);
    assert.equal(state.securityAudit.orgIsolationEnforced, true);
    assert.equal(
      state.securityAudit.passedCount,
      state.securityAudit.totalChecks
    );
  });

  it("11. Automatic Sales Tax on Invoices calculates exact integer cents, credits 2200 Sales Tax Payable, and keeps books balanced", () => {
    const before = getComputedQboState();
    const taxBefore =
      before.accountsWithBalances.find((a) => a.id === "acc-2200")
        ?.balanceCents ?? 0;

    // $1,000.00 taxable line at 8.25% => $82.50 (8250 cents) tax, $1,082.50 (108250 cents) total A/R
    const inv = createInvoice({
      customerId: "cust-1",
      date: "2026-10-27",
      dueDate: "2026-11-26",
      applySalesTax: true,
      taxRatePercent: 8.25,
      lines: [
        {
          serviceName: "Landscape Design & Installation",
          description: "Taxable installation package",
          quantity: 1,
          rateCents: 100000,
          incomeAccountId: "acc-4000",
          taxable: true,
        },
      ],
    });

    assert.equal(inv.subtotalCents, 100000);
    assert.equal(inv.taxCents, 8250);
    assert.equal(inv.totalCents, 108250);
    assert.equal(inv.balanceDueCents, 108250);

    const after = getComputedQboState();
    const taxAfter =
      after.accountsWithBalances.find((a) => a.id === "acc-2200")
        ?.balanceCents ?? 0;
    assert.equal(taxAfter - taxBefore, 8250);
    assert.equal(after.reports.balanceSheet.isBalanced, true);
    assert.equal(after.reports.trialBalance.isBalanced, true);
  });

  it("12. Bank Feed Deposit & Outflow Matching to Open Invoices and Open Bills clears A/R and A/P without double-counting", () => {
    // Match btx-3 (+$1,250.00 deposit) as a partial payment to open Invoice inv-1002 ($3,420.00 balance due)
    matchBankTransaction({
      transactionId: "btx-3",
      matchType: "invoice",
      targetId: "inv-1002",
    });

    const afterPartial = getComputedQboState();
    const partialInv = afterPartial.invoices.find((i) => i.id === "inv-1002");
    assert.equal(partialInv?.balanceDueCents, 217000);
    assert.equal(partialInv?.status, "Open");

    // Import remaining +$2,170.00 deposit for inv-1002 and -$1,120.00 outflow for open Bill exp-3
    importBankCsvRows({
      bankAccountId: "acc-1000",
      rows: [
        {
          date: "2026-10-27",
          description: "ACH DEPOSIT FREEMAN SPORTING GOODS INV-1002",
          amountCents: 217000,
        },
        {
          date: "2026-10-27",
          description: "ACH PMT NORTON LUMBER BILL NL-409",
          amountCents: -112000,
        },
      ],
    });
    const midState = getComputedQboState();
    const invBankTx = midState.bankTransactions.find((t) =>
      t.description.includes("FREEMAN SPORTING GOODS INV-1002")
    );
    const billBankTx = midState.bankTransactions.find((t) =>
      t.description.includes("NORTON LUMBER BILL NL-409")
    );
    assert.ok(invBankTx);
    assert.ok(billBankTx);

    matchBankTransaction({
      transactionId: invBankTx.id,
      matchType: "invoice",
      targetId: "inv-1002",
    });

    matchBankTransaction({
      transactionId: billBankTx.id,
      matchType: "bill",
      targetId: "exp-3",
    });

    const finalState = getComputedQboState();
    const matchedInv = finalState.invoices.find((i) => i.id === "inv-1002");
    const matchedBill = finalState.expenses.find((e) => e.id === "exp-3");

    assert.equal(matchedInv?.status, "Paid");
    assert.equal(matchedInv?.balanceDueCents, 0);
    assert.equal(matchedBill?.status, "Paid");
    assert.equal(finalState.reports.balanceSheet.isBalanced, true);
    assert.equal(finalState.reports.trialBalance.isBalanced, true);
  });

  it("13. Cash Basis & Custom Date-Range Report Filtering preserve exact Balance Sheet & Trial Balance equality", () => {
    const state = getComputedQboState();

    // Accrual basis vs Cash basis across all dates:
    // Seed data has unpaid invoices (A/R $8,250.00) and unpaid bill (A/P $1,850.00),
    // so Cash Basis Net Income differs from Accrual Basis while keeping Balance Sheet balanced!
    const accrualAll = computeReportsForFilter(state, { basis: "accrual" });
    const cashAll = computeReportsForFilter(state, { basis: "cash" });

    assert.equal(accrualAll.balanceSheet.isBalanced, true);
    assert.equal(accrualAll.trialBalance.isBalanced, true);
    assert.equal(cashAll.balanceSheet.isBalanced, true);
    assert.equal(cashAll.trialBalance.isBalanced, true);
    assert.notEqual(
      accrualAll.profitAndLoss.totalIncomeCents,
      cashAll.profitAndLoss.totalIncomeCents
    );

    // Date-range filtered reports (October 2026 only, where prior Sept 2026 entries roll into Retained Earnings)
    const accrualOct = computeReportsForFilter(state, {
      basis: "accrual",
      startDate: "2026-10-01",
      endDate: "2026-10-31",
    });
    const cashOct = computeReportsForFilter(state, {
      basis: "cash",
      startDate: "2026-10-01",
      endDate: "2026-10-31",
    });

    assert.equal(accrualOct.balanceSheet.isBalanced, true);
    assert.equal(accrualOct.trialBalance.isBalanced, true);
    assert.equal(cashOct.balanceSheet.isBalanced, true);
    assert.equal(cashOct.trialBalance.isBalanced, true);
  });

  it("14. Creating new Customer and new Vendor profiles works and integrates with ledger workflows", () => {
    const cust = createCustomer({
      name: "Redwood Tech Campus",
      company: "Redwood Properties LLC",
      email: "ap@redwoodcampus.com",
      phone: "(650) 555-0192",
    });
    const vend = createVendor({
      name: "Pacific Stone Supply",
      email: "billing@pacificstone.com",
      phone: "(650) 555-0177",
      defaultExpenseAccountId: "acc-5010",
    });

    const state = getComputedQboState();
    assert.ok(state.customers.some((c) => c.id === cust.id));
    assert.ok(state.vendors.some((v) => v.id === vend.id));
  });

  it("15. Bank & Credit Card Reconciliation and Dynamic Bank Balance vs QuickBooks Balance math are 100% exact", () => {
    const initial = getComputedQboState();
    const checkingBefore = initial.accountsWithBalances.find(
      (a) => a.id === "acc-1000"
    )!;
    const amexBefore = initial.accountsWithBalances.find(
      (a) => a.id === "acc-2100"
    )!;

    // Before categorizing pending "for_review" rows:
    // Checking GL is $28,050.00 (2805000), pending feed is +$569.90 (+56990) => Bank Balance $28,619.90 (2861990)
    assert.equal(checkingBefore.balanceCents, 2805000);
    assert.equal(checkingBefore.bankBalanceCents, 2861990);

    // Amex GL is $1,492.00 (149200), pending feed is -$90.00 (-9000 charge) => Bank Balance $1,582.00 (158200)
    assert.equal(amexBefore.balanceCents, 149200);
    assert.equal(amexBefore.bankBalanceCents, 158200);

    // Categorize all suggested rows on Checking and Amex
    categorizeAllSuggested("acc-1000");
    categorizeAllSuggested("acc-2100");

    const afterCat = getComputedQboState();
    const checkingAfter = afterCat.accountsWithBalances.find(
      (a) => a.id === "acc-1000"
    )!;
    const amexAfter = afterCat.accountsWithBalances.find(
      (a) => a.id === "acc-2100"
    )!;

    // Now that forReviewCount === 0, Bank Balance === QuickBooks GL Balance to the exact cent!
    assert.equal(checkingAfter.forReviewCount, 0);
    assert.equal(checkingAfter.balanceCents, 2861990);
    assert.equal(checkingAfter.bankBalanceCents, 2861990);

    assert.equal(amexAfter.forReviewCount, 0);
    assert.equal(amexAfter.balanceCents, 158200);
    assert.equal(amexAfter.bankBalanceCents, 158200);

    // Reconcile Checking (debit-normal) and Amex (credit-normal)
    const checkingEntryIds = afterCat.journalEntries
      .filter((je) => je.lines.some((l) => l.accountId === "acc-1000"))
      .map((je) => je.id);
    const amexEntryIds = afterCat.journalEntries
      .filter((je) => je.lines.some((l) => l.accountId === "acc-2100"))
      .map((je) => je.id);

    // Out-of-balance reconciliation must be rejected
    assert.throws(() => {
      finishReconciliation({
        bankAccountId: "acc-1000",
        statementDate: "2026-10-31",
        endingBalanceCents: 2861990 + 1,
        entryIds: checkingEntryIds,
      });
    }, /Cannot finish reconciliation/);

    // Exact $0.00 difference reconciliation succeeds for both Bank and Credit Card
    const recChecking = finishReconciliation({
      bankAccountId: "acc-1000",
      statementDate: "2026-10-31",
      endingBalanceCents: 2861990,
      entryIds: checkingEntryIds,
    });
    const recAmex = finishReconciliation({
      bankAccountId: "acc-2100",
      statementDate: "2026-10-31",
      endingBalanceCents: 158200,
      entryIds: amexEntryIds,
    });

    assert.equal(recChecking.endingBalanceCents, 2861990);
    assert.equal(recAmex.endingBalanceCents, 158200);
  });

  it("16. Sub-Ledger (A/R & A/P Aging) always equals General Ledger (1100 A/R & 2000 A/P) before and after reversals", () => {
    function assertSubLedgerMatchesGL() {
      const s = getComputedQboState();
      const arGl =
        s.accountsWithBalances.find((a) => a.id === "acc-1100")?.balanceCents ??
        0;
      const apGl =
        s.accountsWithBalances.find((a) => a.id === "acc-2000")?.balanceCents ??
        0;
      assert.equal(s.reports.arAging.totalCents, arGl);
      assert.equal(s.kpis.openInvoicesCents, arGl);
      assert.equal(s.reports.apAging.totalCents, apGl);
      assert.equal(s.kpis.openBillsCents, apGl);
      assert.equal(s.reports.balanceSheet.isBalanced, true);
      assert.equal(s.reports.trialBalance.isBalanced, true);
    }

    // 1. Initial seed state
    assertSubLedgerMatchesGL();

    // 2. Receive payment on inv-1002 and pay bill exp-3
    receiveInvoicePayment({
      invoiceId: "inv-1002",
      date: "2026-10-26",
      depositAccountId: "acc-1000",
    });
    payVendorBill({
      expenseId: "exp-3",
      bankAccountId: "acc-1000",
      date: "2026-10-26",
    });
    assertSubLedgerMatchesGL();

    // 3. Reverse both the invoice payment and the bill payment -> A/R and A/P re-open cleanly
    const mid = getComputedQboState();
    const invPmtJeId = mid.invoices.find(
      (i) => i.id === "inv-1002"
    )?.paymentJournalEntryId;
    const billPmtJeId = mid.expenses.find(
      (e) => e.id === "exp-3"
    )?.paymentJournalEntryId;
    assert.ok(invPmtJeId);
    assert.ok(billPmtJeId);

    reverseJournalEntry(invPmtJeId, "2026-10-27");
    reverseJournalEntry(billPmtJeId, "2026-10-27");
    assertSubLedgerMatchesGL();

    // Verify Cash Basis also remains 100% balanced after payment reversals
    const afterRev = getComputedQboState();
    const cashReports = computeReportsForFilter(afterRev, { basis: "cash" });
    assert.equal(cashReports.balanceSheet.isBalanced, true);
    assert.equal(cashReports.trialBalance.isBalanced, true);
  });
});
