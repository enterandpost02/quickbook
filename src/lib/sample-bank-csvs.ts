/**
 * 4 Real-World Multi-Bank CSV Export Formats for Testing & Demo Import
 *
 * Banks vary widely in column names, date formats (YYYY-MM-DD vs MM/DD/YYYY),
 * sign conventions, and single Amount vs split Debit/Credit columns.
 */

export interface BankCsvPreset {
  id: string;
  bankName: string;
  formatDescription: string;
  defaultAccountId: string;
  csvContent: string;
}

export const BANK_CSV_PRESETS: BankCsvPreset[] = [
  {
    id: "chase-checking",
    bankName: "Chase Business Checking",
    formatDescription: "YYYY-MM-DD · Single signed Amount column",
    defaultAccountId: "acc-1000",
    csvContent: `Date,Description,Amount,Payee
2026-10-20,HOME DEPOT #4412 SPRINKLER VALVES,-248.50,Home Depot
2026-10-21,STRIPE TRANSFER - FREEMAN SPORTING GOODS,1450.00,Freeman Sporting Goods
2026-10-22,CHIN'S GAS AND OIL #09,-84.20,Chin's Gas and Oil
2026-10-23,TANIA'S NURSERY WHOLESALE TREES,-620.00,Tania's Nursery
2026-10-24,PG&E MONTHLY UTILITY BILL,-195.40,PG&E
2026-10-25,INTUIT QUICKBOOKS SUBSCRIPTION,-90.00,Intuit
2026-10-26,CHECK DEPOSIT #1092 AMY BIRD SANCTUARY,875.00,Amy's Bird Sanctuary`,
  },
  {
    id: "bofa-split",
    bankName: "Bank of America Business",
    formatDescription: "MM/DD/YYYY · Split Money Out (Debit) & Money In (Credit) columns",
    defaultAccountId: "acc-1000",
    csvContent: `Posted Date,Transaction Description,Money Out,Money In,Merchant
10/20/2026,"NORTON LUMBER REDWOOD TIMBERS, INC.",480.00,,Norton Lumber
10/21/2026,ACH CREDIT BILLS WINDSURF SHOP,,1680.00,Bill's Windsurf Shop
10/22/2026,GUSTO PAYROLL CREW WAGES,2450.00,,Gusto Payroll
10/23/2026,SUNBELT RENTALS TRENCHER RENTAL,315.00,,Sunbelt Rentals
10/24/2026,CHEVRON COMMERCIAL FLEET FUEL GAS,112.80,,Chevron`,
  },
  {
    id: "amex-card",
    bankName: "American Express Corporate",
    formatDescription: "MM/DD/YYYY · Parentheses ($XX.XX) for charges",
    defaultAccountId: "acc-2100",
    csvContent: `Date,Memo,Amount,Vendor
10/18/2026,ADOBE CREATIVE CLOUD LANDSCAPE CAD,($59.99),Adobe
10/19/2026,HOME DEPOT PRO COMMERCIAL TOOLS,($412.75),Home Depot
10/21/2026,GOOGLE ADS LOCAL LANDSCAPING CAMPAIGN,($350.00),Google Ads
10/23/2026,HICKS HARDWARE BRASS NOZZLES,($128.40),Hicks Hardware`,
  },
  {
    id: "wells-fargo",
    bankName: "Wells Fargo Commercial",
    formatDescription: "YYYY-MM-DD · Quoted currency strings with commas",
    defaultAccountId: "acc-1000",
    csvContent: `Transaction Date,Details,Total,Payee Name
2026-10-22,COMMERCIAL DEPOSIT JEFF JALOPIES,"$2,150.00",Jeff's Jalopies
2026-10-23,BROSNAHAN INSURANCE RENEWAL,"-$425.00",Brosnahan Insurance Agency
2026-10-24,TANIA'S NURSERY DROUGHT PLANTS,"-$1,180.50",Tania's Nursery`,
  },
];
