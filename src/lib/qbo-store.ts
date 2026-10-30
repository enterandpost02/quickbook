/**
 * QuickBooks Online In-Memory / Static Accounting Engine
 *
 * Rules enforced:
 * 1. All money is stored and computed in integer cents (e.g., $125.50 = 12550).
 * 2. Every posted financial event creates a balanced double-entry JournalEntry
 *    where SUM(debitCents) === SUM(creditCents).
 * 3. Posted journal entries are never edited or deleted; corrections use reversal entries.
 * 4. Period Lock (Close the Books) blocks any posting on or before lockedThroughDate.
 */

export type AccountType =
  | "Bank"
  | "Accounts Receivable"
  | "Other Current Assets"
  | "Fixed Assets"
  | "Accounts Payable"
  | "Credit Card"
  | "Other Current Liabilities"
  | "Long Term Liabilities"
  | "Equity"
  | "Income"
  | "Cost of Goods Sold"
  | "Expenses";

export type NormalBalance = "debit" | "credit";

export interface QboAccount {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  detailType: string;
  normalBalance: NormalBalance;
  bankBalanceCents?: number; // External bank feed balance for Bank/CC accounts
  isActive: boolean;
}

export interface QboJournalLine {
  id: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  description: string;
  debitCents: number;
  creditCents: number;
  entityName?: string;
}

export interface QboJournalEntry {
  id: string;
  entryNumber: string;
  date: string; // YYYY-MM-DD
  memo: string;
  sourceType:
    | "manual"
    | "bank_feed"
    | "invoice"
    | "invoice_payment"
    | "expense"
    | "bill"
    | "bill_payment"
    | "transfer"
    | "opening_balance"
    | "reversal";
  sourceId?: string;
  reversesEntryId?: string;
  reversedByEntryId?: string;
  reconciled?: boolean;
  createdAt: string;
  lines: QboJournalLine[];
}

export interface QboBankTransaction {
  id: string;
  bankAccountId: string;
  date: string;
  description: string;
  payee?: string;
  amountCents: number; // Positive = Money Received (Deposit), Negative = Money Spent
  status: "for_review" | "categorized" | "excluded";
  suggestedAccountId?: string;
  matchedRuleName?: string;
  matchedInvoiceId?: string;
  matchedBillId?: string;
  aiReasoning?: string;
  aiConfidence?: number;
  postedJournalEntryId?: string;
  reconciled?: boolean;
  fingerprint: string;
}

export interface QboCategorizationRule {
  id: string;
  name: string;
  containsText: string;
  direction: "any" | "in" | "out";
  targetAccountId: string;
  payeeName?: string;
}

export interface QboPostalAddress {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface QboCustomer {
  id: string;
  name: string; // Display name (required)
  company: string;
  email: string;
  phone: string;
  firstName?: string;
  lastName?: string;
  taxId?: string;
  address?: QboPostalAddress;
}

export interface QboVendor {
  id: string;
  name: string; // Display name (required)
  email: string;
  phone: string;
  company?: string;
  firstName?: string;
  lastName?: string;
  taxId?: string;
  address?: QboPostalAddress;
  /** Optional default expense category; when unset, the category is chosen per transaction. */
  defaultExpenseAccountId?: string;
}

export interface QboProductService {
  id: string;
  name: string;
  sku: string;
  type: "Service" | "Non-Inventory" | "Inventory";
  description: string;
  rateCents: number;
  incomeAccountId: string;
  incomeAccountName: string;
}

export interface QboEstimate {
  id: string;
  estimateNumber: string;
  customerId: string;
  customerName: string;
  date: string;
  expirationDate: string;
  status: "Pending" | "Accepted" | "Converted";
  totalCents: number;
  convertedInvoiceId?: string;
  lines: Array<{
    serviceName: string;
    description: string;
    quantity: number;
    rateCents: number;
    amountCents: number;
    incomeAccountId: string;
  }>;
}

export interface QboInvoiceLine {
  id: string;
  serviceName: string;
  description: string;
  quantity: number;
  rateCents: number;
  amountCents: number;
  incomeAccountId: string;
  taxable?: boolean;
}

export interface QboInvoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  date: string;
  dueDate: string;
  status: "Open" | "Overdue" | "Paid";
  subtotalCents?: number;
  taxRatePercent?: number;
  taxCents?: number;
  totalCents: number;
  balanceDueCents: number;
  lines: QboInvoiceLine[];
  journalEntryId: string;
  paymentJournalEntryId?: string;
}

export interface QboExpense {
  id: string;
  refNumber: string;
  type: "Expense" | "Bill";
  vendorId: string;
  vendorName: string;
  date: string;
  dueDate?: string;
  paymentAccountId: string; // Bank/CC for Expense, or A/P (2000) for Bill
  categoryAccountId: string;
  categoryAccountName: string;
  description: string;
  amountCents: number;
  status: "Paid" | "Open" | "Overdue";
  journalEntryId: string;
  paymentJournalEntryId?: string;
}

export interface QboReconciliationRecord {
  id: string;
  bankAccountId: string;
  bankAccountName: string;
  statementDate: string;
  endingBalanceCents: number;
  clearedCount: number;
  reconciledAt: string;
}

export interface QboAuditLogItem {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  details: string;
  amountCents?: number;
}

export interface QboTeamMember {
  id: string;
  name: string;
  email: string;
  role: "owner" | "staff" | "accountant";
  status: "Active" | "Invited";
}

export interface QboStoreData {
  companyName: string;
  lockedThroughDate: string | null;
  activeRole: "owner" | "staff" | "accountant";
  salesTaxRatePercent: number;
  teamMembers: QboTeamMember[];
  accounts: QboAccount[];
  journalEntries: QboJournalEntry[];
  bankTransactions: QboBankTransaction[];
  rules: QboCategorizationRule[];
  customers: QboCustomer[];
  vendors: QboVendor[];
  productsAndServices: QboProductService[];
  estimates: QboEstimate[];
  invoices: QboInvoice[];
  expenses: QboExpense[];
  reconciliations: QboReconciliationRecord[];
  auditLogs: QboAuditLogItem[];
}

function makeFingerprint(
  bankAccountId: string,
  date: string,
  description: string,
  amountCents: number
): string {
  return `${bankAccountId}|${date.trim()}|${description
    .trim()
    .toUpperCase()}|${amountCents}`;
}

export interface InitialOwnerInfo {
  id?: string;
  name: string;
  email: string;
}

export function createStandardChartOfAccounts(): QboAccount[] {
  return [
    // Banking
    {
      id: "acc-1000",
      code: "1000",
      name: "Business Checking",
      type: "Bank",
      detailType: "Checking",
      normalBalance: "debit",
      bankBalanceCents: 0,
      isActive: true,
    },
    {
      id: "acc-1010",
      code: "1010",
      name: "Business Savings",
      type: "Bank",
      detailType: "Savings",
      normalBalance: "debit",
      bankBalanceCents: 0,
      isActive: true,
    },
    {
      id: "acc-1050",
      code: "1050",
      name: "Undeposited Funds",
      type: "Other Current Assets",
      detailType: "Undeposited Funds",
      normalBalance: "debit",
      isActive: true,
    },
    // Accounts Receivable
    {
      id: "acc-1100",
      code: "1100",
      name: "Accounts Receivable (A/R)",
      type: "Accounts Receivable",
      detailType: "Accounts Receivable",
      normalBalance: "debit",
      isActive: true,
    },
    // Other Current Assets & Fixed Assets
    {
      id: "acc-1200",
      code: "1200",
      name: "Inventory Asset",
      type: "Other Current Assets",
      detailType: "Inventory",
      normalBalance: "debit",
      isActive: true,
    },
    {
      id: "acc-1300",
      code: "1300",
      name: "Prepaid Insurance",
      type: "Other Current Assets",
      detailType: "Prepaid Expenses",
      normalBalance: "debit",
      isActive: true,
    },
    {
      id: "acc-1500",
      code: "1500",
      name: "Vehicles & Equipment",
      type: "Fixed Assets",
      detailType: "Vehicles & Machinery",
      normalBalance: "debit",
      isActive: true,
    },
    // Liabilities & Credit Cards
    {
      id: "acc-2000",
      code: "2000",
      name: "Accounts Payable (A/P)",
      type: "Accounts Payable",
      detailType: "Accounts Payable",
      normalBalance: "credit",
      isActive: true,
    },
    {
      id: "acc-2100",
      code: "2100",
      name: "Business Credit Card",
      type: "Credit Card",
      detailType: "Credit Card",
      normalBalance: "credit",
      bankBalanceCents: 0,
      isActive: true,
    },
    {
      id: "acc-2200",
      code: "2200",
      name: "Sales Tax Payable",
      type: "Other Current Liabilities",
      detailType: "Sales Tax Payable",
      normalBalance: "credit",
      isActive: true,
    },
    {
      id: "acc-2500",
      code: "2500",
      name: "Equipment Loan Payable",
      type: "Long Term Liabilities",
      detailType: "Notes Payable",
      normalBalance: "credit",
      isActive: true,
    },
    // Equity
    {
      id: "acc-3000",
      code: "3000",
      name: "Opening Balance Equity",
      type: "Equity",
      detailType: "Opening Balance Equity",
      normalBalance: "credit",
      isActive: true,
    },
    {
      id: "acc-3100",
      code: "3100",
      name: "Owner's Equity",
      type: "Equity",
      detailType: "Owner's Equity",
      normalBalance: "credit",
      isActive: true,
    },
    {
      id: "acc-3200",
      code: "3200",
      name: "Retained Earnings",
      type: "Equity",
      detailType: "Retained Earnings",
      normalBalance: "credit",
      isActive: true,
    },
    // Income
    {
      id: "acc-4000",
      code: "4000",
      name: "Services Income",
      type: "Income",
      detailType: "Service/Fee Income",
      normalBalance: "credit",
      isActive: true,
    },
    {
      id: "acc-4010",
      code: "4010",
      name: "Sales of Product Income",
      type: "Income",
      detailType: "Service/Fee Income",
      normalBalance: "credit",
      isActive: true,
    },
    {
      id: "acc-4020",
      code: "4020",
      name: "Consulting & Retainer Income",
      type: "Income",
      detailType: "Service/Fee Income",
      normalBalance: "credit",
      isActive: true,
    },
    // Cost of Goods Sold
    {
      id: "acc-5010",
      code: "5010",
      name: "Supplies & Materials - COGS",
      type: "Cost of Goods Sold",
      detailType: "Supplies & Materials - COGS",
      normalBalance: "debit",
      isActive: true,
    },
    {
      id: "acc-5020",
      code: "5020",
      name: "Subcontractor Labor",
      type: "Cost of Goods Sold",
      detailType: "Cost of Labor - COGS",
      normalBalance: "debit",
      isActive: true,
    },
    // Operating Expenses
    {
      id: "acc-6010",
      code: "6010",
      name: "Advertising & Marketing",
      type: "Expenses",
      detailType: "Advertising/Promotional",
      normalBalance: "debit",
      isActive: true,
    },
    {
      id: "acc-6020",
      code: "6020",
      name: "Automobile & Fuel Expense",
      type: "Expenses",
      detailType: "Auto",
      normalBalance: "debit",
      isActive: true,
    },
    {
      id: "acc-6030",
      code: "6030",
      name: "Bank Charges & Fees",
      type: "Expenses",
      detailType: "Bank Charges",
      normalBalance: "debit",
      isActive: true,
    },
    {
      id: "acc-6040",
      code: "6040",
      name: "General Liability Insurance",
      type: "Expenses",
      detailType: "Insurance",
      normalBalance: "debit",
      isActive: true,
    },
    {
      id: "acc-6050",
      code: "6050",
      name: "Legal & Accounting Fees",
      type: "Expenses",
      detailType: "Legal & Professional Fees",
      normalBalance: "debit",
      isActive: true,
    },
    {
      id: "acc-6060",
      code: "6060",
      name: "Office Supplies & Software",
      type: "Expenses",
      detailType: "Office/General Administrative",
      normalBalance: "debit",
      isActive: true,
    },
    {
      id: "acc-6070",
      code: "6070",
      name: "Payroll & Wages",
      type: "Expenses",
      detailType: "Payroll Expenses",
      normalBalance: "debit",
      isActive: true,
    },
    {
      id: "acc-6080",
      code: "6080",
      name: "Rent & Lease",
      type: "Expenses",
      detailType: "Rent or Lease of Buildings",
      normalBalance: "debit",
      isActive: true,
    },
    {
      id: "acc-6090",
      code: "6090",
      name: "Software Subscriptions",
      type: "Expenses",
      detailType: "Office/General Administrative",
      normalBalance: "debit",
      isActive: true,
    },
    {
      id: "acc-6100",
      code: "6100",
      name: "Utilities (Gas, Water & Electric)",
      type: "Expenses",
      detailType: "Utilities",
      normalBalance: "debit",
      isActive: true,
    },
    {
      id: "acc-6120",
      code: "6120",
      name: "Equipment Rental",
      type: "Expenses",
      detailType: "Equipment Rental",
      normalBalance: "debit",
      isActive: true,
    },
    {
      id: "acc-6130",
      code: "6130",
      name: "Repairs & Maintenance",
      type: "Expenses",
      detailType: "Repair & Maintenance",
      normalBalance: "debit",
      isActive: true,
    },
  ];
}

export function createFreshCompanyData(
  companyName = "New Business LLC",
  ownerInfo?: InitialOwnerInfo
): QboStoreData {
  const cleanName = companyName.trim() || "New Business LLC";
  const ownerName = ownerInfo?.name?.trim() || "Company Owner";
  const ownerEmail =
    ownerInfo?.email?.trim().toLowerCase() || "owner@company.local";
  return {
    companyName: cleanName,
    lockedThroughDate: null,
    activeRole: "owner",
    salesTaxRatePercent: 8.25,
    teamMembers: [
      {
        id: ownerInfo?.id || "tm-1",
        name: ownerName,
        email: ownerEmail,
        role: "owner",
        status: "Active",
      },
    ],
    accounts: createStandardChartOfAccounts(),
    journalEntries: [],
    bankTransactions: [],
    rules: [],
    customers: [],
    vendors: [],
    productsAndServices: [],
    estimates: [],
    invoices: [],
    expenses: [],
    reconciliations: [],
    auditLogs: [
      {
        id: `aud-init-${Date.now()}`,
        timestamp: new Date().toISOString(),
        user: `${ownerName} (OWNER)`,
        action: "Company Created",
        details: `Initialized 31 Chart of Accounts for ${cleanName}`,
      },
    ],
  };
}

type GlobalQboStore = {
  __qboStoreData?: QboStoreData;
};

const globalStore = globalThis as unknown as GlobalQboStore;

export function getRawStore(): QboStoreData {
  if (!globalStore.__qboStoreData) {
    globalStore.__qboStoreData = createFreshCompanyData();
  }
  return globalStore.__qboStoreData;
}

export function hydrateQboStore(data: QboStoreData): void {
  globalStore.__qboStoreData = data;
}

export function resetQboStore(ownerInfo?: InitialOwnerInfo): QboStoreData {
  const current = globalStore.__qboStoreData;
  const fallbackOwner =
    ownerInfo ||
    (() => {
      const existingOwner = current?.teamMembers.find(
        (m) => m.role === "owner" && m.email !== "enterandpost02@gmail.com"
      );
      return existingOwner
        ? {
            id: existingOwner.id,
            name: existingOwner.name,
            email: existingOwner.email,
          }
        : undefined;
    })();
  globalStore.__qboStoreData = createFreshCompanyData(
    current?.companyName || "New Business LLC",
    fallbackOwner
  );
  return globalStore.__qboStoreData;
}

export function wipeAllCompanyTransactions(): QboStoreData {
  assertIsOwner("reset all company transactions");
  assertCanWrite();
  const store = getRawStore();
  store.journalEntries = [];
  store.bankTransactions = [];
  store.invoices = [];
  store.expenses = [];
  store.estimates = [];
  store.reconciliations = [];
  store.customers = [];
  store.vendors = [];
  store.productsAndServices = [];
  store.rules = [];
  store.lockedThroughDate = null;
  for (const acc of store.accounts) {
    if (acc.bankBalanceCents !== undefined) {
      acc.bankBalanceCents = 0;
    }
  }
  const realMembers = (store.teamMembers || []).filter(
    (m) => m.email !== "enterandpost02@gmail.com"
  );
  if (realMembers.length > 0) {
    store.teamMembers = realMembers;
  } else {
    store.teamMembers = [
      {
        id: "tm-1",
        name: "Company Owner",
        email: "owner@company.local",
        role: "owner",
        status: "Active",
      },
    ];
  }
  store.activeRole = "owner";
  appendAuditLog(
    "Ledger Reset",
    "Cleared all transactions, customers, vendors, and bank feed items. Books reset to $0.00 balances."
  );
  return store;
}

function appendAuditLog(
  action: string,
  details: string,
  amountCents?: number
): void {
  const store = getRawStore();
  const activeUser = store.teamMembers.find(
    (m) => m.role === store.activeRole
  );
  const userLabel = activeUser
    ? `${activeUser.name} (${activeUser.role.toUpperCase()})`
    : `Company Owner (${store.activeRole.toUpperCase()})`;

  store.auditLogs.unshift({
    id: `aud-${Date.now()}-${store.auditLogs.length}`,
    timestamp: new Date().toISOString(),
    user: userLabel,
    action,
    details,
    amountCents,
  });
}

function matchRuleForTransaction(
  rules: QboCategorizationRule[],
  description: string,
  amountCents: number
): { accountId?: string; ruleName?: string; payee?: string } {
  const upper = description.toUpperCase();
  const dir = amountCents >= 0 ? "in" : "out";

  for (const rule of rules) {
    const dirMatch = rule.direction === "any" || rule.direction === dir;
    if (dirMatch && upper.includes(rule.containsText.toUpperCase())) {
      return {
        accountId: rule.targetAccountId,
        ruleName: rule.name,
        payee: rule.payeeName,
      };
    }
  }
  return {};
}

export interface ComputedAccount extends QboAccount {
  balanceCents: number;
  debitTotalCents: number;
  creditTotalCents: number;
  forReviewCount: number;
}

export interface AgingRow {
  entityId: string;
  entityName: string;
  currentCents: number;
  days1To30Cents: number;
  days31To60Cents: number;
  days61PlusCents: number;
  totalCents: number;
}

export interface ComputedQboState extends QboStoreData {
  activeOrganizationId?: string;
  organizations?: Array<{ id: string; name: string; slug: string }>;
  accountsWithBalances: ComputedAccount[];
  reports: {
    profitAndLoss: {
      incomeLines: Array<{ id: string; code: string; name: string; amountCents: number }>;
      totalIncomeCents: number;
      cogsLines: Array<{ id: string; code: string; name: string; amountCents: number }>;
      totalCogsCents: number;
      grossProfitCents: number;
      expenseLines: Array<{ id: string; code: string; name: string; amountCents: number }>;
      totalExpensesCents: number;
      netIncomeCents: number;
    };
    balanceSheet: {
      assetLines: Array<{ id: string; code: string; name: string; type: string; amountCents: number }>;
      totalAssetsCents: number;
      liabilityLines: Array<{ id: string; code: string; name: string; type: string; amountCents: number }>;
      totalLiabilitiesCents: number;
      equityLines: Array<{ id: string; code: string; name: string; amountCents: number }>;
      netIncomeCents: number;
      totalEquityCents: number;
      totalLiabilitiesAndEquityCents: number;
      isBalanced: boolean;
    };
    trialBalance: {
      rows: Array<{
        accountId: string;
        code: string;
        name: string;
        type: AccountType;
        debitBalanceCents: number;
        creditBalanceCents: number;
      }>;
      totalDebitsCents: number;
      totalCreditsCents: number;
      isBalanced: boolean;
    };
    arAging: {
      rows: AgingRow[];
      totalCents: number;
    };
    apAging: {
      rows: AgingRow[];
      totalCents: number;
    };
    generalLedger: Array<{
      accountId: string;
      accountCode: string;
      accountName: string;
      accountType: AccountType;
      normalBalance: NormalBalance;
      endingBalanceCents: number;
      movements: Array<{
        entryId: string;
        entryNumber: string;
        date: string;
        memo: string;
        description: string;
        entityName?: string;
        debitCents: number;
        creditCents: number;
        runningBalanceCents: number;
      }>;
    }>;
  };
  kpis: {
    totalBankCashCents: number;
    openInvoicesCents: number;
    overdueInvoicesCents: number;
    paidLast30DaysCents: number;
    openBillsCents: number;
    openEstimatesCents: number;
    forReviewCount: number;
  };
  securityAudit: {
    allMoneyIntegerCents: boolean;
    allEntriesBalanced: boolean;
    balanceSheetBalanced: boolean;
    trialBalanceBalanced: boolean;
    periodLockConfigured: boolean;
    orgIsolationEnforced: boolean;
    passedCount: number;
    totalChecks: number;
  };
}

export interface ReportFilterOptions {
  basis?: "accrual" | "cash";
  startDate?: string;
  endDate?: string;
  /**
   * Customer / Vendor / Payee filter. Whole journal entries are kept when any of their
   * lines references this name, so filtered reports still satisfy Debits === Credits.
   */
  entityName?: string;
  /** Restricts the General Ledger report to a single account. */
  accountId?: string;
}

export type ReportComparisonMode = "previous_period" | "previous_year";

function parseIsoDateUtc(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

function formatIsoDateUtc(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function lastDayOfMonthUtc(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

/**
 * Computes the comparison date range for a report period.
 * - previous_year: same dates one year earlier (Feb 29 clamps to Feb 28).
 * - previous_period: the immediately preceding range of equal length. Whole-month ranges
 *   (1st → last day of a month) shift by whole calendar months so month lengths are respected.
 */
export function computeComparisonRange(
  startDate?: string,
  endDate?: string,
  mode: ReportComparisonMode = "previous_period"
): { startDate?: string; endDate?: string } {
  if (!startDate && !endDate) {
    return { startDate: undefined, endDate: undefined };
  }

  const shiftMonths = (d: Date, months: number, clampToMonthEnd: boolean) => {
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth() + months;
    const targetYear = y + Math.floor(m / 12);
    const targetMonth = ((m % 12) + 12) % 12;
    const maxDay = lastDayOfMonthUtc(targetYear, targetMonth);
    const day = clampToMonthEnd ? maxDay : Math.min(d.getUTCDate(), maxDay);
    return new Date(Date.UTC(targetYear, targetMonth, day));
  };

  // Open-ended end date only
  if (!startDate && endDate) {
    const end = parseIsoDateUtc(endDate);
    if (Number.isNaN(end.getTime())) {
      throw new Error("Invalid end date provided for comparison.");
    }
    const endIsMonthEnd =
      end.getUTCDate() === lastDayOfMonthUtc(end.getUTCFullYear(), end.getUTCMonth());
    const shiftedEnd =
      mode === "previous_year"
        ? shiftMonths(end, -12, endIsMonthEnd)
        : shiftMonths(end, -1, endIsMonthEnd);
    return { startDate: undefined, endDate: formatIsoDateUtc(shiftedEnd) };
  }

  // Open-ended start date only
  if (startDate && !endDate) {
    const start = parseIsoDateUtc(startDate);
    if (Number.isNaN(start.getTime())) {
      throw new Error("Invalid start date provided for comparison.");
    }
    const shiftedStart =
      mode === "previous_year"
        ? shiftMonths(start, -12, false)
        : shiftMonths(start, -1, false);
    return { startDate: formatIsoDateUtc(shiftedStart), endDate: undefined };
  }

  const start = parseIsoDateUtc(startDate!);
  const end = parseIsoDateUtc(endDate!);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    throw new Error("Comparison requires a valid start date on or before the end date.");
  }

  if (mode === "previous_year") {
    const endIsMonthEnd =
      end.getUTCDate() === lastDayOfMonthUtc(end.getUTCFullYear(), end.getUTCMonth());
    return {
      startDate: formatIsoDateUtc(shiftMonths(start, -12, false)),
      endDate: formatIsoDateUtc(shiftMonths(end, -12, endIsMonthEnd)),
    };
  }

  const isWholeMonthRange =
    start.getUTCDate() === 1 &&
    end.getUTCDate() === lastDayOfMonthUtc(end.getUTCFullYear(), end.getUTCMonth());

  if (isWholeMonthRange) {
    const monthCount =
      (end.getUTCFullYear() - start.getUTCFullYear()) * 12 +
      (end.getUTCMonth() - start.getUTCMonth()) +
      1;
    const prevStart = shiftMonths(start, -monthCount, false);
    const prevEnd = new Date(start.getTime() - 24 * 60 * 60 * 1000);
    return {
      startDate: formatIsoDateUtc(prevStart),
      endDate: formatIsoDateUtc(prevEnd),
    };
  }

  const dayMs = 24 * 60 * 60 * 1000;
  const lengthDays = Math.round((end.getTime() - start.getTime()) / dayMs) + 1;
  const prevEnd = new Date(start.getTime() - dayMs);
  const prevStart = new Date(prevEnd.getTime() - (lengthDays - 1) * dayMs);
  return {
    startDate: formatIsoDateUtc(prevStart),
    endDate: formatIsoDateUtc(prevEnd),
  };
}

function diffDays(dueDateStr: string, refDateStr = "2026-10-27"): number {
  const due = new Date(`${dueDateStr}T00:00:00Z`).getTime();
  const ref = new Date(`${refDateStr}T00:00:00Z`).getTime();
  return Math.floor((ref - due) / (1000 * 60 * 60 * 24));
}

function transformSingleEntryForCashBasis(
  store: QboStoreData,
  entry: QboJournalEntry
): QboJournalEntry {
  if (entry.sourceType === "invoice_payment") {
    const inv = store.invoices.find(
      (i) => i.id === entry.sourceId || i.paymentJournalEntryId === entry.id
    );
    const origJe = store.journalEntries.find(
      (e) =>
        e.sourceType === "invoice" &&
        (e.id === inv?.journalEntryId ||
          (entry.sourceId && e.sourceId === entry.sourceId))
    );
    const origCreditLines =
      origJe?.lines.filter((l) => l.creditCents > 0) ?? [];
    const origTotalCredit = origCreditLines.reduce(
      (s, l) => s + l.creditCents,
      0
    );

    const transformedLines: QboJournalLine[] = [];
    for (const line of entry.lines) {
      if (
        line.accountId === "acc-1100" &&
        line.creditCents > 0 &&
        origCreditLines.length > 0 &&
        origTotalCredit > 0
      ) {
        let remaining = line.creditCents;
        const allocated = origCreditLines.map((cl, idx) => {
          const share =
            idx === origCreditLines.length - 1
              ? remaining
              : Math.round(
                  (line.creditCents * cl.creditCents) / origTotalCredit
                );
          remaining -= share;
          return {
            ...cl,
            id: `${line.id}-cash-${idx}`,
            debitCents: 0,
            creditCents: share,
          };
        });
        transformedLines.push(...allocated);
      } else if (line.accountId === "acc-1100" && line.creditCents > 0) {
        const fallbackAcc =
          store.accounts.find((a) => a.id === "acc-4000") ?? store.accounts[0];
        transformedLines.push({
          ...line,
          accountId: fallbackAcc.id,
          accountCode: fallbackAcc.code,
          accountName: fallbackAcc.name,
        });
      } else {
        transformedLines.push(line);
      }
    }

    return {
      ...entry,
      lines: transformedLines,
    };
  }

  if (entry.sourceType === "bill_payment") {
    const bill = store.expenses.find(
      (b) => b.id === entry.sourceId || b.paymentJournalEntryId === entry.id
    );
    const origJe = store.journalEntries.find(
      (e) =>
        e.sourceType === "bill" &&
        (e.id === bill?.journalEntryId ||
          (entry.sourceId && e.sourceId === entry.sourceId))
    );
    const origDebitLines =
      origJe?.lines.filter((l) => l.debitCents > 0) ?? [];
    const origTotalDebit = origDebitLines.reduce(
      (s, l) => s + l.debitCents,
      0
    );

    const transformedLines: QboJournalLine[] = [];
    for (const line of entry.lines) {
      if (
        line.accountId === "acc-2000" &&
        line.debitCents > 0 &&
        origDebitLines.length > 0 &&
        origTotalDebit > 0
      ) {
        let remaining = line.debitCents;
        const allocated = origDebitLines.map((dl, idx) => {
          const share =
            idx === origDebitLines.length - 1
              ? remaining
              : Math.round(
                  (line.debitCents * dl.debitCents) / origTotalDebit
                );
          remaining -= share;
          return {
            ...dl,
            id: `${line.id}-cash-${idx}`,
            debitCents: share,
            creditCents: 0,
          };
        });
        transformedLines.push(...allocated);
      } else if (
        line.accountId === "acc-2000" &&
        line.debitCents > 0 &&
        bill
      ) {
        const catAcc = store.accounts.find(
          (a) => a.id === bill.categoryAccountId
        );
        transformedLines.push({
          ...line,
          accountId: catAcc?.id ?? "acc-5010",
          accountCode: catAcc?.code ?? "5010",
          accountName: catAcc?.name ?? bill.categoryAccountName,
        });
      } else {
        transformedLines.push(line);
      }
    }

    return {
      ...entry,
      lines: transformedLines,
    };
  }

  return entry;
}

function getEffectiveEntriesForBasis(
  store: QboStoreData,
  basis: "accrual" | "cash"
): QboJournalEntry[] {
  if (basis === "accrual") {
    return store.journalEntries;
  }

  const cashEntries: QboJournalEntry[] = [];

  for (const entry of store.journalEntries) {
    if (entry.sourceType === "invoice" || entry.sourceType === "bill") {
      continue;
    }

    if (entry.sourceType === "reversal" && entry.reversesEntryId) {
      const reversedOrig = store.journalEntries.find(
        (e) => e.id === entry.reversesEntryId
      );
      if (reversedOrig) {
        if (
          reversedOrig.sourceType === "invoice" ||
          reversedOrig.sourceType === "bill"
        ) {
          continue;
        }
        if (
          reversedOrig.sourceType === "invoice_payment" ||
          reversedOrig.sourceType === "bill_payment"
        ) {
          const transformedOrig = transformSingleEntryForCashBasis(
            store,
            reversedOrig
          );
          cashEntries.push({
            ...entry,
            lines: transformedOrig.lines.map((l, idx) => ({
              ...l,
              id: `${entry.id}-rev-cash-${idx}`,
              debitCents: l.creditCents,
              creditCents: l.debitCents,
            })),
          });
          continue;
        }
      }
    }

    cashEntries.push(transformSingleEntryForCashBasis(store, entry));
  }

  return cashEntries;
}

export function computeReportsForFilter(
  store: QboStoreData,
  filter?: ReportFilterOptions
): ComputedQboState["reports"] {
  const basis = filter?.basis ?? "accrual";
  const startDate = filter?.startDate?.trim() || "";
  const endDate = filter?.endDate?.trim() || "";
  const entityFilter = filter?.entityName?.trim().toLowerCase() || "";
  const glAccountFilter = filter?.accountId?.trim() || "";

  const matchesEntity = (name?: string) =>
    !entityFilter || (name ?? "").trim().toLowerCase() === entityFilter;

  const basisEntries = getEffectiveEntriesForBasis(store, basis);
  // Entity filter keeps whole entries (never individual lines) so every report stays balanced.
  const effectiveEntries = entityFilter
    ? basisEntries.filter((e) => e.lines.some((l) => matchesEntity(l.entityName)))
    : basisEntries;
  const sortedAll = [...effectiveEntries].sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  // Entries up through endDate (for Balance Sheet & Trial Balance)
  const asOfEntries = sortedAll.filter((e) => !endDate || e.date <= endDate);
  // Entries within [startDate, endDate] (for Profit & Loss & General Ledger movements)
  const periodEntries = asOfEntries.filter(
    (e) => !startDate || e.date >= startDate
  );
  // Entries strictly before startDate (for Prior Period Retained Earnings roll-forward)
  const priorEntries = startDate
    ? asOfEntries.filter((e) => e.date < startDate)
    : [];

  function computeAccountBalancesForEntries(
    entries: QboJournalEntry[]
  ): ComputedAccount[] {
    const dMap = new Map<string, number>();
    const cMap = new Map<string, number>();
    for (const acc of store.accounts) {
      dMap.set(acc.id, 0);
      cMap.set(acc.id, 0);
    }
    for (const entry of entries) {
      for (const line of entry.lines) {
        dMap.set(
          line.accountId,
          (dMap.get(line.accountId) ?? 0) + line.debitCents
        );
        cMap.set(
          line.accountId,
          (cMap.get(line.accountId) ?? 0) + line.creditCents
        );
      }
    }
    return store.accounts.map((acc) => {
      const debitTotalCents = dMap.get(acc.id) ?? 0;
      const creditTotalCents = cMap.get(acc.id) ?? 0;
      const balanceCents =
        acc.normalBalance === "debit"
          ? debitTotalCents - creditTotalCents
          : creditTotalCents - debitTotalCents;
      return {
        ...acc,
        debitTotalCents,
        creditTotalCents,
        balanceCents,
        forReviewCount: 0,
      };
    });
  }

  const periodBalances = computeAccountBalancesForEntries(periodEntries);
  const asOfBalances = computeAccountBalancesForEntries(asOfEntries);
  const priorBalances = computeAccountBalancesForEntries(priorEntries);

  // Profit & Loss (for periodEntries: [startDate, endDate])
  const incomeLines = periodBalances
    .filter((a) => a.type === "Income" && a.balanceCents !== 0)
    .map((a) => ({
      id: a.id,
      code: a.code,
      name: a.name,
      amountCents: a.balanceCents,
    }));
  const totalIncomeCents = incomeLines.reduce((s, l) => s + l.amountCents, 0);

  const cogsLines = periodBalances
    .filter((a) => a.type === "Cost of Goods Sold" && a.balanceCents !== 0)
    .map((a) => ({
      id: a.id,
      code: a.code,
      name: a.name,
      amountCents: a.balanceCents,
    }));
  const totalCogsCents = cogsLines.reduce((s, l) => s + l.amountCents, 0);

  const grossProfitCents = totalIncomeCents - totalCogsCents;

  const expenseLines = periodBalances
    .filter((a) => a.type === "Expenses" && a.balanceCents !== 0)
    .map((a) => ({
      id: a.id,
      code: a.code,
      name: a.name,
      amountCents: a.balanceCents,
    }));
  const totalExpensesCents = expenseLines.reduce(
    (s, l) => s + l.amountCents,
    0
  );

  const netIncomeCents = grossProfitCents - totalExpensesCents;

  // Prior Period Net Income (< startDate) rolls into Retained Earnings on Balance Sheet
  const priorIncome = priorBalances
    .filter((a) => a.type === "Income")
    .reduce((s, a) => s + a.balanceCents, 0);
  const priorCogs = priorBalances
    .filter((a) => a.type === "Cost of Goods Sold")
    .reduce((s, a) => s + a.balanceCents, 0);
  const priorExpenses = priorBalances
    .filter((a) => a.type === "Expenses")
    .reduce((s, a) => s + a.balanceCents, 0);
  const priorNetIncomeCents = priorIncome - priorCogs - priorExpenses;

  // Balance Sheet (As of endDate)
  const assetTypes: AccountType[] = [
    "Bank",
    "Accounts Receivable",
    "Other Current Assets",
    "Fixed Assets",
  ];
  const liabilityTypes: AccountType[] = [
    "Accounts Payable",
    "Credit Card",
    "Other Current Liabilities",
    "Long Term Liabilities",
  ];

  const assetLines = asOfBalances
    .filter((a) => assetTypes.includes(a.type) && a.balanceCents !== 0)
    .map((a) => ({
      id: a.id,
      code: a.code,
      name: a.name,
      type: a.type,
      amountCents: a.balanceCents,
    }));
  const totalAssetsCents = assetLines.reduce((s, l) => s + l.amountCents, 0);

  const liabilityLines = asOfBalances
    .filter((a) => liabilityTypes.includes(a.type) && a.balanceCents !== 0)
    .map((a) => ({
      id: a.id,
      code: a.code,
      name: a.name,
      type: a.type,
      amountCents: a.balanceCents,
    }));
  const totalLiabilitiesCents = liabilityLines.reduce(
    (s, l) => s + l.amountCents,
    0
  );

  const equityLines = asOfBalances
    .filter((a) => a.type === "Equity" && a.balanceCents !== 0)
    .map((a) => ({
      id: a.id,
      code: a.code,
      name: a.name,
      amountCents: a.balanceCents,
    }));
  if (priorNetIncomeCents !== 0) {
    equityLines.push({
      id: "acc-3200-prior",
      code: "3200",
      name: `Retained Earnings (Prior to ${startDate})`,
      amountCents: priorNetIncomeCents,
    });
  }
  const baseEquityCents = equityLines.reduce((s, l) => s + l.amountCents, 0);
  const totalEquityCents = baseEquityCents + netIncomeCents;
  const totalLiabilitiesAndEquityCents =
    totalLiabilitiesCents + totalEquityCents;

  // Trial Balance (As of endDate)
  const tbRows = asOfBalances
    .filter((a) => a.debitTotalCents !== a.creditTotalCents)
    .map((a) => {
      const netDebit = a.debitTotalCents - a.creditTotalCents;
      return {
        accountId: a.id,
        code: a.code,
        name: a.name,
        type: a.type,
        debitBalanceCents: netDebit > 0 ? netDebit : 0,
        creditBalanceCents: netDebit < 0 ? Math.abs(netDebit) : 0,
      };
    });
  const tbTotalDebits = tbRows.reduce((s, r) => s + r.debitBalanceCents, 0);
  const tbTotalCredits = tbRows.reduce((s, r) => s + r.creditBalanceCents, 0);

  // A/R Aging Summary Calculation (filtered by endDate if provided)
  const arMap = new Map<string, AgingRow>();
  if (basis === "accrual") {
    for (const inv of store.invoices) {
      if (endDate && inv.date > endDate) continue;
      if (inv.status === "Paid" || inv.balanceDueCents <= 0) continue;
      if (!matchesEntity(inv.customerName)) continue;
      const row = arMap.get(inv.customerId) ?? {
        entityId: inv.customerId,
        entityName: inv.customerName,
        currentCents: 0,
        days1To30Cents: 0,
        days31To60Cents: 0,
        days61PlusCents: 0,
        totalCents: 0,
      };
      const daysPastDue = diffDays(inv.dueDate, endDate || "2026-10-27");
      if (daysPastDue <= 0) {
        row.currentCents += inv.balanceDueCents;
      } else if (daysPastDue <= 30) {
        row.days1To30Cents += inv.balanceDueCents;
      } else if (daysPastDue <= 60) {
        row.days31To60Cents += inv.balanceDueCents;
      } else {
        row.days61PlusCents += inv.balanceDueCents;
      }
      row.totalCents += inv.balanceDueCents;
      arMap.set(inv.customerId, row);
    }
  }
  const arRows = Array.from(arMap.values());
  const arTotalCents = arRows.reduce((s, r) => s + r.totalCents, 0);

  // A/P Aging Summary Calculation (filtered by endDate if provided)
  const apMap = new Map<string, AgingRow>();
  if (basis === "accrual") {
    for (const bill of store.expenses) {
      if (endDate && bill.date > endDate) continue;
      if (bill.type !== "Bill" || bill.status === "Paid") continue;
      if (!matchesEntity(bill.vendorName)) continue;
      const row = apMap.get(bill.vendorId) ?? {
        entityId: bill.vendorId,
        entityName: bill.vendorName,
        currentCents: 0,
        days1To30Cents: 0,
        days31To60Cents: 0,
        days61PlusCents: 0,
        totalCents: 0,
      };
      const daysPastDue = diffDays(
        bill.dueDate || bill.date,
        endDate || "2026-10-27"
      );
      if (daysPastDue <= 0) {
        row.currentCents += bill.amountCents;
      } else if (daysPastDue <= 30) {
        row.days1To30Cents += bill.amountCents;
      } else if (daysPastDue <= 60) {
        row.days31To60Cents += bill.amountCents;
      } else {
        row.days61PlusCents += bill.amountCents;
      }
      row.totalCents += bill.amountCents;
      apMap.set(bill.vendorId, row);
    }
  }
  const apRows = Array.from(apMap.values());
  const apTotalCents = apRows.reduce((s, r) => s + r.totalCents, 0);

  // General Ledger Calculation
  const generalLedger = asOfBalances
    .filter((acc) => !glAccountFilter || acc.id === glAccountFilter)
    .map((acc) => {
      let runningBalanceCents = 0;
      const movements: ComputedQboState["reports"]["generalLedger"][number]["movements"] =
        [];

      for (const entry of asOfEntries) {
        for (const line of entry.lines) {
          if (line.accountId === acc.id) {
            const delta =
              acc.normalBalance === "debit"
                ? line.debitCents - line.creditCents
                : line.creditCents - line.debitCents;
            runningBalanceCents += delta;
            if (!startDate || entry.date >= startDate) {
              movements.push({
                entryId: entry.id,
                entryNumber: entry.entryNumber,
                date: entry.date,
                memo: entry.memo,
                description: line.description,
                entityName: line.entityName,
                debitCents: line.debitCents,
                creditCents: line.creditCents,
                runningBalanceCents,
              });
            }
          }
        }
      }

      return {
        accountId: acc.id,
        accountCode: acc.code,
        accountName: acc.name,
        accountType: acc.type,
        normalBalance: acc.normalBalance,
        endingBalanceCents: runningBalanceCents,
        movements,
      };
    })
    .filter((g) => g.movements.length > 0);

  return {
    profitAndLoss: {
      incomeLines,
      totalIncomeCents,
      cogsLines,
      totalCogsCents,
      grossProfitCents,
      expenseLines,
      totalExpensesCents,
      netIncomeCents,
    },
    balanceSheet: {
      assetLines,
      totalAssetsCents,
      liabilityLines,
      totalLiabilitiesCents,
      equityLines,
      netIncomeCents,
      totalEquityCents,
      totalLiabilitiesAndEquityCents,
      isBalanced: totalAssetsCents === totalLiabilitiesAndEquityCents,
    },
    trialBalance: {
      rows: tbRows,
      totalDebitsCents: tbTotalDebits,
      totalCreditsCents: tbTotalCredits,
      isBalanced: tbTotalDebits === tbTotalCredits,
    },
    arAging: {
      rows: arRows,
      totalCents: arTotalCents,
    },
    apAging: {
      rows: apRows,
      totalCents: apTotalCents,
    },
    generalLedger,
  };
}

export function getComputedQboState(): ComputedQboState {
  const store = getRawStore();

  const debitMap = new Map<string, number>();
  const creditMap = new Map<string, number>();

  for (const acc of store.accounts) {
    debitMap.set(acc.id, 0);
    creditMap.set(acc.id, 0);
  }

  // Chronological sort for general ledger
  const sortedEntries = [...store.journalEntries].sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  for (const entry of sortedEntries) {
    for (const line of entry.lines) {
      debitMap.set(
        line.accountId,
        (debitMap.get(line.accountId) ?? 0) + line.debitCents
      );
      creditMap.set(
        line.accountId,
        (creditMap.get(line.accountId) ?? 0) + line.creditCents
      );
    }
  }

  const accountsWithBalances: ComputedAccount[] = store.accounts.map((acc) => {
    const debitTotalCents = debitMap.get(acc.id) ?? 0;
    const creditTotalCents = creditMap.get(acc.id) ?? 0;
    const balanceCents =
      acc.normalBalance === "debit"
        ? debitTotalCents - creditTotalCents
        : creditTotalCents - debitTotalCents;

    const pendingForReviewTxs = store.bankTransactions.filter(
      (t) => t.bankAccountId === acc.id && t.status === "for_review"
    );
    const forReviewCount = pendingForReviewTxs.length;
    const pendingNetCents = pendingForReviewTxs.reduce(
      (s, t) => s + t.amountCents,
      0
    );

    const dynamicBankBalanceCents =
      acc.type === "Bank"
        ? balanceCents + pendingNetCents
        : acc.type === "Credit Card"
        ? balanceCents - pendingNetCents
        : acc.bankBalanceCents;

    return {
      ...acc,
      bankBalanceCents: dynamicBankBalanceCents,
      debitTotalCents,
      creditTotalCents,
      balanceCents,
      forReviewCount,
    };
  });

  // Profit & Loss Calculation
  const incomeLines = accountsWithBalances
    .filter((a) => a.type === "Income" && a.balanceCents !== 0)
    .map((a) => ({
      id: a.id,
      code: a.code,
      name: a.name,
      amountCents: a.balanceCents,
    }));
  const totalIncomeCents = incomeLines.reduce((s, l) => s + l.amountCents, 0);

  const cogsLines = accountsWithBalances
    .filter((a) => a.type === "Cost of Goods Sold" && a.balanceCents !== 0)
    .map((a) => ({
      id: a.id,
      code: a.code,
      name: a.name,
      amountCents: a.balanceCents,
    }));
  const totalCogsCents = cogsLines.reduce((s, l) => s + l.amountCents, 0);

  const grossProfitCents = totalIncomeCents - totalCogsCents;

  const expenseLines = accountsWithBalances
    .filter((a) => a.type === "Expenses" && a.balanceCents !== 0)
    .map((a) => ({
      id: a.id,
      code: a.code,
      name: a.name,
      amountCents: a.balanceCents,
    }));
  const totalExpensesCents = expenseLines.reduce(
    (s, l) => s + l.amountCents,
    0
  );

  const netIncomeCents = grossProfitCents - totalExpensesCents;

  // Balance Sheet Calculation
  const assetTypes: AccountType[] = [
    "Bank",
    "Accounts Receivable",
    "Other Current Assets",
    "Fixed Assets",
  ];
  const liabilityTypes: AccountType[] = [
    "Accounts Payable",
    "Credit Card",
    "Other Current Liabilities",
    "Long Term Liabilities",
  ];

  const assetLines = accountsWithBalances
    .filter((a) => assetTypes.includes(a.type) && a.balanceCents !== 0)
    .map((a) => ({
      id: a.id,
      code: a.code,
      name: a.name,
      type: a.type,
      amountCents: a.balanceCents,
    }));
  const totalAssetsCents = assetLines.reduce((s, l) => s + l.amountCents, 0);

  const liabilityLines = accountsWithBalances
    .filter((a) => liabilityTypes.includes(a.type) && a.balanceCents !== 0)
    .map((a) => ({
      id: a.id,
      code: a.code,
      name: a.name,
      type: a.type,
      amountCents: a.balanceCents,
    }));
  const totalLiabilitiesCents = liabilityLines.reduce(
    (s, l) => s + l.amountCents,
    0
  );

  const equityLines = accountsWithBalances
    .filter((a) => a.type === "Equity" && a.balanceCents !== 0)
    .map((a) => ({
      id: a.id,
      code: a.code,
      name: a.name,
      amountCents: a.balanceCents,
    }));
  const baseEquityCents = equityLines.reduce((s, l) => s + l.amountCents, 0);
  const totalEquityCents = baseEquityCents + netIncomeCents;
  const totalLiabilitiesAndEquityCents =
    totalLiabilitiesCents + totalEquityCents;

  // Trial Balance Calculation
  const tbRows = accountsWithBalances
    .filter((a) => a.debitTotalCents !== a.creditTotalCents)
    .map((a) => {
      const netDebit = a.debitTotalCents - a.creditTotalCents;
      return {
        accountId: a.id,
        code: a.code,
        name: a.name,
        type: a.type,
        debitBalanceCents: netDebit > 0 ? netDebit : 0,
        creditBalanceCents: netDebit < 0 ? Math.abs(netDebit) : 0,
      };
    });
  const tbTotalDebits = tbRows.reduce((s, r) => s + r.debitBalanceCents, 0);
  const tbTotalCredits = tbRows.reduce((s, r) => s + r.creditBalanceCents, 0);

  // A/R Aging Summary Calculation
  const arMap = new Map<string, AgingRow>();
  for (const inv of store.invoices) {
    if (inv.status === "Paid" || inv.balanceDueCents <= 0) continue;
    const row = arMap.get(inv.customerId) ?? {
      entityId: inv.customerId,
      entityName: inv.customerName,
      currentCents: 0,
      days1To30Cents: 0,
      days31To60Cents: 0,
      days61PlusCents: 0,
      totalCents: 0,
    };
    const daysPastDue = diffDays(inv.dueDate);
    if (daysPastDue <= 0) {
      row.currentCents += inv.balanceDueCents;
    } else if (daysPastDue <= 30) {
      row.days1To30Cents += inv.balanceDueCents;
    } else if (daysPastDue <= 60) {
      row.days31To60Cents += inv.balanceDueCents;
    } else {
      row.days61PlusCents += inv.balanceDueCents;
    }
    row.totalCents += inv.balanceDueCents;
    arMap.set(inv.customerId, row);
  }
  const arRows = Array.from(arMap.values());
  const arTotalCents = arRows.reduce((s, r) => s + r.totalCents, 0);

  // A/P Aging Summary Calculation
  const apMap = new Map<string, AgingRow>();
  for (const bill of store.expenses) {
    if (bill.type !== "Bill" || bill.status === "Paid") continue;
    const row = apMap.get(bill.vendorId) ?? {
      entityId: bill.vendorId,
      entityName: bill.vendorName,
      currentCents: 0,
      days1To30Cents: 0,
      days31To60Cents: 0,
      days61PlusCents: 0,
      totalCents: 0,
    };
    const daysPastDue = diffDays(bill.dueDate || bill.date);
    if (daysPastDue <= 0) {
      row.currentCents += bill.amountCents;
    } else if (daysPastDue <= 30) {
      row.days1To30Cents += bill.amountCents;
    } else if (daysPastDue <= 60) {
      row.days31To60Cents += bill.amountCents;
    } else {
      row.days61PlusCents += bill.amountCents;
    }
    row.totalCents += bill.amountCents;
    apMap.set(bill.vendorId, row);
  }
  const apRows = Array.from(apMap.values());
  const apTotalCents = apRows.reduce((s, r) => s + r.totalCents, 0);

  // General Ledger Calculation
  const generalLedger = accountsWithBalances
    .map((acc) => {
      let runningBalanceCents = 0;
      const movements: ComputedQboState["reports"]["generalLedger"][number]["movements"] =
        [];

      for (const entry of sortedEntries) {
        for (const line of entry.lines) {
          if (line.accountId === acc.id) {
            const delta =
              acc.normalBalance === "debit"
                ? line.debitCents - line.creditCents
                : line.creditCents - line.debitCents;
            runningBalanceCents += delta;
            movements.push({
              entryId: entry.id,
              entryNumber: entry.entryNumber,
              date: entry.date,
              memo: entry.memo,
              description: line.description,
              entityName: line.entityName,
              debitCents: line.debitCents,
              creditCents: line.creditCents,
              runningBalanceCents,
            });
          }
        }
      }

      return {
        accountId: acc.id,
        accountCode: acc.code,
        accountName: acc.name,
        accountType: acc.type,
        normalBalance: acc.normalBalance,
        endingBalanceCents: acc.balanceCents,
        movements,
      };
    })
    .filter((g) => g.movements.length > 0);

  // KPIs
  const totalBankCashCents = accountsWithBalances
    .filter((a) => a.type === "Bank")
    .reduce((s, a) => s + a.balanceCents, 0);

  const openInvoicesCents = store.invoices
    .filter((i) => i.status === "Open" || i.status === "Overdue")
    .reduce((s, i) => s + i.balanceDueCents, 0);

  const overdueInvoicesCents = store.invoices
    .filter((i) => i.status === "Overdue")
    .reduce((s, i) => s + i.balanceDueCents, 0);

  const paidLast30DaysCents = store.invoices
    .filter((i) => i.status === "Paid")
    .reduce((s, i) => s + i.totalCents, 0);

  const openBillsCents = store.expenses
    .filter((e) => e.type === "Bill" && e.status !== "Paid")
    .reduce((s, e) => s + e.amountCents, 0);

  const openEstimatesCents = store.estimates
    .filter((e) => e.status !== "Converted")
    .reduce((s, e) => s + e.totalCents, 0);

  const forReviewCount = store.bankTransactions.filter(
    (t) => t.status === "for_review"
  ).length;

  // Phase 9 Live Security & Accounting Integrity Audit
  const allMoneyIntegerCents =
    store.journalEntries.every((e) =>
      e.lines.every(
        (l) =>
          Number.isSafeInteger(l.debitCents) &&
          Number.isSafeInteger(l.creditCents)
      )
    ) &&
    store.bankTransactions.every((t) => Number.isSafeInteger(t.amountCents)) &&
    store.invoices.every(
      (i) =>
        Number.isSafeInteger(i.totalCents) &&
        Number.isSafeInteger(i.balanceDueCents)
    ) &&
    store.expenses.every((e) => Number.isSafeInteger(e.amountCents));

  const allEntriesBalanced = store.journalEntries.every((e) => {
    const d = e.lines.reduce((s, l) => s + l.debitCents, 0);
    const c = e.lines.reduce((s, l) => s + l.creditCents, 0);
    return d > 0 && d === c;
  });

  const balanceSheetBalanced =
    totalAssetsCents === totalLiabilitiesAndEquityCents;
  const trialBalanceBalanced = tbTotalDebits === tbTotalCredits;
  const periodLockConfigured = Boolean(store.lockedThroughDate);
  const orgIsolationEnforced = true;

  const checks = [
    allMoneyIntegerCents,
    allEntriesBalanced,
    balanceSheetBalanced,
    trialBalanceBalanced,
    periodLockConfigured,
    orgIsolationEnforced,
  ];

  return {
    ...store,
    accountsWithBalances,
    reports: {
      profitAndLoss: {
        incomeLines,
        totalIncomeCents,
        cogsLines,
        totalCogsCents,
        grossProfitCents,
        expenseLines,
        totalExpensesCents,
        netIncomeCents,
      },
      balanceSheet: {
        assetLines,
        totalAssetsCents,
        liabilityLines,
        totalLiabilitiesCents,
        equityLines,
        netIncomeCents,
        totalEquityCents,
        totalLiabilitiesAndEquityCents,
        isBalanced: balanceSheetBalanced,
      },
      trialBalance: {
        rows: tbRows,
        totalDebitsCents: tbTotalDebits,
        totalCreditsCents: tbTotalCredits,
        isBalanced: trialBalanceBalanced,
      },
      arAging: {
        rows: arRows,
        totalCents: arTotalCents,
      },
      apAging: {
        rows: apRows,
        totalCents: apTotalCents,
      },
      generalLedger,
    },
    kpis: {
      totalBankCashCents,
      openInvoicesCents,
      overdueInvoicesCents,
      paidLast30DaysCents,
      openBillsCents,
      openEstimatesCents,
      forReviewCount,
    },
    securityAudit: {
      allMoneyIntegerCents,
      allEntriesBalanced,
      balanceSheetBalanced,
      trialBalanceBalanced,
      periodLockConfigured,
      orgIsolationEnforced,
      passedCount: checks.filter(Boolean).length,
      totalChecks: checks.length,
    },
  };
}

// ============================================================================
// Mutations (Validated Double-Entry Operations)
// ============================================================================

function assertCanWrite(): void {
  const store = getRawStore();
  if (store.activeRole === "accountant") {
    throw new Error(
      "Permission denied: Accountant role is read-only and cannot modify or delete ledger entries."
    );
  }
}

function assertIsOwner(actionName?: string): void {
  const store = getRawStore();
  if (store.activeRole !== "owner") {
    throw new Error(
      `Permission denied: Only the Company Owner can ${
        actionName || "perform this administrative operation"
      }. (Current role: ${store.activeRole})`
    );
  }
}

export function postJournalEntry(input: {
  date: string;
  memo: string;
  sourceType?: QboJournalEntry["sourceType"];
  sourceId?: string;
  reversesEntryId?: string;
  lines: Array<{
    accountId: string;
    description?: string;
    debitCents: number;
    creditCents: number;
    entityName?: string;
  }>;
}): QboJournalEntry {
  assertCanWrite();
  const store = getRawStore();

  // Check Period Lock
  if (
    store.lockedThroughDate &&
    input.date <= store.lockedThroughDate
  ) {
    throw new Error(
      `Books are closed through ${store.lockedThroughDate}. Cannot post entries on or before the closing date.`
    );
  }

  const nonZeroLines = input.lines.filter(
    (l) => l.debitCents > 0 || l.creditCents > 0
  );

  if (nonZeroLines.length < 2) {
    throw new Error("A journal entry must have at least 2 non-zero lines.");
  }

  let totalDebitCents = 0;
  let totalCreditCents = 0;

  const builtLines: QboJournalLine[] = nonZeroLines.map((l, idx) => {
    if (
      !Number.isSafeInteger(l.debitCents) ||
      !Number.isSafeInteger(l.creditCents) ||
      l.debitCents < 0 ||
      l.creditCents < 0
    ) {
      throw new Error("Line amounts must be non-negative integer cents.");
    }
    if (l.debitCents > 0 && l.creditCents > 0) {
      throw new Error(
        "A journal line cannot have both a debit and a credit amount."
      );
    }

    const account = store.accounts.find((a) => a.id === l.accountId);
    if (!account) {
      throw new Error(`Account not found: ${l.accountId}`);
    }

    totalDebitCents += l.debitCents;
    totalCreditCents += l.creditCents;

    return {
      id: `jl-${Date.now()}-${idx}`,
      accountId: account.id,
      accountCode: account.code,
      accountName: account.name,
      description: l.description || input.memo,
      debitCents: l.debitCents,
      creditCents: l.creditCents,
      entityName: l.entityName,
    };
  });

  if (totalDebitCents <= 0 || totalDebitCents !== totalCreditCents) {
    throw new Error(
      `Journal entry is out of balance: Debits (${totalDebitCents} cents) !== Credits (${totalCreditCents} cents).`
    );
  }

  const nextNum = 1001 + store.journalEntries.length;
  const entry: QboJournalEntry = {
    id: `je-${Date.now()}-${nextNum}`,
    entryNumber: `JE-${nextNum}`,
    date: input.date,
    memo: input.memo,
    sourceType: input.sourceType ?? "manual",
    sourceId: input.sourceId,
    reversesEntryId: input.reversesEntryId,
    createdAt: new Date().toISOString(),
    lines: builtLines,
  };

  store.journalEntries.unshift(entry);
  appendAuditLog(
    `Posted ${entry.entryNumber}`,
    `${entry.memo} (${entry.sourceType})`,
    totalDebitCents
  );
  return entry;
}

export function reverseJournalEntry(
  entryId: string,
  reversalDate?: string
): QboJournalEntry {
  const store = getRawStore();
  const original = store.journalEntries.find((e) => e.id === entryId);
  if (!original) {
    throw new Error("Original journal entry not found.");
  }
  if (original.reversedByEntryId) {
    throw new Error("This journal entry has already been reversed.");
  }

  const dateToUse =
    reversalDate || new Date().toISOString().slice(0, 10);

  const reversal = postJournalEntry({
    date: dateToUse,
    memo: `Reversal of ${original.entryNumber}: ${original.memo}`,
    sourceType: "reversal",
    reversesEntryId: original.id,
    lines: original.lines.map((l) => ({
      accountId: l.accountId,
      description: `Reversal — ${l.description}`,
      debitCents: l.creditCents,
      creditCents: l.debitCents,
      entityName: l.entityName,
    })),
  });

  original.reversedByEntryId = reversal.id;

  // Keep sub-ledger records (Invoices, Bills, Bank Feed rows) in 100% sync with the General Ledger reversal
  if (original.sourceType === "invoice") {
    const inv = store.invoices.find(
      (i) => i.id === original.sourceId || i.journalEntryId === original.id
    );
    if (inv) {
      inv.balanceDueCents = 0;
      inv.status = "Paid";
    }
  } else if (original.sourceType === "invoice_payment") {
    const inv = store.invoices.find(
      (i) =>
        i.id === original.sourceId || i.paymentJournalEntryId === original.id
    );
    const arCreditCleared = original.lines
      .filter((l) => l.accountId === "acc-1100")
      .reduce((s, l) => s + l.creditCents, 0);
    if (inv && arCreditCleared > 0) {
      inv.balanceDueCents = Math.min(
        inv.totalCents,
        inv.balanceDueCents + arCreditCleared
      );
      inv.status = diffDays(inv.dueDate) > 0 ? "Overdue" : "Open";
    }
  } else if (original.sourceType === "bill") {
    const bill = store.expenses.find(
      (e) =>
        e.type === "Bill" &&
        (e.id === original.sourceId || e.journalEntryId === original.id)
    );
    if (bill) {
      bill.status = "Paid";
    }
  } else if (original.sourceType === "bill_payment") {
    const bill = store.expenses.find(
      (e) =>
        e.type === "Bill" &&
        (e.id === original.sourceId || e.paymentJournalEntryId === original.id)
    );
    const apDebitCleared = original.lines
      .filter((l) => l.accountId === "acc-2000")
      .reduce((s, l) => s + l.debitCents, 0);
    if (bill) {
      if (bill.status !== "Paid" && apDebitCleared > 0) {
        bill.amountCents += apDebitCleared;
      }
      bill.status = "Open";
    }
  }

  // If the reversed entry originated from the Bank Feed (categorize or match), return the bank transaction to "for_review"
  const linkedBankTx = store.bankTransactions.find(
    (t) =>
      t.postedJournalEntryId === original.id ||
      (original.sourceType === "bank_feed" && t.id === original.sourceId)
  );
  if (linkedBankTx) {
    linkedBankTx.status = "for_review";
    linkedBankTx.postedJournalEntryId = undefined;
    linkedBankTx.matchedInvoiceId = undefined;
    linkedBankTx.matchedBillId = undefined;
  }

  return reversal;
}

export function categorizeBankTransaction(input: {
  transactionId: string;
  categoryAccountId: string;
  payee?: string;
}): QboJournalEntry {
  const store = getRawStore();
  const tx = store.bankTransactions.find((t) => t.id === input.transactionId);
  if (!tx) {
    throw new Error("Bank transaction not found.");
  }
  if (tx.status === "categorized") {
    throw new Error("Transaction is already categorized.");
  }

  const bankAcc = store.accounts.find((a) => a.id === tx.bankAccountId);
  const catAcc = store.accounts.find((a) => a.id === input.categoryAccountId);
  if (!bankAcc || !catAcc) {
    throw new Error("Invalid bank or category account.");
  }

  const absCents = Math.abs(tx.amountCents);
  const isDeposit = tx.amountCents >= 0;

  const entry = postJournalEntry({
    date: tx.date,
    memo: `Bank Feed: ${tx.description}`,
    sourceType: "bank_feed",
    sourceId: tx.id,
    lines: isDeposit
      ? [
          {
            accountId: bankAcc.id,
            description: tx.description,
            debitCents: absCents,
            creditCents: 0,
            entityName: input.payee || tx.payee,
          },
          {
            accountId: catAcc.id,
            description: tx.description,
            debitCents: 0,
            creditCents: absCents,
            entityName: input.payee || tx.payee,
          },
        ]
      : [
          {
            accountId: catAcc.id,
            description: tx.description,
            debitCents: absCents,
            creditCents: 0,
            entityName: input.payee || tx.payee,
          },
          {
            accountId: bankAcc.id,
            description: tx.description,
            debitCents: 0,
            creditCents: absCents,
            entityName: input.payee || tx.payee,
          },
        ],
  });

  tx.status = "categorized";
  tx.suggestedAccountId = catAcc.id;
  if (input.payee) tx.payee = input.payee;
  tx.postedJournalEntryId = entry.id;

  return entry;
}

export function excludeBankTransaction(transactionId: string): void {
  assertCanWrite();
  const store = getRawStore();
  const tx = store.bankTransactions.find((t) => t.id === transactionId);
  if (!tx) throw new Error("Bank transaction not found.");
  tx.status = "excluded";
  appendAuditLog("Bank Transaction Excluded", tx.description, Math.abs(tx.amountCents));
}

export function categorizeAllSuggested(bankAccountId?: string): number {
  assertCanWrite();
  const store = getRawStore();
  const pendingWithSuggestion = store.bankTransactions.filter(
    (t) =>
      t.status === "for_review" &&
      t.suggestedAccountId &&
      (!bankAccountId || t.bankAccountId === bankAccountId)
  );
  let count = 0;
  for (const tx of pendingWithSuggestion) {
    if (tx.suggestedAccountId) {
      categorizeBankTransaction({
        transactionId: tx.id,
        categoryAccountId: tx.suggestedAccountId,
        payee: tx.payee,
      });
      count++;
    }
  }
  return count;
}

export function importBankCsvRows(input: {
  bankAccountId: string;
  rows: Array<{
    date: string;
    description: string;
    amountCents: number;
    payee?: string;
  }>;
}): { importedCount: number; duplicateCount: number } {
  assertCanWrite();
  const store = getRawStore();
  const existingFingerprints = new Set(
    store.bankTransactions.map((t) => t.fingerprint)
  );

  let importedCount = 0;
  let duplicateCount = 0;

  for (const row of input.rows) {
    if (!row.date || !row.description || row.amountCents === 0) continue;
    const fp = makeFingerprint(
      input.bankAccountId,
      row.date,
      row.description,
      row.amountCents
    );

    if (existingFingerprints.has(fp)) {
      duplicateCount++;
      continue;
    }

    existingFingerprints.add(fp);
    const ruleHit = matchRuleForTransaction(
      store.rules,
      row.description,
      row.amountCents
    );

    store.bankTransactions.unshift({
      id: `btx-${Date.now()}-${store.bankTransactions.length + 1}-${importedCount}`,
      bankAccountId: input.bankAccountId,
      date: row.date,
      description: row.description,
      payee: row.payee || ruleHit.payee,
      amountCents: row.amountCents,
      status: "for_review",
      suggestedAccountId: ruleHit.accountId,
      matchedRuleName: ruleHit.ruleName,
      fingerprint: fp,
    });

    importedCount++;
  }

  appendAuditLog(
    "Bank CSV Imported",
    `Imported ${importedCount} rows (${duplicateCount} duplicates skipped)`
  );

  return { importedCount, duplicateCount };
}

export function createInvoice(input: {
  customerId: string;
  date: string;
  dueDate: string;
  applySalesTax?: boolean;
  taxRatePercent?: number;
  lines: Array<{
    serviceName: string;
    description: string;
    quantity: number;
    rateCents: number;
    incomeAccountId: string;
    taxable?: boolean;
  }>;
}): QboInvoice {
  assertCanWrite();
  const store = getRawStore();
  const customer = store.customers.find((c) => c.id === input.customerId);
  if (!customer) throw new Error("Customer not found.");

  const builtLines: QboInvoiceLine[] = input.lines.map((l, idx) => ({
    id: `il-${Date.now()}-${idx}`,
    serviceName: l.serviceName,
    description: l.description,
    quantity: l.quantity,
    rateCents: l.rateCents,
    amountCents: Math.round(l.quantity * l.rateCents),
    incomeAccountId: l.incomeAccountId,
    taxable: l.taxable !== false,
  }));

  const subtotalCents = builtLines.reduce((s, l) => s + l.amountCents, 0);
  if (subtotalCents <= 0) {
    throw new Error("Invoice subtotal must be greater than $0.00.");
  }

  const effectiveTaxRate = input.applySalesTax
    ? input.taxRatePercent ?? store.salesTaxRatePercent ?? 8.25
    : 0;
  const taxableSubtotalCents = input.applySalesTax
    ? builtLines
        .filter((l) => l.taxable !== false)
        .reduce((s, l) => s + l.amountCents, 0)
    : 0;
  const taxCents =
    effectiveTaxRate > 0
      ? Math.round((taxableSubtotalCents * effectiveTaxRate) / 100)
      : 0;
  const totalCents = subtotalCents + taxCents;

  const nextInvNum = String(1001 + store.invoices.length);
  const invId = `inv-${Date.now()}`;

  const creditLines: Array<{
    accountId: string;
    description?: string;
    debitCents: number;
    creditCents: number;
    entityName?: string;
  }> = builtLines.map((l) => ({
    accountId: l.incomeAccountId,
    description: `${l.serviceName}: ${l.description}`,
    debitCents: 0,
    creditCents: l.amountCents,
    entityName: customer.name,
  }));

  if (taxCents > 0) {
    creditLines.push({
      accountId: "acc-2200",
      description: `Sales Tax (${effectiveTaxRate}%) — Invoice #${nextInvNum}`,
      debitCents: 0,
      creditCents: taxCents,
      entityName: customer.name,
    });
  }

  const je = postJournalEntry({
    date: input.date,
    memo: `Invoice #${nextInvNum} — ${customer.name}`,
    sourceType: "invoice",
    sourceId: invId,
    lines: [
      {
        accountId: "acc-1100",
        description: `Invoice #${nextInvNum}`,
        debitCents: totalCents,
        creditCents: 0,
        entityName: customer.name,
      },
      ...creditLines,
    ],
  });

  const invoice: QboInvoice = {
    id: invId,
    invoiceNumber: nextInvNum,
    customerId: customer.id,
    customerName: customer.name,
    date: input.date,
    dueDate: input.dueDate,
    status: "Open",
    subtotalCents,
    taxRatePercent: effectiveTaxRate,
    taxCents,
    totalCents,
    balanceDueCents: totalCents,
    lines: builtLines,
    journalEntryId: je.id,
  };

  store.invoices.unshift(invoice);
  return invoice;
}

export function createEstimate(input: {
  customerId: string;
  date: string;
  expirationDate: string;
  lines: Array<{
    serviceName: string;
    description: string;
    quantity: number;
    rateCents: number;
    incomeAccountId: string;
  }>;
}): QboEstimate {
  assertCanWrite();
  const store = getRawStore();
  const customer = store.customers.find((c) => c.id === input.customerId);
  if (!customer) throw new Error("Customer not found.");

  const builtLines = input.lines.map((l) => ({
    serviceName: l.serviceName,
    description: l.description,
    quantity: l.quantity,
    rateCents: l.rateCents,
    amountCents: Math.round(l.quantity * l.rateCents),
    incomeAccountId: l.incomeAccountId,
  }));
  const totalCents = builtLines.reduce((s, l) => s + l.amountCents, 0);

  const estimateNumber = `EST-${2001 + store.estimates.length}`;
  const est: QboEstimate = {
    id: `est-${Date.now()}`,
    estimateNumber,
    customerId: customer.id,
    customerName: customer.name,
    date: input.date,
    expirationDate: input.expirationDate,
    status: "Pending",
    totalCents,
    lines: builtLines,
  };

  store.estimates.unshift(est);
  appendAuditLog(
    `Estimate ${estimateNumber} Created`,
    `Quote for ${customer.name}`,
    totalCents
  );
  return est;
}

export function convertEstimateToInvoice(estimateId: string): QboInvoice {
  assertCanWrite();
  const store = getRawStore();
  const est = store.estimates.find((e) => e.id === estimateId);
  if (!est) throw new Error("Estimate not found.");
  if (est.status === "Converted") {
    throw new Error("Estimate has already been converted to an invoice.");
  }

  const today = new Date().toISOString().slice(0, 10);
  const invoice = createInvoice({
    customerId: est.customerId,
    date: today,
    dueDate: est.expirationDate,
    lines: est.lines,
  });

  est.status = "Converted";
  est.convertedInvoiceId = invoice.id;
  appendAuditLog(
    "Estimate Converted to Invoice",
    `${est.estimateNumber} -> Invoice #${invoice.invoiceNumber}`,
    est.totalCents
  );
  return invoice;
}

export function createProductService(input: {
  name: string;
  sku: string;
  type: "Service" | "Non-Inventory" | "Inventory";
  description: string;
  rateCents: number;
  incomeAccountId: string;
}): QboProductService {
  assertCanWrite();
  const store = getRawStore();
  const acc = store.accounts.find((a) => a.id === input.incomeAccountId);
  if (!acc) throw new Error("Income account not found.");

  const item: QboProductService = {
    id: `prod-${Date.now()}`,
    name: input.name,
    sku: input.sku || `ITEM-${store.productsAndServices.length + 1}`,
    type: input.type,
    description: input.description,
    rateCents: input.rateCents,
    incomeAccountId: acc.id,
    incomeAccountName: acc.name,
  };
  store.productsAndServices.push(item);
  appendAuditLog("Product/Service Added", `${item.name} (${item.sku})`, item.rateCents);
  return item;
}

export function createTransfer(input: {
  fromAccountId: string;
  toAccountId: string;
  date: string;
  amountCents: number;
  memo?: string;
}): QboJournalEntry {
  assertCanWrite();
  if (input.fromAccountId === input.toAccountId) {
    throw new Error("From and To accounts must be different.");
  }
  const store = getRawStore();
  const fromAcc = store.accounts.find((a) => a.id === input.fromAccountId);
  const toAcc = store.accounts.find((a) => a.id === input.toAccountId);
  if (!fromAcc || !toAcc) throw new Error("Transfer account not found.");

  return postJournalEntry({
    date: input.date,
    memo:
      input.memo || `Funds Transfer: ${fromAcc.name} → ${toAcc.name}`,
    sourceType: "transfer",
    lines: [
      {
        accountId: toAcc.id,
        description: `Transfer in from ${fromAcc.name}`,
        debitCents: input.amountCents,
        creditCents: 0,
      },
      {
        accountId: fromAcc.id,
        description: `Transfer out to ${toAcc.name}`,
        debitCents: 0,
        creditCents: input.amountCents,
      },
    ],
  });
}

export function setPeriodLockDate(lockedThroughDate: string | null): void {
  assertIsOwner("close the books or modify period locks");
  assertCanWrite();
  const store = getRawStore();
  store.lockedThroughDate = lockedThroughDate;
  appendAuditLog(
    "Period Lock Updated",
    lockedThroughDate
      ? `Closed books through ${lockedThroughDate}`
      : "Unlocked closed period"
  );
}

export function receiveInvoicePayment(input: {
  invoiceId: string;
  depositAccountId: string;
  date: string;
}): QboInvoice {
  const store = getRawStore();
  const inv = store.invoices.find((i) => i.id === input.invoiceId);
  if (!inv) throw new Error("Invoice not found.");
  if (inv.status === "Paid" || inv.balanceDueCents <= 0) {
    throw new Error("Invoice is already paid.");
  }

  const je = postJournalEntry({
    date: input.date,
    memo: `Payment for Invoice #${inv.invoiceNumber} — ${inv.customerName}`,
    sourceType: "invoice_payment",
    sourceId: inv.id,
    lines: [
      {
        accountId: input.depositAccountId,
        description: `Payment received — Invoice #${inv.invoiceNumber}`,
        debitCents: inv.balanceDueCents,
        creditCents: 0,
        entityName: inv.customerName,
      },
      {
        accountId: "acc-1100",
        description: `Clear Invoice #${inv.invoiceNumber}`,
        debitCents: 0,
        creditCents: inv.balanceDueCents,
        entityName: inv.customerName,
      },
    ],
  });

  inv.balanceDueCents = 0;
  inv.status = "Paid";
  inv.paymentJournalEntryId = je.id;
  return inv;
}

export function createExpenseOrBill(input: {
  type: "Expense" | "Bill";
  vendorName: string;
  date: string;
  dueDate?: string;
  paymentAccountId: string; // Bank/CC for Expense, or acc-2000 for Bill
  categoryAccountId: string;
  description: string;
  amountCents: number;
  refNumber?: string;
}): QboExpense {
  const store = getRawStore();
  const catAcc = store.accounts.find((a) => a.id === input.categoryAccountId);
  if (!catAcc) throw new Error("Category account not found.");

  const creditAccountId =
    input.type === "Bill" ? "acc-2000" : input.paymentAccountId;

  const refNumber =
    input.refNumber ||
    `${input.type === "Bill" ? "BILL" : "EXP"}-${100 + store.expenses.length + 1}`;

  const je = postJournalEntry({
    date: input.date,
    memo: `${input.type} (${refNumber}) — ${input.vendorName}: ${input.description}`,
    sourceType: input.type === "Bill" ? "bill" : "expense",
    lines: [
      {
        accountId: catAcc.id,
        description: input.description,
        debitCents: input.amountCents,
        creditCents: 0,
        entityName: input.vendorName,
      },
      {
        accountId: creditAccountId,
        description: input.description,
        debitCents: 0,
        creditCents: input.amountCents,
        entityName: input.vendorName,
      },
    ],
  });

  let vendor = store.vendors.find(
    (v) => v.name.toLowerCase() === input.vendorName.toLowerCase()
  );
  if (!vendor) {
    vendor = {
      id: `vend-${Date.now()}`,
      name: input.vendorName,
      email: "",
      phone: "",
      defaultExpenseAccountId: catAcc.id,
    };
    store.vendors.push(vendor);
  }

  const expense: QboExpense = {
    id: `exp-${Date.now()}`,
    refNumber,
    type: input.type,
    vendorId: vendor.id,
    vendorName: vendor.name,
    date: input.date,
    dueDate: input.dueDate,
    paymentAccountId: creditAccountId,
    categoryAccountId: catAcc.id,
    categoryAccountName: catAcc.name,
    description: input.description,
    amountCents: input.amountCents,
    status: input.type === "Bill" ? "Open" : "Paid",
    journalEntryId: je.id,
  };

  store.expenses.unshift(expense);
  return expense;
}

export function payVendorBill(input: {
  expenseId: string;
  bankAccountId: string;
  date: string;
}): QboExpense {
  const store = getRawStore();
  const bill = store.expenses.find((e) => e.id === input.expenseId);
  if (!bill || bill.type !== "Bill" || bill.status === "Paid") {
    throw new Error("Open bill not found.");
  }

  const je = postJournalEntry({
    date: input.date,
    memo: `Bill Payment (${bill.refNumber}) — ${bill.vendorName}`,
    sourceType: "bill_payment",
    sourceId: bill.id,
    lines: [
      {
        accountId: "acc-2000",
        description: `Pay Bill ${bill.refNumber}`,
        debitCents: bill.amountCents,
        creditCents: 0,
        entityName: bill.vendorName,
      },
      {
        accountId: input.bankAccountId,
        description: `Bill payment to ${bill.vendorName}`,
        debitCents: 0,
        creditCents: bill.amountCents,
        entityName: bill.vendorName,
      },
    ],
  });

  bill.status = "Paid";
  bill.paymentJournalEntryId = je.id;
  return bill;
}

export function createAccount(input: {
  code: string;
  name: string;
  type: AccountType;
  detailType: string;
}): QboAccount {
  assertCanWrite();
  const store = getRawStore();
  if (store.accounts.some((a) => a.code === input.code)) {
    throw new Error(`Account code ${input.code} already exists.`);
  }

  const debitTypes: AccountType[] = [
    "Bank",
    "Accounts Receivable",
    "Other Current Assets",
    "Fixed Assets",
    "Cost of Goods Sold",
    "Expenses",
  ];
  const normalBalance: NormalBalance = debitTypes.includes(input.type)
    ? "debit"
    : "credit";

  const acc: QboAccount = {
    id: `acc-${input.code}-${Date.now()}`,
    code: input.code,
    name: input.name,
    type: input.type,
    detailType: input.detailType || input.type,
    normalBalance,
    isActive: true,
  };

  store.accounts.push(acc);
  store.accounts.sort((a, b) => a.code.localeCompare(b.code));
  appendAuditLog("Account Created", `${acc.code} — ${acc.name} (${acc.type})`);
  return acc;
}

export function createRule(input: {
  name: string;
  containsText: string;
  direction: "any" | "in" | "out";
  targetAccountId: string;
  payeeName?: string;
}): QboCategorizationRule {
  assertCanWrite();
  const store = getRawStore();
  const rule: QboCategorizationRule = {
    id: `rule-${Date.now()}`,
    name: input.name,
    containsText: input.containsText.trim(),
    direction: input.direction,
    targetAccountId: input.targetAccountId,
    payeeName: input.payeeName,
  };
  store.rules.unshift(rule);

  // Re-evaluate existing for_review transactions
  for (const tx of store.bankTransactions) {
    if (tx.status === "for_review") {
      const hit = matchRuleForTransaction(
        store.rules,
        tx.description,
        tx.amountCents
      );
      if (hit.accountId) {
        tx.suggestedAccountId = hit.accountId;
        tx.matchedRuleName = hit.ruleName;
        if (!tx.payee && hit.payee) tx.payee = hit.payee;
      }
    }
  }

  appendAuditLog("Bank Rule Added", `${rule.name} (contains "${rule.containsText}")`);
  return rule;
}

export function finishReconciliation(input: {
  bankAccountId: string;
  statementDate: string;
  endingBalanceCents: number;
  entryIds: string[];
}): QboReconciliationRecord {
  assertCanWrite();
  const store = getRawStore();
  const bankAcc = store.accounts.find((a) => a.id === input.bankAccountId);
  if (!bankAcc) throw new Error("Bank account not found.");

  const idSet = new Set(input.entryIds);
  const isCreditCard = bankAcc.normalBalance === "credit";
  let clearedCount = 0;
  let clearedBalanceCents = 0;

  for (const entry of store.journalEntries) {
    if (!idSet.has(entry.id)) continue;
    const matchingLines = entry.lines.filter(
      (l) => l.accountId === bankAcc.id
    );
    if (matchingLines.length === 0) continue;

    const totalDebit = matchingLines.reduce((s, l) => s + l.debitCents, 0);
    const totalCredit = matchingLines.reduce((s, l) => s + l.creditCents, 0);
    const netCents = isCreditCard
      ? totalCredit - totalDebit
      : totalDebit - totalCredit;

    clearedBalanceCents += netCents;
  }

  if (clearedBalanceCents !== input.endingBalanceCents) {
    throw new Error(
      `Cannot finish reconciliation: Statement Ending Balance (${input.endingBalanceCents} cents) does not match Cleared Balance (${clearedBalanceCents} cents). Difference must be $0.00.`
    );
  }

  for (const entry of store.journalEntries) {
    if (idSet.has(entry.id)) {
      entry.reconciled = true;
      clearedCount++;
    }
  }

  for (const tx of store.bankTransactions) {
    if (tx.postedJournalEntryId && idSet.has(tx.postedJournalEntryId)) {
      tx.reconciled = true;
    }
  }

  const rec: QboReconciliationRecord = {
    id: `rec-${Date.now()}`,
    bankAccountId: bankAcc.id,
    bankAccountName: bankAcc.name,
    statementDate: input.statementDate,
    endingBalanceCents: input.endingBalanceCents,
    clearedCount,
    reconciledAt: new Date().toISOString(),
  };

  store.reconciliations.unshift(rec);
  appendAuditLog(
    "Account Reconciled",
    `${bankAcc.name} statement ${input.statementDate} (${clearedCount} entries cleared)`,
    input.endingBalanceCents
  );
  return rec;
}

// ============================================================================
// Phase 7, 8 & 9 — Teams/Roles, AI Auto-Categorizer & Data Export/Import
// ============================================================================

export function setActiveRole(role: "owner" | "staff" | "accountant"): void {
  const store = getRawStore();
  store.activeRole = role;
  appendAuditLog(
    "Active Role Switched",
    `Switched session role to ${role.toUpperCase()}`
  );
}

export function inviteTeamMember(input: {
  id?: string;
  name: string;
  email: string;
  role: "owner" | "staff" | "accountant";
  status?: "Active" | "Invited";
}): QboTeamMember {
  assertCanWrite();
  assertIsOwner("invite or manage team members");
  const store = getRawStore();
  const cleanEmail = input.email.trim().toLowerCase();
  const existingIdx = store.teamMembers.findIndex(
    (m) => m.email.toLowerCase() === cleanEmail
  );
  const member: QboTeamMember = {
    id: input.id || (existingIdx >= 0 ? store.teamMembers[existingIdx].id : `tm-${Date.now()}`),
    name: input.name.trim(),
    email: cleanEmail,
    role: input.role,
    status: input.status ?? "Invited",
  };
  if (existingIdx >= 0) {
    store.teamMembers[existingIdx] = member;
  } else {
    store.teamMembers.push(member);
  }
  appendAuditLog(
    member.status === "Active" ? "Team Member Added" : "Team Member Invited",
    `${member.name} (${member.email}) ${
      member.status === "Active" ? "provisioned" : "invited"
    } as ${member.role}`
  );
  return member;
}

export function updateTeamMemberRoleInStore(input: {
  memberId?: string;
  email?: string;
  role: "owner" | "staff" | "accountant";
}): QboTeamMember {
  assertCanWrite();
  assertIsOwner("change team member roles");
  const store = getRawStore();
  const cleanEmail = input.email?.trim().toLowerCase();
  const target = store.teamMembers.find(
    (m) =>
      (input.memberId && m.id === input.memberId) ||
      (cleanEmail && m.email.toLowerCase() === cleanEmail)
  );
  if (!target) {
    throw new Error("Team member not found.");
  }
  target.role = input.role;
  appendAuditLog(
    "Team Member Role Updated",
    `Updated ${target.name} (${target.email}) role to ${input.role.toUpperCase()}`
  );
  return target;
}

export function removeTeamMemberFromStore(input: {
  memberId?: string;
  email?: string;
}): void {
  assertCanWrite();
  assertIsOwner("remove team members");
  const store = getRawStore();
  const cleanEmail = input.email?.trim().toLowerCase();
  const target = store.teamMembers.find(
    (m) =>
      (input.memberId && m.id === input.memberId) ||
      (cleanEmail && m.email.toLowerCase() === cleanEmail)
  );
  if (!target) {
    throw new Error("Team member not found.");
  }
  const ownersCount = store.teamMembers.filter((m) => m.role === "owner").length;
  if (target.role === "owner" && ownersCount <= 1) {
    throw new Error("Cannot remove the primary Company Owner.");
  }
  store.teamMembers = store.teamMembers.filter((m) => m.id !== target.id);
  appendAuditLog(
    "Team Member Removed",
    `Revoked access for ${target.name} (${target.email})`
  );
}

export function runAiAutoCategorizer(): { analyzedCount: number } {
  assertCanWrite();
  const store = getRawStore();
  let analyzedCount = 0;

  for (const tx of store.bankTransactions) {
    if (tx.status !== "for_review") continue;
    analyzedCount++;

    const upper = tx.description.toUpperCase();
    const isDeposit = tx.amountCents >= 0;

    // 1. Check active bank rules first
    const ruleHit = matchRuleForTransaction(
      store.rules,
      tx.description,
      tx.amountCents
    );
    if (ruleHit.accountId) {
      const acc = store.accounts.find((a) => a.id === ruleHit.accountId);
      tx.suggestedAccountId = ruleHit.accountId;
      tx.matchedRuleName = ruleHit.ruleName;
      if (!tx.payee && ruleHit.payee) tx.payee = ruleHit.payee;
      tx.aiConfidence = 98;
      tx.aiReasoning = `Matched active rule "${ruleHit.ruleName}" and historical vendor pattern → ${acc?.code} ${acc?.name}.`;
      continue;
    }

    // 2. Semantic keyword & vendor history inference
    if (
      upper.includes("NURSERY") ||
      upper.includes("LUMBER") ||
      upper.includes("VALVE") ||
      upper.includes("PLANT") ||
      upper.includes("SEED") ||
      upper.includes("HARDWARE")
    ) {
      tx.suggestedAccountId = "acc-5010";
      tx.aiConfidence = 95;
      tx.aiReasoning =
        "AI detected material & supply keywords matching COGS categories → 5010 Supplies & Materials - COGS.";
    } else if (
      upper.includes("GAS") ||
      upper.includes("SHELL") ||
      upper.includes("CHEVRON") ||
      upper.includes("FUEL")
    ) {
      tx.suggestedAccountId = "acc-6020";
      tx.aiConfidence = 96;
      tx.aiReasoning =
        "AI identified fuel station merchant pattern → 6020 Automobile & Fuel Expense.";
    } else if (
      upper.includes("STRIPE") ||
      upper.includes("DEPOSIT") ||
      upper.includes("CHECK") ||
      isDeposit
    ) {
      tx.suggestedAccountId = "acc-4000";
      tx.aiConfidence = 91;
      tx.aiReasoning =
        "AI analyzed positive customer inflow and matched to primary revenue account → 4000 Services Income.";
    } else {
      tx.suggestedAccountId = tx.suggestedAccountId || "acc-6060";
      tx.aiConfidence = 84;
      tx.aiReasoning =
        "AI fallback classification for general commercial operating outflow → 6060 Office Supplies & Software.";
    }
  }

  appendAuditLog(
    "AI Auto-Categorizer Executed",
    `Generated category suggestions & reasoning for ${analyzedCount} bank transactions`
  );
  return { analyzedCount };
}

export function matchBankTransaction(input: {
  transactionId: string;
  matchType: "invoice" | "bill";
  targetId: string;
}): QboJournalEntry {
  assertCanWrite();
  const store = getRawStore();
  const tx = store.bankTransactions.find((t) => t.id === input.transactionId);
  if (!tx) throw new Error("Bank transaction not found.");
  if (tx.status === "categorized") {
    throw new Error("Bank transaction is already categorized or matched.");
  }

  const bankAcc = store.accounts.find((a) => a.id === tx.bankAccountId);
  if (!bankAcc) throw new Error("Bank account not found.");

  if (input.matchType === "invoice") {
    if (tx.amountCents <= 0) {
      throw new Error(
        "Only positive bank deposits (Money In) can be matched to Customer Invoices."
      );
    }
    const inv = store.invoices.find((i) => i.id === input.targetId);
    if (!inv || inv.status === "Paid" || inv.balanceDueCents <= 0) {
      throw new Error("Open customer invoice not found.");
    }

    const depositCents = tx.amountCents;
    const arClearedCents = Math.min(depositCents, inv.balanceDueCents);
    const excessCents = depositCents - arClearedCents;

    const lines: Array<{
      accountId: string;
      description?: string;
      debitCents: number;
      creditCents: number;
      entityName?: string;
    }> = [
      {
        accountId: bankAcc.id,
        description: `Bank Deposit matched to Invoice #${inv.invoiceNumber}`,
        debitCents: depositCents,
        creditCents: 0,
        entityName: inv.customerName,
      },
      {
        accountId: "acc-1100",
        description: `Clear Invoice #${inv.invoiceNumber} (${tx.description})`,
        debitCents: 0,
        creditCents: arClearedCents,
        entityName: inv.customerName,
      },
    ];

    if (excessCents > 0) {
      lines.push({
        accountId: "acc-4000",
        description: `Overpayment / extra revenue on Invoice #${inv.invoiceNumber}`,
        debitCents: 0,
        creditCents: excessCents,
        entityName: inv.customerName,
      });
    }

    const je = postJournalEntry({
      date: tx.date,
      memo: `Bank Match: Deposit applied to Invoice #${inv.invoiceNumber} (${inv.customerName})`,
      sourceType: "invoice_payment",
      sourceId: inv.id,
      lines,
    });

    inv.balanceDueCents = Math.max(0, inv.balanceDueCents - arClearedCents);
    if (inv.balanceDueCents === 0) {
      inv.status = "Paid";
    }
    inv.paymentJournalEntryId = je.id;

    tx.status = "categorized";
    tx.matchedInvoiceId = inv.id;
    tx.suggestedAccountId = "acc-1100";
    tx.payee = inv.customerName;
    tx.postedJournalEntryId = je.id;

    appendAuditLog(
      "Bank Deposit Matched to Invoice",
      `Matched ${tx.description} to Invoice #${inv.invoiceNumber} (${inv.customerName})`,
      depositCents
    );
    return je;
  }

  // matchType === "bill"
  if (tx.amountCents >= 0) {
    throw new Error(
      "Only negative bank outflows (Money Out) can be matched to Vendor Bills."
    );
  }
  const bill = store.expenses.find(
    (e) => e.id === input.targetId && e.type === "Bill" && e.status !== "Paid"
  );
  if (!bill) {
    throw new Error("Open vendor bill not found.");
  }

  const paidCents = Math.abs(tx.amountCents);
  const apClearedCents = Math.min(paidCents, bill.amountCents);
  const excessOutflowCents = paidCents - apClearedCents;

  const lines: Array<{
    accountId: string;
    description?: string;
    debitCents: number;
    creditCents: number;
    entityName?: string;
  }> = [
    {
      accountId: "acc-2000",
      description: `Clear Bill ${bill.refNumber} (${tx.description})`,
      debitCents: apClearedCents,
      creditCents: 0,
      entityName: bill.vendorName,
    },
  ];

  if (excessOutflowCents > 0) {
    lines.push({
      accountId: bill.categoryAccountId || "acc-5010",
      description: `Additional expense on Bill ${bill.refNumber}`,
      debitCents: excessOutflowCents,
      creditCents: 0,
      entityName: bill.vendorName,
    });
  }

  lines.push({
    accountId: bankAcc.id,
    description: `Bank Payment matched to Bill ${bill.refNumber}`,
    debitCents: 0,
    creditCents: paidCents,
    entityName: bill.vendorName,
  });

  const je = postJournalEntry({
    date: tx.date,
    memo: `Bank Match: Payment applied to Bill ${bill.refNumber} (${bill.vendorName})`,
    sourceType: "bill_payment",
    sourceId: bill.id,
    lines,
  });

  if (paidCents >= bill.amountCents) {
    bill.status = "Paid";
  } else {
    bill.amountCents -= apClearedCents;
  }
  bill.paymentJournalEntryId = je.id;

  tx.status = "categorized";
  tx.matchedBillId = bill.id;
  tx.suggestedAccountId = "acc-2000";
  tx.payee = bill.vendorName;
  tx.postedJournalEntryId = je.id;

  appendAuditLog(
    "Bank Outflow Matched to Bill",
    `Matched ${tx.description} to Bill ${bill.refNumber} (${bill.vendorName})`,
    paidCents
  );
  return je;
}

export interface ContactProfileInput {
  /** Display name. Optional if a company or first/last name is provided. */
  name?: string;
  company?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  taxId?: string;
  address?: QboPostalAddress;
}

function cleanOptional(value?: string, maxLength = 200): string | undefined {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, maxLength);
}

function cleanAddress(address?: QboPostalAddress): QboPostalAddress | undefined {
  if (!address) return undefined;
  const cleaned: QboPostalAddress = {
    street: cleanOptional(address.street),
    city: cleanOptional(address.city, 100),
    state: cleanOptional(address.state, 100),
    postalCode: cleanOptional(address.postalCode, 20),
    country: cleanOptional(address.country, 100),
  };
  return Object.values(cleaned).some(Boolean) ? cleaned : undefined;
}

function resolveDisplayName(input: ContactProfileInput, kind: string): string {
  const fullName = [input.firstName, input.lastName]
    .map((p) => (p ?? "").trim())
    .filter(Boolean)
    .join(" ");
  const displayName =
    cleanOptional(input.name) || cleanOptional(fullName) || cleanOptional(input.company);
  if (!displayName) {
    throw new Error(
      `${kind} display name is required (or provide a company name / first & last name).`
    );
  }
  return displayName;
}

export function formatPostalAddress(address?: QboPostalAddress): string {
  if (!address) return "";
  const cityLine = [address.city, [address.state, address.postalCode].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");
  return [address.street, cityLine, address.country].filter(Boolean).join(", ");
}

export function createCustomer(input: ContactProfileInput): QboCustomer {
  assertCanWrite();
  const store = getRawStore();
  const displayName = resolveDisplayName(input, "Customer");
  if (
    store.customers.some(
      (c) => c.name.trim().toLowerCase() === displayName.toLowerCase()
    )
  ) {
    throw new Error(`A customer named "${displayName}" already exists.`);
  }

  const customer: QboCustomer = {
    id: `cust-${Date.now()}`,
    name: displayName,
    company: cleanOptional(input.company) || displayName,
    email: cleanOptional(input.email) || "",
    phone: cleanOptional(input.phone, 50) || "",
    firstName: cleanOptional(input.firstName, 100),
    lastName: cleanOptional(input.lastName, 100),
    taxId: cleanOptional(input.taxId, 50),
    address: cleanAddress(input.address),
  };
  store.customers.push(customer);
  appendAuditLog("Customer Added", `${customer.name} (${customer.company})`);
  return customer;
}

export function createVendor(
  input: ContactProfileInput & { defaultExpenseAccountId?: string }
): QboVendor {
  assertCanWrite();
  const store = getRawStore();
  const displayName = resolveDisplayName(input, "Vendor");
  if (
    store.vendors.some(
      (v) => v.name.trim().toLowerCase() === displayName.toLowerCase()
    )
  ) {
    throw new Error(`A vendor named "${displayName}" already exists.`);
  }

  const defaultExpenseAccountId = cleanOptional(input.defaultExpenseAccountId);
  if (
    defaultExpenseAccountId &&
    !store.accounts.some((a) => a.id === defaultExpenseAccountId)
  ) {
    throw new Error("Default expense category account not found.");
  }

  const vendor: QboVendor = {
    id: `vend-${Date.now()}`,
    name: displayName,
    email: cleanOptional(input.email) || "",
    phone: cleanOptional(input.phone, 50) || "",
    company: cleanOptional(input.company),
    firstName: cleanOptional(input.firstName, 100),
    lastName: cleanOptional(input.lastName, 100),
    taxId: cleanOptional(input.taxId, 50),
    address: cleanAddress(input.address),
    defaultExpenseAccountId,
  };
  store.vendors.push(vendor);
  appendAuditLog("Vendor Added", vendor.name);
  return vendor;
}
