"use client";

import React, { useState } from "react";
import {
  Check,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  Download,
  FileSpreadsheet,
  FileText,
  History,
  Landmark,
  Lock,
  Mail,
  Package,
  Plus,
  Receipt,
  RotateCcw,
  Scale,
  Search,
  Send,
  ShieldAlert,
  Sparkles,
  Unlock,
  Upload,
} from "lucide-react";
import {
  computeReportsForFilter,
  computeComparisonRange,
  formatPostalAddress,
  type ComputedQboState,
} from "@/lib/qbo-store";
import { formatCents, parseDollarsToCents } from "@/lib/money";
import type { ActiveModalType } from "./qbo-modals";

export type QboNavTab =
  | "home"
  | "banking"
  | "sales"
  | "expenses"
  | "coa"
  | "journals"
  | "reports"
  | "reconcile"
  | "audit";

interface ViewProps {
  state: ComputedQboState;
  setActiveTab: (tab: QboNavTab) => void;
  setActiveModal: (modal: ActiveModalType) => void;
  runAction: (
    action: string,
    payload?: unknown,
    successMsg?: string
  ) => Promise<void>;
  isSubmitting: boolean;
}

// ============================================================================
// 1. DASHBOARD HOME VIEW (QuickBooks "Business Overview")
// ============================================================================

export function DashboardHomeView({
  state,
  setActiveTab,
  setActiveModal,
  runAction,
}: ViewProps) {
  const { profitAndLoss, balanceSheet } = state.reports;
  const bankAccounts = state.accountsWithBalances.filter(
    (a) => a.type === "Bank" || a.type === "Credit Card"
  );
  const totalOutflowsCents =
    profitAndLoss.totalCogsCents + profitAndLoss.totalExpensesCents;

  const topExpenses = [
    ...profitAndLoss.cogsLines,
    ...profitAndLoss.expenseLines,
  ]
    .sort((a, b) => b.amountCents - a.amountCents)
    .slice(0, 5);

  const colors = [
    "bg-[#2CA01C]",
    "bg-sky-500",
    "bg-amber-500",
    "bg-indigo-500",
    "bg-rose-500",
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner / Quick Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-white p-5 border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#2CA01C]" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#2CA01C]">
              Business Overview · Double-Entry Ledger Active
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-0.5">
            {state.companyName}
          </h1>
          <p className="text-xs text-slate-500">
            All figures computed live in integer cents from{" "}
            {state.journalEntries.length} balanced journal entries.
            {state.lockedThroughDate && (
              <span className="ml-2 inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-700">
                <Lock className="h-3 w-3 text-amber-600" />
                Books closed through {state.lockedThroughDate}
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setActiveModal("csv_import")}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Upload className="h-3.5 w-3.5 text-[#2CA01C]" />
            Import Bank CSV
          </button>
          <button
            onClick={() => setActiveModal("invoice")}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <FileText className="h-3.5 w-3.5 text-[#2CA01C]" />
            Create Invoice
          </button>
          <button
            onClick={() => setActiveModal("expense")}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Receipt className="h-3.5 w-3.5 text-[#2CA01C]" />
            Record Expense
          </button>
          <button
            onClick={() => setActiveModal("journal_entry")}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#2CA01C] px-4 py-2 text-xs font-semibold text-white hover:bg-[#248217]"
          >
            <Plus className="h-3.5 w-3.5" />
            Journal Entry
          </button>
        </div>
      </div>

      {/* Main QBO 3-Card Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 1: Profit and Loss Widget */}
        <div className="rounded-xl bg-white p-5 border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Profit and Loss
              </h2>
              <span className="text-xs text-slate-400">This Quarter</span>
            </div>
            <div className="mt-3">
              <p className="text-xs text-slate-500">Net profit for period</p>
              <p
                className={`text-2xl font-mono font-bold ${
                  profitAndLoss.netIncomeCents >= 0
                    ? "text-slate-900"
                    : "text-red-600"
                }`}
              >
                {formatCents(profitAndLoss.netIncomeCents)}
              </p>
            </div>

            {state.kpis.forReviewCount > 0 && (
              <button
                onClick={() => setActiveTab("banking")}
                className="mt-3 w-full flex items-center justify-between rounded-lg bg-amber-50 border border-amber-200/80 px-3 py-2 text-xs text-amber-900 hover:bg-amber-100/70 transition-colors"
              >
                <span>
                  <strong>{state.kpis.forReviewCount} bank transactions</strong>{" "}
                  to review
                </span>
                <span className="font-semibold text-[#2CA01C] underline">
                  Categorize →
                </span>
              </button>
            )}

            <div className="mt-5 space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-slate-600">Income</span>
                  <span className="font-mono font-bold text-slate-900">
                    {formatCents(profitAndLoss.totalIncomeCents)}
                  </span>
                </div>
                <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-[#2CA01C] rounded-full"
                    style={{ width: "100%" }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-slate-600">
                    Expenses &amp; COGS
                  </span>
                  <span className="font-mono font-bold text-slate-900">
                    {formatCents(totalOutflowsCents)}
                  </span>
                </div>
                <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-sky-600 rounded-full"
                    style={{
                      width: `${Math.min(
                        100,
                        profitAndLoss.totalIncomeCents > 0
                          ? Math.round(
                              (totalOutflowsCents /
                                profitAndLoss.totalIncomeCents) *
                                100
                            )
                          : 50
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100 flex justify-between items-center">
            <button
              onClick={() => setActiveTab("reports")}
              className="text-xs font-semibold text-[#0077C5] hover:underline"
            >
              See Profit and Loss report
            </button>
            <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
              BS Balanced: {balanceSheet.isBalanced ? "Yes" : "Check"}
            </span>
          </div>
        </div>

        {/* Card 2: Expenses by Category */}
        <div className="rounded-xl bg-white p-5 border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Expenses Breakdown
              </h2>
              <span className="text-xs text-slate-400">Last 30 Days</span>
            </div>
            <div className="mt-3">
              <p className="text-xs text-slate-500">Total spending</p>
              <p className="text-2xl font-mono font-bold text-slate-900">
                {formatCents(totalOutflowsCents)}
              </p>
            </div>

            <div className="mt-4 space-y-2.5">
              {topExpenses.map((exp, idx) => {
                const pct =
                  totalOutflowsCents > 0
                    ? Math.round((exp.amountCents / totalOutflowsCents) * 100)
                    : 0;
                return (
                  <div key={exp.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2 truncate text-slate-700">
                        <span
                          className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                            colors[idx % colors.length]
                          }`}
                        />
                        <span className="truncate">{exp.name}</span>
                      </span>
                      <span className="font-mono font-semibold text-slate-900 shrink-0 ml-2">
                        {formatCents(exp.amountCents)} ({pct}%)
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${
                          colors[idx % colors.length]
                        }`}
                        style={{ width: `${Math.max(5, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100">
            <button
              onClick={() => setActiveTab("expenses")}
              className="text-xs font-semibold text-[#0077C5] hover:underline"
            >
              Manage all expenses &amp; bills
            </button>
          </div>
        </div>

        {/* Card 3: Bank Accounts Widget (Signature QuickBooks Card) */}
        <div className="rounded-xl bg-white p-5 border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Bank &amp; Credit Accounts
              </h2>
              <button
                onClick={() => setActiveModal("csv_import")}
                className="text-xs font-semibold text-[#0077C5] hover:underline"
              >
                + Upload CSV
              </button>
            </div>

            <div className="mt-3 divide-y divide-slate-100">
              {bankAccounts.map((acc) => (
                <div key={acc.id} className="py-3 first:pt-1 last:pb-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {acc.type === "Credit Card" ? (
                        <CreditCard className="h-4 w-4 text-slate-500" />
                      ) : (
                        <Landmark className="h-4 w-4 text-[#0077C5]" />
                      )}
                      <span className="text-sm font-semibold text-slate-900">
                        {acc.name}
                      </span>
                    </div>
                    {acc.forReviewCount > 0 && (
                      <button
                        onClick={() => setActiveTab("banking")}
                        className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-900 hover:bg-amber-200"
                      >
                        {acc.forReviewCount} to review
                      </button>
                    )}
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs bg-slate-50 rounded-lg p-2">
                    <div>
                      <span className="block text-[10px] uppercase text-slate-400">
                        Bank Balance
                      </span>
                      <span className="font-mono font-semibold text-slate-700">
                        {formatCents(acc.bankBalanceCents ?? acc.balanceCents)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="block text-[10px] uppercase text-slate-400">
                        In Pro E Books
                      </span>
                      <span className="font-mono font-bold text-slate-900">
                        {formatCents(acc.balanceCents)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={() => setActiveTab("banking")}
              className="text-xs font-semibold text-[#0077C5] hover:underline"
            >
              Go to bank register →
            </button>
            <button
              onClick={() => setActiveTab("reconcile")}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              Reconcile
            </button>
          </div>
        </div>
      </div>

      {/* Invoices Money Bar + Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Invoices Overview Card */}
        <div className="rounded-xl bg-white p-5 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Invoices &amp; Accounts Receivable
            </h2>
            <button
              onClick={() => setActiveTab("sales")}
              className="text-xs font-semibold text-[#0077C5] hover:underline"
            >
              View all invoices &amp; estimates
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4">
            <div className="border-l-4 border-amber-500 pl-3">
              <span className="block text-xs text-slate-500">Overdue</span>
              <span className="text-lg font-mono font-bold text-slate-900">
                {formatCents(state.kpis.overdueInvoicesCents)}
              </span>
            </div>
            <div className="border-l-4 border-sky-500 pl-3">
              <span className="block text-xs text-slate-500">
                Open (Unpaid)
              </span>
              <span className="text-lg font-mono font-bold text-slate-900">
                {formatCents(state.kpis.openInvoicesCents)}
              </span>
            </div>
            <div className="border-l-4 border-[#2CA01C] pl-3">
              <span className="block text-xs text-slate-500">
                Paid Last 30 Days
              </span>
              <span className="text-lg font-mono font-bold text-[#2CA01C]">
                {formatCents(state.kpis.paidLast30DaysCents)}
              </span>
            </div>
          </div>

          {/* Multi-segment bar */}
          <div className="h-4 w-full rounded-full bg-slate-100 flex overflow-hidden mb-5">
            <div
              className="bg-amber-500 h-full"
              style={{ width: "18%" }}
              title="Overdue"
            />
            <div
              className="bg-sky-500 h-full"
              style={{ width: "34%" }}
              title="Open"
            />
            <div
              className="bg-[#2CA01C] h-full"
              style={{ width: "48%" }}
              title="Paid"
            />
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {state.invoices.slice(0, 3).map((inv) => (
              <div
                key={inv.id}
                className="py-2.5 flex items-center justify-between"
              >
                <div>
                  <span className="font-semibold text-slate-900">
                    #{inv.invoiceNumber} · {inv.customerName}
                  </span>
                  <span className="block text-slate-400">
                    Due {inv.dueDate}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-slate-900">
                    {formatCents(inv.totalCents)}
                  </span>
                  {inv.status !== "Paid" ? (
                    <button
                      onClick={() =>
                        runAction(
                          "receive_invoice_payment",
                          {
                            invoiceId: inv.id,
                            depositAccountId: "acc-1000",
                            date: new Date().toISOString().slice(0, 10),
                          },
                          `Received payment of ${formatCents(
                            inv.balanceDueCents
                          )} for Invoice #${inv.invoiceNumber}`
                        )
                      }
                      className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-[#2CA01C] hover:bg-emerald-100"
                    >
                      Receive payment
                    </button>
                  ) : (
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                      Paid
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Posted Journal Entries */}
        <div className="rounded-xl bg-white p-5 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Recent Ledger Postings (Double-Entry)
            </h2>
            <button
              onClick={() => setActiveTab("journals")}
              className="text-xs font-semibold text-[#0077C5] hover:underline"
            >
              View General Journal
            </button>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {state.journalEntries.slice(0, 5).map((je) => {
              const total = je.lines.reduce((s, l) => s + l.debitCents, 0);
              return (
                <div
                  key={je.id}
                  className="py-2.5 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-700">
                        {je.entryNumber}
                      </span>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-600">
                        {je.sourceType.replace("_", " ")}
                      </span>
                      <span className="text-slate-400">{je.date}</span>
                    </div>
                    <p className="text-slate-700 truncate mt-0.5">{je.memo}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono font-bold text-slate-900">
                      {formatCents(total)}
                    </span>
                    <span className="block text-[10px] text-[#2CA01C]">
                      Dr = Cr
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 2. BANKING CENTER & CSV FEED VIEW (Transactions -> Bank Transactions)
// ============================================================================

export function BankingCenterView({
  state,
  setActiveModal,
  runAction,
  isSubmitting,
}: ViewProps) {
  const bankAccounts = state.accountsWithBalances.filter(
    (a) => a.type === "Bank" || a.type === "Credit Card"
  );
  const [selectedBankId, setSelectedBankId] = useState(
    bankAccounts[0]?.id ?? "acc-1000"
  );
  const [subTab, setSubTab] = useState<
    "for_review" | "categorized" | "excluded" | "rules"
  >("for_review");

  const [selectedCategoryByTx, setSelectedCategoryByTx] = useState<
    Record<string, string>
  >({});
  const [payeeByTx, setPayeeByTx] = useState<Record<string, string>>({});
  const [actionModeByTx, setActionModeByTx] = useState<
    Record<string, "categorize" | "match">
  >({});
  const [matchTargetByTx, setMatchTargetByTx] = useState<
    Record<string, string>
  >({});

  const openInvoices = state.invoices.filter(
    (inv) => inv.status !== "Paid" && inv.balanceDueCents > 0
  );
  const openBills = state.expenses.filter(
    (exp) => exp.type === "Bill" && exp.status !== "Paid" && exp.amountCents > 0
  );

  const [ruleName, setRuleName] = useState("");
  const [ruleContains, setRuleContains] = useState("");
  const [ruleDirection, setRuleDirection] = useState<"out" | "in" | "any">(
    "out"
  );
  const [ruleTargetAcc, setRuleTargetAcc] = useState("acc-5010");

  const filteredTxs = state.bankTransactions.filter(
    (t) =>
      t.bankAccountId === selectedBankId &&
      (subTab === "rules" ? true : t.status === subTab)
  );

  const nonBankAccounts = state.accounts.filter(
    (a) => a.id !== selectedBankId
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Bank Transactions &amp; CSV Feed
          </h1>
          <p className="text-xs text-slate-500">
            Upload bank CSV files (Chase, BofA, Amex, Wells Fargo), review auto-categorized rules, and post to the General Ledger
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() =>
              runAction(
                "run_ai_categorizer",
                {},
                "AI Auto-Categorizer analyzed pending bank rows and updated suggestions + reasoning!"
              )
            }
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 rounded-full border border-indigo-300 bg-indigo-50 px-4 py-2 text-xs font-semibold text-indigo-800 hover:bg-indigo-100"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Run AI Categorizer
          </button>

          <button
            onClick={() =>
              runAction(
                "categorize_all_suggested",
                { bankAccountId: selectedBankId },
                "Accepted and posted all rule-matched bank transactions!"
              )
            }
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-4 py-2 text-xs font-semibold text-[#2CA01C] hover:bg-emerald-100"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Accept All Rule Matches
          </button>

          <button
            onClick={() => setActiveModal("csv_import")}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#2CA01C] px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#248217]"
          >
            <Upload className="h-3.5 w-3.5" />
            Upload from file (.CSV)
          </button>
        </div>
      </div>

      {/* QuickBooks Bank Account Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {bankAccounts.map((acc) => {
          const isSelected = acc.id === selectedBankId;
          return (
            <button
              key={acc.id}
              onClick={() => setSelectedBankId(acc.id)}
              className={`text-left rounded-xl p-4 border transition-all ${
                isSelected
                  ? "bg-[#0077C5] text-white border-[#0077C5] shadow-md"
                  : "bg-white text-slate-900 border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold truncate">{acc.name}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                    isSelected
                      ? "bg-white/20 text-white"
                      : "bg-amber-100 text-amber-900"
                  }`}
                >
                  {acc.forReviewCount} to review
                </span>
              </div>

              <div className="mt-4 flex items-baseline justify-between">
                <div>
                  <span
                    className={`block text-[10px] uppercase ${
                      isSelected ? "text-sky-100" : "text-slate-400"
                    }`}
                  >
                    Bank Balance
                  </span>
                  <span className="text-lg font-mono font-bold">
                    {formatCents(acc.bankBalanceCents ?? acc.balanceCents)}
                  </span>
                </div>
                <div className="text-right">
                  <span
                    className={`block text-[10px] uppercase ${
                      isSelected ? "text-sky-100" : "text-slate-400"
                    }`}
                  >
                    In Pro E Books
                  </span>
                  <span className="text-sm font-mono font-semibold">
                    {formatCents(acc.balanceCents)}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Sub-Tabs */}
      <div className="rounded-xl bg-white border border-slate-200 shadow-2xs overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 bg-[#F4F5F8]">
          <div className="flex gap-6">
            {(
              [
                {
                  id: "for_review",
                  label: `For review (${
                    state.bankTransactions.filter(
                      (t) =>
                        t.bankAccountId === selectedBankId &&
                        t.status === "for_review"
                    ).length
                  })`,
                },
                {
                  id: "categorized",
                  label: `Categorized (${
                    state.bankTransactions.filter(
                      (t) =>
                        t.bankAccountId === selectedBankId &&
                        t.status === "categorized"
                    ).length
                  })`,
                },
                {
                  id: "excluded",
                  label: `Excluded (${
                    state.bankTransactions.filter(
                      (t) =>
                        t.bankAccountId === selectedBankId &&
                        t.status === "excluded"
                    ).length
                  })`,
                },
                {
                  id: "rules",
                  label: `Auto-Categorization Rules (${state.rules.length})`,
                },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSubTab(tab.id)}
                className={`py-3.5 text-xs font-bold border-b-2 transition-colors ${
                  subTab === tab.id
                    ? "border-[#2CA01C] text-[#2CA01C]"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {subTab === "rules" ? (
          <div className="p-5 space-y-5">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!ruleName.trim() || !ruleContains.trim()) return;
                await runAction(
                  "create_rule",
                  {
                    name: ruleName,
                    containsText: ruleContains,
                    direction: ruleDirection,
                    targetAccountId: ruleTargetAcc,
                  },
                  `Created rule "${ruleName}" and applied to pending transactions`
                );
                setRuleName("");
                setRuleContains("");
              }}
              className="grid grid-cols-1 sm:grid-cols-5 gap-3 rounded-lg bg-slate-50 p-4 border border-slate-200"
            >
              <input
                type="text"
                value={ruleName}
                onChange={(e) => setRuleName(e.target.value)}
                placeholder="Rule Name (e.g. Starbucks Meals)"
                required
                className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs"
              />
              <input
                type="text"
                value={ruleContains}
                onChange={(e) => setRuleContains(e.target.value)}
                placeholder="Description contains (e.g. STARBUCKS)"
                required
                className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-mono"
              />
              <select
                value={ruleDirection}
                onChange={(e) =>
                  setRuleDirection(e.target.value as "out" | "in" | "any")
                }
                className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
              >
                <option value="out">Money Out (Spent)</option>
                <option value="in">Money In (Received)</option>
                <option value="any">Any Direction</option>
              </select>
              <select
                value={ruleTargetAcc}
                onChange={(e) => setRuleTargetAcc(e.target.value)}
                className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
              >
                {nonBankAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.code} — {a.name}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="rounded-full bg-[#2CA01C] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#248217]"
              >
                + Add Rule
              </button>
            </form>

            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase">
                  <tr>
                    <th className="px-4 py-2.5">Rule Name</th>
                    <th className="px-4 py-2.5">Condition</th>
                    <th className="px-4 py-2.5">Assign to Account</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {state.rules.map((r) => {
                    const target = state.accounts.find(
                      (a) => a.id === r.targetAccountId
                    );
                    return (
                      <tr key={r.id}>
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {r.name}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          Description contains{" "}
                          <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-slate-800">
                            {r.containsText}
                          </code>{" "}
                          ({r.direction})
                        </td>
                        <td className="px-4 py-3 font-medium text-[#2CA01C]">
                          {target
                            ? `${target.code} — ${target.name}`
                            : r.targetAccountId}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs min-w-[550px]">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Bank Description</th>
                  <th className="px-4 py-3">Payee / Vendor</th>
                  <th className="px-4 py-3">Category / Match Account</th>
                  <th className="px-4 py-3 text-right">Spent</th>
                  <th className="px-4 py-3 text-right">Received</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTxs.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-12 text-center text-slate-500"
                    >
                      No transactions in this tab. Click{" "}
                      <button
                        onClick={() => setActiveModal("csv_import")}
                        className="font-semibold text-[#2CA01C] underline"
                      >
                        Upload from file (.CSV)
                      </button>{" "}
                      to import more bank statement rows.
                    </td>
                  </tr>
                ) : (
                  filteredTxs.map((tx) => {
                    const chosenCatId =
                      selectedCategoryByTx[tx.id] ??
                      tx.suggestedAccountId ??
                      nonBankAccounts[0]?.id ??
                      "acc-5010";
                    const chosenPayee = payeeByTx[tx.id] ?? tx.payee ?? "";
                    const isDeposit = tx.amountCents >= 0;
                    const exactInvoiceMatch = isDeposit
                      ? openInvoices.find(
                          (inv) => inv.balanceDueCents === tx.amountCents
                        )
                      : undefined;
                    const exactBillMatch = !isDeposit
                      ? openBills.find(
                          (b) => b.amountCents === Math.abs(tx.amountCents)
                        )
                      : undefined;

                    const canMatch = isDeposit
                      ? openInvoices.length > 0
                      : openBills.length > 0;
                    const defaultMode: "categorize" | "match" =
                      (exactInvoiceMatch || exactBillMatch) && canMatch
                        ? "match"
                        : "categorize";
                    const currentMode =
                      actionModeByTx[tx.id] ?? defaultMode;

                    const chosenMatchId =
                      matchTargetByTx[tx.id] ??
                      (isDeposit
                        ? exactInvoiceMatch?.id ?? openInvoices[0]?.id ?? ""
                        : exactBillMatch?.id ?? openBills[0]?.id ?? "");

                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/90">
                        <td className="px-4 py-3 font-mono text-slate-600 whitespace-nowrap">
                          {tx.date}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-slate-900 block">
                            {tx.description}
                          </span>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            {tx.matchedRuleName && (
                              <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                                RULE: {tx.matchedRuleName}
                              </span>
                            )}
                            {(exactInvoiceMatch || exactBillMatch) &&
                              subTab === "for_review" && (
                                <span className="inline-flex items-center gap-1 rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold text-[#0077C5]">
                                  EXACT{" "}
                                  {exactInvoiceMatch
                                    ? `INVOICE #${exactInvoiceMatch.invoiceNumber}`
                                    : `BILL ${exactBillMatch?.refNumber}`}{" "}
                                  MATCH
                                </span>
                              )}
                            {tx.aiConfidence !== undefined && (
                              <span className="inline-flex items-center gap-1 rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold text-indigo-800">
                                AI {tx.aiConfidence}% Confidence
                              </span>
                            )}
                          </div>
                          {tx.aiReasoning && subTab === "for_review" && (
                            <p className="mt-1 text-[11px] text-slate-500 max-w-md">
                              <span className="font-semibold text-indigo-700">
                                AI Reasoning:
                              </span>{" "}
                              {tx.aiReasoning}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {subTab === "for_review" ? (
                            <input
                              type="text"
                              value={chosenPayee}
                              onChange={(e) =>
                                setPayeeByTx({
                                  ...payeeByTx,
                                  [tx.id]: e.target.value,
                                })
                              }
                              placeholder="Add payee..."
                              className="w-36 rounded border border-slate-300 bg-white px-2 py-1 text-xs"
                            />
                          ) : (
                            <span className="text-slate-700">
                              {tx.payee || "—"}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {subTab === "for_review" ? (
                            <div className="space-y-1.5">
                              {canMatch && (
                                <div className="inline-flex rounded border border-slate-200 bg-slate-100 p-0.5 text-[10px] font-bold">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setActionModeByTx({
                                        ...actionModeByTx,
                                        [tx.id]: "categorize",
                                      })
                                    }
                                    className={`rounded px-2 py-0.5 ${
                                      currentMode === "categorize"
                                        ? "bg-white text-slate-900 shadow-2xs"
                                        : "text-slate-500 hover:text-slate-800"
                                    }`}
                                  >
                                    Categorize
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setActionModeByTx({
                                        ...actionModeByTx,
                                        [tx.id]: "match",
                                      })
                                    }
                                    className={`rounded px-2 py-0.5 ${
                                      currentMode === "match"
                                        ? "bg-[#0077C5] text-white shadow-2xs"
                                        : "text-slate-500 hover:text-slate-800"
                                    }`}
                                  >
                                    Match {isDeposit ? "Invoice" : "Bill"}
                                  </button>
                                </div>
                              )}

                              {currentMode === "match" && canMatch ? (
                                <select
                                  value={chosenMatchId}
                                  onChange={(e) =>
                                    setMatchTargetByTx({
                                      ...matchTargetByTx,
                                      [tx.id]: e.target.value,
                                    })
                                  }
                                  className="w-60 rounded border border-[#0077C5] bg-sky-50/40 px-2 py-1 text-xs font-semibold text-slate-900"
                                >
                                  {isDeposit
                                    ? openInvoices.map((inv) => (
                                        <option key={inv.id} value={inv.id}>
                                          Inv #{inv.invoiceNumber} ·{" "}
                                          {inv.customerName} (Open:{" "}
                                          {formatCents(inv.balanceDueCents)})
                                        </option>
                                      ))
                                    : openBills.map((b) => (
                                        <option key={b.id} value={b.id}>
                                          Bill {b.refNumber} · {b.vendorName} (
                                          {formatCents(b.amountCents)})
                                        </option>
                                      ))}
                                </select>
                              ) : (
                                <select
                                  value={chosenCatId}
                                  onChange={(e) =>
                                    setSelectedCategoryByTx({
                                      ...selectedCategoryByTx,
                                      [tx.id]: e.target.value,
                                    })
                                  }
                                  className="w-60 rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-800"
                                >
                                  {nonBankAccounts.map((acc) => (
                                    <option key={acc.id} value={acc.id}>
                                      {acc.code} — {acc.name} ({acc.type})
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>
                          ) : (
                            <span className="font-medium text-slate-700">
                              {tx.matchedInvoiceId
                                ? `Matched to Invoice`
                                : tx.matchedBillId
                                ? `Matched to Bill`
                                : state.accounts.find(
                                    (a) => a.id === tx.suggestedAccountId
                                  )?.name}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold text-slate-900">
                          {tx.amountCents < 0
                            ? formatCents(Math.abs(tx.amountCents))
                            : ""}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold text-[#2CA01C]">
                          {tx.amountCents >= 0
                            ? formatCents(tx.amountCents)
                            : ""}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          {subTab === "for_review" ? (
                            <div className="inline-flex items-center gap-2">
                              {currentMode === "match" &&
                              canMatch &&
                              chosenMatchId ? (
                                <button
                                  onClick={() =>
                                    runAction(
                                      "match_bank_tx",
                                      {
                                        transactionId: tx.id,
                                        matchType: isDeposit
                                          ? "invoice"
                                          : "bill",
                                        targetId: chosenMatchId,
                                      },
                                      `Matched ${tx.description} to ${
                                        isDeposit ? "Open Invoice" : "Open Bill"
                                      } without double-counting!`
                                    )
                                  }
                                  disabled={isSubmitting}
                                  className="rounded-full bg-[#0077C5] px-3.5 py-1 text-xs font-bold text-white hover:bg-[#005fa0]"
                                >
                                  Match
                                </button>
                              ) : (
                                <button
                                  onClick={() =>
                                    runAction(
                                      "categorize_bank_tx",
                                      {
                                        transactionId: tx.id,
                                        categoryAccountId: chosenCatId,
                                        payee: chosenPayee,
                                      },
                                      `Posted ${tx.description} to General Ledger`
                                    )
                                  }
                                  disabled={isSubmitting}
                                  className="rounded-full bg-[#2CA01C] px-3.5 py-1 text-xs font-bold text-white hover:bg-[#248217]"
                                >
                                  Add
                                </button>
                              )}
                              <button
                                onClick={() =>
                                  runAction(
                                    "exclude_bank_tx",
                                    { transactionId: tx.id },
                                    "Excluded transaction from review"
                                  )
                                }
                                className="text-xs text-slate-400 hover:text-slate-700"
                              >
                                Exclude
                              </button>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                              <Check className="h-3.5 w-3.5" />{" "}
                              {tx.matchedInvoiceId || tx.matchedBillId
                                ? "Matched"
                                : "Added"}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// 3. SALES, INVOICES, ESTIMATES, CUSTOMERS & PRODUCTS/SERVICES VIEW
// ============================================================================

export function SalesAndInvoicesView({
  state,
  setActiveModal,
  runAction,
}: ViewProps) {
  const [subTab, setSubTab] = useState<
    "invoices" | "estimates" | "customers" | "products"
  >("invoices");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Sales, Invoices, Estimates &amp; Catalog
          </h1>
          <p className="text-xs text-slate-500">
            Create estimates, convert quotes to invoices, receive payments, and manage Products &amp; Services
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setActiveModal("customer")}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Plus className="h-3.5 w-3.5 text-[#2CA01C]" />
            + New Customer
          </button>
          <button
            onClick={() => setActiveModal("product_service")}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Package className="h-3.5 w-3.5 text-[#2CA01C]" />
            + Product / Service
          </button>
          <button
            onClick={() => setActiveModal("estimate")}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <ClipboardList className="h-3.5 w-3.5 text-[#2CA01C]" />
            + New Estimate
          </button>
          <button
            onClick={() => setActiveModal("invoice")}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#2CA01C] px-5 py-2 text-xs font-semibold text-white hover:bg-[#248217]"
          >
            <Plus className="h-3.5 w-3.5" />
            Create Invoice
          </button>
        </div>
      </div>

      {/* QuickBooks Money Bar */}
      <div className="rounded-xl bg-white p-5 border border-slate-200 shadow-2xs">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 mb-3">
          <div>
            <span className="text-xs font-bold uppercase text-indigo-600">
              {state.estimates.filter((e) => e.status !== "Converted").length}{" "}
              Open Estimates
            </span>
            <p className="text-2xl font-mono font-bold text-slate-900 mt-0.5">
              {formatCents(state.kpis.openEstimatesCents)}
            </p>
          </div>
          <div>
            <span className="text-xs font-bold uppercase text-amber-600">
              {state.invoices.filter((i) => i.status === "Overdue").length}{" "}
              Overdue Invoices
            </span>
            <p className="text-2xl font-mono font-bold text-slate-900 mt-0.5">
              {formatCents(state.kpis.overdueInvoicesCents)}
            </p>
          </div>
          <div>
            <span className="text-xs font-bold uppercase text-sky-600">
              {state.invoices.filter((i) => i.status !== "Paid").length} Open
              Invoices (A/R)
            </span>
            <p className="text-2xl font-mono font-bold text-slate-900 mt-0.5">
              {formatCents(state.kpis.openInvoicesCents)}
            </p>
          </div>
          <div>
            <span className="text-xs font-bold uppercase text-[#2CA01C]">
              {state.invoices.filter((i) => i.status === "Paid").length} Paid
              Last 30 Days
            </span>
            <p className="text-2xl font-mono font-bold text-[#2CA01C] mt-0.5">
              {formatCents(state.kpis.paidLast30DaysCents)}
            </p>
          </div>
        </div>
        <div className="h-3 w-full rounded-full bg-slate-100 flex overflow-hidden">
          <div className="bg-indigo-500 h-full w-1/4" />
          <div className="bg-amber-500 h-full w-1/6" />
          <div className="bg-sky-500 h-full w-1/4" />
          <div className="bg-[#2CA01C] h-full flex-1" />
        </div>
      </div>

      {/* Table Card */}
      <div className="rounded-xl bg-white border border-slate-200 shadow-2xs overflow-hidden">
        <div className="flex gap-6 px-5 border-b border-slate-200 bg-[#F4F5F8]">
          <button
            onClick={() => setSubTab("invoices")}
            className={`py-3 text-xs font-bold border-b-2 ${
              subTab === "invoices"
                ? "border-[#2CA01C] text-[#2CA01C]"
                : "border-transparent text-slate-600"
            }`}
          >
            Invoices ({state.invoices.length})
          </button>
          <button
            onClick={() => setSubTab("estimates")}
            className={`py-3 text-xs font-bold border-b-2 ${
              subTab === "estimates"
                ? "border-[#2CA01C] text-[#2CA01C]"
                : "border-transparent text-slate-600"
            }`}
          >
            Estimates / Quotes ({state.estimates.length})
          </button>
          <button
            onClick={() => setSubTab("customers")}
            className={`py-3 text-xs font-bold border-b-2 ${
              subTab === "customers"
                ? "border-[#2CA01C] text-[#2CA01C]"
                : "border-transparent text-slate-600"
            }`}
          >
            Customers ({state.customers.length})
          </button>
          <button
            onClick={() => setSubTab("products")}
            className={`py-3 text-xs font-bold border-b-2 ${
              subTab === "products"
                ? "border-[#2CA01C] text-[#2CA01C]"
                : "border-transparent text-slate-600"
            }`}
          >
            Products &amp; Services ({state.productsAndServices.length})
          </button>
        </div>

        {subTab === "invoices" && (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs min-w-[650px]">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">No.</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Due Date</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-right">Open Balance</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {state.invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-slate-600">
                    {inv.date}
                  </td>
                  <td className="px-4 py-3 font-mono font-bold text-slate-900">
                    #{inv.invoiceNumber}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {inv.customerName}
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-600">
                    {inv.dueDate}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-semibold">
                    <div>{formatCents(inv.totalCents)}</div>
                    {(inv.taxCents ?? 0) > 0 && (
                      <span className="block text-[10px] font-normal text-slate-400">
                        incl. {formatCents(inv.taxCents ?? 0)} tax
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                    {formatCents(inv.balanceDueCents)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                        inv.status === "Paid"
                          ? "bg-emerald-100 text-emerald-800"
                          : inv.status === "Overdue"
                          ? "bg-amber-100 text-amber-900"
                          : "bg-sky-100 text-sky-900"
                      }`}
                    >
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {inv.status !== "Paid" ? (
                      <button
                        onClick={() =>
                          runAction(
                            "receive_invoice_payment",
                            {
                              invoiceId: inv.id,
                              depositAccountId: "acc-1000",
                              date: new Date().toISOString().slice(0, 10),
                            },
                            `Recorded payment for Invoice #${inv.invoiceNumber}`
                          )
                        }
                        className="font-bold text-[#0077C5] hover:underline"
                      >
                        Receive payment
                      </button>
                    ) : (
                      <span className="text-slate-400">Deposited</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}

        {subTab === "estimates" && (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs min-w-[600px]">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Estimate #</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Expires</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {state.estimates.map((est) => (
                <tr key={est.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-slate-600">
                    {est.date}
                  </td>
                  <td className="px-4 py-3 font-mono font-bold text-slate-900">
                    {est.estimateNumber}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {est.customerName}
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-600">
                    {est.expirationDate}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                    {formatCents(est.totalCents)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                        est.status === "Converted"
                          ? "bg-emerald-100 text-emerald-800"
                          : est.status === "Accepted"
                          ? "bg-indigo-100 text-indigo-800"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {est.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {est.status !== "Converted" ? (
                      <button
                        onClick={() =>
                          runAction(
                            "convert_estimate",
                            { estimateId: est.id },
                            `Converted ${est.estimateNumber} to Invoice and posted to A/R!`
                          )
                        }
                        className="rounded-full bg-[#2CA01C] px-3 py-1 text-xs font-bold text-white hover:bg-[#248217]"
                      >
                        Convert to Invoice
                      </button>
                    ) : (
                      <span className="text-emerald-700 font-semibold">
                        ✓ Invoiced
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}

        {subTab === "customers" && (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs min-w-[650px]">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3">Customer / Company</th>
                <th className="px-4 py-3">Tax ID</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Billing Address</th>
                <th className="px-4 py-3 text-right">Open Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {state.customers.map((c) => {
                const openBal = state.invoices
                  .filter((i) => i.customerId === c.id)
                  .reduce((s, i) => s + i.balanceDueCents, 0);
                const contactPerson = [c.firstName, c.lastName].filter(Boolean).join(" ");
                const addrStr = formatPostalAddress(c.address);
                return (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{c.name}</div>
                      {contactPerson && contactPerson !== c.name && (
                        <div className="text-[11px] text-slate-500">Contact: {contactPerson}</div>
                      )}
                      {c.company && c.company !== c.name && (
                        <div className="text-[11px] text-slate-400">{c.company}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-600">
                      {c.taxId ? (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-700">
                          {c.taxId}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-slate-700">{c.email || "—"}</div>
                      <div className="font-mono text-[11px] text-slate-500">{c.phone || ""}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-xs truncate" title={addrStr}>
                      {addrStr || <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                      {formatCents(openBal)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}

        {subTab === "products" && (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs min-w-[600px]">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Sales Description</th>
                <th className="px-4 py-3">Income Account</th>
                <th className="px-4 py-3 text-right">Sales Price / Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {state.productsAndServices.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono font-semibold text-slate-600">
                    {p.sku}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {p.name}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{p.type}</td>
                  <td className="px-4 py-3 text-slate-500">{p.description}</td>
                  <td className="px-4 py-3 text-emerald-700 font-medium">
                    {p.incomeAccountName}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                    {formatCents(p.rateCents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// 4. EXPENSES, BILLS & VENDORS VIEW
// ============================================================================

export function ExpensesAndVendorsView({
  state,
  setActiveModal,
  runAction,
}: ViewProps) {
  const [subTab, setSubTab] = useState<"expenses" | "vendors">("expenses");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Expenses, Bills &amp; Vendors
          </h1>
          <p className="text-xs text-slate-500">
            Record cash/card expenses, track vendor bills in Accounts Payable, and pay bills
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setActiveModal("vendor")}
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            + New Vendor
          </button>
          <button
            onClick={() => setActiveModal("bill")}
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            + Enter Vendor Bill
          </button>
          <button
            onClick={() => setActiveModal("expense")}
            className="rounded-full bg-[#2CA01C] px-5 py-2 text-xs font-semibold text-white hover:bg-[#248217]"
          >
            + New Expense
          </button>
        </div>
      </div>

      <div className="rounded-xl bg-white border border-slate-200 shadow-2xs overflow-hidden">
        <div className="flex gap-6 px-5 border-b border-slate-200 bg-[#F4F5F8]">
          <button
            onClick={() => setSubTab("expenses")}
            className={`py-3 text-xs font-bold border-b-2 ${
              subTab === "expenses"
                ? "border-[#2CA01C] text-[#2CA01C]"
                : "border-transparent text-slate-600"
            }`}
          >
            Expenses &amp; Bills ({state.expenses.length})
          </button>
          <button
            onClick={() => setSubTab("vendors")}
            className={`py-3 text-xs font-bold border-b-2 ${
              subTab === "vendors"
                ? "border-[#2CA01C] text-[#2CA01C]"
                : "border-transparent text-slate-600"
            }`}
          >
            Vendors ({state.vendors.length})
          </button>
        </div>

        {subTab === "expenses" ? (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs min-w-[650px]">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Ref No.</th>
                <th className="px-4 py-3">Payee / Vendor</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Memo</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {state.expenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-slate-600">
                    {exp.date}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-800">
                    {exp.type}
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-600">
                    {exp.refNumber}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {exp.vendorName}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {exp.categoryAccountName}
                  </td>
                  <td className="px-4 py-3 text-slate-500 max-w-xs truncate">
                    {exp.description}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                    {formatCents(exp.amountCents)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                        exp.status === "Paid"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-900"
                      }`}
                    >
                      {exp.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {exp.type === "Bill" && exp.status !== "Paid" ? (
                      <button
                        onClick={() =>
                          runAction(
                            "pay_bill",
                            {
                              expenseId: exp.id,
                              bankAccountId: "acc-1000",
                              date: new Date().toISOString().slice(0, 10),
                            },
                            `Paid Bill ${exp.refNumber} (${exp.vendorName}) from Checking`
                          )
                        }
                        className="font-bold text-[#0077C5] hover:underline"
                      >
                        Pay bill
                      </button>
                    ) : (
                      <span className="text-slate-400">Closed</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs min-w-[650px]">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3">Vendor / Company</th>
                <th className="px-4 py-3">Tax ID / 1099</th>
                <th className="px-4 py-3">Default Category</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Address</th>
                <th className="px-4 py-3 text-right">Open Bill Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {state.vendors.map((v) => {
                const openAp = state.expenses
                  .filter(
                    (e) =>
                      e.vendorId === v.id &&
                      e.type === "Bill" &&
                      e.status !== "Paid"
                  )
                  .reduce((s, e) => s + e.amountCents, 0);
                const contactPerson = [v.firstName, v.lastName].filter(Boolean).join(" ");
                const addrStr = formatPostalAddress(v.address);
                const defAccount = v.defaultExpenseAccountId
                  ? state.accounts.find((a) => a.id === v.defaultExpenseAccountId)
                  : undefined;

                return (
                  <tr key={v.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{v.name}</div>
                      {contactPerson && contactPerson !== v.name && (
                        <div className="text-[11px] text-slate-500">Contact: {contactPerson}</div>
                      )}
                      {v.company && v.company !== v.name && (
                        <div className="text-[11px] text-slate-400">{v.company}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-600">
                      {v.taxId ? (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-700">
                          {v.taxId}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {defAccount ? (
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                          {defAccount.code} · {defAccount.name}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Optional (Select per bill)</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-slate-700">{v.email || "—"}</div>
                      <div className="font-mono text-[11px] text-slate-500">{v.phone || ""}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-xs truncate" title={addrStr}>
                      {addrStr || <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                      {formatCents(openAp)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// 5. CHART OF ACCOUNTS VIEW
// ============================================================================

export function ChartOfAccountsView({
  state,
  setActiveModal,
  setActiveTab,
}: ViewProps) {
  const [search, setSearch] = useState("");

  const filtered = state.accountsWithBalances.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.code.includes(search) ||
      a.type.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Chart of Accounts ({state.accounts.length})
          </h1>
          <p className="text-xs text-slate-500">
            Complete multi-category chart of accounts with real-time QuickBooks balances
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by name, code or type..."
              className="rounded-full border border-slate-300 bg-white pl-8 pr-4 py-1.5 text-xs focus:border-[#2CA01C] focus:outline-none"
            />
          </div>
          <button
            onClick={() => setActiveModal("account")}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#2CA01C] px-5 py-2 text-xs font-semibold text-white hover:bg-[#248217]"
          >
            <Plus className="h-3.5 w-3.5" />
            New Account
          </button>
        </div>
      </div>

      <div className="rounded-xl bg-white border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs min-w-[700px]">
          <thead className="bg-[#F4F5F8] border-b border-slate-200 text-slate-600 uppercase">
            <tr>
              <th className="px-4 py-3 w-20">Code</th>
              <th className="px-4 py-3">Account Name</th>
              <th className="px-4 py-3">Account Type</th>
              <th className="px-4 py-3">Detail Type</th>
              <th className="px-4 py-3 text-right">Pro E Books Balance</th>
              <th className="px-4 py-3 text-right">Bank Balance</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((acc) => (
              <tr key={acc.id} className="hover:bg-slate-50">
                <td className="px-4 py-2.5 font-mono font-bold text-slate-700">
                  {acc.code}
                </td>
                <td className="px-4 py-2.5 font-semibold text-slate-900">
                  {acc.name}
                </td>
                <td className="px-4 py-2.5 text-slate-700">{acc.type}</td>
                <td className="px-4 py-2.5 text-slate-500">{acc.detailType}</td>
                <td className="px-4 py-2.5 text-right font-mono font-bold text-slate-900">
                  {formatCents(acc.balanceCents)}
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-slate-600">
                  {acc.bankBalanceCents !== undefined
                    ? formatCents(acc.bankBalanceCents)
                    : "—"}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <button
                    onClick={() => setActiveTab("reports")}
                    className="font-semibold text-[#0077C5] hover:underline"
                  >
                    Run report
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 6. MANUAL JOURNAL ENTRIES & IMMUTABLE AUDIT LEDGER VIEW
// ============================================================================

export function JournalEntriesView({
  state,
  setActiveModal,
  runAction,
  isSubmitting,
}: ViewProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            General Journal Entries ({state.journalEntries.length})
          </h1>
          <p className="text-xs text-slate-500">
            Posted entries are immutable. Corrections create reversing entries that swap debits and credits.
          </p>
        </div>
        <button
          onClick={() => setActiveModal("journal_entry")}
          className="inline-flex items-center gap-1.5 rounded-full bg-[#2CA01C] px-5 py-2 text-xs font-semibold text-white hover:bg-[#248217]"
        >
          <Plus className="h-3.5 w-3.5" />
          New Journal Entry
        </button>
      </div>

      <div className="space-y-4">
        {state.journalEntries.map((je) => {
          const totalDebits = je.lines.reduce((s, l) => s + l.debitCents, 0);
          const totalCredits = je.lines.reduce((s, l) => s + l.creditCents, 0);
          return (
            <div
              key={je.id}
              className="rounded-xl bg-white border border-slate-200 shadow-2xs overflow-hidden"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 bg-[#F4F5F8] border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-bold text-slate-900">
                    {je.entryNumber}
                  </span>
                  <span className="font-mono text-xs text-slate-600">
                    {je.date}
                  </span>
                  <span className="rounded bg-white border border-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-700">
                    {je.sourceType.replace("_", " ")}
                  </span>
                  {je.reversedByEntryId && (
                    <span className="rounded bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
                      REVERSED
                    </span>
                  )}
                  <span className="text-xs font-medium text-slate-700">
                    {je.memo}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-bold text-[#2CA01C]">
                    Balanced: {formatCents(totalDebits)}
                  </span>
                  {!je.reversedByEntryId && je.sourceType !== "reversal" && (
                    <button
                      onClick={() =>
                        runAction(
                          "reverse_journal_entry",
                          { entryId: je.id },
                          `Created reversing journal entry for ${je.entryNumber}`
                        )
                      }
                      disabled={isSubmitting}
                      className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Reverse Entry
                    </button>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto w-full">
                <table className="w-full text-left text-xs min-w-[500px]">
                <thead className="bg-slate-50/60 text-slate-400 uppercase border-b border-slate-100">
                  <tr>
                    <th className="px-5 py-2">Account</th>
                    <th className="px-5 py-2">Description</th>
                    <th className="px-5 py-2">Name</th>
                    <th className="px-5 py-2 text-right w-32">Debit</th>
                    <th className="px-5 py-2 text-right w-32">Credit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {je.lines.map((line) => (
                    <tr key={line.id}>
                      <td className="px-5 py-2 font-medium text-slate-900">
                        <span className="font-mono text-slate-500 mr-1.5">
                          {line.accountCode}
                        </span>
                        {line.accountName}
                      </td>
                      <td className="px-5 py-2 text-slate-600">
                        {line.description}
                      </td>
                      <td className="px-5 py-2 text-slate-500">
                        {line.entityName || "—"}
                      </td>
                      <td className="px-5 py-2 text-right font-mono font-semibold text-slate-900">
                        {line.debitCents > 0
                          ? formatCents(line.debitCents)
                          : ""}
                      </td>
                      <td className="px-5 py-2 text-right font-mono font-semibold text-slate-900">
                        {line.creditCents > 0
                          ? formatCents(line.creditCents)
                          : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50/80 border-t border-slate-200 font-mono font-bold text-xs">
                  <tr>
                    <td
                      colSpan={3}
                      className="px-5 py-2 text-right text-slate-500"
                    >
                      TOTAL
                    </td>
                    <td className="px-5 py-2 text-right text-slate-900">
                      {formatCents(totalDebits)}
                    </td>
                    <td className="px-5 py-2 text-right text-slate-900">
                      {formatCents(totalCredits)}
                    </td>
                  </tr>
                </tfoot>
              </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// 7. REPORTS CENTER (P&L, Balance Sheet, Trial Balance, A/R & A/P Aging, GL)
// ============================================================================

export function ReportsCenterView({ state }: ViewProps) {
  const [reportTab, setReportTab] = useState<
    "pnl" | "bs" | "tb" | "ar_aging" | "ap_aging" | "gl"
  >("pnl");
  const [basis, setBasis] = useState<"Accrual" | "Cash">("Accrual");
  const [datePreset, setDatePreset] = useState<
    "all" | "oct_2026" | "sep_2026" | "q3_2026" | "q4_2026" | "ytd_2026" | "custom"
  >("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Enhanced Filter Options
  const [entityFilter, setEntityFilter] = useState("");
  const [accountFilter, setAccountFilter] = useState("");
  const [hideZeroRows, setHideZeroRows] = useState(false);

  // Period Comparison Options
  const [compareMode, setCompareMode] = useState<
    "none" | "previous_period" | "previous_year" | "custom"
  >("none");
  const [compareStartDate, setCompareStartDate] = useState("");
  const [compareEndDate, setCompareEndDate] = useState("");

  function applyPreset(
    preset: "all" | "oct_2026" | "sep_2026" | "q3_2026" | "q4_2026" | "ytd_2026" | "custom"
  ) {
    setDatePreset(preset);
    if (preset === "all") {
      setStartDate("");
      setEndDate("");
    } else if (preset === "oct_2026") {
      setStartDate("2026-10-01");
      setEndDate("2026-10-31");
    } else if (preset === "sep_2026") {
      setStartDate("2026-09-01");
      setEndDate("2026-09-30");
    } else if (preset === "q3_2026") {
      setStartDate("2026-07-01");
      setEndDate("2026-09-30");
    } else if (preset === "q4_2026") {
      setStartDate("2026-10-01");
      setEndDate("2026-12-31");
    } else if (preset === "ytd_2026") {
      setStartDate("2026-01-01");
      setEndDate("2026-10-31");
    }
  }

  // Active comparison range calculation
  const effectiveCompareRange =
    compareMode === "previous_period"
      ? computeComparisonRange(startDate, endDate, "previous_period")
      : compareMode === "previous_year"
      ? computeComparisonRange(startDate, endDate, "previous_year")
      : compareMode === "custom"
      ? { startDate: compareStartDate || undefined, endDate: compareEndDate || undefined }
      : null;

  const isComparing =
    compareMode !== "none" &&
    (reportTab === "pnl" || reportTab === "bs" || reportTab === "tb");

  const computedReports = computeReportsForFilter(state, {
    basis: basis === "Cash" ? "cash" : "accrual",
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    entityName: entityFilter.trim() || undefined,
    accountId: accountFilter || undefined,
  });

  const comparisonReports =
    isComparing && effectiveCompareRange
      ? computeReportsForFilter(state, {
          basis: basis === "Cash" ? "cash" : "accrual",
          startDate: effectiveCompareRange.startDate,
          endDate: effectiveCompareRange.endDate,
          entityName: entityFilter.trim() || undefined,
          accountId: accountFilter || undefined,
        })
      : null;

  const {
    profitAndLoss,
    balanceSheet,
    trialBalance,
    arAging,
    apAging,
    generalLedger,
  } = computedReports;

  // Comparison lookup maps
  const priorIncomeMap = new Map(
    comparisonReports?.profitAndLoss.incomeLines.map((l) => [l.code, l.amountCents]) ?? []
  );
  const priorCogsMap = new Map(
    comparisonReports?.profitAndLoss.cogsLines.map((l) => [l.code, l.amountCents]) ?? []
  );
  const priorExpenseMap = new Map(
    comparisonReports?.profitAndLoss.expenseLines.map((l) => [l.code, l.amountCents]) ?? []
  );
  const priorAssetMap = new Map(
    comparisonReports?.balanceSheet.assetLines.map((l) => [l.code, l.amountCents]) ?? []
  );
  const priorLiabMap = new Map(
    comparisonReports?.balanceSheet.liabilityLines.map((l) => [l.code, l.amountCents]) ?? []
  );
  const priorEquityMap = new Map(
    comparisonReports?.balanceSheet.equityLines.map((l) => [l.code, l.amountCents]) ?? []
  );
  const priorTbMap = new Map(
    comparisonReports?.trialBalance.rows.map((r) => [r.code, r]) ?? []
  );

  function computeVariance(currentCents: number, priorCents: number) {
    const diffCents = currentCents - priorCents;
    let pctStr = "—";
    if (priorCents !== 0) {
      const pct = (diffCents / Math.abs(priorCents)) * 100;
      pctStr = `${diffCents > 0 ? "+" : ""}${pct.toFixed(1)}%`;
    } else if (currentCents !== 0) {
      pctStr = currentCents > 0 ? "+100%" : "-100%";
    }
    return { diffCents, pctStr };
  }

  function exportReportCsv() {
    let csv = "";
    if (reportTab === "pnl") {
      if (isComparing) {
        csv = "Section,Code,Name,Current ($),Prior Period ($),$ Change,% Change\n";
        const writeRow = (sec: string, code: string, name: string, cur: number, prior: number) => {
          const { diffCents, pctStr } = computeVariance(cur, prior);
          csv += `"${sec}","${code}","${name}",${(cur / 100).toFixed(2)},${(prior / 100).toFixed(2)},${(diffCents / 100).toFixed(2)},"${pctStr}"\n`;
        };
        for (const l of profitAndLoss.incomeLines) {
          writeRow("Income", l.code, l.name, l.amountCents, priorIncomeMap.get(l.code) ?? 0);
        }
        writeRow("Total Income", "", "Total Income", profitAndLoss.totalIncomeCents, comparisonReports?.profitAndLoss.totalIncomeCents ?? 0);
        for (const l of profitAndLoss.cogsLines) {
          writeRow("COGS", l.code, l.name, l.amountCents, priorCogsMap.get(l.code) ?? 0);
        }
        writeRow("Total COGS", "", "Total Cost of Goods Sold", profitAndLoss.totalCogsCents, comparisonReports?.profitAndLoss.totalCogsCents ?? 0);
        writeRow("Gross Profit", "", "Gross Profit", profitAndLoss.grossProfitCents, comparisonReports?.profitAndLoss.grossProfitCents ?? 0);
        for (const l of profitAndLoss.expenseLines) {
          writeRow("Expenses", l.code, l.name, l.amountCents, priorExpenseMap.get(l.code) ?? 0);
        }
        writeRow("Total Expenses", "", "Total Operating Expenses", profitAndLoss.totalExpensesCents, comparisonReports?.profitAndLoss.totalExpensesCents ?? 0);
        writeRow("Net Income", "", "Net Income", profitAndLoss.netIncomeCents, comparisonReports?.profitAndLoss.netIncomeCents ?? 0);
      } else {
        csv = "Section,Code,Name,Amount\n";
        for (const l of profitAndLoss.incomeLines) {
          csv += `Income,${l.code},"${l.name}",${(l.amountCents / 100).toFixed(2)}\n`;
        }
        for (const l of profitAndLoss.cogsLines) {
          csv += `COGS,${l.code},"${l.name}",${(l.amountCents / 100).toFixed(2)}\n`;
        }
        for (const l of profitAndLoss.expenseLines) {
          csv += `Expenses,${l.code},"${l.name}",${(l.amountCents / 100).toFixed(2)}\n`;
        }
        csv += `Net Income,,,"${(profitAndLoss.netIncomeCents / 100).toFixed(2)}"\n`;
      }
    } else if (reportTab === "tb") {
      if (isComparing) {
        csv = "Account Code,Account Name,Type,Current Debit,Current Credit,Prior Debit,Prior Credit\n";
        for (const r of trialBalance.rows) {
          const prior = priorTbMap.get(r.code);
          csv += `"${r.code}","${r.name}","${r.type}",${(r.debitBalanceCents / 100).toFixed(2)},${(r.creditBalanceCents / 100).toFixed(2)},${((prior?.debitBalanceCents ?? 0) / 100).toFixed(2)},${((prior?.creditBalanceCents ?? 0) / 100).toFixed(2)}\n`;
        }
      } else {
        csv = "Account Code,Account Name,Debit,Credit\n";
        for (const r of trialBalance.rows) {
          csv += `${r.code},"${r.name}",${(r.debitBalanceCents / 100).toFixed(2)},${(r.creditBalanceCents / 100).toFixed(2)}\n`;
        }
      }
    } else if (reportTab === "bs") {
      if (isComparing) {
        csv = "Section,Code,Name,Current ($),Prior Period ($),$ Change,% Change\n";
        const writeRow = (sec: string, code: string, name: string, cur: number, prior: number) => {
          const { diffCents, pctStr } = computeVariance(cur, prior);
          csv += `"${sec}","${code}","${name}",${(cur / 100).toFixed(2)},${(prior / 100).toFixed(2)},${(diffCents / 100).toFixed(2)},"${pctStr}"\n`;
        };
        for (const l of balanceSheet.assetLines) {
          writeRow("Assets", l.code, l.name, l.amountCents, priorAssetMap.get(l.code) ?? 0);
        }
        writeRow("Total Assets", "", "Total Assets", balanceSheet.totalAssetsCents, comparisonReports?.balanceSheet.totalAssetsCents ?? 0);
        for (const l of balanceSheet.liabilityLines) {
          writeRow("Liabilities", l.code, l.name, l.amountCents, priorLiabMap.get(l.code) ?? 0);
        }
        writeRow("Total Liabilities", "", "Total Liabilities", balanceSheet.totalLiabilitiesCents, comparisonReports?.balanceSheet.totalLiabilitiesCents ?? 0);
        for (const l of balanceSheet.equityLines) {
          writeRow("Equity", l.code, l.name, l.amountCents, priorEquityMap.get(l.code) ?? 0);
        }
        writeRow("Total Equity", "", "Total Equity", balanceSheet.totalEquityCents, comparisonReports?.balanceSheet.totalEquityCents ?? 0);
      } else {
        csv = "Section,Code,Name,Amount\n";
        for (const l of balanceSheet.assetLines) {
          csv += `Assets,${l.code},"${l.name}",${(l.amountCents / 100).toFixed(2)}\n`;
        }
        for (const l of balanceSheet.liabilityLines) {
          csv += `Liabilities,${l.code},"${l.name}",${(l.amountCents / 100).toFixed(2)}\n`;
        }
        for (const l of balanceSheet.equityLines) {
          csv += `Equity,${l.code},"${l.name}",${(l.amountCents / 100).toFixed(2)}\n`;
        }
      }
    } else {
      csv = "Entity,Current,1-30 Days,31-60 Days,61+ Days,Total\n";
      for (const r of reportTab === "ar_aging" ? arAging.rows : apAging.rows) {
        csv += `"${r.entityName}",${(r.currentCents / 100).toFixed(2)},${(r.days1To30Cents / 100).toFixed(2)},${(r.days31To60Cents / 100).toFixed(2)},${(r.days61PlusCents / 100).toFixed(2)},${(r.totalCents / 100).toFixed(2)}\n`;
      }
    }

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${reportTab}-report${isComparing ? "-comparison" : ""}.csv`;
    a.click();
  }

  // All known entity names for dropdown filter
  const allEntityNames = Array.from(
    new Set([
      ...state.customers.map((c) => c.name),
      ...state.vendors.map((v) => v.name),
    ])
  ).sort();

  return (
    <div className="space-y-6">
      {/* Top Tab Bar & Primary Action */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1.5 bg-white p-1.5 rounded-xl border border-slate-200">
          {(
            [
              { id: "pnl", label: "Profit & Loss" },
              { id: "bs", label: "Balance Sheet" },
              { id: "tb", label: "Trial Balance" },
              { id: "ar_aging", label: "A/R Aging Summary" },
              { id: "ap_aging", label: "A/P Aging Summary" },
              { id: "gl", label: "General Ledger" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setReportTab(t.id)}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-colors ${
                reportTab === t.id
                  ? "bg-[#2CA01C] text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportReportCsv}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs"
          >
            <Download className="h-3.5 w-3.5 text-[#2CA01C]" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Advanced Filter & Comparison Control Toolbar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Filter Reports:
            </span>

            {/* Date Preset Selector */}
            <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50/80 px-2.5 py-1 text-xs">
              <span className="text-slate-400 font-medium">Period:</span>
              <select
                value={datePreset}
                onChange={(e) =>
                  applyPreset(
                    e.target.value as
                      | "all"
                      | "oct_2026"
                      | "sep_2026"
                      | "q3_2026"
                      | "q4_2026"
                      | "ytd_2026"
                      | "custom"
                  )
                }
                className="bg-transparent font-semibold text-slate-800 focus:outline-none"
              >
                <option value="all">All Dates</option>
                <option value="oct_2026">October 2026</option>
                <option value="sep_2026">September 2026</option>
                <option value="q3_2026">Q3 2026 (Jul - Sep)</option>
                <option value="q4_2026">Q4 2026 (Oct - Dec)</option>
                <option value="ytd_2026">Year-to-Date 2026</option>
                <option value="custom">Custom Date Range</option>
              </select>
            </div>

            {/* Start and End Date Inputs */}
            <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2 py-1 text-xs font-mono">
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setDatePreset("custom");
                  setStartDate(e.target.value);
                }}
                className="bg-transparent text-slate-700 focus:outline-none"
                title="Start Date"
              />
              <span className="text-slate-400 font-sans">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setDatePreset("custom");
                  setEndDate(e.target.value);
                }}
                className="bg-transparent text-slate-700 focus:outline-none"
                title="End Date"
              />
            </div>

            {/* Accounting Basis Toggle */}
            <div className="flex items-center gap-1 rounded-lg border border-slate-200 p-0.5 text-xs bg-slate-50">
              <span className="px-2 text-slate-400 font-medium">Basis:</span>
              <button
                onClick={() => setBasis("Accrual")}
                className={`rounded px-2.5 py-1 font-semibold transition-colors ${
                  basis === "Accrual"
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Accrual
              </button>
              <button
                onClick={() => setBasis("Cash")}
                className={`rounded px-2.5 py-1 font-semibold transition-colors ${
                  basis === "Cash"
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Cash
              </button>
            </div>
          </div>

          {/* Zero balance toggle */}
          <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={hideZeroRows}
              onChange={(e) => setHideZeroRows(e.target.checked)}
              className="rounded border-slate-300 text-[#2CA01C] focus:ring-[#2CA01C]"
            />
            Hide zero-balance rows
          </label>
        </div>

        {/* Row 2: Entity Filter, GL Account Filter & Period Comparison Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Payee / Entity Filter */}
            <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1 bg-white">
              <span className="text-slate-400 font-medium">Entity / Payee:</span>
              <select
                value={entityFilter}
                onChange={(e) => setEntityFilter(e.target.value)}
                className="bg-transparent font-semibold text-slate-800 focus:outline-none max-w-xs"
              >
                <option value="">— All Customers &amp; Vendors —</option>
                {allEntityNames.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              {entityFilter && (
                <button
                  onClick={() => setEntityFilter("")}
                  className="text-slate-400 hover:text-slate-700 ml-1 font-bold"
                  title="Clear entity filter"
                >
                  ×
                </button>
              )}
            </div>

            {/* General Ledger Account Filter */}
            {reportTab === "gl" && (
              <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1 bg-white">
                <span className="text-slate-400 font-medium">Account:</span>
                <select
                  value={accountFilter}
                  onChange={(e) => setAccountFilter(e.target.value)}
                  className="bg-transparent font-semibold text-slate-800 focus:outline-none max-w-xs"
                >
                  <option value="">— All GL Accounts —</option>
                  {state.accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.code} · {a.name} ({a.type})
                    </option>
                  ))}
                </select>
                {accountFilter && (
                  <button
                    onClick={() => setAccountFilter("")}
                    className="text-slate-400 hover:text-slate-700 ml-1 font-bold"
                    title="Clear account filter"
                  >
                    ×
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Period Comparison Controls (For P&L, BS, Trial Balance) */}
          {(reportTab === "pnl" || reportTab === "bs" || reportTab === "tb") && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg bg-emerald-50/70 border border-emerald-200 px-2.5 py-1">
              <span className="text-[#2CA01C] font-bold">Compare:</span>
              <select
                value={compareMode}
                onChange={(e) =>
                  setCompareMode(
                    e.target.value as
                      | "none"
                      | "previous_period"
                      | "previous_year"
                      | "custom"
                  )
                }
                className="bg-transparent font-bold text-slate-800 focus:outline-none"
              >
                <option value="none">No Comparison (Single Period)</option>
                <option value="previous_period">Previous Period (PP)</option>
                <option value="previous_year">Previous Year (PY)</option>
                <option value="custom">Custom Comparison Range</option>
              </select>

              {compareMode === "custom" && (
                <div className="flex items-center gap-1 border-l border-emerald-200 pl-2 font-mono">
                  <input
                    type="date"
                    value={compareStartDate}
                    onChange={(e) => setCompareStartDate(e.target.value)}
                    className="rounded border border-emerald-300 bg-white px-1.5 py-0.5 text-xs text-slate-700"
                    title="Compare Start Date"
                  />
                  <span className="text-slate-400 font-sans">to</span>
                  <input
                    type="date"
                    value={compareEndDate}
                    onChange={(e) => setCompareEndDate(e.target.value)}
                    className="rounded border border-emerald-300 bg-white px-1.5 py-0.5 text-xs text-slate-700"
                    title="Compare End Date"
                  />
                </div>
              )}

              {isComparing && effectiveCompareRange?.startDate && (
                <span className="hidden xl:inline text-[11px] font-mono text-emerald-800">
                  [{effectiveCompareRange.startDate} → {effectiveCompareRange.endDate || "Present"}]
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Report Paper Sheet */}
      <div className="rounded-xl bg-white border border-slate-200 shadow-sm p-4 sm:p-8 max-w-4xl mx-auto min-w-0 overflow-hidden">
        <div className="text-center border-b border-slate-200 pb-5 mb-6">
          <h2 className="text-lg font-bold text-slate-900">
            {state.companyName}
          </h2>
          <p className="text-sm font-semibold text-slate-700 mt-0.5">
            {reportTab === "pnl"
              ? "Profit and Loss Statement"
              : reportTab === "bs"
              ? "Balance Sheet"
              : reportTab === "tb"
              ? "Trial Balance"
              : reportTab === "ar_aging"
              ? "Accounts Receivable Aging Summary"
              : reportTab === "ap_aging"
              ? "Accounts Payable Aging Summary"
              : "General Ledger"}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            {basis} Basis ·{" "}
            {startDate || endDate
              ? `${startDate || "Inception"} through ${endDate || "Present"}`
              : "All Dates"}
            {entityFilter ? ` · Entity: "${entityFilter}"` : ""}
            {isComparing
              ? ` · Compared to ${
                  effectiveCompareRange?.startDate || "Prior"
                } through ${effectiveCompareRange?.endDate || "Prior"}`
              : ""}{" "}
            · All amounts in integer-cents USD
          </p>
        </div>

        {/* ---------------- PROFIT AND LOSS ---------------- */}
        {reportTab === "pnl" && (
          <div className="space-y-6 text-xs overflow-x-auto min-w-0">
            {isComparing && (
              <div className="grid grid-cols-12 font-bold uppercase tracking-wider text-slate-500 border-b-2 border-slate-800 pb-2">
                <span className="col-span-5">Account / Category</span>
                <span className="col-span-2 text-right">Current Period</span>
                <span className="col-span-2 text-right">Prior Period</span>
                <span className="col-span-2 text-right">$ Change</span>
                <span className="col-span-1 text-right">% Change</span>
              </div>
            )}

            {/* Income */}
            <div>
              <h3 className="font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1.5 mb-2">
                Income
              </h3>
              <div className="space-y-1.5">
                {profitAndLoss.incomeLines
                  .filter(
                    (l) =>
                      !hideZeroRows ||
                      l.amountCents !== 0 ||
                      (priorIncomeMap.get(l.code) ?? 0) !== 0
                  )
                  .map((l) => {
                    const prior = priorIncomeMap.get(l.code) ?? 0;
                    const { diffCents, pctStr } = computeVariance(l.amountCents, prior);
                    if (!isComparing) {
                      return (
                        <div key={l.id} className="flex justify-between py-1">
                          <span className="text-slate-800">
                            {l.code} · {l.name}
                          </span>
                          <span className="font-mono font-medium text-slate-900">
                            {formatCents(l.amountCents)}
                          </span>
                        </div>
                      );
                    }
                    return (
                      <div key={l.id} className="grid grid-cols-12 py-1 items-center">
                        <span className="col-span-5 text-slate-800 font-medium">
                          {l.code} · {l.name}
                        </span>
                        <span className="col-span-2 text-right font-mono font-medium text-slate-900">
                          {formatCents(l.amountCents)}
                        </span>
                        <span className="col-span-2 text-right font-mono text-slate-500">
                          {formatCents(prior)}
                        </span>
                        <span
                          className={`col-span-2 text-right font-mono font-semibold ${
                            diffCents > 0
                              ? "text-emerald-700"
                              : diffCents < 0
                              ? "text-rose-700"
                              : "text-slate-500"
                          }`}
                        >
                          {diffCents > 0 ? "+" : ""}
                          {formatCents(diffCents)}
                        </span>
                        <span className="col-span-1 text-right font-mono text-slate-600">
                          {pctStr}
                        </span>
                      </div>
                    );
                  })}
              </div>
              {/* Total Income */}
              {(() => {
                const priorTotal = comparisonReports?.profitAndLoss.totalIncomeCents ?? 0;
                const { diffCents, pctStr } = computeVariance(
                  profitAndLoss.totalIncomeCents,
                  priorTotal
                );
                return isComparing ? (
                  <div className="grid grid-cols-12 border-t border-slate-300 pt-2 mt-2 font-bold text-slate-900 items-center">
                    <span className="col-span-5">Total Income</span>
                    <span className="col-span-2 text-right font-mono">
                      {formatCents(profitAndLoss.totalIncomeCents)}
                    </span>
                    <span className="col-span-2 text-right font-mono text-slate-600">
                      {formatCents(priorTotal)}
                    </span>
                    <span
                      className={`col-span-2 text-right font-mono ${
                        diffCents >= 0 ? "text-emerald-700" : "text-rose-700"
                      }`}
                    >
                      {diffCents > 0 ? "+" : ""}
                      {formatCents(diffCents)}
                    </span>
                    <span className="col-span-1 text-right font-mono">{pctStr}</span>
                  </div>
                ) : (
                  <div className="flex justify-between border-t border-slate-300 pt-2 mt-2 font-bold text-slate-900">
                    <span>Total Income</span>
                    <span className="font-mono">
                      {formatCents(profitAndLoss.totalIncomeCents)}
                    </span>
                  </div>
                );
              })()}
            </div>

            {/* COGS */}
            <div>
              <h3 className="font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1.5 mb-2">
                Cost of Goods Sold
              </h3>
              <div className="space-y-1.5">
                {profitAndLoss.cogsLines
                  .filter(
                    (l) =>
                      !hideZeroRows ||
                      l.amountCents !== 0 ||
                      (priorCogsMap.get(l.code) ?? 0) !== 0
                  )
                  .map((l) => {
                    const prior = priorCogsMap.get(l.code) ?? 0;
                    const { diffCents, pctStr } = computeVariance(l.amountCents, prior);
                    if (!isComparing) {
                      return (
                        <div key={l.id} className="flex justify-between py-1">
                          <span className="text-slate-800">
                            {l.code} · {l.name}
                          </span>
                          <span className="font-mono font-medium text-slate-900">
                            {formatCents(l.amountCents)}
                          </span>
                        </div>
                      );
                    }
                    return (
                      <div key={l.id} className="grid grid-cols-12 py-1 items-center">
                        <span className="col-span-5 text-slate-800 font-medium">
                          {l.code} · {l.name}
                        </span>
                        <span className="col-span-2 text-right font-mono font-medium text-slate-900">
                          {formatCents(l.amountCents)}
                        </span>
                        <span className="col-span-2 text-right font-mono text-slate-500">
                          {formatCents(prior)}
                        </span>
                        <span
                          className={`col-span-2 text-right font-mono font-semibold ${
                            diffCents > 0
                              ? "text-rose-700"
                              : diffCents < 0
                              ? "text-emerald-700"
                              : "text-slate-500"
                          }`}
                        >
                          {diffCents > 0 ? "+" : ""}
                          {formatCents(diffCents)}
                        </span>
                        <span className="col-span-1 text-right font-mono text-slate-600">
                          {pctStr}
                        </span>
                      </div>
                    );
                  })}
              </div>
              {/* Total COGS */}
              {(() => {
                const priorTotal = comparisonReports?.profitAndLoss.totalCogsCents ?? 0;
                const { diffCents, pctStr } = computeVariance(
                  profitAndLoss.totalCogsCents,
                  priorTotal
                );
                return isComparing ? (
                  <div className="grid grid-cols-12 border-t border-slate-300 pt-2 mt-2 font-bold text-slate-900 items-center">
                    <span className="col-span-5">Total Cost of Goods Sold</span>
                    <span className="col-span-2 text-right font-mono">
                      {formatCents(profitAndLoss.totalCogsCents)}
                    </span>
                    <span className="col-span-2 text-right font-mono text-slate-600">
                      {formatCents(priorTotal)}
                    </span>
                    <span className="col-span-2 text-right font-mono">
                      {diffCents > 0 ? "+" : ""}
                      {formatCents(diffCents)}
                    </span>
                    <span className="col-span-1 text-right font-mono">{pctStr}</span>
                  </div>
                ) : (
                  <div className="flex justify-between border-t border-slate-300 pt-2 mt-2 font-bold text-slate-900">
                    <span>Total Cost of Goods Sold</span>
                    <span className="font-mono">
                      {formatCents(profitAndLoss.totalCogsCents)}
                    </span>
                  </div>
                );
              })()}
            </div>

            {/* Gross Profit */}
            {(() => {
              const priorGross = comparisonReports?.profitAndLoss.grossProfitCents ?? 0;
              const { diffCents, pctStr } = computeVariance(
                profitAndLoss.grossProfitCents,
                priorGross
              );
              return isComparing ? (
                <div className="grid grid-cols-12 bg-slate-50 p-3 rounded-lg font-bold text-sm text-slate-900 items-center">
                  <span className="col-span-5">Gross Profit</span>
                  <span className="col-span-2 text-right font-mono">
                    {formatCents(profitAndLoss.grossProfitCents)}
                  </span>
                  <span className="col-span-2 text-right font-mono text-slate-600">
                    {formatCents(priorGross)}
                  </span>
                  <span
                    className={`col-span-2 text-right font-mono ${
                      diffCents >= 0 ? "text-emerald-700" : "text-rose-700"
                    }`}
                  >
                    {diffCents > 0 ? "+" : ""}
                    {formatCents(diffCents)}
                  </span>
                  <span className="col-span-1 text-right font-mono">{pctStr}</span>
                </div>
              ) : (
                <div className="flex justify-between bg-slate-50 p-3 rounded-lg font-bold text-sm text-slate-900">
                  <span>Gross Profit</span>
                  <span className="font-mono">
                    {formatCents(profitAndLoss.grossProfitCents)}
                  </span>
                </div>
              );
            })()}

            {/* Operating Expenses */}
            <div>
              <h3 className="font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1.5 mb-2">
                Operating Expenses
              </h3>
              <div className="space-y-1.5">
                {profitAndLoss.expenseLines
                  .filter(
                    (l) =>
                      !hideZeroRows ||
                      l.amountCents !== 0 ||
                      (priorExpenseMap.get(l.code) ?? 0) !== 0
                  )
                  .map((l) => {
                    const prior = priorExpenseMap.get(l.code) ?? 0;
                    const { diffCents, pctStr } = computeVariance(l.amountCents, prior);
                    if (!isComparing) {
                      return (
                        <div key={l.id} className="flex justify-between py-1">
                          <span className="text-slate-800">
                            {l.code} · {l.name}
                          </span>
                          <span className="font-mono font-medium text-slate-900">
                            {formatCents(l.amountCents)}
                          </span>
                        </div>
                      );
                    }
                    return (
                      <div key={l.id} className="grid grid-cols-12 py-1 items-center">
                        <span className="col-span-5 text-slate-800 font-medium">
                          {l.code} · {l.name}
                        </span>
                        <span className="col-span-2 text-right font-mono font-medium text-slate-900">
                          {formatCents(l.amountCents)}
                        </span>
                        <span className="col-span-2 text-right font-mono text-slate-500">
                          {formatCents(prior)}
                        </span>
                        <span
                          className={`col-span-2 text-right font-mono font-semibold ${
                            diffCents > 0
                              ? "text-rose-700"
                              : diffCents < 0
                              ? "text-emerald-700"
                              : "text-slate-500"
                          }`}
                        >
                          {diffCents > 0 ? "+" : ""}
                          {formatCents(diffCents)}
                        </span>
                        <span className="col-span-1 text-right font-mono text-slate-600">
                          {pctStr}
                        </span>
                      </div>
                    );
                  })}
              </div>
              {/* Total Expenses */}
              {(() => {
                const priorTotal = comparisonReports?.profitAndLoss.totalExpensesCents ?? 0;
                const { diffCents, pctStr } = computeVariance(
                  profitAndLoss.totalExpensesCents,
                  priorTotal
                );
                return isComparing ? (
                  <div className="grid grid-cols-12 border-t border-slate-300 pt-2 mt-2 font-bold text-slate-900 items-center">
                    <span className="col-span-5">Total Expenses</span>
                    <span className="col-span-2 text-right font-mono">
                      {formatCents(profitAndLoss.totalExpensesCents)}
                    </span>
                    <span className="col-span-2 text-right font-mono text-slate-600">
                      {formatCents(priorTotal)}
                    </span>
                    <span className="col-span-2 text-right font-mono">
                      {diffCents > 0 ? "+" : ""}
                      {formatCents(diffCents)}
                    </span>
                    <span className="col-span-1 text-right font-mono">{pctStr}</span>
                  </div>
                ) : (
                  <div className="flex justify-between border-t border-slate-300 pt-2 mt-2 font-bold text-slate-900">
                    <span>Total Expenses</span>
                    <span className="font-mono">
                      {formatCents(profitAndLoss.totalExpensesCents)}
                    </span>
                  </div>
                );
              })()}
            </div>

            {/* Net Income */}
            {(() => {
              const priorNet = comparisonReports?.profitAndLoss.netIncomeCents ?? 0;
              const { diffCents, pctStr } = computeVariance(
                profitAndLoss.netIncomeCents,
                priorNet
              );
              return isComparing ? (
                <div className="grid grid-cols-12 border-t-2 border-b-4 border-double border-slate-900 py-3 font-bold text-base text-slate-900 items-center">
                  <span className="col-span-5">Net Income</span>
                  <span className="col-span-2 text-right font-mono text-[#2CA01C]">
                    {formatCents(profitAndLoss.netIncomeCents)}
                  </span>
                  <span className="col-span-2 text-right font-mono text-slate-600">
                    {formatCents(priorNet)}
                  </span>
                  <span
                    className={`col-span-2 text-right font-mono ${
                      diffCents >= 0 ? "text-emerald-700" : "text-rose-700"
                    }`}
                  >
                    {diffCents > 0 ? "+" : ""}
                    {formatCents(diffCents)}
                  </span>
                  <span className="col-span-1 text-right font-mono text-sm">{pctStr}</span>
                </div>
              ) : (
                <div className="flex justify-between border-t-2 border-b-4 border-double border-slate-900 py-3 font-bold text-base text-slate-900">
                  <span>Net Income</span>
                  <span className="font-mono text-[#2CA01C]">
                    {formatCents(profitAndLoss.netIncomeCents)}
                  </span>
                </div>
              );
            })()}
          </div>
        )}

        {/* ---------------- BALANCE SHEET ---------------- */}
        {reportTab === "bs" && (
          <div className="space-y-6 text-xs overflow-x-auto min-w-0">
            {isComparing && (
              <div className="grid grid-cols-12 font-bold uppercase tracking-wider text-slate-500 border-b-2 border-slate-800 pb-2">
                <span className="col-span-5">Account</span>
                <span className="col-span-2 text-right">Current Period</span>
                <span className="col-span-2 text-right">Prior Period</span>
                <span className="col-span-2 text-right">$ Change</span>
                <span className="col-span-1 text-right">% Change</span>
              </div>
            )}

            {/* Assets */}
            <div>
              <h3 className="font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1.5 mb-2">
                Assets
              </h3>
              <div className="space-y-1.5">
                {balanceSheet.assetLines
                  .filter(
                    (l) =>
                      !hideZeroRows ||
                      l.amountCents !== 0 ||
                      (priorAssetMap.get(l.code) ?? 0) !== 0
                  )
                  .map((l) => {
                    const prior = priorAssetMap.get(l.code) ?? 0;
                    const { diffCents, pctStr } = computeVariance(l.amountCents, prior);
                    if (!isComparing) {
                      return (
                        <div key={l.id} className="flex justify-between py-1">
                          <span className="text-slate-800">
                            {l.code} · {l.name} <span className="text-slate-400">({l.type})</span>
                          </span>
                          <span className="font-mono font-medium text-slate-900">
                            {formatCents(l.amountCents)}
                          </span>
                        </div>
                      );
                    }
                    return (
                      <div key={l.id} className="grid grid-cols-12 py-1 items-center">
                        <span className="col-span-5 text-slate-800">
                          {l.code} · {l.name} <span className="text-slate-400 text-[10px]">({l.type})</span>
                        </span>
                        <span className="col-span-2 text-right font-mono font-medium text-slate-900">
                          {formatCents(l.amountCents)}
                        </span>
                        <span className="col-span-2 text-right font-mono text-slate-500">
                          {formatCents(prior)}
                        </span>
                        <span className="col-span-2 text-right font-mono font-semibold">
                          {diffCents > 0 ? "+" : ""}
                          {formatCents(diffCents)}
                        </span>
                        <span className="col-span-1 text-right font-mono text-slate-600">
                          {pctStr}
                        </span>
                      </div>
                    );
                  })}
              </div>
              {(() => {
                const priorTotal = comparisonReports?.balanceSheet.totalAssetsCents ?? 0;
                const { diffCents, pctStr } = computeVariance(
                  balanceSheet.totalAssetsCents,
                  priorTotal
                );
                return isComparing ? (
                  <div className="grid grid-cols-12 border-t-2 border-slate-900 pt-2 mt-2 font-bold text-sm text-slate-900 items-center">
                    <span className="col-span-5">Total Assets</span>
                    <span className="col-span-2 text-right font-mono">
                      {formatCents(balanceSheet.totalAssetsCents)}
                    </span>
                    <span className="col-span-2 text-right font-mono text-slate-600">
                      {formatCents(priorTotal)}
                    </span>
                    <span className="col-span-2 text-right font-mono">
                      {diffCents > 0 ? "+" : ""}
                      {formatCents(diffCents)}
                    </span>
                    <span className="col-span-1 text-right font-mono">{pctStr}</span>
                  </div>
                ) : (
                  <div className="flex justify-between border-t-2 border-slate-900 pt-2 mt-2 font-bold text-sm text-slate-900">
                    <span>Total Assets</span>
                    <span className="font-mono">
                      {formatCents(balanceSheet.totalAssetsCents)}
                    </span>
                  </div>
                );
              })()}
            </div>

            {/* Liabilities */}
            <div>
              <h3 className="font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1.5 mb-2">
                Liabilities
              </h3>
              <div className="space-y-1.5">
                {balanceSheet.liabilityLines
                  .filter(
                    (l) =>
                      !hideZeroRows ||
                      l.amountCents !== 0 ||
                      (priorLiabMap.get(l.code) ?? 0) !== 0
                  )
                  .map((l) => {
                    const prior = priorLiabMap.get(l.code) ?? 0;
                    const { diffCents, pctStr } = computeVariance(l.amountCents, prior);
                    if (!isComparing) {
                      return (
                        <div key={l.id} className="flex justify-between py-1">
                          <span className="text-slate-800">
                            {l.code} · {l.name}
                          </span>
                          <span className="font-mono font-medium text-slate-900">
                            {formatCents(l.amountCents)}
                          </span>
                        </div>
                      );
                    }
                    return (
                      <div key={l.id} className="grid grid-cols-12 py-1 items-center">
                        <span className="col-span-5 text-slate-800">
                          {l.code} · {l.name}
                        </span>
                        <span className="col-span-2 text-right font-mono font-medium text-slate-900">
                          {formatCents(l.amountCents)}
                        </span>
                        <span className="col-span-2 text-right font-mono text-slate-500">
                          {formatCents(prior)}
                        </span>
                        <span className="col-span-2 text-right font-mono font-semibold">
                          {diffCents > 0 ? "+" : ""}
                          {formatCents(diffCents)}
                        </span>
                        <span className="col-span-1 text-right font-mono text-slate-600">
                          {pctStr}
                        </span>
                      </div>
                    );
                  })}
              </div>
              {(() => {
                const priorTotal = comparisonReports?.balanceSheet.totalLiabilitiesCents ?? 0;
                const { diffCents, pctStr } = computeVariance(
                  balanceSheet.totalLiabilitiesCents,
                  priorTotal
                );
                return isComparing ? (
                  <div className="grid grid-cols-12 border-t border-slate-300 pt-2 mt-2 font-bold text-slate-900 items-center">
                    <span className="col-span-5">Total Liabilities</span>
                    <span className="col-span-2 text-right font-mono">
                      {formatCents(balanceSheet.totalLiabilitiesCents)}
                    </span>
                    <span className="col-span-2 text-right font-mono text-slate-600">
                      {formatCents(priorTotal)}
                    </span>
                    <span className="col-span-2 text-right font-mono">
                      {diffCents > 0 ? "+" : ""}
                      {formatCents(diffCents)}
                    </span>
                    <span className="col-span-1 text-right font-mono">{pctStr}</span>
                  </div>
                ) : (
                  <div className="flex justify-between border-t border-slate-300 pt-2 mt-2 font-bold text-slate-900">
                    <span>Total Liabilities</span>
                    <span className="font-mono">
                      {formatCents(balanceSheet.totalLiabilitiesCents)}
                    </span>
                  </div>
                );
              })()}
            </div>

            {/* Equity */}
            <div>
              <h3 className="font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1.5 mb-2">
                Equity
              </h3>
              <div className="space-y-1.5">
                {balanceSheet.equityLines
                  .filter(
                    (l) =>
                      !hideZeroRows ||
                      l.amountCents !== 0 ||
                      (priorEquityMap.get(l.code) ?? 0) !== 0
                  )
                  .map((l) => {
                    const prior = priorEquityMap.get(l.code) ?? 0;
                    const { diffCents, pctStr } = computeVariance(l.amountCents, prior);
                    if (!isComparing) {
                      return (
                        <div key={l.id} className="flex justify-between py-1">
                          <span className="text-slate-800">
                            {l.code} · {l.name}
                          </span>
                          <span className="font-mono font-medium text-slate-900">
                            {formatCents(l.amountCents)}
                          </span>
                        </div>
                      );
                    }
                    return (
                      <div key={l.id} className="grid grid-cols-12 py-1 items-center">
                        <span className="col-span-5 text-slate-800">
                          {l.code} · {l.name}
                        </span>
                        <span className="col-span-2 text-right font-mono font-medium text-slate-900">
                          {formatCents(l.amountCents)}
                        </span>
                        <span className="col-span-2 text-right font-mono text-slate-500">
                          {formatCents(prior)}
                        </span>
                        <span className="col-span-2 text-right font-mono font-semibold">
                          {diffCents > 0 ? "+" : ""}
                          {formatCents(diffCents)}
                        </span>
                        <span className="col-span-1 text-right font-mono text-slate-600">
                          {pctStr}
                        </span>
                      </div>
                    );
                  })}
                {/* Net Income (Current Period) */}
                {(() => {
                  const priorNet = comparisonReports?.balanceSheet.netIncomeCents ?? 0;
                  const { diffCents, pctStr } = computeVariance(
                    balanceSheet.netIncomeCents,
                    priorNet
                  );
                  return isComparing ? (
                    <div className="grid grid-cols-12 py-1 items-center">
                      <span className="col-span-5 text-slate-800 font-medium">
                        Net Income (Current Period)
                      </span>
                      <span className="col-span-2 text-right font-mono font-medium text-slate-900">
                        {formatCents(balanceSheet.netIncomeCents)}
                      </span>
                      <span className="col-span-2 text-right font-mono text-slate-500">
                        {formatCents(priorNet)}
                      </span>
                      <span className="col-span-2 text-right font-mono font-semibold">
                        {diffCents > 0 ? "+" : ""}
                        {formatCents(diffCents)}
                      </span>
                      <span className="col-span-1 text-right font-mono text-slate-600">
                        {pctStr}
                      </span>
                    </div>
                  ) : (
                    <div className="flex justify-between py-1">
                      <span className="text-slate-800 font-medium">
                        Net Income (Current Period)
                      </span>
                      <span className="font-mono font-medium text-slate-900">
                        {formatCents(balanceSheet.netIncomeCents)}
                      </span>
                    </div>
                  );
                })()}
              </div>
              {(() => {
                const priorTotal = comparisonReports?.balanceSheet.totalEquityCents ?? 0;
                const { diffCents, pctStr } = computeVariance(
                  balanceSheet.totalEquityCents,
                  priorTotal
                );
                return isComparing ? (
                  <div className="grid grid-cols-12 border-t border-slate-300 pt-2 mt-2 font-bold text-slate-900 items-center">
                    <span className="col-span-5">Total Equity</span>
                    <span className="col-span-2 text-right font-mono">
                      {formatCents(balanceSheet.totalEquityCents)}
                    </span>
                    <span className="col-span-2 text-right font-mono text-slate-600">
                      {formatCents(priorTotal)}
                    </span>
                    <span className="col-span-2 text-right font-mono">
                      {diffCents > 0 ? "+" : ""}
                      {formatCents(diffCents)}
                    </span>
                    <span className="col-span-1 text-right font-mono">{pctStr}</span>
                  </div>
                ) : (
                  <div className="flex justify-between border-t border-slate-300 pt-2 mt-2 font-bold text-slate-900">
                    <span>Total Equity</span>
                    <span className="font-mono">
                      {formatCents(balanceSheet.totalEquityCents)}
                    </span>
                  </div>
                );
              })()}
            </div>

            {/* Total Liabilities & Equity */}
            {(() => {
              const priorTotal =
                comparisonReports?.balanceSheet.totalLiabilitiesAndEquityCents ?? 0;
              const { diffCents, pctStr } = computeVariance(
                balanceSheet.totalLiabilitiesAndEquityCents,
                priorTotal
              );
              return isComparing ? (
                <div className="grid grid-cols-12 border-t-2 border-b-4 border-double border-slate-900 py-3 font-bold text-base text-slate-900 items-center">
                  <span className="col-span-5 flex items-center gap-2">
                    Total Liabilities and Equity
                    {balanceSheet.isBalanced && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-[#2CA01C]">
                        ✓ Balanced
                      </span>
                    )}
                  </span>
                  <span className="col-span-2 text-right font-mono text-[#2CA01C]">
                    {formatCents(balanceSheet.totalLiabilitiesAndEquityCents)}
                  </span>
                  <span className="col-span-2 text-right font-mono text-slate-600">
                    {formatCents(priorTotal)}
                  </span>
                  <span className="col-span-2 text-right font-mono">
                    {diffCents > 0 ? "+" : ""}
                    {formatCents(diffCents)}
                  </span>
                  <span className="col-span-1 text-right font-mono text-sm">{pctStr}</span>
                </div>
              ) : (
                <div className="flex justify-between border-t-2 border-b-4 border-double border-slate-900 py-3 font-bold text-base text-slate-900">
                  <span className="flex items-center gap-2">
                    Total Liabilities and Equity
                    {balanceSheet.isBalanced && (
                      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-[#2CA01C]">
                        ✓ Matches Total Assets
                      </span>
                    )}
                  </span>
                  <span className="font-mono text-[#2CA01C]">
                    {formatCents(balanceSheet.totalLiabilitiesAndEquityCents)}
                  </span>
                </div>
              );
            })()}
          </div>
        )}

        {/* ---------------- TRIAL BALANCE ---------------- */}
        {reportTab === "tb" && (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs min-w-[550px]">
            <thead className="border-b-2 border-slate-800 text-slate-600 uppercase">
              <tr>
                <th className="py-2">Account</th>
                <th className="py-2">Type</th>
                {isComparing ? (
                  <>
                    <th className="py-2 text-right">Cur Debit</th>
                    <th className="py-2 text-right">Cur Credit</th>
                    <th className="py-2 text-right text-slate-400">Prior Debit</th>
                    <th className="py-2 text-right text-slate-400">Prior Credit</th>
                  </>
                ) : (
                  <>
                    <th className="py-2 text-right">Debit</th>
                    <th className="py-2 text-right">Credit</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {trialBalance.rows
                .filter(
                  (r) =>
                    !hideZeroRows ||
                    r.debitBalanceCents !== 0 ||
                    r.creditBalanceCents !== 0 ||
                    ((priorTbMap.get(r.code)?.debitBalanceCents ?? 0) !== 0) ||
                    ((priorTbMap.get(r.code)?.creditBalanceCents ?? 0) !== 0)
                )
                .map((r) => {
                  const prior = priorTbMap.get(r.code);
                  return (
                    <tr key={r.accountId} className="hover:bg-slate-50">
                      <td className="py-2 font-medium text-slate-900">
                        <span className="font-mono text-slate-500 mr-2">
                          {r.code}
                        </span>
                        {r.name}
                      </td>
                      <td className="py-2 text-slate-500">{r.type}</td>
                      {isComparing ? (
                        <>
                          <td className="py-2 text-right font-mono">
                            {r.debitBalanceCents > 0 ? formatCents(r.debitBalanceCents) : ""}
                          </td>
                          <td className="py-2 text-right font-mono">
                            {r.creditBalanceCents > 0 ? formatCents(r.creditBalanceCents) : ""}
                          </td>
                          <td className="py-2 text-right font-mono text-slate-500">
                            {(prior?.debitBalanceCents ?? 0) > 0 ? formatCents(prior!.debitBalanceCents) : ""}
                          </td>
                          <td className="py-2 text-right font-mono text-slate-500">
                            {(prior?.creditBalanceCents ?? 0) > 0 ? formatCents(prior!.creditBalanceCents) : ""}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-2 text-right font-mono">
                            {r.debitBalanceCents > 0
                              ? formatCents(r.debitBalanceCents)
                              : ""}
                          </td>
                          <td className="py-2 text-right font-mono">
                            {r.creditBalanceCents > 0
                              ? formatCents(r.creditBalanceCents)
                              : ""}
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
            </tbody>
            <tfoot className="border-t-2 border-b-4 border-double border-slate-900 font-bold text-sm">
              <tr>
                <td colSpan={2} className="py-3">
                  TOTAL{" "}
                  {trialBalance.isBalanced && (
                    <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] text-[#2CA01C]">
                      ✓ Debits = Credits
                    </span>
                  )}
                </td>
                {isComparing ? (
                  <>
                    <td className="py-3 text-right font-mono">
                      {formatCents(trialBalance.totalDebitsCents)}
                    </td>
                    <td className="py-3 text-right font-mono">
                      {formatCents(trialBalance.totalCreditsCents)}
                    </td>
                    <td className="py-3 text-right font-mono text-slate-600">
                      {formatCents(comparisonReports?.trialBalance.totalDebitsCents ?? 0)}
                    </td>
                    <td className="py-3 text-right font-mono text-slate-600">
                      {formatCents(comparisonReports?.trialBalance.totalCreditsCents ?? 0)}
                    </td>
                  </>
                ) : (
                  <>
                    <td className="py-3 text-right font-mono">
                      {formatCents(trialBalance.totalDebitsCents)}
                    </td>
                    <td className="py-3 text-right font-mono">
                      {formatCents(trialBalance.totalCreditsCents)}
                    </td>
                  </>
                )}
              </tr>
            </tfoot>
          </table>
          </div>
        )}

        {/* ---------------- AGING SUMMARIES (A/R & A/P) ---------------- */}
        {(reportTab === "ar_aging" || reportTab === "ap_aging") && (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs min-w-[550px]">
            <thead className="border-b-2 border-slate-800 text-slate-600 uppercase">
              <tr>
                <th className="py-2">
                  {reportTab === "ar_aging" ? "Customer" : "Vendor"}
                </th>
                <th className="py-2 text-right">Current</th>
                <th className="py-2 text-right">1 - 30 Days</th>
                <th className="py-2 text-right">31 - 60 Days</th>
                <th className="py-2 text-right">61+ Days</th>
                <th className="py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(reportTab === "ar_aging" ? arAging.rows : apAging.rows)
                .filter((r) => !hideZeroRows || r.totalCents !== 0)
                .map((r) => (
                  <tr key={r.entityId} className="hover:bg-slate-50">
                    <td className="py-2.5 font-semibold text-slate-900">
                      {r.entityName}
                    </td>
                    <td className="py-2.5 text-right font-mono">
                      {formatCents(r.currentCents)}
                    </td>
                    <td className="py-2.5 text-right font-mono text-amber-700">
                      {formatCents(r.days1To30Cents)}
                    </td>
                    <td className="py-2.5 text-right font-mono text-orange-700">
                      {formatCents(r.days31To60Cents)}
                    </td>
                    <td className="py-2.5 text-right font-mono text-red-700">
                      {formatCents(r.days61PlusCents)}
                    </td>
                    <td className="py-2.5 text-right font-mono font-bold text-slate-900">
                      {formatCents(r.totalCents)}
                    </td>
                  </tr>
                ))}
            </tbody>
            <tfoot className="border-t-2 border-b-4 border-double border-slate-900 font-bold text-sm">
              <tr>
                <td colSpan={5} className="py-3">
                  TOTAL{" "}
                  {reportTab === "ar_aging"
                    ? "OPEN RECEIVABLES"
                    : "OPEN PAYABLES"}
                </td>
                <td className="py-3 text-right font-mono text-[#2CA01C]">
                  {formatCents(
                    reportTab === "ar_aging"
                      ? arAging.totalCents
                      : apAging.totalCents
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
          </div>
        )}

        {/* ---------------- GENERAL LEDGER ---------------- */}
        {reportTab === "gl" && (
          <div className="space-y-6 text-xs">
            {generalLedger
              .filter(
                (acc) =>
                  (!hideZeroRows || acc.endingBalanceCents !== 0 || acc.movements.length > 0) &&
                  (!accountFilter || acc.accountId === accountFilter)
              )
              .map((acc) => (
                <div
                  key={acc.accountId}
                  className="border border-slate-200 rounded-lg overflow-hidden"
                >
                  <div className="bg-[#F4F5F8] px-4 py-2.5 flex justify-between font-bold text-slate-900">
                    <span>
                      {acc.accountCode} — {acc.accountName} ({acc.accountType})
                    </span>
                    <span className="font-mono">
                      Ending: {formatCents(acc.endingBalanceCents)}
                    </span>
                  </div>
                  <div className="overflow-x-auto w-full">
                    <table className="w-full text-left text-xs min-w-[500px]">
                    <thead className="border-b border-slate-100 text-slate-400">
                      <tr>
                        <th className="px-4 py-1.5">Date</th>
                        <th className="px-4 py-1.5">Entry</th>
                        <th className="px-4 py-1.5">Description</th>
                        <th className="px-4 py-1.5 text-right">Debit</th>
                        <th className="px-4 py-1.5 text-right">Credit</th>
                        <th className="px-4 py-1.5 text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {acc.movements.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-2.5 text-slate-400 italic text-center">
                            No journal transactions in selected period
                          </td>
                        </tr>
                      ) : (
                        acc.movements.map((m, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="px-4 py-1.5 font-mono text-slate-600">
                              {m.date}
                            </td>
                            <td className="px-4 py-1.5 font-mono font-semibold">
                              {m.entryNumber}
                            </td>
                            <td className="px-4 py-1.5 text-slate-700">
                              {m.description}
                            </td>
                            <td className="px-4 py-1.5 text-right font-mono">
                              {m.debitCents > 0 ? formatCents(m.debitCents) : ""}
                            </td>
                            <td className="px-4 py-1.5 text-right font-mono">
                              {m.creditCents > 0 ? formatCents(m.creditCents) : ""}
                            </td>
                            <td className="px-4 py-1.5 text-right font-mono font-semibold">
                              {formatCents(m.runningBalanceCents)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// 8. RECONCILE & PERIOD LOCK VIEW
// ============================================================================

export function ReconcileView({ state, runAction, isSubmitting }: ViewProps) {
  const bankAccounts = state.accountsWithBalances.filter(
    (a) => a.type === "Bank" || a.type === "Credit Card"
  );
  const [bankAccountId, setBankAccountId] = useState(
    bankAccounts[0]?.id ?? "acc-1000"
  );
  const [statementDate, setStatementDate] = useState("2026-10-31");
  const currentBank =
    bankAccounts.find((a) => a.id === bankAccountId) ?? bankAccounts[0];

  const [statementEndingDollars, setStatementEndingDollars] = useState(
    ((currentBank?.balanceCents ?? 2805000) / 100).toFixed(2)
  );
  const [lockDateInput, setLockDateInput] = useState(
    state.lockedThroughDate ?? "2026-09-30"
  );

  // Find all journal entries that touch this bank or credit card account
  const isCreditCard = currentBank?.normalBalance === "credit";
  const bankEntries = state.journalEntries
    .map((je) => {
      const matchingLines = je.lines.filter(
        (l) => l.accountId === bankAccountId
      );
      if (matchingLines.length === 0) return null;
      const totalDebit = matchingLines.reduce((s, l) => s + l.debitCents, 0);
      const totalCredit = matchingLines.reduce((s, l) => s + l.creditCents, 0);
      const netCents = isCreditCard
        ? totalCredit - totalDebit
        : totalDebit - totalCredit;
      return {
        entryId: je.id,
        entryNumber: je.entryNumber,
        date: je.date,
        memo: je.memo,
        netCents,
        reconciled: Boolean(je.reconciled),
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  // Default every entry to checked (true) unless explicitly unchecked (false)
  const [checkedIds, setCheckedIds] = useState<Record<string, boolean>>({});

  let statementEndingCents = 0;
  try {
    statementEndingCents = parseDollarsToCents(statementEndingDollars);
  } catch {
    statementEndingCents = 0;
  }

  const clearedBalanceCents = bankEntries.reduce(
    (sum, item) =>
      checkedIds[item.entryId] !== false ? sum + item.netCents : sum,
    0
  );
  const differenceCents = statementEndingCents - clearedBalanceCents;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Reconcile &amp; Close the Books
          </h1>
          <p className="text-xs text-slate-500">
            Match your bank statement ending balance until Difference is $0.00, and lock closed accounting periods
          </p>
        </div>

        <button
          disabled={differenceCents !== 0 || isSubmitting}
          onClick={() =>
            runAction(
              "reconcile",
              {
                bankAccountId,
                statementDate,
                endingBalanceCents: statementEndingCents,
                entryIds: bankEntries
                  .filter((item) => checkedIds[item.entryId] !== false)
                  .map((item) => item.entryId),
              },
              `Reconciled ${currentBank?.name} with $0.00 difference!`
            )
          }
          className="inline-flex items-center gap-1.5 rounded-full bg-[#2CA01C] px-6 py-2 text-xs font-bold text-white hover:bg-[#248217] disabled:opacity-50"
        >
          <CheckCircle2 className="h-4 w-4" />
          Finish Reconciliation Now
        </button>
      </div>

      {/* Period Lock (Close the Books) Card */}
      <div className="rounded-xl bg-white p-5 border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-amber-100 p-2 text-amber-800">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Close the Books (Period Lock)
            </h2>
            <p className="text-xs text-slate-500">
              Prevent accidental edits or backdated journal entries on or before the closing date.
              Currently:{" "}
              <strong className="font-mono text-slate-900">
                {state.lockedThroughDate
                  ? `Locked through ${state.lockedThroughDate}`
                  : "Unlocked"}
              </strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={lockDateInput}
            onChange={(e) => setLockDateInput(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-mono"
          />
          <button
            onClick={() =>
              runAction(
                "set_period_lock",
                { lockedThroughDate: lockDateInput },
                `Locked accounting period through ${lockDateInput}`
              )
            }
            className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
          >
            <Lock className="h-3 w-3" />
            Set Lock Date
          </button>
          {state.lockedThroughDate && (
            <button
              onClick={() =>
                runAction(
                  "set_period_lock",
                  { lockedThroughDate: null },
                  "Unlocked closed period"
                )
              }
              className="inline-flex items-center gap-1 rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              <Unlock className="h-3 w-3" />
              Unlock
            </button>
          )}
        </div>
      </div>

      {/* Reconciliation Math Banner */}
      <div className="rounded-xl bg-white p-5 border border-slate-200 shadow-2xs grid grid-cols-1 sm:grid-cols-4 gap-4 items-center">
        <div>
          <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
            Account
          </label>
          <select
            value={bankAccountId}
            onChange={(e) => {
              const nextId = e.target.value;
              setBankAccountId(nextId);
              setCheckedIds({});
              const nextAcc = bankAccounts.find((a) => a.id === nextId);
              if (nextAcc) {
                setStatementEndingDollars(
                  (nextAcc.balanceCents / 100).toFixed(2)
                );
              }
            }}
            className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold"
          >
            {bankAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({formatCents(a.balanceCents)})
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-[11px] font-bold uppercase text-slate-400">
              Statement Ending Balance ($)
            </label>
            <button
              type="button"
              onClick={() => {
                setCheckedIds({});
                setStatementEndingDollars(
                  ((currentBank?.balanceCents ?? 0) / 100).toFixed(2)
                );
              }}
              className="text-[10px] font-bold text-[#0077C5] hover:underline"
            >
              Use Cleared Total
            </button>
          </div>
          <input
            type="text"
            value={statementEndingDollars}
            onChange={(e) => setStatementEndingDollars(e.target.value)}
            className="w-full rounded border border-slate-300 px-2.5 py-1.5 font-mono text-sm font-bold"
          />
        </div>

        <div>
          <span className="block text-[11px] font-bold uppercase text-slate-400">
            Cleared Balance in Pro E Books
          </span>
          <span className="text-xl font-mono font-bold text-slate-900">
            {formatCents(clearedBalanceCents)}
          </span>
        </div>

        <div
          className={`rounded-lg p-3 text-right ${
            differenceCents === 0
              ? "bg-emerald-50 border border-emerald-200 text-[#2CA01C]"
              : "bg-amber-50 border border-amber-200 text-amber-900"
          }`}
        >
          <span className="block text-[11px] font-bold uppercase">
            Difference
          </span>
          <span className="text-xl font-mono font-bold">
            {formatCents(differenceCents)}
          </span>
        </div>
      </div>

      <div className="rounded-xl bg-white border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs min-w-[650px]">
          <thead className="bg-[#F4F5F8] border-b border-slate-200 text-slate-600 uppercase">
            <tr>
              <th className="px-4 py-3 w-12 text-center">Cleared</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Ref</th>
              <th className="px-4 py-3">Memo / Payee</th>
              <th className="px-4 py-3 text-right">
                {isCreditCard ? "Payment / Credit (Dr)" : "Payment (Out)"}
              </th>
              <th className="px-4 py-3 text-right">
                {isCreditCard ? "Charge (Cr)" : "Deposit (In)"}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {bankEntries.map((item) => (
              <tr key={item.entryId} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={checkedIds[item.entryId] !== false}
                    onChange={(e) =>
                      setCheckedIds({
                        ...checkedIds,
                        [item.entryId]: e.target.checked,
                      })
                    }
                    className="h-4 w-4 accent-[#2CA01C] rounded"
                  />
                </td>
                <td className="px-4 py-3 font-mono text-slate-600">
                  {item.date}
                </td>
                <td className="px-4 py-3 font-mono font-bold">
                  {item.entryNumber}
                </td>
                <td className="px-4 py-3 text-slate-800">{item.memo}</td>
                <td className="px-4 py-3 text-right font-mono text-slate-900">
                  {item.netCents < 0
                    ? formatCents(Math.abs(item.netCents))
                    : ""}
                </td>
                <td className="px-4 py-3 text-right font-mono font-semibold text-[#2CA01C]">
                  {item.netCents >= 0 ? formatCents(item.netCents) : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {/* Reconciliation History */}
      <div className="rounded-xl bg-white border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-5 py-3 bg-[#F4F5F8] border-b border-slate-200">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
            History by Account ({state.reconciliations.length})
          </h3>
        </div>
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs min-w-[550px]">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase">
            <tr>
              <th className="px-4 py-2.5">Account</th>
              <th className="px-4 py-2.5">Statement Ending Date</th>
              <th className="px-4 py-2.5">Reconciled On</th>
              <th className="px-4 py-2.5 text-right">Cleared Items</th>
              <th className="px-4 py-2.5 text-right">Ending Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {state.reconciliations.map((rec) => (
              <tr key={rec.id}>
                <td className="px-4 py-2.5 font-semibold text-slate-900">
                  {rec.bankAccountName}
                </td>
                <td className="px-4 py-2.5 font-mono text-slate-600">
                  {rec.statementDate}
                </td>
                <td className="px-4 py-2.5 font-mono text-slate-500">
                  {rec.reconciledAt.slice(0, 10)}
                </td>
                <td className="px-4 py-2.5 text-right font-mono">
                  {rec.clearedCount}
                </td>
                <td className="px-4 py-2.5 text-right font-mono font-bold text-[#2CA01C]">
                  {formatCents(rec.endingBalanceCents)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 9. AUDIT LOG, TEAMS & LAUNCH SECURITY VIEW (Phases 7 & 9)
// ============================================================================

export function AuditLogView({ state, runAction }: ViewProps) {
  const [subTab, setSubTab] = useState<"audit" | "teams" | "security">("audit");
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"accountant" | "staff" | "owner">(
    "accountant"
  );

  function exportFullCompanyJson() {
    const json = JSON.stringify(state, null, 2);
    const blob = new Blob([json], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "craigs_landscaping_qbo_full_backup.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Audit Log, Team Roles &amp; Security Center
          </h1>
          <p className="text-xs text-slate-500">
            Chronological audit trail, role-based access control (Owner / Staff / Accountant Read-Only), and Phase 9 accounting integrity audit
          </p>
        </div>

        {state.teamMembers && state.teamMembers.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">
              Active Role:
            </span>
            {Array.from(new Set(state.teamMembers.map((m) => m.role))).map((r) => (
              <button
                key={r}
                onClick={() =>
                  runAction(
                    "set_active_role",
                    { role: r },
                    r === "accountant"
                      ? "Switched to Accountant (Read-Only) mode — mutations are now blocked!"
                      : `Switched to ${r.toUpperCase()} role`
                  )
                }
                className={`rounded-full px-3 py-1 text-xs font-bold capitalize transition-colors ${
                  state.activeRole === r
                    ? "bg-[#2CA01C] text-white"
                    : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
                }`}
              >
                {r === "accountant" ? "Accountant (Read-Only)" : r}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Sub-navigation */}
      <div className="rounded-xl bg-white border border-slate-200 shadow-2xs overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 bg-[#F4F5F8]">
          <div className="flex gap-6">
            <button
              onClick={() => setSubTab("audit")}
              className={`py-3.5 text-xs font-bold border-b-2 transition-colors ${
                subTab === "audit"
                  ? "border-[#2CA01C] text-[#2CA01C]"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              Audit Log ({state.auditLogs.length})
            </button>
            <button
              onClick={() => setSubTab("teams")}
              className={`py-3.5 text-xs font-bold border-b-2 transition-colors ${
                subTab === "teams"
                  ? "border-[#2CA01C] text-[#2CA01C]"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              Team Members &amp; Roles ({state.teamMembers.length})
            </button>
            <button
              onClick={() => setSubTab("security")}
              className={`py-3.5 text-xs font-bold border-b-2 transition-colors ${
                subTab === "security"
                  ? "border-[#2CA01C] text-[#2CA01C]"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              Security Audit &amp; Data Export (
              {state.securityAudit.passedCount}/{state.securityAudit.totalChecks} Passed)
            </button>
          </div>

          <button
            onClick={exportFullCompanyJson}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            <Download className="h-3.5 w-3.5" />
            Export Full Company Backup (.JSON)
          </button>
        </div>

        {subTab === "audit" && (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs min-w-[600px]">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase">
              <tr>
                <th className="px-4 py-3">Date / Time</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Event</th>
                <th className="px-4 py-3">Details</th>
                <th className="px-4 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {state.auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-slate-500 whitespace-nowrap">
                    {log.timestamp.replace("T", " ").slice(0, 19)}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {log.user}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold text-[#2CA01C]">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{log.details}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                    {log.amountCents !== undefined
                      ? formatCents(log.amountCents)
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}

        {subTab === "teams" && (
          <div className="p-5 space-y-5">
            <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50/70 p-3.5 text-xs text-emerald-950">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2CA01C] text-white">
                <Mail className="h-4 w-4" />
              </div>
              <div>
                <p className="font-bold text-emerald-900">
                  Automated Employee Invitations &amp; RBAC Control
                </p>
                <p className="text-[11px] text-emerald-700">
                  When you invite a new employee or accountant, an official onboarding email is dispatched directly from{" "}
                  <strong className="font-mono text-emerald-950">enterandpost02@gmail.com</strong> with their assigned role and immediate access link.
                </p>
              </div>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!inviteName.trim() || !inviteEmail.trim()) return;
                await runAction(
                  "invite_team_member",
                  {
                    name: inviteName,
                    email: inviteEmail,
                    role: inviteRole,
                  },
                  `Invitation email dispatched to ${inviteEmail} from enterandpost02@gmail.com (${inviteRole.toUpperCase()} permissions)`
                );
                setInviteName("");
                setInviteEmail("");
              }}
              className="space-y-2 rounded-lg bg-slate-50 p-4 border border-slate-200"
            >
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <input
                  type="text"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="Employee Full Name (e.g. Jane Doe)"
                  required
                  className="rounded border border-slate-300 bg-white px-3 py-2 text-xs"
                />
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="Employee Email Address"
                  required
                  className="rounded border border-slate-300 bg-white px-3 py-2 text-xs"
                />
                <select
                  value={inviteRole}
                  onChange={(e) =>
                    setInviteRole(
                      e.target.value as "accountant" | "staff" | "owner"
                    )
                  }
                  className="rounded border border-slate-300 bg-white px-2.5 py-2 text-xs font-semibold text-slate-800"
                >
                  <option value="accountant">Accountant (Read-Only Audit)</option>
                  <option value="staff">Staff Bookkeeper (Standard)</option>
                  <option value="owner">Company Owner (Full Admin)</option>
                </select>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[#2CA01C] px-4 py-2 text-xs font-bold text-white hover:bg-[#248217] transition-colors"
                >
                  <Send className="h-3.5 w-3.5" />
                  Send Invite Email
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                Sender: <span className="font-semibold text-slate-700">enterandpost02@gmail.com</span> · The invited user will receive a branded invitation with one-click sign-in.
              </p>
            </form>

            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-xs min-w-[550px]">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role &amp; Permissions</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {state.teamMembers.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {m.name}
                      {m.email === "enterandpost02@gmail.com" && (
                        <span className="ml-2 inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-[#2CA01C]">
                          Admin
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-mono text-[11px]">
                      {m.email}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase ${
                          m.role === "owner"
                            ? "bg-emerald-50 text-[#2CA01C] border border-emerald-200"
                            : m.role === "staff"
                            ? "bg-sky-50 text-[#0077C5] border border-sky-200"
                            : "bg-slate-100 text-slate-700 border border-slate-200"
                        }`}
                      >
                        {m.role === "accountant"
                          ? "Accountant (Read-Only)"
                          : m.role === "staff"
                          ? "Staff Bookkeeper"
                          : "Company Owner"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {m.status === "Invited" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                          <Mail className="h-3 w-3" />
                          Invited (Email Sent)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-semibold text-[#2CA01C]">
                          <Check className="h-3 w-3" />
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {m.email !== "enterandpost02@gmail.com" && (
                        <button
                          onClick={() =>
                            runAction(
                              "resend_invite_email",
                              { memberId: m.id, email: m.email },
                              `Resent onboarding invitation to ${m.email} from enterandpost02@gmail.com`
                            )
                          }
                          className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                          title="Resend invitation email from enterandpost02@gmail.com"
                        >
                          <Mail className="h-3 w-3 text-slate-500" />
                          Resend Email
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}

        {subTab === "security" && (
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  title: "1. Integer-Cents Monetary Integrity",
                  desc: "Every journal line, bank transaction, invoice, and bill is stored as exact integer cents with 0 floating-point drift.",
                  ok: state.securityAudit.allMoneyIntegerCents,
                },
                {
                  title: "2. Double-Entry Journal Balance (Dr = Cr)",
                  desc: `All ${state.journalEntries.length} posted journal entries have SUM(debitCents) === SUM(creditCents).`,
                  ok: state.securityAudit.allEntriesBalanced,
                },
                {
                  title: "3. Balance Sheet Accounting Equation",
                  desc: `Total Assets (${formatCents(
                    state.reports.balanceSheet.totalAssetsCents
                  )}) === Liabilities + Equity (${formatCents(
                    state.reports.balanceSheet.totalLiabilitiesAndEquityCents
                  )}).`,
                  ok: state.securityAudit.balanceSheetBalanced,
                },
                {
                  title: "4. General Ledger Trial Balance Equality",
                  desc: `Total Debits (${formatCents(
                    state.reports.trialBalance.totalDebitsCents
                  )}) === Total Credits (${formatCents(
                    state.reports.trialBalance.totalCreditsCents
                  )}).`,
                  ok: state.securityAudit.trialBalanceBalanced,
                },
                {
                  title: "5. Closed Period Lock Protection",
                  desc: state.lockedThroughDate
                    ? `Books locked through ${state.lockedThroughDate}; backdated edits/entries are rejected.`
                    : "Period lock is currently unlocked.",
                  ok: state.securityAudit.periodLockConfigured,
                },
                {
                  title: "6. Multi-Tenant Organization Isolation",
                  desc: "All Drizzle PostgreSQL tables and queries enforce organization_id scoping and RBAC checks.",
                  ok: state.securityAudit.orgIsolationEnforced,
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="flex items-start gap-3 rounded-xl border border-slate-200 p-4 bg-slate-50/60"
                >
                  <CheckCircle2
                    className={`h-5 w-5 shrink-0 mt-0.5 ${
                      item.ok ? "text-[#2CA01C]" : "text-amber-500"
                    }`}
                  />
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-600 mt-1">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Production Data Management & Cleanup */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 mt-6 shadow-2xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Production Data Management &amp; Clean Books
                  </h3>
                  <p className="text-xs text-slate-500">
                    Manage sample test data or start completely fresh with $0.00 balances for live deployment
                  </p>
                </div>
                <span className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-[#2CA01C]">
                  ✓ Vercel &amp; Cloud Ready
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  onClick={async () => {
                    if (
                      window.confirm(
                        `Wipe all sample data for "${state.companyName}"?\n\nThis will remove all demo invoices, bills, journal entries, and bank transactions. Your Chart of Accounts will be reset to $0.00 balances, ready for live production use.`
                      )
                    ) {
                      await runAction(
                        "wipe_transactions",
                        {},
                        `Wiped all sample transactions for "${state.companyName}". Books are now fresh with $0.00 balances!`
                      );
                    }
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-rose-300 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-rose-600" />
                  Wipe All Sample Data ($0.00 Fresh Books)
                </button>

                <button
                  onClick={async () => {
                    if (
                      window.confirm(
                        `Reset "${state.companyName}" to pre-loaded sample practice data?`
                      )
                    ) {
                      await runAction(
                        "reset_demo",
                        {},
                        "Reset company data to initial sample state"
                      );
                    }
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
                  Load Demo Practice Data
                </button>

                <button
                  onClick={exportFullCompanyJson}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Download className="h-3.5 w-3.5 text-[#2CA01C]" />
                  Export Full Company Backup (.JSON)
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
