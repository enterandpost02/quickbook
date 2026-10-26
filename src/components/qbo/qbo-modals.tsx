"use client";

import React, { useState } from "react";
import {
  ArrowUpRight,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Landmark,
  Plus,
  Receipt,
  Scale,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import type { AccountType, ComputedQboState } from "@/lib/qbo-store";
import { formatCents, parseDollarsToCents } from "@/lib/money";
import {
  normalizeDateString,
  parseCsvTextToPreview,
  parseCurrencyStringToCents,
  type ParsedCsvPreview,
} from "@/lib/csv-parser";

export type ActiveModalType =
  | null
  | "quick_create"
  | "csv_import"
  | "journal_entry"
  | "invoice"
  | "expense"
  | "bill"
  | "account";

interface ModalsProps {
  activeModal: ActiveModalType;
  setActiveModal: (modal: ActiveModalType) => void;
  state: ComputedQboState;
  runAction: (action: string, payload?: unknown, successMsg?: string) => Promise<void>;
  isSubmitting: boolean;
}

export function QboModals({
  activeModal,
  setActiveModal,
  state,
  runAction,
  isSubmitting,
}: ModalsProps) {
  if (!activeModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-[1px] p-4 overflow-y-auto">
      {activeModal === "quick_create" && (
        <QuickCreateMenuModal
          onClose={() => setActiveModal(null)}
          onSelect={(m) => setActiveModal(m)}
        />
      )}
      {activeModal === "csv_import" && (
        <CsvImportModal
          state={state}
          onClose={() => setActiveModal(null)}
          runAction={runAction}
          isSubmitting={isSubmitting}
        />
      )}
      {activeModal === "journal_entry" && (
        <JournalEntryModal
          state={state}
          onClose={() => setActiveModal(null)}
          runAction={runAction}
          isSubmitting={isSubmitting}
        />
      )}
      {activeModal === "invoice" && (
        <CreateInvoiceModal
          state={state}
          onClose={() => setActiveModal(null)}
          runAction={runAction}
          isSubmitting={isSubmitting}
        />
      )}
      {(activeModal === "expense" || activeModal === "bill") && (
        <CreateExpenseModal
          initialType={activeModal === "bill" ? "Bill" : "Expense"}
          state={state}
          onClose={() => setActiveModal(null)}
          runAction={runAction}
          isSubmitting={isSubmitting}
        />
      )}
      {activeModal === "account" && (
        <CreateAccountModal
          onClose={() => setActiveModal(null)}
          runAction={runAction}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
}

// ============================================================================
// 1. QuickBooks "+ New" 4-Column Quick Create Modal
// ============================================================================

function QuickCreateMenuModal({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (m: ActiveModalType) => void;
}) {
  return (
    <div className="w-full max-w-3xl rounded-xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
      <div className="flex items-center justify-between px-6 py-4 bg-[#F4F5F8] border-b border-slate-200">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#2CA01C] text-white text-xs font-bold">
            +
          </span>
          <h2 className="text-base font-bold text-slate-800">
            QuickBooks Create New
          </h2>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 p-6">
        {/* Column 1: Customers */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2 mb-3">
            Customers
          </h3>
          <div className="space-y-1.5">
            <button
              onClick={() => onSelect("invoice")}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-emerald-50 hover:text-[#2CA01C]"
            >
              <FileText className="h-4 w-4 text-[#2CA01C]" />
              Invoice
            </button>
          </div>
        </div>

        {/* Column 2: Vendors */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2 mb-3">
            Vendors
          </h3>
          <div className="space-y-1.5">
            <button
              onClick={() => onSelect("expense")}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-emerald-50 hover:text-[#2CA01C]"
            >
              <Receipt className="h-4 w-4 text-[#2CA01C]" />
              Expense
            </button>
            <button
              onClick={() => onSelect("bill")}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-emerald-50 hover:text-[#2CA01C]"
            >
              <FileSpreadsheet className="h-4 w-4 text-[#2CA01C]" />
              Vendor Bill (A/P)
            </button>
          </div>
        </div>

        {/* Column 3: Other / Accounting */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2 mb-3">
            Other &amp; Banking
          </h3>
          <div className="space-y-1.5">
            <button
              onClick={() => onSelect("journal_entry")}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-emerald-50 hover:text-[#2CA01C]"
            >
              <Scale className="h-4 w-4 text-[#2CA01C]" />
              Journal Entry
            </button>
            <button
              onClick={() => onSelect("csv_import")}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-emerald-50 hover:text-[#2CA01C]"
            >
              <Upload className="h-4 w-4 text-[#2CA01C]" />
              Upload Bank CSV File
            </button>
            <button
              onClick={() => onSelect("account")}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-emerald-50 hover:text-[#2CA01C]"
            >
              <Landmark className="h-4 w-4 text-[#2CA01C]" />
              Chart of Accounts Item
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 2. Bank CSV Upload & Column Mapping Modal
// ============================================================================

function CsvImportModal({
  state,
  onClose,
  runAction,
  isSubmitting,
}: {
  state: ComputedQboState;
  onClose: () => void;
  runAction: (action: string, payload?: unknown, successMsg?: string) => Promise<void>;
  isSubmitting: boolean;
}) {
  const bankAccounts = state.accounts.filter(
    (a) => a.type === "Bank" || a.type === "Credit Card"
  );
  const [bankAccountId, setBankAccountId] = useState(
    bankAccounts[0]?.id ?? "acc-1000"
  );
  const [csvText, setCsvText] = useState("");
  const [preview, setPreview] = useState<ParsedCsvPreview | null>(null);
  const [dateIdx, setDateIdx] = useState(0);
  const [descIdx, setDescIdx] = useState(1);
  const [amountIdx, setAmountIdx] = useState(2);
  const [payeeIdx, setPayeeIdx] = useState(-1);
  const [error, setError] = useState<string | null>(null);

  function handleTextChange(text: string) {
    setCsvText(text);
    setError(null);
    const parsed = parseCsvTextToPreview(text);
    if (parsed.headers.length > 0) {
      setPreview(parsed);
      setDateIdx(parsed.suggestedMapping.dateIndex);
      setDescIdx(parsed.suggestedMapping.descriptionIndex);
      setAmountIdx(parsed.suggestedMapping.amountIndex);
      setPayeeIdx(parsed.suggestedMapping.payeeIndex);
    } else {
      setPreview(null);
    }
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = String(ev.target?.result ?? "");
      handleTextChange(content);
    };
    reader.readAsText(file);
  }

  async function handleImportSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!preview || preview.rawRows.length === 0) {
      setError("Please upload a CSV file or load the sample CSV first.");
      return;
    }

    const mappedRows = preview.rawRows
      .map((r) => ({
        date: normalizeDateString(r[dateIdx] ?? ""),
        description: (r[descIdx] ?? "").trim(),
        amountCents: parseCurrencyStringToCents(r[amountIdx] ?? "0"),
        payee: payeeIdx >= 0 ? (r[payeeIdx] ?? "").trim() : undefined,
      }))
      .filter((r) => r.description && r.amountCents !== 0);

    if (mappedRows.length === 0) {
      setError("No valid non-zero transactions found with the selected column mapping.");
      return;
    }

    await runAction(
      "import_csv",
      {
        bankAccountId,
        rows: mappedRows,
      },
      `Imported ${mappedRows.length} bank transactions into For Review`
    );
    onClose();
  }

  return (
    <div className="w-full max-w-4xl rounded-xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 bg-[#1E252B] text-white">
        <div className="flex items-center gap-2.5">
          <Upload className="h-5 w-5 text-[#2CA01C]" />
          <div>
            <h2 className="text-base font-bold">
              Upload Bank Statement CSV into QuickBooks
            </h2>
            <p className="text-xs text-slate-300">
              Map columns, detect duplicates automatically, and run categorization rules
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-slate-300 hover:bg-slate-700"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <form onSubmit={handleImportSubmit} className="p-6 space-y-5 max-h-[82vh] overflow-y-auto">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1.5">
              1. Select Bank or Credit Card Account
            </label>
            <select
              value={bankAccountId}
              onChange={(e) => setBankAccountId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#2CA01C] focus:outline-none"
            >
              {bankAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.code} — {acc.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col justify-end">
            <div className="flex items-center gap-2">
              <label className="flex-1 cursor-pointer inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
                <Upload className="h-4 w-4 text-[#2CA01C]" />
                <span>Choose .CSV File</span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              <button
                type="button"
                onClick={() => handleTextChange(state.sampleCsvText)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm font-semibold text-[#2CA01C] hover:bg-emerald-100"
              >
                <Sparkles className="h-4 w-4" />
                Load Sample Bank CSV
              </button>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-slate-600 mb-1.5">
            2. Or Paste / Edit Raw CSV Data
          </label>
          <textarea
            rows={4}
            value={csvText}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder="Date,Description,Amount,Payee&#10;2026-10-20,HOME DEPOT SPRINKLERS,-248.50,Home Depot"
            className="w-full rounded-lg border border-slate-300 font-mono text-xs p-3 text-slate-800 focus:border-[#2CA01C] focus:outline-none"
          />
        </div>

        {preview && preview.headers.length > 0 && (
          <div className="space-y-4 rounded-xl border border-slate-200 bg-[#F4F5F8] p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              3. Map CSV Columns ({preview.rawRows.length} rows detected)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Date Column
                </label>
                <select
                  value={dateIdx}
                  onChange={(e) => setDateIdx(Number(e.target.value))}
                  className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                >
                  {preview.headers.map((h, i) => (
                    <option key={i} value={i}>
                      {h || `Column ${i + 1}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Description Column
                </label>
                <select
                  value={descIdx}
                  onChange={(e) => setDescIdx(Number(e.target.value))}
                  className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                >
                  {preview.headers.map((h, i) => (
                    <option key={i} value={i}>
                      {h || `Column ${i + 1}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Amount Column
                </label>
                <select
                  value={amountIdx}
                  onChange={(e) => setAmountIdx(Number(e.target.value))}
                  className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                >
                  {preview.headers.map((h, i) => (
                    <option key={i} value={i}>
                      {h || `Column ${i + 1}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Payee Column (Optional)
                </label>
                <select
                  value={payeeIdx}
                  onChange={(e) => setPayeeIdx(Number(e.target.value))}
                  className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                >
                  <option value={-1}>— Auto-detect from rules —</option>
                  {preview.headers.map((h, i) => (
                    <option key={i} value={i}>
                      {h || `Column ${i + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Description</th>
                    <th className="px-3 py-2">Payee</th>
                    <th className="px-3 py-2 text-right">Parsed Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {preview.rawRows.slice(0, 6).map((row, idx) => {
                    const cents = parseCurrencyStringToCents(
                      row[amountIdx] ?? "0"
                    );
                    return (
                      <tr key={idx}>
                        <td className="px-3 py-1.5 font-mono text-slate-600">
                          {normalizeDateString(row[dateIdx] ?? "")}
                        </td>
                        <td className="px-3 py-1.5 font-medium text-slate-800">
                          {row[descIdx]}
                        </td>
                        <td className="px-3 py-1.5 text-slate-600">
                          {payeeIdx >= 0 ? row[payeeIdx] : "Auto"}
                        </td>
                        <td
                          className={`px-3 py-1.5 text-right font-mono font-semibold ${
                            cents >= 0 ? "text-[#2CA01C]" : "text-slate-900"
                          }`}
                        >
                          {formatCents(cents)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !preview}
            className="rounded-full bg-[#2CA01C] px-6 py-2 text-sm font-semibold text-white shadow-xs hover:bg-[#248217] disabled:opacity-50"
          >
            {isSubmitting ? "Importing..." : "Import to For Review"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ============================================================================
// 3. Manual Double-Entry Journal Entry Modal
// ============================================================================

function JournalEntryModal({
  state,
  onClose,
  runAction,
  isSubmitting,
}: {
  state: ComputedQboState;
  onClose: () => void;
  runAction: (action: string, payload?: unknown, successMsg?: string) => Promise<void>;
  isSubmitting: boolean;
}) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [memo, setMemo] = useState("");
  const [lines, setLines] = useState([
    {
      accountId: state.accounts[0]?.id ?? "acc-1000",
      debit: "250.00",
      credit: "",
      description: "",
      entityName: "",
    },
    {
      accountId: state.accounts.find((a) => a.code === "4010")?.id ?? "acc-4010",
      debit: "",
      credit: "250.00",
      description: "",
      entityName: "",
    },
  ]);
  const [error, setError] = useState<string | null>(null);

  function safeParse(val: string): number {
    if (!val.trim()) return 0;
    try {
      return Math.max(0, parseDollarsToCents(val));
    } catch {
      return 0;
    }
  }

  const totalDebitCents = lines.reduce((s, l) => s + safeParse(l.debit), 0);
  const totalCreditCents = lines.reduce((s, l) => s + safeParse(l.credit), 0);
  const isBalanced =
    totalDebitCents > 0 && totalDebitCents === totalCreditCents;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isBalanced) {
      setError(
        `Entry must balance before posting: Debits (${formatCents(
          totalDebitCents
        )}) !== Credits (${formatCents(totalCreditCents)}).`
      );
      return;
    }

    await runAction(
      "post_journal_entry",
      {
        date,
        memo: memo.trim() || "Manual Journal Adjustment",
        lines: lines.map((l) => ({
          accountId: l.accountId,
          debitCents: safeParse(l.debit),
          creditCents: safeParse(l.credit),
          description: l.description,
          entityName: l.entityName,
        })),
      },
      "Posted balanced Journal Entry to General Ledger"
    );
    onClose();
  }

  return (
    <div className="w-full max-w-4xl rounded-xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 bg-[#1E252B] text-white">
        <div className="flex items-center gap-2.5">
          <Scale className="h-5 w-5 text-[#2CA01C]" />
          <div>
            <h2 className="text-base font-bold">
              Journal Entry #{1001 + state.journalEntries.length}
            </h2>
            <p className="text-xs text-slate-300">
              Every posted entry is immutable and verified for equal integer-cent debits and credits
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-slate-300 hover:bg-slate-700"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[82vh] overflow-y-auto">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
              Journal Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
              Memo / Reason for Entry
            </label>
            <input
              type="text"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="e.g., Accrued subcontractor labor or depreciation adjustment"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F4F5F8] border-b border-slate-200 text-slate-600 uppercase">
              <tr>
                <th className="px-3 py-2.5 w-8">#</th>
                <th className="px-3 py-2.5">Account</th>
                <th className="px-3 py-2.5 w-32 text-right">Debits ($)</th>
                <th className="px-3 py-2.5 w-32 text-right">Credits ($)</th>
                <th className="px-3 py-2.5">Description</th>
                <th className="px-3 py-2.5 w-40">Name (Customer/Vendor)</th>
                <th className="px-2 py-2.5 w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {lines.map((line, i) => (
                <tr key={i} className="hover:bg-slate-50/80">
                  <td className="px-3 py-2 text-slate-400 font-mono">
                    {i + 1}
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={line.accountId}
                      onChange={(e) => {
                        const next = [...lines];
                        next[i].accountId = e.target.value;
                        setLines(next);
                      }}
                      className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium"
                    >
                      {state.accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.code} — {acc.name} ({acc.type})
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={line.debit}
                      onChange={(e) => {
                        const next = [...lines];
                        next[i].debit = e.target.value;
                        if (e.target.value) next[i].credit = "";
                        setLines(next);
                      }}
                      placeholder="0.00"
                      className="w-full rounded border border-slate-300 px-2 py-1.5 text-right font-mono text-xs"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={line.credit}
                      onChange={(e) => {
                        const next = [...lines];
                        next[i].credit = e.target.value;
                        if (e.target.value) next[i].debit = "";
                        setLines(next);
                      }}
                      placeholder="0.00"
                      className="w-full rounded border border-slate-300 px-2 py-1.5 text-right font-mono text-xs"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={line.description}
                      onChange={(e) => {
                        const next = [...lines];
                        next[i].description = e.target.value;
                        setLines(next);
                      }}
                      placeholder="Line memo"
                      className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={line.entityName}
                      onChange={(e) => {
                        const next = [...lines];
                        next[i].entityName = e.target.value;
                        setLines(next);
                      }}
                      placeholder="Optional"
                      className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs"
                    />
                  </td>
                  <td className="px-2 py-2 text-center">
                    {lines.length > 2 && (
                      <button
                        type="button"
                        onClick={() =>
                          setLines(lines.filter((_, idx) => idx !== i))
                        }
                        className="text-slate-400 hover:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-[#F4F5F8] font-bold border-t border-slate-300">
              <tr>
                <td colSpan={2} className="px-3 py-2.5 text-right uppercase text-slate-600">
                  Total
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-slate-900">
                  {formatCents(totalDebitCents)}
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-slate-900">
                  {formatCents(totalCreditCents)}
                </td>
                <td colSpan={3} className="px-3 py-2.5">
                  {isBalanced ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#2CA01C]">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Balanced
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-amber-700">
                      Difference:{" "}
                      {formatCents(Math.abs(totalDebitCents - totalCreditCents))}
                    </span>
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() =>
              setLines([
                ...lines,
                {
                  accountId: state.accounts[0]?.id ?? "acc-1000",
                  debit: "",
                  credit: "",
                  description: "",
                  entityName: "",
                },
              ])
            }
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            <Plus className="h-3.5 w-3.5" /> Add Line
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isBalanced || isSubmitting}
              className="rounded-full bg-[#2CA01C] px-6 py-2 text-sm font-semibold text-white hover:bg-[#248217] disabled:opacity-50"
            >
              {isSubmitting ? "Posting..." : "Save and Post"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

// ============================================================================
// 4. Create Customer Invoice Modal
// ============================================================================

function CreateInvoiceModal({
  state,
  onClose,
  runAction,
  isSubmitting,
}: {
  state: ComputedQboState;
  onClose: () => void;
  runAction: (action: string, payload?: unknown, successMsg?: string) => Promise<void>;
  isSubmitting: boolean;
}) {
  const incomeAccounts = state.accounts.filter((a) => a.type === "Income");
  const [customerId, setCustomerId] = useState(
    state.customers[0]?.id ?? "cust-1"
  );
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("2026-11-25");
  const [lines, setLines] = useState([
    {
      serviceName: "Landscape Design & Installation",
      description: "Backyard patio pavers & drought-tolerant planting",
      quantity: 1,
      rateDollars: "1250.00",
      incomeAccountId: incomeAccounts[0]?.id ?? "acc-4010",
    },
  ]);

  function safeRateCents(val: string): number {
    try {
      return Math.max(0, parseDollarsToCents(val));
    } catch {
      return 0;
    }
  }

  const totalCents = lines.reduce(
    (s, l) => s + Math.round(l.quantity * safeRateCents(l.rateDollars)),
    0
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await runAction(
      "create_invoice",
      {
        customerId,
        date,
        dueDate,
        lines: lines.map((l) => ({
          serviceName: l.serviceName,
          description: l.description,
          quantity: Number(l.quantity) || 1,
          rateCents: safeRateCents(l.rateDollars),
          incomeAccountId: l.incomeAccountId,
        })),
      },
      `Created Invoice for ${formatCents(totalCents)} and posted to A/R`
    );
    onClose();
  }

  return (
    <div className="w-full max-w-4xl rounded-xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 bg-[#1E252B] text-white">
        <div className="flex items-center gap-2.5">
          <FileText className="h-5 w-5 text-[#2CA01C]" />
          <div>
            <h2 className="text-base font-bold">
              Create Invoice #{1001 + state.invoices.length}
            </h2>
            <p className="text-xs text-slate-300">
              Automatically debits Accounts Receivable (1100) and credits Service Income
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="block text-[10px] uppercase tracking-wider text-slate-400">
              Balance Due
            </span>
            <span className="text-lg font-mono font-bold text-white">
              {formatCents(totalCents)}
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-300 hover:bg-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
              Customer
            </label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              {state.customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
              Invoice Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
              Due Date (Net 30)
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F4F5F8] border-b border-slate-200 text-slate-600 uppercase">
              <tr>
                <th className="px-3 py-2.5">Product / Service</th>
                <th className="px-3 py-2.5">Description</th>
                <th className="px-3 py-2.5">Income Account</th>
                <th className="px-3 py-2.5 w-20 text-right">Qty</th>
                <th className="px-3 py-2.5 w-28 text-right">Rate ($)</th>
                <th className="px-3 py-2.5 w-28 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {lines.map((line, i) => {
                const lineAmt = Math.round(
                  line.quantity * safeRateCents(line.rateDollars)
                );
                return (
                  <tr key={i}>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={line.serviceName}
                        onChange={(e) => {
                          const next = [...lines];
                          next[i].serviceName = e.target.value;
                          setLines(next);
                        }}
                        required
                        className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs font-medium"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={line.description}
                        onChange={(e) => {
                          const next = [...lines];
                          next[i].description = e.target.value;
                          setLines(next);
                        }}
                        className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={line.incomeAccountId}
                        onChange={(e) => {
                          const next = [...lines];
                          next[i].incomeAccountId = e.target.value;
                          setLines(next);
                        }}
                        className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-xs"
                      >
                        {incomeAccounts.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.code} — {a.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={1}
                        value={line.quantity}
                        onChange={(e) => {
                          const next = [...lines];
                          next[i].quantity = Number(e.target.value) || 1;
                          setLines(next);
                        }}
                        className="w-full rounded border border-slate-300 px-2 py-1.5 text-right font-mono text-xs"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={line.rateDollars}
                        onChange={(e) => {
                          const next = [...lines];
                          next[i].rateDollars = e.target.value;
                          setLines(next);
                        }}
                        className="w-full rounded border border-slate-300 px-2 py-1.5 text-right font-mono text-xs"
                      />
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-semibold text-slate-900">
                      {formatCents(lineAmt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() =>
              setLines([
                ...lines,
                {
                  serviceName: "Sprinkler Heads & Fittings",
                  description: "Additional zone installation",
                  quantity: 1,
                  rateDollars: "350.00",
                  incomeAccountId: incomeAccounts[0]?.id ?? "acc-4010",
                },
              ])
            }
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            <Plus className="h-3.5 w-3.5" /> Add Service Line
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || totalCents <= 0}
              className="rounded-full bg-[#2CA01C] px-6 py-2 text-sm font-semibold text-white hover:bg-[#248217] disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : "Save and Send Invoice"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

// ============================================================================
// 5. Create Expense or Vendor Bill Modal
// ============================================================================

function CreateExpenseModal({
  initialType,
  state,
  onClose,
  runAction,
  isSubmitting,
}: {
  initialType: "Expense" | "Bill";
  state: ComputedQboState;
  onClose: () => void;
  runAction: (action: string, payload?: unknown, successMsg?: string) => Promise<void>;
  isSubmitting: boolean;
}) {
  const [type, setType] = useState<"Expense" | "Bill">(initialType);
  const [vendorName, setVendorName] = useState(
    state.vendors[0]?.name ?? "Tania's Nursery"
  );
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("2026-11-25");
  const bankAccounts = state.accounts.filter(
    (a) => a.type === "Bank" || a.type === "Credit Card"
  );
  const expenseAccounts = state.accounts.filter(
    (a) => a.type === "Expenses" || a.type === "Cost of Goods Sold"
  );
  const [paymentAccountId, setPaymentAccountId] = useState(
    bankAccounts[0]?.id ?? "acc-1000"
  );
  const [categoryAccountId, setCategoryAccountId] = useState(
    expenseAccounts[0]?.id ?? "acc-5010"
  );
  const [description, setDescription] = useState(
    "Wholesale soil, fertilizer & landscaping supplies"
  );
  const [amountDollars, setAmountDollars] = useState("425.00");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    let cents = 0;
    try {
      cents = parseDollarsToCents(amountDollars);
    } catch {
      return;
    }
    if (cents <= 0) return;

    await runAction(
      "create_expense",
      {
        type,
        vendorName,
        date,
        dueDate: type === "Bill" ? dueDate : undefined,
        paymentAccountId,
        categoryAccountId,
        description,
        amountCents: cents,
      },
      `Recorded ${type} for ${formatCents(cents)} (${vendorName})`
    );
    onClose();
  }

  return (
    <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 bg-[#1E252B] text-white">
        <div className="flex items-center gap-2.5">
          <Receipt className="h-5 w-5 text-[#2CA01C]" />
          <h2 className="text-base font-bold">
            Record {type === "Bill" ? "Vendor Bill (A/P)" : "Cash / Card Expense"}
          </h2>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-slate-300 hover:bg-slate-700"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div className="flex gap-2 rounded-lg bg-[#F4F5F8] p-1 w-fit">
          <button
            type="button"
            onClick={() => setType("Expense")}
            className={`rounded-md px-4 py-1.5 text-xs font-semibold transition-colors ${
              type === "Expense"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600"
            }`}
          >
            Immediate Expense (Paid Now)
          </button>
          <button
            type="button"
            onClick={() => setType("Bill")}
            className={`rounded-md px-4 py-1.5 text-xs font-semibold transition-colors ${
              type === "Bill"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600"
            }`}
          >
            Vendor Bill (Accounts Payable)
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
              Payee / Vendor
            </label>
            <input
              type="text"
              list="qbo-vendors-list"
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <datalist id="qbo-vendors-list">
              {state.vendors.map((v) => (
                <option key={v.id} value={v.name} />
              ))}
            </datalist>
          </div>

          {type === "Expense" ? (
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                Payment Account (Bank / Card)
              </label>
              <select
                value={paymentAccountId}
                onChange={(e) => setPaymentAccountId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                {bankAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.code} — {a.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                Due Date (Posts to 2000 A/P)
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
              Category (COGS / Expense)
            </label>
            <select
              value={categoryAccountId}
              onChange={(e) => setCategoryAccountId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              {expenseAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.code} — {a.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
              Amount ($)
            </label>
            <input
              type="text"
              value={amountDollars}
              onChange={(e) => setAmountDollars(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-right font-mono text-sm font-semibold"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
            Description / Memo
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-full bg-[#2CA01C] px-6 py-2 text-sm font-semibold text-white hover:bg-[#248217]"
          >
            {isSubmitting ? "Saving..." : `Save ${type}`}
          </button>
        </div>
      </form>
    </div>
  );
}

// ============================================================================
// 6. Create Chart of Accounts Item Modal
// ============================================================================

function CreateAccountModal({
  onClose,
  runAction,
  isSubmitting,
}: {
  onClose: () => void;
  runAction: (action: string, payload?: unknown, successMsg?: string) => Promise<void>;
  isSubmitting: boolean;
}) {
  const [code, setCode] = useState("6150");
  const [name, setName] = useState("Small Tools & Safety Gear");
  const [type, setType] = useState<AccountType>("Expenses");
  const [detailType, setDetailType] = useState("Supplies & Materials");

  const accountTypes: AccountType[] = [
    "Bank",
    "Accounts Receivable",
    "Other Current Assets",
    "Fixed Assets",
    "Accounts Payable",
    "Credit Card",
    "Other Current Liabilities",
    "Long Term Liabilities",
    "Equity",
    "Income",
    "Cost of Goods Sold",
    "Expenses",
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await runAction(
      "create_account",
      { code, name, type, detailType },
      `Added account ${code} — ${name} to Chart of Accounts`
    );
    onClose();
  }

  return (
    <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 bg-[#1E252B] text-white">
        <div className="flex items-center gap-2">
          <Landmark className="h-5 w-5 text-[#2CA01C]" />
          <h2 className="text-base font-bold">New Chart of Accounts Item</h2>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-slate-300 hover:bg-slate-700"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
              Account Code
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
              Account Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
              Account Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as AccountType)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              {accountTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
              Detail Type
            </label>
            <input
              type="text"
              value={detailType}
              onChange={(e) => setDetailType(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-full bg-[#2CA01C] px-6 py-2 text-sm font-semibold text-white hover:bg-[#248217]"
          >
            Save and Close
          </button>
        </div>
      </form>
    </div>
  );
}
