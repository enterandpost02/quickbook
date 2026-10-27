import { formatCents } from "./money";
import { formatPostalAddress, type ComputedQboState } from "./qbo-store";

export type QboSearchResultKind =
  | "customer"
  | "vendor"
  | "invoice"
  | "estimate"
  | "expense"
  | "bank_transaction"
  | "account"
  | "journal_entry"
  | "product";

export interface QboSearchResult {
  kind: QboSearchResultKind;
  id: string;
  title: string;
  subtitle: string;
  amountCents?: number;
  /** Higher = better match. Used for ordering within the result list. */
  score: number;
}

export const SEARCH_KIND_LABELS: Record<QboSearchResultKind, string> = {
  customer: "Customers",
  vendor: "Vendors",
  invoice: "Invoices",
  estimate: "Estimates",
  expense: "Expenses & Bills",
  bank_transaction: "Bank Transactions",
  account: "Chart of Accounts",
  journal_entry: "Journal Entries",
  product: "Products & Services",
};

/**
 * Parses a query like "1,250", "$1250.00" or "-90" into absolute integer cents.
 * Returns null when the query is not a monetary amount.
 */
export function parseSearchAmountCents(query: string): number | null {
  const cleaned = query.replace(/[$,\s]/g, "").replace(/^-/, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const [whole, fraction = ""] = cleaned.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(cents) ? cents : null;
}

function scoreText(haystacks: Array<string | undefined>, terms: string[]): number {
  const fields = haystacks.map((h) => (h ?? "").toLowerCase());
  let score = 0;
  for (const term of terms) {
    let best = 0;
    for (const field of fields) {
      if (!field) continue;
      if (field === term) best = Math.max(best, 6);
      else if (field.startsWith(term)) best = Math.max(best, 4);
      else if (field.includes(` ${term}`)) best = Math.max(best, 3);
      else if (field.includes(term)) best = Math.max(best, 2);
    }
    // Every term must match somewhere (AND semantics)
    if (best === 0) return 0;
    score += best;
  }
  return score;
}

/**
 * Searches every record type in the active company. Text terms use AND semantics across
 * all searchable fields; numeric queries also match amounts to the exact cent.
 */
export function searchQboState(
  state: ComputedQboState,
  rawQuery: string,
  limitPerKind = 6
): QboSearchResult[] {
  const query = rawQuery.trim().toLowerCase();
  if (query.length < 2) return [];

  const terms = query.split(/\s+/).filter(Boolean);
  const amountCents = parseSearchAmountCents(query);
  const results: QboSearchResult[] = [];

  const push = (
    kind: QboSearchResultKind,
    id: string,
    title: string,
    subtitle: string,
    fields: Array<string | undefined>,
    recordAmountCents?: number
  ) => {
    let score = scoreText(fields, terms);
    if (
      amountCents !== null &&
      recordAmountCents !== undefined &&
      Math.abs(recordAmountCents) === amountCents
    ) {
      score = Math.max(score, 10);
    }
    if (score > 0) {
      results.push({ kind, id, title, subtitle, amountCents: recordAmountCents, score });
    }
  };

  for (const c of state.customers) {
    push(
      "customer",
      c.id,
      c.name,
      [c.company !== c.name ? c.company : "", c.email, c.phone].filter(Boolean).join(" · "),
      [
        c.name,
        c.company,
        c.email,
        c.phone,
        c.firstName,
        c.lastName,
        c.taxId,
        formatPostalAddress(c.address),
      ]
    );
  }

  for (const v of state.vendors) {
    push(
      "vendor",
      v.id,
      v.name,
      [v.company, v.email, v.phone].filter(Boolean).join(" · "),
      [
        v.name,
        v.company,
        v.email,
        v.phone,
        v.firstName,
        v.lastName,
        v.taxId,
        formatPostalAddress(v.address),
      ]
    );
  }

  for (const inv of state.invoices) {
    push(
      "invoice",
      inv.id,
      `Invoice #${inv.invoiceNumber} · ${inv.customerName}`,
      `${inv.date} · ${inv.status} · Open ${formatCents(inv.balanceDueCents)}`,
      [
        inv.invoiceNumber,
        `#${inv.invoiceNumber}`,
        `INV-${inv.invoiceNumber}`,
        `Invoice ${inv.invoiceNumber}`,
        `Invoice #${inv.invoiceNumber}`,
        inv.customerName,
        inv.status,
        ...inv.lines.map((l) => `${l.serviceName} ${l.description}`),
      ],
      inv.totalCents
    );
  }

  for (const est of state.estimates) {
    push(
      "estimate",
      est.id,
      `${est.estimateNumber} · ${est.customerName}`,
      `${est.date} · ${est.status}`,
      [
        est.estimateNumber,
        `#${est.estimateNumber}`,
        `EST-${est.estimateNumber}`,
        `Estimate ${est.estimateNumber}`,
        est.customerName,
        est.status,
        ...est.lines.map((l) => l.serviceName),
      ],
      est.totalCents
    );
  }

  for (const exp of state.expenses) {
    push(
      "expense",
      exp.id,
      `${exp.type} ${exp.refNumber} · ${exp.vendorName}`,
      `${exp.date} · ${exp.categoryAccountName} · ${exp.status}`,
      [exp.refNumber, exp.vendorName, exp.description, exp.categoryAccountName, exp.type],
      exp.amountCents
    );
  }

  for (const tx of state.bankTransactions) {
    const bankName = state.accounts.find((a) => a.id === tx.bankAccountId)?.name ?? "";
    push(
      "bank_transaction",
      tx.id,
      tx.description,
      `${tx.date} · ${bankName} · ${tx.status.replace("_", " ")}`,
      [tx.description, tx.payee, bankName],
      tx.amountCents
    );
  }

  for (const acc of state.accountsWithBalances) {
    push(
      "account",
      acc.id,
      `${acc.code} — ${acc.name}`,
      `${acc.type} · Balance ${formatCents(acc.balanceCents)}`,
      [acc.code, acc.name, acc.type, acc.detailType]
    );
  }

  for (const je of state.journalEntries) {
    const totalDebit = je.lines.reduce((s, l) => s + l.debitCents, 0);
    push(
      "journal_entry",
      je.id,
      `${je.entryNumber} · ${je.memo}`,
      `${je.date} · ${je.sourceType.replace("_", " ")}`,
      [
        je.entryNumber,
        je.memo,
        ...je.lines.map((l) => `${l.accountName} ${l.description} ${l.entityName ?? ""}`),
      ],
      totalDebit
    );
  }

  for (const p of state.productsAndServices) {
    push(
      "product",
      p.id,
      p.name,
      `${p.sku} · ${p.type} · ${formatCents(p.rateCents)}`,
      [p.name, p.sku, p.description, p.type],
      p.rateCents
    );
  }

  // Keep the best matches per kind, then order kinds by their best score
  const byKind = new Map<QboSearchResultKind, QboSearchResult[]>();
  for (const r of results) {
    const list = byKind.get(r.kind) ?? [];
    list.push(r);
    byKind.set(r.kind, list);
  }
  return Array.from(byKind.values())
    .map((list) => list.sort((a, b) => b.score - a.score).slice(0, limitPerKind))
    .sort((a, b) => b[0].score - a[0].score)
    .flat();
}
