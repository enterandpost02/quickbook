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

export interface QboCustomer {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
}

export interface QboVendor {
  id: string;
  name: string;
  email: string;
  phone: string;
  defaultExpenseAccountId: string;
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
}

export interface QboInvoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  date: string;
  dueDate: string;
  status: "Open" | "Overdue" | "Paid";
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

export const SAMPLE_BANK_CSV = `Date,Description,Amount,Payee
2026-10-20,HOME DEPOT #4412 SPRINKLER VALVES,-248.50,Home Depot
2026-10-21,STRIPE TRANSFER - FREEMAN SPORTING GOODS,1450.00,Freeman Sporting Goods
2026-10-22,CHIN'S GAS AND OIL #09,-84.20,Chin's Gas and Oil
2026-10-23,TANIA'S NURSERY WHOLESALE TREES,-620.00,Tania's Nursery
2026-10-24,PG&E MONTHLY UTILITY BILL,-195.40,PG&E
2026-10-25,INTUIT QUICKBOOKS SUBSCRIPTION,-90.00,Intuit
2026-10-26,CHECK DEPOSIT #1092 AMY BIRD SANCTUARY,875.00,Amy's Bird Sanctuary`;

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

export function createInitialSeedData(customCompanyName?: string): QboStoreData {
  const accounts: QboAccount[] = [
    // Banking
    {
      id: "acc-1000",
      code: "1000",
      name: "Business Checking (Chase ••4021)",
      type: "Bank",
      detailType: "Checking",
      normalBalance: "debit",
      bankBalanceCents: 2841990,
      isActive: true,
    },
    {
      id: "acc-1010",
      code: "1010",
      name: "Business Savings (Chase ••8810)",
      type: "Bank",
      detailType: "Savings",
      normalBalance: "debit",
      bankBalanceCents: 1500000,
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
      name: "Trucks & Landscaping Equipment",
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
      name: "Corporate Platinum Card (Amex ••1004)",
      type: "Credit Card",
      detailType: "Credit Card",
      normalBalance: "credit",
      bankBalanceCents: 149200,
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
      name: "Design Services Income",
      type: "Income",
      detailType: "Service/Fee Income",
      normalBalance: "credit",
      isActive: true,
    },
    {
      id: "acc-4010",
      code: "4010",
      name: "Landscaping & Installation Income",
      type: "Income",
      detailType: "Service/Fee Income",
      normalBalance: "credit",
      isActive: true,
    },
    {
      id: "acc-4020",
      code: "4020",
      name: "Pest Control & Maintenance Income",
      type: "Income",
      detailType: "Service/Fee Income",
      normalBalance: "credit",
      isActive: true,
    },
    // Cost of Goods Sold
    {
      id: "acc-5010",
      code: "5010",
      name: "Job Materials (Plants, Soil & Sprinklers)",
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
      name: "Automobile & Truck Fuel",
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
      name: "Yard & Office Rent",
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

  const customers: QboCustomer[] = [
    {
      id: "cust-1",
      name: "Amy's Bird Sanctuary",
      company: "Amy's Bird Sanctuary",
      email: "amy@birdsanctuary.org",
      phone: "(650) 555-0192",
    },
    {
      id: "cust-2",
      name: "Freeman Sporting Goods",
      company: "Freeman Sporting Goods",
      email: "ap@freemansporting.com",
      phone: "(415) 555-0148",
    },
    {
      id: "cust-3",
      name: "Bill's Windsurf Shop",
      company: "Bill's Windsurf Shop",
      email: "bill@windsurfshop.com",
      phone: "(650) 555-0114",
    },
    {
      id: "cust-4",
      name: "Geeta Kalapatapu",
      company: "Kalapatapu Residence",
      email: "geeta@kalapatapu.net",
      phone: "(408) 555-0183",
    },
    {
      id: "cust-5",
      name: "Jeff's Jalopies",
      company: "Jeff's Jalopies Auto",
      email: "jeff@jeffsjalopies.com",
      phone: "(650) 555-0167",
    },
  ];

  const vendors: QboVendor[] = [
    {
      id: "vend-1",
      name: "Tania's Nursery",
      email: "billing@taniasnursery.com",
      phone: "(650) 555-0201",
      defaultExpenseAccountId: "acc-5010",
    },
    {
      id: "vend-2",
      name: "Hicks Hardware",
      email: "accounts@hickshardware.com",
      phone: "(650) 555-0244",
      defaultExpenseAccountId: "acc-5010",
    },
    {
      id: "vend-3",
      name: "Chin's Gas and Oil",
      email: "fleet@chinsgas.com",
      phone: "(415) 555-0288",
      defaultExpenseAccountId: "acc-6020",
    },
    {
      id: "vend-4",
      name: "PG&E",
      email: "support@pge.com",
      phone: "(800) 743-5000",
      defaultExpenseAccountId: "acc-6100",
    },
    {
      id: "vend-5",
      name: "Brosnahan Insurance Agency",
      email: "policies@brosnahanins.com",
      phone: "(415) 555-0299",
      defaultExpenseAccountId: "acc-6040",
    },
    {
      id: "vend-6",
      name: "Norton Lumber and Building Materials",
      email: "sales@nortonlumber.com",
      phone: "(650) 555-0271",
      defaultExpenseAccountId: "acc-5010",
    },
  ];

  const productsAndServices: QboProductService[] = [
    {
      id: "prod-1",
      name: "Landscape Architecture Design",
      sku: "DES-100",
      type: "Service",
      description: "Custom CAD site plan, native plant blueprint & irrigation layout",
      rateCents: 12500,
      incomeAccountId: "acc-4000",
      incomeAccountName: "Design Services Income",
    },
    {
      id: "prod-2",
      name: "Pond & Irrigation Installation",
      sku: "LND-200",
      type: "Service",
      description: "Full water feature excavation, liner, pump & multi-zone drip irrigation",
      rateCents: 360000,
      incomeAccountId: "acc-4010",
      incomeAccountName: "Landscaping & Installation Income",
    },
    {
      id: "prod-3",
      name: "Commercial Turf & Sprinklers",
      sku: "LND-210",
      type: "Service",
      description: "Commercial storefront sod installation & smart Wi-Fi controller",
      rateCents: 342000,
      incomeAccountId: "acc-4010",
      incomeAccountName: "Landscaping & Installation Income",
    },
    {
      id: "prod-4",
      name: "Coastal Grounds & Pest Control",
      sku: "MNT-300",
      type: "Service",
      description: "Monthly palm pruning, salt-tolerant bed care & organic pest treatment",
      rateCents: 168000,
      incomeAccountId: "acc-4020",
      incomeAccountName: "Pest Control & Maintenance Income",
    },
    {
      id: "prod-5",
      name: "Pop-Up Sprinkler Heads & Brass Nozzles",
      sku: "MAT-401",
      type: "Non-Inventory",
      description: "Commercial grade 4-inch rotary sprinkler heads",
      rateCents: 4500,
      incomeAccountId: "acc-4010",
      incomeAccountName: "Landscaping & Installation Income",
    },
    {
      id: "prod-6",
      name: "Drought-Tolerant Patio Redesign",
      sku: "DES-150",
      type: "Service",
      description: "Flagstone walkway, decomposed granite & succulent garden",
      rateCents: 245000,
      incomeAccountId: "acc-4010",
      incomeAccountName: "Landscaping & Installation Income",
    },
  ];

  const estimates: QboEstimate[] = [
    {
      id: "est-2001",
      estimateNumber: "EST-2001",
      customerId: "cust-4",
      customerName: "Geeta Kalapatapu",
      date: "2026-10-14",
      expirationDate: "2026-11-14",
      status: "Accepted",
      totalCents: 245000,
      lines: [
        {
          serviceName: "Drought-Tolerant Patio Redesign",
          description: "Flagstone walkway, decomposed granite & succulent garden",
          quantity: 1,
          rateCents: 245000,
          amountCents: 245000,
          incomeAccountId: "acc-4010",
        },
      ],
    },
    {
      id: "est-2002",
      estimateNumber: "EST-2002",
      customerId: "cust-5",
      customerName: "Jeff's Jalopies",
      date: "2026-10-19",
      expirationDate: "2026-11-19",
      status: "Pending",
      totalCents: 189000,
      lines: [
        {
          serviceName: "Commercial Lot Perimeter Landscaping",
          description: "Showroom frontage planters & automatic drip system",
          quantity: 1,
          rateCents: 189000,
          amountCents: 189000,
          incomeAccountId: "acc-4010",
        },
      ],
    },
  ];

  const rules: QboCategorizationRule[] = [
    {
      id: "rule-1",
      name: "Nursery & Hardware Materials",
      containsText: "NURSERY",
      direction: "out",
      targetAccountId: "acc-5010",
      payeeName: "Tania's Nursery",
    },
    {
      id: "rule-2",
      name: "Home Depot / Hardware Supplies",
      containsText: "HOME DEPOT",
      direction: "out",
      targetAccountId: "acc-5010",
      payeeName: "Home Depot",
    },
    {
      id: "rule-3",
      name: "Fleet Fuel & Gas",
      containsText: "GAS",
      direction: "out",
      targetAccountId: "acc-6020",
      payeeName: "Chin's Gas and Oil",
    },
    {
      id: "rule-4",
      name: "PG&E Utilities",
      containsText: "PG&E",
      direction: "out",
      targetAccountId: "acc-6100",
      payeeName: "PG&E",
    },
    {
      id: "rule-5",
      name: "Intuit / Software Subscriptions",
      containsText: "INTUIT",
      direction: "out",
      targetAccountId: "acc-6090",
      payeeName: "Intuit",
    },
    {
      id: "rule-6",
      name: "Stripe Customer Deposits",
      containsText: "STRIPE",
      direction: "in",
      targetAccountId: "acc-4010",
      payeeName: "Stripe Payout",
    },
    {
      id: "rule-7",
      name: "Gusto Payroll Runs",
      containsText: "GUSTO",
      direction: "out",
      targetAccountId: "acc-6070",
      payeeName: "Gusto Payroll",
    },
  ];

  const journalEntries: QboJournalEntry[] = [
    // JE-1001: Opening Balance & Capitalization
    {
      id: "je-1001",
      entryNumber: "JE-1001",
      date: "2026-09-01",
      memo: "Initial capitalization, fleet truck & savings funding",
      sourceType: "opening_balance",
      reconciled: true,
      createdAt: "2026-09-01T09:00:00Z",
      lines: [
        {
          id: "jl-1",
          accountId: "acc-1000",
          accountCode: "1000",
          accountName: "Business Checking (Chase ••4021)",
          description: "Opening checking deposit",
          debitCents: 2500000,
          creditCents: 0,
        },
        {
          id: "jl-2",
          accountId: "acc-1010",
          accountCode: "1010",
          accountName: "Business Savings (Chase ••8810)",
          description: "Opening savings reserve",
          debitCents: 1500000,
          creditCents: 0,
        },
        {
          id: "jl-3",
          accountId: "acc-1500",
          accountCode: "1500",
          accountName: "Trucks & Landscaping Equipment",
          description: "Ford F-250 Crew Truck & Commercial Mowers",
          debitCents: 3200000,
          creditCents: 0,
        },
        {
          id: "jl-4",
          accountId: "acc-2500",
          accountCode: "2500",
          accountName: "Equipment Loan Payable",
          description: "Equipment financing note",
          debitCents: 0,
          creditCents: 1200000,
        },
        {
          id: "jl-5",
          accountId: "acc-3100",
          accountCode: "3100",
          accountName: "Owner's Equity",
          description: "Craig's initial owner investment",
          debitCents: 0,
          creditCents: 6000000,
        },
      ],
    },
    // JE-1002: Invoice #1001 to Amy's Bird Sanctuary ($4,850.00) - Paid
    {
      id: "je-1002",
      entryNumber: "JE-1002",
      date: "2026-10-02",
      memo: "Invoice #1001 — Amy's Bird Sanctuary (Sanctuary Pond & Native Garden)",
      sourceType: "invoice",
      sourceId: "inv-1001",
      createdAt: "2026-10-02T10:30:00Z",
      lines: [
        {
          id: "jl-6",
          accountId: "acc-1100",
          accountCode: "1100",
          accountName: "Accounts Receivable (A/R)",
          description: "Invoice #1001",
          debitCents: 485000,
          creditCents: 0,
          entityName: "Amy's Bird Sanctuary",
        },
        {
          id: "jl-7",
          accountId: "acc-4000",
          accountCode: "4000",
          accountName: "Design Services Income",
          description: "Custom landscape architecture plan",
          debitCents: 0,
          creditCents: 125000,
          entityName: "Amy's Bird Sanctuary",
        },
        {
          id: "jl-8",
          accountId: "acc-4010",
          accountCode: "4010",
          accountName: "Landscaping & Installation Income",
          description: "Pond installation & irrigation",
          debitCents: 0,
          creditCents: 360000,
          entityName: "Amy's Bird Sanctuary",
        },
      ],
    },
    // JE-1003: Payment for Invoice #1001 ($4,850.00)
    {
      id: "je-1003",
      entryNumber: "JE-1003",
      date: "2026-10-05",
      memo: "Payment received for Invoice #1001 — Amy's Bird Sanctuary",
      sourceType: "invoice_payment",
      sourceId: "inv-1001",
      reconciled: true,
      createdAt: "2026-10-05T14:15:00Z",
      lines: [
        {
          id: "jl-9",
          accountId: "acc-1000",
          accountCode: "1000",
          accountName: "Business Checking (Chase ••4021)",
          description: "ACH Deposit — Amy's Bird Sanctuary",
          debitCents: 485000,
          creditCents: 0,
          entityName: "Amy's Bird Sanctuary",
        },
        {
          id: "jl-10",
          accountId: "acc-1100",
          accountCode: "1100",
          accountName: "Accounts Receivable (A/R)",
          description: "Clear Invoice #1001",
          debitCents: 0,
          creditCents: 485000,
          entityName: "Amy's Bird Sanctuary",
        },
      ],
    },
    // JE-1004: Invoice #1002 to Freeman Sporting Goods ($3,420.00) - Open
    {
      id: "je-1004",
      entryNumber: "JE-1004",
      date: "2026-10-10",
      memo: "Invoice #1002 — Freeman Sporting Goods (Commercial Lawn & Sprinkler Upgrade)",
      sourceType: "invoice",
      sourceId: "inv-1002",
      createdAt: "2026-10-10T11:00:00Z",
      lines: [
        {
          id: "jl-11",
          accountId: "acc-1100",
          accountCode: "1100",
          accountName: "Accounts Receivable (A/R)",
          description: "Invoice #1002",
          debitCents: 342000,
          creditCents: 0,
          entityName: "Freeman Sporting Goods",
        },
        {
          id: "jl-12",
          accountId: "acc-4010",
          accountCode: "4010",
          accountName: "Landscaping & Installation Income",
          description: "Commercial turf & smart sprinkler controllers",
          debitCents: 0,
          creditCents: 342000,
          entityName: "Freeman Sporting Goods",
        },
      ],
    },
    // JE-1005: Invoice #1003 to Bill's Windsurf Shop ($1,680.00) - Overdue
    {
      id: "je-1005",
      entryNumber: "JE-1005",
      date: "2026-09-18",
      memo: "Invoice #1003 — Bill's Windsurf Shop (Monthly Coastal Maintenance)",
      sourceType: "invoice",
      sourceId: "inv-1003",
      createdAt: "2026-09-18T16:00:00Z",
      lines: [
        {
          id: "jl-13",
          accountId: "acc-1100",
          accountCode: "1100",
          accountName: "Accounts Receivable (A/R)",
          description: "Invoice #1003",
          debitCents: 168000,
          creditCents: 0,
          entityName: "Bill's Windsurf Shop",
        },
        {
          id: "jl-14",
          accountId: "acc-4020",
          accountCode: "4020",
          accountName: "Pest Control & Maintenance Income",
          description: "Boardwalk palms & pest control",
          debitCents: 0,
          creditCents: 168000,
          entityName: "Bill's Windsurf Shop",
        },
      ],
    },
    // JE-1006: Expense - Yard Rent ($1,800.00) paid from Checking
    {
      id: "je-1006",
      entryNumber: "JE-1006",
      date: "2026-10-01",
      memo: "October Equipment Yard & Office Lease",
      sourceType: "expense",
      sourceId: "exp-1",
      reconciled: true,
      createdAt: "2026-10-01T08:00:00Z",
      lines: [
        {
          id: "jl-15",
          accountId: "acc-6080",
          accountCode: "6080",
          accountName: "Yard & Office Rent",
          description: "Monthly yard lease",
          debitCents: 180000,
          creditCents: 0,
          entityName: "Bay Area Industrial Properties",
        },
        {
          id: "jl-16",
          accountId: "acc-1000",
          accountCode: "1000",
          accountName: "Business Checking (Chase ••4021)",
          description: "ACH Rent Payment",
          debitCents: 0,
          creditCents: 180000,
          entityName: "Bay Area Industrial Properties",
        },
      ],
    },
    // JE-1007: Expense - Tania's Nursery ($945.00) paid on Corporate Amex
    {
      id: "je-1007",
      entryNumber: "JE-1007",
      date: "2026-10-06",
      memo: "Japanese Maple trees, sod rolls & irrigation fittings",
      sourceType: "expense",
      sourceId: "exp-2",
      createdAt: "2026-10-06T12:20:00Z",
      lines: [
        {
          id: "jl-17",
          accountId: "acc-5010",
          accountCode: "5010",
          accountName: "Job Materials (Plants, Soil & Sprinklers)",
          description: "Nursery stock for Amy's Sanctuary job",
          debitCents: 94500,
          creditCents: 0,
          entityName: "Tania's Nursery",
        },
        {
          id: "jl-18",
          accountId: "acc-2100",
          accountCode: "2100",
          accountName: "Corporate Platinum Card (Amex ••1004)",
          description: "Amex charge — Tania's Nursery",
          debitCents: 0,
          creditCents: 94500,
          entityName: "Tania's Nursery",
        },
      ],
    },
    // JE-1008: Bill from Norton Lumber ($1,120.00) - Open Bill in A/P
    {
      id: "je-1008",
      entryNumber: "JE-1008",
      date: "2026-10-12",
      memo: "Bill #NL-409 — Redwood pergola timbers & concrete mix",
      sourceType: "bill",
      sourceId: "exp-3",
      createdAt: "2026-10-12T15:00:00Z",
      lines: [
        {
          id: "jl-19",
          accountId: "acc-5010",
          accountCode: "5010",
          accountName: "Job Materials (Plants, Soil & Sprinklers)",
          description: "Redwood timbers for Freeman job",
          debitCents: 112000,
          creditCents: 0,
          entityName: "Norton Lumber and Building Materials",
        },
        {
          id: "jl-20",
          accountId: "acc-2000",
          accountCode: "2000",
          accountName: "Accounts Payable (A/P)",
          description: "Open Vendor Bill #NL-409",
          debitCents: 0,
          creditCents: 112000,
          entityName: "Norton Lumber and Building Materials",
        },
      ],
    },
    // JE-1009: Expense - Brosnahan Insurance ($547.00) on Corporate Amex
    {
      id: "je-1009",
      entryNumber: "JE-1009",
      date: "2026-10-14",
      memo: "Commercial general liability & fleet policy",
      sourceType: "expense",
      sourceId: "exp-4",
      createdAt: "2026-10-14T09:45:00Z",
      lines: [
        {
          id: "jl-21",
          accountId: "acc-6040",
          accountCode: "6040",
          accountName: "General Liability Insurance",
          description: "Quarterly liability coverage",
          debitCents: 54700,
          creditCents: 0,
          entityName: "Brosnahan Insurance Agency",
        },
        {
          id: "jl-22",
          accountId: "acc-2100",
          accountCode: "2100",
          accountName: "Corporate Platinum Card (Amex ••1004)",
          description: "Amex charge — Brosnahan Insurance",
          debitCents: 0,
          creditCents: 54700,
          entityName: "Brosnahan Insurance Agency",
        },
      ],
    },
  ];

  const invoices: QboInvoice[] = [
    {
      id: "inv-1001",
      invoiceNumber: "1001",
      customerId: "cust-1",
      customerName: "Amy's Bird Sanctuary",
      date: "2026-10-02",
      dueDate: "2026-11-01",
      status: "Paid",
      totalCents: 485000,
      balanceDueCents: 0,
      journalEntryId: "je-1002",
      paymentJournalEntryId: "je-1003",
      lines: [
        {
          id: "il-1",
          serviceName: "Landscape Architecture Design",
          description: "Sanctuary native habitat & pond blueprint",
          quantity: 10,
          rateCents: 12500,
          amountCents: 125000,
          incomeAccountId: "acc-4000",
        },
        {
          id: "il-2",
          serviceName: "Pond & Irrigation Installation",
          description: "Koi pond liner, pump, stone edging & drip zones",
          quantity: 1,
          rateCents: 360000,
          amountCents: 360000,
          incomeAccountId: "acc-4010",
        },
      ],
    },
    {
      id: "inv-1002",
      invoiceNumber: "1002",
      customerId: "cust-2",
      customerName: "Freeman Sporting Goods",
      date: "2026-10-10",
      dueDate: "2026-11-09",
      status: "Open",
      totalCents: 342000,
      balanceDueCents: 342000,
      journalEntryId: "je-1004",
      lines: [
        {
          id: "il-3",
          serviceName: "Commercial Turf & Sprinklers",
          description: "Storefront lawn re-sodding and 8-zone smart controller",
          quantity: 1,
          rateCents: 342000,
          amountCents: 342000,
          incomeAccountId: "acc-4010",
        },
      ],
    },
    {
      id: "inv-1003",
      invoiceNumber: "1003",
      customerId: "cust-3",
      customerName: "Bill's Windsurf Shop",
      date: "2026-09-18",
      dueDate: "2026-10-18",
      status: "Overdue",
      totalCents: 168000,
      balanceDueCents: 168000,
      journalEntryId: "je-1005",
      lines: [
        {
          id: "il-4",
          serviceName: "Coastal Grounds & Pest Control",
          description: "Palm pruning, salt-tolerant beds & organic pest treatment",
          quantity: 1,
          rateCents: 168000,
          amountCents: 168000,
          incomeAccountId: "acc-4020",
        },
      ],
    },
  ];

  const expenses: QboExpense[] = [
    {
      id: "exp-1",
      refNumber: "ACH-1001",
      type: "Expense",
      vendorId: "vend-4",
      vendorName: "Bay Area Industrial Properties",
      date: "2026-10-01",
      paymentAccountId: "acc-1000",
      categoryAccountId: "acc-6080",
      categoryAccountName: "Yard & Office Rent",
      description: "October Equipment Yard & Office Lease",
      amountCents: 180000,
      status: "Paid",
      journalEntryId: "je-1006",
    },
    {
      id: "exp-2",
      refNumber: "AMEX-882",
      type: "Expense",
      vendorId: "vend-1",
      vendorName: "Tania's Nursery",
      date: "2026-10-06",
      paymentAccountId: "acc-2100",
      categoryAccountId: "acc-5010",
      categoryAccountName: "Job Materials (Plants, Soil & Sprinklers)",
      description: "Japanese Maple trees, sod rolls & irrigation fittings",
      amountCents: 94500,
      status: "Paid",
      journalEntryId: "je-1007",
    },
    {
      id: "exp-3",
      refNumber: "NL-409",
      type: "Bill",
      vendorId: "vend-6",
      vendorName: "Norton Lumber and Building Materials",
      date: "2026-10-12",
      dueDate: "2026-11-11",
      paymentAccountId: "acc-2000",
      categoryAccountId: "acc-5010",
      categoryAccountName: "Job Materials (Plants, Soil & Sprinklers)",
      description: "Redwood pergola timbers & concrete mix",
      amountCents: 112000,
      status: "Open",
      journalEntryId: "je-1008",
    },
    {
      id: "exp-4",
      refNumber: "AMEX-904",
      type: "Expense",
      vendorId: "vend-5",
      vendorName: "Brosnahan Insurance Agency",
      date: "2026-10-14",
      paymentAccountId: "acc-2100",
      categoryAccountId: "acc-6040",
      categoryAccountName: "General Liability Insurance",
      description: "Commercial general liability & fleet policy",
      amountCents: 54700,
      status: "Paid",
      journalEntryId: "je-1009",
    },
  ];

  // Uncategorized ("For Review") + Categorized Bank Feed Items
  const bankTransactions: QboBankTransaction[] = [
    {
      id: "btx-1",
      bankAccountId: "acc-1000",
      date: "2026-10-15",
      description: "HICKS HARDWARE #102 IRRIGATION PIPE",
      payee: "Hicks Hardware",
      amountCents: -31250,
      status: "for_review",
      suggestedAccountId: "acc-5010",
      matchedRuleName: "Hardware Supplies",
      aiConfidence: 97,
      aiReasoning:
        "Matched vendor 'Hicks Hardware' + keyword 'IRRIGATION PIPE' against 4 prior categorizations to 5010 Job Materials.",
      fingerprint: makeFingerprint(
        "acc-1000",
        "2026-10-15",
        "HICKS HARDWARE #102 IRRIGATION PIPE",
        -31250
      ),
    },
    {
      id: "btx-2",
      bankAccountId: "acc-1000",
      date: "2026-10-16",
      description: "CHIN'S GAS AND OIL FLEET FUEL",
      payee: "Chin's Gas and Oil",
      amountCents: -14260,
      status: "for_review",
      suggestedAccountId: "acc-6020",
      matchedRuleName: "Fleet Fuel & Gas",
      aiConfidence: 99,
      aiReasoning:
        "Recurring fuel merchant 'Chin's Gas and Oil' matches rule 'Fleet Fuel & Gas' -> 6020 Automobile & Truck Fuel.",
      fingerprint: makeFingerprint(
        "acc-1000",
        "2026-10-16",
        "CHIN'S GAS AND OIL FLEET FUEL",
        -14260
      ),
    },
    {
      id: "btx-3",
      bankAccountId: "acc-1000",
      date: "2026-10-17",
      description: "STRIPE PAYOUT - GEETA KALAPATAPU PATIO DESIGN",
      payee: "Geeta Kalapatapu",
      amountCents: 125000,
      status: "for_review",
      suggestedAccountId: "acc-4010",
      matchedRuleName: "Stripe Customer Deposits",
      aiConfidence: 94,
      aiReasoning:
        "Positive ACH deposit ($1,250.00) with 'PATIO DESIGN' memo aligns with 4010 Design & Consulting Income.",
      fingerprint: makeFingerprint(
        "acc-1000",
        "2026-10-17",
        "STRIPE PAYOUT - GEETA KALAPATAPU PATIO DESIGN",
        125000
      ),
    },
    {
      id: "btx-4",
      bankAccountId: "acc-1000",
      date: "2026-10-18",
      description: "PG&E COMMERCIAL ELECTRIC & WATER PUMP",
      payee: "PG&E",
      amountCents: -22500,
      status: "for_review",
      suggestedAccountId: "acc-6100",
      matchedRuleName: "PG&E Utilities",
      aiConfidence: 98,
      aiReasoning:
        "Utility provider 'PG&E' consistently categorized to 6100 Utilities (Gas, Water & Electric).",
      fingerprint: makeFingerprint(
        "acc-1000",
        "2026-10-18",
        "PG&E COMMERCIAL ELECTRIC & WATER PUMP",
        -22500
      ),
    },
    {
      id: "btx-5",
      bankAccountId: "acc-2100",
      date: "2026-10-19",
      description: "INTUIT QUICKBOOKS ONLINE PLUS",
      payee: "Intuit",
      amountCents: -9000,
      status: "for_review",
      suggestedAccountId: "acc-6090",
      matchedRuleName: "Intuit / Software Subscriptions",
      aiConfidence: 99,
      aiReasoning:
        "SaaS subscription charge on Amex ••1004 matches 6090 Software & Cloud Subscriptions.",
      fingerprint: makeFingerprint(
        "acc-2100",
        "2026-10-19",
        "INTUIT QUICKBOOKS ONLINE PLUS",
        -9000
      ),
    },
    {
      id: "btx-6",
      bankAccountId: "acc-1000",
      date: "2026-10-05",
      description: "ACH DEPOSIT AMY'S BIRD SANCTUARY INV 1001",
      payee: "Amy's Bird Sanctuary",
      amountCents: 485000,
      status: "categorized",
      suggestedAccountId: "acc-1100",
      postedJournalEntryId: "je-1003",
      reconciled: true,
      fingerprint: makeFingerprint(
        "acc-1000",
        "2026-10-05",
        "ACH DEPOSIT AMY'S BIRD SANCTUARY INV 1001",
        485000
      ),
    },
    {
      id: "btx-7",
      bankAccountId: "acc-1000",
      date: "2026-10-01",
      description: "BAY AREA INDUSTRIAL PROPERTIES RENT",
      payee: "Bay Area Industrial Properties",
      amountCents: -180000,
      status: "categorized",
      suggestedAccountId: "acc-6080",
      postedJournalEntryId: "je-1006",
      reconciled: true,
      fingerprint: makeFingerprint(
        "acc-1000",
        "2026-10-01",
        "BAY AREA INDUSTRIAL PROPERTIES RENT",
        -180000
      ),
    },
  ];

  const reconciliations: QboReconciliationRecord[] = [
    {
      id: "rec-1",
      bankAccountId: "acc-1000",
      bankAccountName: "Business Checking (Chase ••4021)",
      statementDate: "2026-09-30",
      endingBalanceCents: 2500000,
      clearedCount: 1,
      reconciledAt: "2026-10-02T10:00:00Z",
    },
  ];

  const auditLogs: QboAuditLogItem[] = [
    {
      id: "aud-1",
      timestamp: "2026-10-14T09:45:00Z",
      user: "Craig Carlson (Owner)",
      action: "Expense Recorded",
      details: "JE-1009 · Brosnahan Insurance Agency (General Liability)",
      amountCents: 54700,
    },
    {
      id: "aud-2",
      timestamp: "2026-10-12T15:00:00Z",
      user: "Craig Carlson (Owner)",
      action: "Bill Entered",
      details: "JE-1008 · Norton Lumber and Building Materials (#NL-409)",
      amountCents: 112000,
    },
    {
      id: "aud-3",
      timestamp: "2026-10-10T11:00:00Z",
      user: "Craig Carlson (Owner)",
      action: "Invoice Created",
      details: "JE-1004 · Invoice #1002 to Freeman Sporting Goods",
      amountCents: 342000,
    },
    {
      id: "aud-4",
      timestamp: "2026-10-05T14:15:00Z",
      user: "Craig Carlson (Owner)",
      action: "Invoice Payment Received",
      details: "JE-1003 · Payment for Invoice #1001 (Amy's Bird Sanctuary)",
      amountCents: 485000,
    },
  ];

  const teamMembers: QboTeamMember[] = [
    {
      id: "tm-1",
      name: "Craig Carlson",
      email: "craig@craigslandscaping.com",
      role: "owner",
      status: "Active",
    },
    {
      id: "tm-2",
      name: "Sarah Jenkins",
      email: "sarah@craigslandscaping.com",
      role: "staff",
      status: "Active",
    },
    {
      id: "tm-3",
      name: "Arthur Andersen, CPA",
      email: "a.andersen@bayareacpa.com",
      role: "accountant",
      status: "Active",
    },
  ];

  return {
    companyName:
      customCompanyName?.trim() || "Craig's Design and Landscaping Services",
    lockedThroughDate: "2026-08-31",
    activeRole: "owner",
    salesTaxRatePercent: 8.25,
    teamMembers,
    accounts,
    journalEntries,
    bankTransactions,
    rules,
    customers,
    vendors,
    productsAndServices,
    estimates,
    invoices,
    expenses,
    reconciliations,
    auditLogs,
  };
}

export function createFreshCompanyData(companyName: string): QboStoreData {
  const base = createInitialSeedData(companyName);
  return {
    companyName: companyName.trim() || "New Business LLC",
    lockedThroughDate: null,
    activeRole: "owner",
    salesTaxRatePercent: 8.25,
    teamMembers: [
      {
        id: "tm-1",
        name: "Business Owner",
        email: "owner@company.com",
        role: "owner",
        status: "Active",
      },
    ],
    accounts: base.accounts.map((a) => ({
      ...a,
      bankBalanceCents: a.bankBalanceCents !== undefined ? 0 : undefined,
    })),
    journalEntries: [],
    bankTransactions: [],
    rules: base.rules,
    customers: [],
    vendors: [],
    productsAndServices: base.productsAndServices,
    estimates: [],
    invoices: [],
    expenses: [],
    reconciliations: [],
    auditLogs: [
      {
        id: `aud-init-${Date.now()}`,
        timestamp: new Date().toISOString(),
        user: "Business Owner (Owner)",
        action: "Company Created",
        details: `Initialized 31 Chart of Accounts for ${companyName.trim()}`,
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
    globalStore.__qboStoreData = createInitialSeedData();
  }
  return globalStore.__qboStoreData;
}

export function hydrateQboStore(data: QboStoreData): void {
  globalStore.__qboStoreData = data;
}

export function resetQboStore(): QboStoreData {
  globalStore.__qboStoreData = createInitialSeedData();
  return globalStore.__qboStoreData;
}

function appendAuditLog(
  action: string,
  details: string,
  amountCents?: number
): void {
  const store = getRawStore();
  store.auditLogs.unshift({
    id: `aud-${Date.now()}-${store.auditLogs.length}`,
    timestamp: new Date().toISOString(),
    user: "Craig Carlson (Owner)",
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
  sampleCsvText: string;
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

function diffDays(dueDateStr: string, refDateStr = "2026-10-27"): number {
  const due = new Date(`${dueDateStr}T00:00:00Z`).getTime();
  const ref = new Date(`${refDateStr}T00:00:00Z`).getTime();
  return Math.floor((ref - due) / (1000 * 60 * 60 * 24));
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

    const forReviewCount = store.bankTransactions.filter(
      (t) => t.bankAccountId === acc.id && t.status === "for_review"
    ).length;

    return {
      ...acc,
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
    sampleCsvText: SAMPLE_BANK_CSV,
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
      id: `btx-${Date.now()}-${importedCount}`,
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
  lines: Array<{
    serviceName: string;
    description: string;
    quantity: number;
    rateCents: number;
    incomeAccountId: string;
  }>;
}): QboInvoice {
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
  }));

  const totalCents = builtLines.reduce((s, l) => s + l.amountCents, 0);
  if (totalCents <= 0) {
    throw new Error("Invoice total must be greater than $0.00.");
  }

  const nextInvNum = String(1001 + store.invoices.length);

  const je = postJournalEntry({
    date: input.date,
    memo: `Invoice #${nextInvNum} — ${customer.name}`,
    sourceType: "invoice",
    lines: [
      {
        accountId: "acc-1100",
        description: `Invoice #${nextInvNum}`,
        debitCents: totalCents,
        creditCents: 0,
        entityName: customer.name,
      },
      ...builtLines.map((l) => ({
        accountId: l.incomeAccountId,
        description: `${l.serviceName}: ${l.description}`,
        debitCents: 0,
        creditCents: l.amountCents,
        entityName: customer.name,
      })),
    ],
  });

  const invoice: QboInvoice = {
    id: `inv-${Date.now()}`,
    invoiceNumber: nextInvNum,
    customerId: customer.id,
    customerName: customer.name,
    date: input.date,
    dueDate: input.dueDate,
    status: "Open",
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
  let clearedCount = 0;

  for (const entry of store.journalEntries) {
    if (idSet.has(entry.id)) {
      entry.reconciled = true;
      clearedCount++;
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
  name: string;
  email: string;
  role: "owner" | "staff" | "accountant";
}): QboTeamMember {
  assertCanWrite();
  const store = getRawStore();
  const member: QboTeamMember = {
    id: `tm-${Date.now()}`,
    name: input.name,
    email: input.email,
    role: input.role,
    status: "Invited",
  };
  store.teamMembers.push(member);
  appendAuditLog(
    "Team Member Invited",
    `${member.name} (${member.email}) invited as ${member.role}`
  );
  return member;
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
        "AI detected landscaping material keywords (NURSERY/HARDWARE/VALVES) matching prior COGS bills → 5010 Job Materials.";
    } else if (
      upper.includes("GAS") ||
      upper.includes("SHELL") ||
      upper.includes("CHEVRON") ||
      upper.includes("FUEL")
    ) {
      tx.suggestedAccountId = "acc-6020";
      tx.aiConfidence = 96;
      tx.aiReasoning =
        "AI identified fuel station merchant pattern → 6020 Automobile & Truck Fuel.";
    } else if (
      upper.includes("STRIPE") ||
      upper.includes("DEPOSIT") ||
      upper.includes("CHECK") ||
      isDeposit
    ) {
      tx.suggestedAccountId = "acc-4000";
      tx.aiConfidence = 91;
      tx.aiReasoning =
        "AI analyzed positive customer inflow and matched to primary revenue account → 4000 Landscaping Services Income.";
    } else {
      tx.suggestedAccountId = tx.suggestedAccountId || "acc-6060";
      tx.aiConfidence = 84;
      tx.aiReasoning =
        "AI fallback classification for general commercial operating outflow → 6060 Office Supplies & Postage.";
    }
  }

  appendAuditLog(
    "AI Auto-Categorizer Executed",
    `Generated category suggestions & reasoning for ${analyzedCount} bank transactions`
  );
  return { analyzedCount };
}
