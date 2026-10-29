import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  categorizeAllSuggested,
  categorizeBankTransaction,
  computeComparisonRange,
  computeReportsForFilter,
  convertEstimateToInvoice,
  createCustomer,
  createInvoice,
  createTransfer,
  createVendor,
  finishReconciliation,
  formatPostalAddress,
  getComputedQboState,
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
  createFreshCompanyData,
} from "../qbo-store";
import {
  searchQboState,
  parseSearchAmountCents,
} from "../qbo-search";
import {
  computeRowAmountCents,
  normalizeDateString,
  parseCsvTextToPreview,
} from "../csv-parser";
import { BANK_CSV_PRESETS } from "../sample-bank-csvs";
import {
  sendTeamInviteEmail,
  sendSignupOtpEmail,
  DEFAULT_SENDER_EMAIL,
} from "../mailer";
import {
  DEFAULT_ADMIN,
  createSessionRecordInDb,
  ensureAdminUserInDb,
  getOrganizationTeamRosterFromDb,
  hashPassword,
  provisionOrInviteTeamMemberInDb,
  removeTeamMemberFromDb,
  requestSignupOtp,
  resolveAuthFromRawToken,
  updateTeamMemberRoleInDb,
  verifyPassword,
  verifySignupOtpRecord,
} from "../auth";
import {
  initializeLedgerForNewOrganization,
  loadQboStoreFromDb,
  resetQboDbCacheForTests,
} from "../qbo-db";
import {
  adminCreateOrganizationAndOwner,
  adminDeleteUser,
  adminResetUserPassword,
  adminToggleOrganizationSuspension,
  adminToggleUserSuspension,
  getPlatformAdminOverview,
} from "../admin";
import { resetDbInstanceForTests } from "../../db";

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

  it("17. Reports Center: Period Comparison (PP & PY) and Entity/GL filtering maintain 100% precision and invariants", () => {
    // 1. Whole month comparison calculation (October 2026 -> September 2026 PP, October 2025 PY)
    const pp = computeComparisonRange("2026-10-01", "2026-10-31", "previous_period");
    assert.equal(pp.startDate, "2026-09-01");
    assert.equal(pp.endDate, "2026-09-30");

    const py = computeComparisonRange("2026-10-01", "2026-10-31", "previous_year");
    assert.equal(py.startDate, "2025-10-01");
    assert.equal(py.endDate, "2025-10-31");

    // 2. Arbitrary multi-day range shifts exactly by range length
    const tenDays = computeComparisonRange("2026-10-11", "2026-10-20", "previous_period");
    assert.equal(tenDays.startDate, "2026-10-01");
    assert.equal(tenDays.endDate, "2026-10-10");

    // 3. Open-ended ranges
    const openEnd = computeComparisonRange(undefined, "2026-10-31", "previous_year");
    assert.equal(openEnd.endDate, "2025-10-31");

    // 4. Period Comparison Reports Evaluation
    const state = getComputedQboState();
    const curReports = computeReportsForFilter(state, {
      startDate: "2026-10-01",
      endDate: "2026-10-31",
    });
    const priorReports = computeReportsForFilter(state, {
      startDate: pp.startDate,
      endDate: pp.endDate,
    });

    // Invariants hold across both periods
    assert.equal(curReports.balanceSheet.isBalanced, true);
    assert.equal(curReports.trialBalance.isBalanced, true);
    assert.equal(priorReports.balanceSheet.isBalanced, true);
    assert.equal(priorReports.trialBalance.isBalanced, true);

    // Variance math is exact integer-cents
    const incomeCur = curReports.profitAndLoss.totalIncomeCents;
    const incomePrior = priorReports.profitAndLoss.totalIncomeCents;
    const variance = incomeCur - incomePrior;
    assert.equal(typeof variance, "number");
    assert.ok(Number.isSafeInteger(variance));

    // 5. Entity Filter: filter by Redwood Tech Campus
    const entityReports = computeReportsForFilter(state, {
      entityName: "Redwood Tech Campus",
    });
    // Double entry debits equal credits remains valid under entity filter
    assert.equal(entityReports.trialBalance.isBalanced, true);
    assert.equal(
      entityReports.trialBalance.totalDebitsCents,
      entityReports.trialBalance.totalCreditsCents
    );
  });

  it("18. Customer & Vendor profile enhancements and Top Global Search Engine", () => {
    // 1. Create customer with optional fields: firstName, lastName, taxId, address
    const cust = createCustomer({
      firstName: "Eleanor",
      lastName: "Vance",
      company: "Hill House Design Co",
      taxId: "12-3456789",
      email: "eleanor@hillhouse.example",
      phone: "(415) 555-0199",
      address: {
        street: "450 Sutter St, Suite 1200",
        city: "San Francisco",
        state: "CA",
        postalCode: "94108",
        country: "USA",
      },
    });
    assert.equal(cust.name, "Eleanor Vance");
    assert.equal(cust.company, "Hill House Design Co");
    assert.equal(cust.taxId, "12-3456789");
    assert.equal(cust.address?.postalCode, "94108");
    assert.equal(
      formatPostalAddress(cust.address),
      "450 Sutter St, Suite 1200, San Francisco, CA 94108, USA"
    );

    // 2. Create vendor with optional fields, no default category (optional)
    const vendor = createVendor({
      name: "Apex Precision Tools",
      firstName: "Marcus",
      lastName: "Brody",
      taxId: "98-7654321",
      email: "orders@apexprecision.example",
      phone: "(408) 555-0144",
      defaultExpenseAccountId: undefined, // Optional!
      address: {
        street: "880 N 1st St",
        city: "San Jose",
        state: "CA",
        postalCode: "95112",
      },
    });
    assert.equal(vendor.name, "Apex Precision Tools");
    assert.equal(vendor.taxId, "98-7654321");
    assert.equal(vendor.defaultExpenseAccountId, undefined);
    assert.equal(
      formatPostalAddress(vendor.address),
      "880 N 1st St, San Jose, CA 95112"
    );

    // 3. Amount parser tests
    assert.equal(parseSearchAmountCents("$1,250.00"), 125000);
    assert.equal(parseSearchAmountCents("425"), 42500);
    assert.equal(parseSearchAmountCents("90.50"), 9050);
    assert.equal(parseSearchAmountCents("invalid-dollar"), null);

    // 4. Global Search engine indexing
    const state = getComputedQboState();

    // Query by exact invoice number
    const invRes = searchQboState(state, "INV-1001");
    assert.ok(invRes.length > 0);
    assert.equal(invRes[0].kind, "invoice");
    assert.ok(invRes[0].title.includes("1001"));

    // Query by customer name
    const custRes = searchQboState(state, "Amy");
    assert.ok(custRes.some((r) => r.kind === "customer" && r.title.includes("Amy")));

    // Query by created customer name
    const eleanorRes = searchQboState(state, "Eleanor");
    assert.ok(eleanorRes.some((r) => r.kind === "customer" && r.title.includes("Eleanor Vance")));

    // Query by vendor name
    const venRes = searchQboState(state, "Tania");
    assert.ok(venRes.some((r) => r.kind === "vendor" && r.title.includes("Tania")));

    // Query by created vendor name
    const apexRes = searchQboState(state, "Apex");
    assert.ok(apexRes.some((r) => r.kind === "vendor" && r.title.includes("Apex Precision")));

    // Query by GL account code or name
    const acctRes = searchQboState(state, "1000");
    assert.ok(acctRes.some((r) => r.kind === "account" && r.title.includes("1000")));

    // Query by dollar amount
    const amtRes = searchQboState(state, "$1,250.00");
    assert.ok(amtRes.some((r) => r.amountCents === 125000));
  });

  it("19. Wipe All Sample Data resets company to fresh $0.00 books with balanced ledger", () => {
    // 1. Verify initially we have transactions
    const before = getComputedQboState();
    assert.ok(before.journalEntries.length > 0);
    assert.ok(before.invoices.length > 0);
    assert.ok(before.expenses.length > 0);

    // 2. Wipe all sample transactions
    wipeAllCompanyTransactions();

    // 3. Verify clean $0.00 state
    const after = getComputedQboState();
    assert.equal(after.journalEntries.length, 0);
    assert.equal(after.invoices.length, 0);
    assert.equal(after.expenses.length, 0);
    assert.equal(after.bankTransactions.length, 0);
    assert.equal(after.estimates.length, 0);
    assert.equal(after.kpis.openInvoicesCents, 0);
    assert.equal(after.kpis.openBillsCents, 0);
    assert.equal(after.reports.profitAndLoss.totalIncomeCents, 0);
    assert.equal(after.reports.profitAndLoss.totalExpensesCents, 0);
    assert.equal(after.reports.profitAndLoss.netIncomeCents, 0);
    assert.equal(after.reports.balanceSheet.totalAssetsCents, 0);
    assert.equal(after.reports.balanceSheet.totalLiabilitiesAndEquityCents, 0);
    assert.equal(after.reports.balanceSheet.isBalanced, true);
    assert.equal(after.reports.trialBalance.isBalanced, true);

    // 4. Verify createFreshCompanyData also generates fresh $0.00 company
    const fresh = createFreshCompanyData("Acme Corp LLC");
    assert.equal(fresh.companyName, "Acme Corp LLC");
    assert.equal(fresh.journalEntries.length, 0);
    assert.equal(fresh.invoices.length, 0);
    assert.equal(fresh.expenses.length, 0);
    assert.equal(fresh.accounts.length, 31);
  });

  it("20. Authentication, Super Admin Separation & RBAC: Super Admin removed from customer roster, Owner team controls, and strict role guards", async () => {
    // 1. Verify Platform Super Admin ("Godfather") credentials match requirements
    assert.equal(DEFAULT_ADMIN.email, "enterandpost02@gmail.com");
    assert.equal(DEFAULT_ADMIN.password, "Standard@1122");
    const hash = hashPassword(DEFAULT_ADMIN.password);
    assert.equal(verifyPassword("Standard@1122", hash), true);
    assert.equal(verifyPassword("WrongPassword", hash), false);

    // 2. Verify customer company ledger does NOT contain enterandpost02@gmail.com as owner
    const state = getComputedQboState();
    assert.equal(
      state.teamMembers.some(
        (m) => m.email.toLowerCase() === "enterandpost02@gmail.com"
      ),
      false,
      "Super Admin email enterandpost02@gmail.com must NOT be seeded into customer company teamMembers"
    );
    const ownerMember = state.teamMembers.find((m) => m.role === "owner");
    assert.ok(ownerMember, "Customer company must have its own isolated Owner");
    assert.equal(ownerMember.status, "Active");

    // 3. Verify fresh company creation initializes strictly with the buyer's Owner identity
    const buyerFresh = createFreshCompanyData("Horizon Retail Group LLC", {
      id: "usr-buyer-1",
      name: "Elena Rostova",
      email: "elena@horizonretail.com",
    });
    assert.equal(buyerFresh.teamMembers.length, 1);
    assert.equal(buyerFresh.teamMembers[0].email, "elena@horizonretail.com");
    assert.equal(buyerFresh.teamMembers[0].role, "owner");

    // 4. Owner invites a Staff Bookkeeper and updates/removes roles
    const newMember = inviteTeamMember({
      name: "Marcus Vance",
      email: "marcus.vance@example.com",
      role: "staff",
    });
    assert.equal(newMember.name, "Marcus Vance");
    assert.equal(newMember.email, "marcus.vance@example.com");
    assert.equal(newMember.role, "staff");
    assert.equal(newMember.status, "Invited");

    const updatedMember = updateTeamMemberRoleInStore({
      email: "marcus.vance@example.com",
      role: "accountant",
    });
    assert.equal(updatedMember.role, "accountant");

    // 5. Test email dispatcher for both OTP and Team Invitations
    assert.equal(DEFAULT_SENDER_EMAIL, "enterandpost02@gmail.com");
    const otpMail = await sendSignupOtpEmail({
      to: "elena@horizonretail.com",
      recipientName: "Elena Rostova",
      otpCode: "482910",
      organizationName: "Horizon Retail Group LLC",
    });
    assert.equal(otpMail.success, true);
    assert.ok(otpMail.subject.includes("482910"));

    const mailResult = await sendTeamInviteEmail({
      to: "marcus.vance@example.com",
      recipientName: "Marcus Vance",
      role: "staff",
      companyName: "Horizon Retail Group LLC",
      inviterName: "Elena Rostova",
      inviterEmail: "elena@horizonretail.com",
      inviteToken: "tok_demo_123",
      appUrl: "https://proebooks.vercel.app",
    });
    assert.equal(mailResult.success, true);
    assert.equal(mailResult.to, "marcus.vance@example.com");
    assert.ok(mailResult.subject.includes("invited to join"));

    // 6. Verify RBAC prevents Accountant from inviting or mutating records
    setActiveRole("accountant");
    assert.throws(() => {
      inviteTeamMember({
        name: "Hacker",
        email: "hacker@example.com",
        role: "owner",
      });
    }, /Permission denied: Accountant role is read-only/);

    // 7. Verify RBAC prevents Staff from owner-only actions (wipe, lock, invite, remove)
    setActiveRole("staff");
    assert.throws(() => {
      wipeAllCompanyTransactions();
    }, /Permission denied: Only the Company Owner/);

    assert.throws(() => {
      setPeriodLockDate("2026-08-31");
    }, /Permission denied: Only the Company Owner/);

    assert.throws(() => {
      inviteTeamMember({
        name: "Unauthorized Staff Invite",
        email: "unauth@example.com",
        role: "staff",
      });
    }, /Permission denied: Only the Company Owner/);

    assert.throws(() => {
      removeTeamMemberFromStore({ email: "marcus.vance@example.com" });
    }, /Permission denied: Only the Company Owner/);

    setActiveRole("owner");
    removeTeamMemberFromStore({ email: "marcus.vance@example.com" });
    assert.equal(
      getComputedQboState().teamMembers.some(
        (m) => m.email === "marcus.vance@example.com"
      ),
      false
    );
    setPeriodLockDate("2026-08-31");
    assert.equal(getComputedQboState().lockedThroughDate, "2026-08-31");
  });

  it("21. 2-Step Email OTP Buyer Signup: OTP generation, attempt tracking, verification, and clean isolated Owner organization", async () => {
    const prevDbUrl = process.env.DATABASE_URL;
    const prevPgDir = process.env.PGLITE_DATA_DIR;
    const prevGmailPw = process.env.GMAIL_APP_PASSWORD;
    process.env.DATABASE_URL = "";
    process.env.PGLITE_DATA_DIR = "memory://";
    delete process.env.GMAIL_APP_PASSWORD;
    await resetQboDbCacheForTests();
    await resetDbInstanceForTests();

    try {
      await ensureAdminUserInDb();

      // 1. Block registering Super Admin email on customer signup
      const blockedAdmin = await requestSignupOtp({
        fullName: "Fake Admin",
        email: "enterandpost02@gmail.com",
        password: "Password@123",
        organizationName: "Fake Org",
      });
      assert.equal(blockedAdmin.ok, false);
      assert.ok(blockedAdmin.error?.includes("reserved"));

      // 2. Request OTP for a genuine software buyer (Owner)
      const otpReq = await requestSignupOtp({
        fullName: "Nadia Khan",
        email: "nadia@sterlingconsulting.io",
        password: "StrongPassword@2026",
        organizationName: "Sterling Consulting Partners LLC",
        baseCurrency: "USD",
      });
      assert.equal(otpReq.ok, true);
      assert.ok(
        otpReq.simulatedOtpCode && /^\d{6}$/.test(otpReq.simulatedOtpCode),
        "Simulated 6-digit OTP code must be returned when SMTP is unconfigured"
      );

      // 3. Reject incorrect OTP code and track remaining attempts
      const wrongAttempt = await verifySignupOtpRecord({
        email: "nadia@sterlingconsulting.io",
        otpCode: otpReq.simulatedOtpCode === "000000" ? "111111" : "000000",
      });
      assert.equal(wrongAttempt.ok, false);
      assert.ok(wrongAttempt.error?.includes("Invalid verification code"));

      // 4. Verify with exact 6-digit OTP code
      const verified = await verifySignupOtpRecord({
        email: "nadia@sterlingconsulting.io",
        otpCode: otpReq.simulatedOtpCode!,
      });
      assert.equal(verified.ok, true);
      assert.ok(verified.user);
      assert.ok(verified.organization);
      assert.equal(verified.role, "owner");
      assert.equal(verified.joinedExistingOrg, false);
      assert.equal(verified.user.emailVerified, true);
      assert.equal(verified.user.isSuperAdmin, false);
      assert.equal(
        verified.organization.name,
        "Sterling Consulting Partners LLC"
      );

      // Initialize new Owner's fresh ledger and verify 0 transactions & NO Super Admin in roster
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
        template: "empty",
      });

      const { state } = await loadQboStoreFromDb(verified.organization.id, {
        allowedOrgIds: [verified.organization.id],
      });
      assert.equal(state.companyName, "Sterling Consulting Partners LLC");
      assert.equal(state.journalEntries.length, 0);
      assert.equal(state.accounts.length, 31);
      assert.equal(state.teamMembers.length, 1);
      assert.equal(state.teamMembers[0].email, "nadia@sterlingconsulting.io");
      assert.equal(state.teamMembers[0].role, "owner");
      assert.equal(
        state.teamMembers.some(
          (m) => m.email.toLowerCase() === "enterandpost02@gmail.com"
        ),
        false
      );

      // 5. Reject duplicate signup for already-verified email
      const dupReq = await requestSignupOtp({
        fullName: "Nadia Khan",
        email: "nadia@sterlingconsulting.io",
        password: "StrongPassword@2026",
        organizationName: "Another Org",
      });
      assert.equal(dupReq.ok, false);
      assert.ok(dupReq.error?.includes("already exists"));
    } finally {
      await resetQboDbCacheForTests();
      await resetDbInstanceForTests();
      if (prevDbUrl === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = prevDbUrl;
      if (prevPgDir === undefined) delete process.env.PGLITE_DATA_DIR;
      else process.env.PGLITE_DATA_DIR = prevPgDir;
      if (prevGmailPw !== undefined) process.env.GMAIL_APP_PASSWORD = prevGmailPw;
    }
  });

  it("22. Owner Staff & Accountant Provisioning: Direct password creation, OTP invite onboarding, role updates, and session RBAC", async () => {
    const prevDbUrl = process.env.DATABASE_URL;
    const prevPgDir = process.env.PGLITE_DATA_DIR;
    const prevGmailPw = process.env.GMAIL_APP_PASSWORD;
    process.env.DATABASE_URL = "";
    process.env.PGLITE_DATA_DIR = "memory://";
    delete process.env.GMAIL_APP_PASSWORD;
    await resetQboDbCacheForTests();
    await resetDbInstanceForTests();

    try {
      await ensureAdminUserInDb();

      // Create Owner + Company
      const ownerSetup = await adminCreateOrganizationAndOwner({
        organizationName: "Vertex Architecture Studio",
        ownerName: "David Chen",
        ownerEmail: "david@vertexarch.com",
        ownerPassword: "OwnerPassword@123",
      });

      // 1. Owner creates a Staff Bookkeeper with an immediate login password
      const staffProvision = await provisionOrInviteTeamMemberInDb({
        organizationId: ownerSetup.organizationId,
        invitedByUserId: ownerSetup.userId,
        name: "Maya Lin",
        email: "maya.staff@vertexarch.com",
        role: "staff",
        initialPassword: "StaffPassword@123",
      });
      assert.equal(staffProvision.provisionedDirectly, true);
      assert.equal(staffProvision.member.status, "Active");
      assert.ok(staffProvision.member.id);

      // Verify Staff Bookkeeper session authenticates strictly as 'staff' for Vertex Architecture Studio
      const staffSession = await createSessionRecordInDb(
        staffProvision.member.id,
        ownerSetup.organizationId
      );
      const staffAuth = await resolveAuthFromRawToken(staffSession.rawToken);
      assert.ok(staffAuth);
      assert.equal(staffAuth.isSuperAdmin, false);
      assert.equal(staffAuth.role, "staff");
      assert.equal(staffAuth.organization.id, ownerSetup.organizationId);
      assert.equal(staffAuth.memberships.length, 1);

      // 2. Owner invites an external Accountant via Email OTP invitation link (no initial password)
      const cpaInvite = await provisionOrInviteTeamMemberInDb({
        organizationId: ownerSetup.organizationId,
        invitedByUserId: ownerSetup.userId,
        name: "Robert Miller, CPA",
        email: "robert@millercpa.org",
        role: "accountant",
      });
      assert.equal(cpaInvite.provisionedDirectly, false);
      assert.equal(cpaInvite.member.status, "Invited");
      assert.ok(cpaInvite.inviteToken);

      // Accountant completes 2-step OTP verification using the invite token
      const cpaOtpReq = await requestSignupOtp({
        fullName: "Robert Miller, CPA",
        email: "robert@millercpa.org",
        password: "CpaSecurePassword@99",
        inviteToken: cpaInvite.inviteToken,
      });
      assert.equal(cpaOtpReq.ok, true);
      assert.equal(cpaOtpReq.invitedRole, "accountant");
      assert.equal(cpaOtpReq.organizationName, "Vertex Architecture Studio");

      const cpaVerified = await verifySignupOtpRecord({
        email: "robert@millercpa.org",
        otpCode: cpaOtpReq.simulatedOtpCode!,
      });
      assert.equal(cpaVerified.ok, true);
      assert.equal(cpaVerified.joinedExistingOrg, true);
      assert.equal(cpaVerified.role, "accountant");
      assert.equal(cpaVerified.organization?.id, ownerSetup.organizationId);

      // 3. Roster now shows Owner + Active Staff + Active Accountant (and NO Super Admin)
      const roster = await getOrganizationTeamRosterFromDb(
        ownerSetup.organizationId
      );
      assert.equal(roster.length, 3);
      assert.equal(
        roster.some((m) => m.email === "enterandpost02@gmail.com"),
        false
      );

      // 4. Owner updates Staff role to Accountant, then removes external CPA
      await updateTeamMemberRoleInDb({
        organizationId: ownerSetup.organizationId,
        email: "maya.staff@vertexarch.com",
        role: "accountant",
      });
      const updatedStaffAuth = await resolveAuthFromRawToken(
        staffSession.rawToken
      );
      assert.equal(updatedStaffAuth?.role, "accountant");

      await removeTeamMemberFromDb({
        organizationId: ownerSetup.organizationId,
        email: "robert@millercpa.org",
        actingUserId: ownerSetup.userId,
      });
      const rosterAfterRemove = await getOrganizationTeamRosterFromDb(
        ownerSetup.organizationId
      );
      assert.equal(rosterAfterRemove.length, 2);
    } finally {
      await resetQboDbCacheForTests();
      await resetDbInstanceForTests();
      if (prevDbUrl === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = prevDbUrl;
      if (prevPgDir === undefined) delete process.env.PGLITE_DATA_DIR;
      else process.env.PGLITE_DATA_DIR = prevPgDir;
      if (prevGmailPw !== undefined) process.env.GMAIL_APP_PASSWORD = prevGmailPw;
    }
  });

  it("23. Godfather Super Admin & Multi-Tenant Isolation: Global overview, tenant boundary enforcement, suspension, and password reset", async () => {
    const prevDbUrl = process.env.DATABASE_URL;
    const prevPgDir = process.env.PGLITE_DATA_DIR;
    process.env.DATABASE_URL = "";
    process.env.PGLITE_DATA_DIR = "memory://";
    await resetQboDbCacheForTests();
    await resetDbInstanceForTests();

    try {
      const godfather = await ensureAdminUserInDb();
      assert.equal(godfather.user.email, "enterandpost02@gmail.com");
      assert.equal(godfather.user.isSuperAdmin, true);

      // Create two completely separate Customer Owners (Tenant A & Tenant B)
      const tenantA = await adminCreateOrganizationAndOwner({
        organizationName: "Alpha Logistics Corp",
        ownerName: "Owner Alpha",
        ownerEmail: "alpha@logistics.io",
        ownerPassword: "AlphaPassword@11",
      });
      const tenantB = await adminCreateOrganizationAndOwner({
        organizationName: "Beta Medical Supplies",
        ownerName: "Owner Beta",
        ownerEmail: "beta@medical.io",
        ownerPassword: "BetaPassword@22",
      });

      // 1. Multi-Tenant Isolation: Tenant A only sees Alpha Logistics Corp, NEVER Beta Medical Supplies
      const sessionA = await createSessionRecordInDb(
        tenantA.userId,
        tenantA.organizationId
      );
      const authA = await resolveAuthFromRawToken(sessionA.rawToken);
      assert.ok(authA);
      assert.equal(authA.isSuperAdmin, false);
      assert.equal(authA.memberships.length, 1);
      assert.equal(authA.memberships[0].organization.id, tenantA.organizationId);

      const loadedForA = await loadQboStoreFromDb(tenantA.organizationId, {
        allowedOrgIds: authA.memberships.map((m) => m.organization.id),
      });
      assert.equal(loadedForA.state.organizations?.length, 1);
      assert.equal(
        loadedForA.state.organizations?.[0].name,
        "Alpha Logistics Corp"
      );

      // 2. Godfather Super Admin session sees ALL organizations across the entire software
      const godfatherSession = await createSessionRecordInDb(
        godfather.user.id,
        tenantA.organizationId
      );
      const godfatherAuth = await resolveAuthFromRawToken(
        godfatherSession.rawToken
      );
      assert.ok(godfatherAuth);
      assert.equal(godfatherAuth.isSuperAdmin, true);
      assert.ok(godfatherAuth.memberships.length >= 2);

      const overview = await getPlatformAdminOverview();
      assert.ok(
        overview.organizations.some((o) => o.id === tenantA.organizationId)
      );
      assert.ok(
        overview.organizations.some((o) => o.id === tenantB.organizationId)
      );
      assert.ok(overview.kpis.totalOwners >= 2);

      // 3. Godfather suspends Tenant A user -> Tenant A's active session is immediately revoked
      await adminToggleUserSuspension(tenantA.userId, true);
      const revokedAuthA = await resolveAuthFromRawToken(sessionA.rawToken);
      assert.equal(revokedAuthA, null);

      // Reactivate Tenant A user and test Organization-level suspension
      await adminToggleUserSuspension(tenantA.userId, false);
      const sessionA2 = await createSessionRecordInDb(
        tenantA.userId,
        tenantA.organizationId
      );
      assert.ok(await resolveAuthFromRawToken(sessionA2.rawToken));

      await adminToggleOrganizationSuspension(tenantA.organizationId, true);
      assert.equal(await resolveAuthFromRawToken(sessionA2.rawToken), null);
      await adminToggleOrganizationSuspension(tenantA.organizationId, false);
      assert.ok(await resolveAuthFromRawToken(sessionA2.rawToken));

      // 4. Godfather resets Tenant B Owner's password
      await adminResetUserPassword(tenantB.userId, "NewResetPass@2026");

      // 5. Godfather cannot suspend or delete the Super Admin account itself
      await assert.rejects(
        () => adminToggleUserSuspension(godfather.user.id, true),
        /Cannot suspend the Platform Super Administrator/
      );
      await assert.rejects(
        () => adminDeleteUser(godfather.user.id),
        /Cannot delete the Platform Super Administrator/
      );
    } finally {
      await resetQboDbCacheForTests();
      await resetDbInstanceForTests();
      if (prevDbUrl === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = prevDbUrl;
      if (prevPgDir === undefined) delete process.env.PGLITE_DATA_DIR;
      else process.env.PGLITE_DATA_DIR = prevPgDir;
    }
  });
});
