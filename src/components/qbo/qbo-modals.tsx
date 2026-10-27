"use client";

import React, { useState } from "react";
import {
  ArrowLeftRight,
  CheckCircle2,
  ClipboardList,
  Download,
  FileSpreadsheet,
  FileText,
  Landmark,
  Package,
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
  computeRowAmountCents,
  normalizeDateString,
  parseCsvTextToPreview,
  type ParsedCsvPreview,
} from "@/lib/csv-parser";
import { BANK_CSV_PRESETS } from "@/lib/sample-bank-csvs";

export type ActiveModalType =
  | null
  | "quick_create"
  | "csv_import"
  | "journal_entry"
  | "invoice"
  | "estimate"
  | "product_service"
  | "transfer"
  | "expense"
  | "bill"
  | "account"
  | "customer"
  | "vendor";

interface ModalsProps {
  activeModal: ActiveModalType;
  setActiveModal: (modal: ActiveModalType) => void;
  state: ComputedQboState;
  runAction: (
    action: string,
    payload?: unknown,
    successMsg?: string
  ) => Promise<void>;
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
      {activeModal === "estimate" && (
        <CreateEstimateModal
          state={state}
          onClose={() => setActiveModal(null)}
          runAction={runAction}
          isSubmitting={isSubmitting}
        />
      )}
      {activeModal === "product_service" && (
        <CreateProductServiceModal
          state={state}
          onClose={() => setActiveModal(null)}
          runAction={runAction}
          isSubmitting={isSubmitting}
        />
      )}
      {activeModal === "transfer" && (
        <CreateTransferModal
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
      {activeModal === "customer" && (
        <CreateCustomerModal
          onClose={() => setActiveModal(null)}
          runAction={runAction}
          isSubmitting={isSubmitting}
        />
      )}
      {activeModal === "vendor" && (
        <CreateVendorModal
          state={state}
          onClose={() => setActiveModal(null)}
          runAction={runAction}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
}

// ============================================================================
// 1. QuickBooks "+ New" 3-Column Quick Create Modal
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
            <button
              onClick={() => onSelect("estimate")}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-emerald-50 hover:text-[#2CA01C]"
            >
              <ClipboardList className="h-4 w-4 text-[#2CA01C]" />
              Estimate / Quote
            </button>
            <button
              onClick={() => onSelect("product_service")}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-emerald-50 hover:text-[#2CA01C]"
            >
              <Package className="h-4 w-4 text-[#2CA01C]" />
              Product / Service Item
            </button>
            <button
              onClick={() => onSelect("customer")}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-emerald-50 hover:text-[#2CA01C]"
            >
              <Plus className="h-4 w-4 text-[#2CA01C]" />
              New Customer Profile
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
              Expense (Cash / Card)
            </button>
            <button
              onClick={() => onSelect("bill")}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-emerald-50 hover:text-[#2CA01C]"
            >
              <FileSpreadsheet className="h-4 w-4 text-[#2CA01C]" />
              Vendor Bill (A/P)
            </button>
            <button
              onClick={() => onSelect("vendor")}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-emerald-50 hover:text-[#2CA01C]"
            >
              <Plus className="h-4 w-4 text-[#2CA01C]" />
              New Vendor Profile
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
              onClick={() => onSelect("transfer")}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-emerald-50 hover:text-[#2CA01C]"
            >
              <ArrowLeftRight className="h-4 w-4 text-[#2CA01C]" />
              Bank Transfer
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
// 2. Bank CSV Upload & Multi-Bank Column Mapping Modal
// ============================================================================

function CsvImportModal({
  state,
  onClose,
  runAction,
  isSubmitting,
}: {
  state: ComputedQboState;
  onClose: () => void;
  runAction: (
    action: string,
    payload?: unknown,
    successMsg?: string
  ) => Promise<void>;
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
  const [moneyOutIdx, setMoneyOutIdx] = useState(-1);
  const [moneyInIdx, setMoneyInIdx] = useState(-1);
  const [isSplitAmount, setIsSplitAmount] = useState(false);
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
      setMoneyOutIdx(parsed.suggestedMapping.moneyOutIndex);
      setMoneyInIdx(parsed.suggestedMapping.moneyInIndex);
      setIsSplitAmount(parsed.suggestedMapping.isSplitAmount);
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

  function downloadSampleCsv(presetId: string) {
    const preset =
      BANK_CSV_PRESETS.find((p) => p.id === presetId) ?? BANK_CSV_PRESETS[0];
    const blob = new Blob([preset.csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${preset.id}-statement.csv`;
    a.click();
  }

  async function handleImportSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!preview || preview.rawRows.length === 0) {
      setError("Please upload a CSV file or select one of the 4 bank presets.");
      return;
    }

    const mappedRows = preview.rawRows
      .map((r) => ({
        date: normalizeDateString(r[dateIdx] ?? ""),
        description: (r[descIdx] ?? "").trim(),
        amountCents: computeRowAmountCents(r, {
          amountIndex: amountIdx,
          moneyOutIndex: moneyOutIdx,
          moneyInIndex: moneyInIdx,
          isSplitAmount,
        }),
        payee: payeeIdx >= 0 ? (r[payeeIdx] ?? "").trim() : undefined,
      }))
      .filter((r) => r.description && r.amountCents !== 0);

    if (mappedRows.length === 0) {
      setError(
        "No valid non-zero transactions found with the selected column mapping."
      );
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
              Supports single Amount or split Money Out/Money In columns, duplicate detection, and auto-rules
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

      <form
        onSubmit={handleImportSubmit}
        className="p-6 space-y-5 max-h-[84vh] overflow-y-auto"
      >
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1.5">
              1. Target QuickBooks Account
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

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1.5">
              Upload .CSV from Computer
            </label>
            <div className="flex items-center gap-2">
              <label className="flex-1 cursor-pointer inline-flex items-center justify-center gap-2 rounded-lg border border-dashed border-[#2CA01C] bg-emerald-50/50 px-3 py-2 text-xs font-bold text-[#2CA01C] hover:bg-emerald-50">
                <Upload className="h-4 w-4" />
                <span>Select .CSV File from Disk</span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              <button
                type="button"
                onClick={() => downloadSampleCsv("chase-checking")}
                title="Download sample .csv file to test uploading from your computer"
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Download className="h-3.5 w-3.5" />
                Sample .CSV
              </button>
            </div>
          </div>
        </div>

        {/* 4 Real Bank Format Presets */}
        <div>
          <label className="block text-xs font-semibold uppercase text-slate-600 mb-1.5">
            2. Or Test One of 4 Real Bank Export Formats Instantly
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
            {BANK_CSV_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  setBankAccountId(preset.defaultAccountId);
                  handleTextChange(preset.csvContent);
                }}
                className="text-left rounded-lg border border-slate-200 bg-slate-50 p-2.5 hover:border-[#2CA01C] hover:bg-emerald-50/40 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">
                    {preset.bankName}
                  </span>
                  <Sparkles className="h-3 w-3 text-[#2CA01C]" />
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">
                  {preset.formatDescription}
                </p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
            Raw CSV Content
          </label>
          <textarea
            rows={4}
            value={csvText}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder="Click a bank preset above or choose a .CSV file from your computer..."
            className="w-full rounded-lg border border-slate-300 font-mono text-xs p-3 text-slate-800 focus:border-[#2CA01C] focus:outline-none"
          />
        </div>

        {preview && preview.headers.length > 0 && (
          <div className="space-y-4 rounded-xl border border-slate-200 bg-[#F4F5F8] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                3. Column Mapping &amp; Live Preview ({preview.rawRows.length}{" "}
                rows)
              </h3>
              <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={isSplitAmount}
                  onChange={(e) => setIsSplitAmount(e.target.checked)}
                  className="accent-[#2CA01C]"
                />
                Split Money Out / Money In columns (e.g. Bank of America)
              </label>
            </div>

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

              {!isSplitAmount ? (
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
              ) : (
                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <label className="block text-[10px] font-medium text-slate-600 mb-1">
                      Money Out
                    </label>
                    <select
                      value={moneyOutIdx}
                      onChange={(e) => setMoneyOutIdx(Number(e.target.value))}
                      className="w-full rounded border border-slate-300 bg-white px-1.5 py-1.5 text-xs"
                    >
                      {preview.headers.map((h, i) => (
                        <option key={i} value={i}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-slate-600 mb-1">
                      Money In
                    </label>
                    <select
                      value={moneyInIdx}
                      onChange={(e) => setMoneyInIdx(Number(e.target.value))}
                      className="w-full rounded border border-slate-300 bg-white px-1.5 py-1.5 text-xs"
                    >
                      {preview.headers.map((h, i) => (
                        <option key={i} value={i}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Payee Column
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
                    <th className="px-3 py-2">Normalized Date</th>
                    <th className="px-3 py-2">Description</th>
                    <th className="px-3 py-2">Payee</th>
                    <th className="px-3 py-2 text-right">
                      Amount (Integer Cents)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {preview.rawRows.slice(0, 7).map((row, idx) => {
                    const cents = computeRowAmountCents(row, {
                      amountIndex: amountIdx,
                      moneyOutIndex: moneyOutIdx,
                      moneyInIndex: moneyInIdx,
                      isSplitAmount,
                    });
                    return (
                      <tr key={idx}>
                        <td className="px-3 py-1.5 font-mono text-slate-600">
                          {normalizeDateString(row[dateIdx] ?? "")}
                        </td>
                        <td className="px-3 py-1.5 font-medium text-slate-800">
                          {row[descIdx]}
                        </td>
                        <td className="px-3 py-1.5 text-slate-600">
                          {payeeIdx >= 0 ? row[payeeIdx] : "Rule Auto"}
                        </td>
                        <td
                          className={`px-3 py-1.5 text-right font-mono font-semibold ${
                            cents >= 0 ? "text-[#2CA01C]" : "text-slate-900"
                          }`}
                        >
                          {formatCents(cents)}{" "}
                          <span className="text-[10px] text-slate-400">
                            ({cents}¢)
                          </span>
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
  runAction: (
    action: string,
    payload?: unknown,
    successMsg?: string
  ) => Promise<void>;
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

      <form
        onSubmit={handleSubmit}
        className="p-6 space-y-5 max-h-[82vh] overflow-y-auto"
      >
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
                <td
                  colSpan={2}
                  className="px-3 py-2.5 text-right uppercase text-slate-600"
                >
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
// 4. Create Customer Invoice Modal (with Product/Service Catalog selector)
// ============================================================================

function CreateInvoiceModal({
  state,
  onClose,
  runAction,
  isSubmitting,
}: {
  state: ComputedQboState;
  onClose: () => void;
  runAction: (
    action: string,
    payload?: unknown,
    successMsg?: string
  ) => Promise<void>;
  isSubmitting: boolean;
}) {
  const incomeAccounts = state.accounts.filter((a) => a.type === "Income");
  const [customerId, setCustomerId] = useState(
    state.customers[0]?.id ?? "cust-1"
  );
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("2026-11-25");
  const firstCatalog = state.productsAndServices[0];
  const [applySalesTax, setApplySalesTax] = useState(true);
  const [taxRateInput, setTaxRateInput] = useState(
    String(state.salesTaxRatePercent ?? 8.25)
  );
  const [lines, setLines] = useState([
    {
      serviceName:
        firstCatalog?.name ?? "Landscape Design & Installation",
      description:
        firstCatalog?.description ??
        "Backyard patio pavers & drought-tolerant planting",
      quantity: 1,
      rateDollars: ((firstCatalog?.rateCents ?? 125000) / 100).toFixed(2),
      incomeAccountId:
        firstCatalog?.incomeAccountId ?? incomeAccounts[0]?.id ?? "acc-4010",
      taxable: true,
    },
  ]);

  function safeRateCents(val: string): number {
    try {
      return Math.max(0, parseDollarsToCents(val));
    } catch {
      return 0;
    }
  }

  const subtotalCents = lines.reduce(
    (s, l) => s + Math.round(l.quantity * safeRateCents(l.rateDollars)),
    0
  );
  const taxableSubtotalCents = lines.reduce(
    (s, l) =>
      l.taxable
        ? s + Math.round(l.quantity * safeRateCents(l.rateDollars))
        : s,
    0
  );
  const effectiveTaxRate = applySalesTax
    ? Math.max(0, Number(taxRateInput) || 0)
    : 0;
  const taxCents = applySalesTax
    ? Math.round((taxableSubtotalCents * effectiveTaxRate) / 100)
    : 0;
  const totalCents = subtotalCents + taxCents;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await runAction(
      "create_invoice",
      {
        customerId,
        date,
        dueDate,
        applySalesTax,
        taxRatePercent: effectiveTaxRate,
        lines: lines.map((l) => ({
          serviceName: l.serviceName,
          description: l.description,
          quantity: Number(l.quantity) || 1,
          rateCents: safeRateCents(l.rateDollars),
          incomeAccountId: l.incomeAccountId,
          taxable: l.taxable,
        })),
      },
      `Created Invoice for ${formatCents(totalCents)} (${
        taxCents > 0
          ? `Subtotal ${formatCents(subtotalCents)} + Sales Tax ${formatCents(taxCents)}`
          : "No Sales Tax"
      }) and posted to A/R`
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
                <th className="px-3 py-2.5 w-16 text-center">Tax</th>
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
                      <select
                        value={line.serviceName}
                        onChange={(e) => {
                          const selected = state.productsAndServices.find(
                            (p) => p.name === e.target.value
                          );
                          const next = [...lines];
                          next[i].serviceName = e.target.value;
                          if (selected) {
                            next[i].description = selected.description;
                            next[i].rateDollars = (
                              selected.rateCents / 100
                            ).toFixed(2);
                            next[i].incomeAccountId = selected.incomeAccountId;
                          }
                          setLines(next);
                        }}
                        className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium"
                      >
                        {state.productsAndServices.map((p) => (
                          <option key={p.id} value={p.name}>
                            {p.name} ({formatCents(p.rateCents)})
                          </option>
                        ))}
                      </select>
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
                    <td className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={line.taxable}
                        onChange={(e) => {
                          const next = [...lines];
                          next[i].taxable = e.target.checked;
                          setLines(next);
                        }}
                        className="h-4 w-4 rounded border-slate-300 text-[#2CA01C] focus:ring-[#2CA01C]"
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

        {/* Sales Tax & Totals Summary Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-slate-200 bg-[#F4F5F8] p-4">
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={applySalesTax}
                onChange={(e) => setApplySalesTax(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-[#2CA01C] focus:ring-[#2CA01C]"
              />
              Charge Sales Tax (2200 Sales Tax Payable)
            </label>
            {applySalesTax && (
              <div className="inline-flex items-center gap-1.5">
                <span className="text-xs text-slate-500">Rate (%):</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="50"
                  value={taxRateInput}
                  onChange={(e) => setTaxRateInput(e.target.value)}
                  className="w-20 rounded border border-slate-300 bg-white px-2 py-1 text-right font-mono text-xs font-semibold"
                />
              </div>
            )}
          </div>

          <div className="space-y-1 text-right min-w-[220px]">
            <div className="flex justify-between text-xs text-slate-600">
              <span>Subtotal:</span>
              <span className="font-mono font-semibold text-slate-800">
                {formatCents(subtotalCents)}
              </span>
            </div>
            <div className="flex justify-between text-xs text-slate-600">
              <span>
                Sales Tax ({applySalesTax ? `${effectiveTaxRate}%` : "0%"}):
              </span>
              <span className="font-mono font-semibold text-slate-800">
                {formatCents(taxCents)}
              </span>
            </div>
            <div className="flex justify-between text-sm font-bold text-slate-900 border-t border-slate-300 pt-1">
              <span>Invoice Total (Debit A/R):</span>
              <span className="font-mono text-[#2CA01C]">
                {formatCents(totalCents)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() =>
              setLines([
                ...lines,
                {
                  serviceName:
                    state.productsAndServices[1]?.name ??
                    "Pond & Irrigation Installation",
                  description:
                    state.productsAndServices[1]?.description ??
                    "Additional zone installation",
                  quantity: 1,
                  rateDollars: "350.00",
                  incomeAccountId: incomeAccounts[0]?.id ?? "acc-4010",
                  taxable: true,
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
// 5. Create Estimate / Quote Modal
// ============================================================================

function CreateEstimateModal({
  state,
  onClose,
  runAction,
  isSubmitting,
}: {
  state: ComputedQboState;
  onClose: () => void;
  runAction: (
    action: string,
    payload?: unknown,
    successMsg?: string
  ) => Promise<void>;
  isSubmitting: boolean;
}) {
  const incomeAccounts = state.accounts.filter((a) => a.type === "Income");
  const [customerId, setCustomerId] = useState(
    state.customers[0]?.id ?? "cust-1"
  );
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [expirationDate, setExpirationDate] = useState("2026-11-30");
  const [serviceName, setServiceName] = useState(
    state.productsAndServices[0]?.name ?? "Landscape Architecture Design"
  );
  const [description, setDescription] = useState(
    "Complete front & backyard landscaping proposal"
  );
  const [rateDollars, setRateDollars] = useState("2850.00");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    let cents = 0;
    try {
      cents = parseDollarsToCents(rateDollars);
    } catch {
      return;
    }
    if (cents <= 0) return;

    await runAction(
      "create_estimate",
      {
        customerId,
        date,
        expirationDate,
        lines: [
          {
            serviceName,
            description,
            quantity: 1,
            rateCents: cents,
            incomeAccountId: incomeAccounts[0]?.id ?? "acc-4010",
          },
        ],
      },
      `Created Estimate for ${formatCents(cents)}`
    );
    onClose();
  }

  return (
    <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 bg-[#1E252B] text-white">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-[#2CA01C]" />
          <h2 className="text-base font-bold">
            New Customer Estimate / Quote (EST-{2001 + state.estimates.length})
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
              Estimate Date
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
              Expiration Date
            </label>
            <input
              type="date"
              value={expirationDate}
              onChange={(e) => setExpirationDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
              Product / Service
            </label>
            <input
              type="text"
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
              Quoted Amount ($)
            </label>
            <input
              type="text"
              value={rateDollars}
              onChange={(e) => setRateDollars(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-right font-mono text-sm font-bold"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
            Scope of Work / Description
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
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
            Save Estimate
          </button>
        </div>
      </form>
    </div>
  );
}

// ============================================================================
// 6. Create Product / Service Catalog Item Modal
// ============================================================================

function CreateProductServiceModal({
  state,
  onClose,
  runAction,
  isSubmitting,
}: {
  state: ComputedQboState;
  onClose: () => void;
  runAction: (
    action: string,
    payload?: unknown,
    successMsg?: string
  ) => Promise<void>;
  isSubmitting: boolean;
}) {
  const incomeAccounts = state.accounts.filter((a) => a.type === "Income");
  const [name, setName] = useState("Seasonal Tree Pruning & Mulching");
  const [sku, setSku] = useState("MNT-350");
  const [type, setType] = useState<"Service" | "Non-Inventory" | "Inventory">(
    "Service"
  );
  const [description, setDescription] = useState(
    "Canopy thinning, deadwood removal & organic bark mulch"
  );
  const [rateDollars, setRateDollars] = useState("450.00");
  const [incomeAccountId, setIncomeAccountId] = useState(
    incomeAccounts[0]?.id ?? "acc-4010"
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    let rateCents = 0;
    try {
      rateCents = parseDollarsToCents(rateDollars);
    } catch {
      return;
    }
    await runAction(
      "create_product_service",
      {
        name,
        sku,
        type,
        description,
        rateCents,
        incomeAccountId,
      },
      `Added "${name}" to Products & Services catalog`
    );
    onClose();
  }

  return (
    <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 bg-[#1E252B] text-white">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-[#2CA01C]" />
          <h2 className="text-base font-bold">
            New Product / Service Item
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
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
              Item Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
              SKU
            </label>
            <input
              type="text"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
              Type
            </label>
            <select
              value={type}
              onChange={(e) =>
                setType(
                  e.target.value as "Service" | "Non-Inventory" | "Inventory"
                )
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="Service">Service</option>
              <option value="Non-Inventory">Non-Inventory</option>
              <option value="Inventory">Inventory</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
              Sales Price / Rate ($)
            </label>
            <input
              type="text"
              value={rateDollars}
              onChange={(e) => setRateDollars(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-right font-mono text-sm font-bold"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
              Income Account
            </label>
            <select
              value={incomeAccountId}
              onChange={(e) => setIncomeAccountId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              {incomeAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.code} — {a.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
            Description on Sales Forms
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
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
            Save Item
          </button>
        </div>
      </form>
    </div>
  );
}

// ============================================================================
// 7. Bank Transfer Modal
// ============================================================================

function CreateTransferModal({
  state,
  onClose,
  runAction,
  isSubmitting,
}: {
  state: ComputedQboState;
  onClose: () => void;
  runAction: (
    action: string,
    payload?: unknown,
    successMsg?: string
  ) => Promise<void>;
  isSubmitting: boolean;
}) {
  const bankAccounts = state.accounts.filter(
    (a) => a.type === "Bank" || a.type === "Credit Card"
  );
  const [fromAccountId, setFromAccountId] = useState("acc-1000");
  const [toAccountId, setToAccountId] = useState("acc-1010");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [amountDollars, setAmountDollars] = useState("1000.00");
  const [memo, setMemo] = useState("Monthly transfer to Business Savings reserve");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    let amountCents = 0;
    try {
      amountCents = parseDollarsToCents(amountDollars);
    } catch {
      return;
    }
    if (amountCents <= 0) return;

    await runAction(
      "create_transfer",
      {
        fromAccountId,
        toAccountId,
        date,
        amountCents,
        memo,
      },
      `Transferred ${formatCents(amountCents)} between accounts`
    );
    onClose();
  }

  return (
    <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 bg-[#1E252B] text-white">
        <div className="flex items-center gap-2">
          <ArrowLeftRight className="h-5 w-5 text-[#2CA01C]" />
          <h2 className="text-base font-bold">Transfer Funds Between Accounts</h2>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-slate-300 hover:bg-slate-700"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
            Transfer Funds From
          </label>
          <select
            value={fromAccountId}
            onChange={(e) => setFromAccountId(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            {bankAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.code} — {a.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
            Transfer Funds To
          </label>
          <select
            value={toAccountId}
            onChange={(e) => setToAccountId(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            {bankAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.code} — {a.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
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
              Transfer Amount ($)
            </label>
            <input
              type="text"
              value={amountDollars}
              onChange={(e) => setAmountDollars(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-right font-mono text-sm font-bold"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
            Memo
          </label>
          <input
            type="text"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
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
            disabled={isSubmitting || fromAccountId === toAccountId}
            className="rounded-full bg-[#2CA01C] px-6 py-2 text-sm font-semibold text-white hover:bg-[#248217] disabled:opacity-50"
          >
            Save Transfer
          </button>
        </div>
      </form>
    </div>
  );
}

// ============================================================================
// 8. Create Expense or Vendor Bill Modal
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
  runAction: (
    action: string,
    payload?: unknown,
    successMsg?: string
  ) => Promise<void>;
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
// 9. Create Chart of Accounts Item Modal
// ============================================================================

function CreateAccountModal({
  onClose,
  runAction,
  isSubmitting,
}: {
  onClose: () => void;
  runAction: (
    action: string,
    payload?: unknown,
    successMsg?: string
  ) => Promise<void>;
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

// ============================================================================
// 10. Create New Customer Profile Modal
// ============================================================================

function CreateCustomerModal({
  onClose,
  runAction,
  isSubmitting,
}: {
  onClose: () => void;
  runAction: (
    action: string,
    payload?: unknown,
    successMsg?: string
  ) => Promise<void>;
  isSubmitting: boolean;
}) {
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await runAction(
      "create_customer",
      {
        name: name.trim(),
        company: company.trim() || name.trim(),
        email: email.trim(),
        phone: phone.trim(),
      },
      `Added customer "${name.trim()}" to Customer Directory`
    );
    onClose();
  }

  return (
    <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 bg-[#1E252B] text-white">
        <div className="flex items-center gap-2">
          <Plus className="h-5 w-5 text-[#2CA01C]" />
          <div>
            <h2 className="text-base font-bold">New Customer Profile</h2>
            <p className="text-xs text-slate-300">
              Create a customer for Invoices, Estimates &amp; A/R Tracking
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

      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
              Customer Display Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Redwood Tech Campus"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
              Company Name
            </label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="e.g. Redwood Properties LLC"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ap@redwoodcampus.com"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
              Phone Number
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(650) 555-0192"
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
            disabled={isSubmitting || !name.trim()}
            className="rounded-full bg-[#2CA01C] px-6 py-2 text-sm font-semibold text-white hover:bg-[#248217] disabled:opacity-50"
          >
            {isSubmitting ? "Saving..." : "Save Customer"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ============================================================================
// 11. Create New Vendor Profile Modal
// ============================================================================

function CreateVendorModal({
  state,
  onClose,
  runAction,
  isSubmitting,
}: {
  state: ComputedQboState;
  onClose: () => void;
  runAction: (
    action: string,
    payload?: unknown,
    successMsg?: string
  ) => Promise<void>;
  isSubmitting: boolean;
}) {
  const expenseAccounts = state.accounts.filter(
    (a) => a.type === "Expenses" || a.type === "Cost of Goods Sold"
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [defaultExpenseAccountId, setDefaultExpenseAccountId] = useState(
    expenseAccounts[0]?.id ?? "acc-5010"
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await runAction(
      "create_vendor",
      {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        defaultExpenseAccountId,
      },
      `Added vendor "${name.trim()}" to Vendor Directory`
    );
    onClose();
  }

  return (
    <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 bg-[#1E252B] text-white">
        <div className="flex items-center gap-2">
          <Plus className="h-5 w-5 text-[#2CA01C]" />
          <div>
            <h2 className="text-base font-bold">New Vendor Profile</h2>
            <p className="text-xs text-slate-300">
              Create a supplier/vendor for Bills (A/P) &amp; Expense categorization
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

      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
            Vendor / Supplier Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Pacific Stone & Paver Supply"
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="billing@pacificstone.com"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
              Phone Number
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(650) 555-0177"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
            Default Expense / COGS Account
          </label>
          <select
            value={defaultExpenseAccountId}
            onChange={(e) => setDefaultExpenseAccountId(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            {expenseAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.code} — {a.name} ({a.type})
              </option>
            ))}
          </select>
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
            disabled={isSubmitting || !name.trim()}
            className="rounded-full bg-[#2CA01C] px-6 py-2 text-sm font-semibold text-white hover:bg-[#248217] disabled:opacity-50"
          >
            {isSubmitting ? "Saving..." : "Save Vendor"}
          </button>
        </div>
      </form>
    </div>
  );
}
