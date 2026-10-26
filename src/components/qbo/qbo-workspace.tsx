"use client";

import React, { useState } from "react";
import {
  BookOpenCheck,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  History,
  Landmark,
  LayoutDashboard,
  Lock,
  Plus,
  Receipt,
  RotateCcw,
  Scale,
  ScrollText,
  Settings,
  Upload,
} from "lucide-react";
import type { ComputedQboState } from "@/lib/qbo-store";
import { QboModals, type ActiveModalType } from "./qbo-modals";
import {
  AuditLogView,
  BankingCenterView,
  ChartOfAccountsView,
  DashboardHomeView,
  ExpensesAndVendorsView,
  JournalEntriesView,
  ReconcileView,
  ReportsCenterView,
  SalesAndInvoicesView,
  type QboNavTab,
} from "./qbo-views";

export function QboWorkspace({
  initialState,
}: {
  initialState: ComputedQboState;
}) {
  const [state, setState] = useState<ComputedQboState>(initialState);
  const [activeTab, setActiveTab] = useState<QboNavTab>("home");
  const [activeModal, setActiveModal] = useState<ActiveModalType>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  function showToast(type: "success" | "error", message: string) {
    setToast({ type, message });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4000);
  }

  async function runAction(
    action: string,
    payload?: unknown,
    successMsg?: string
  ) {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/qbo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, payload }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast("error", data.error || "Action failed");
        return;
      }
      setState(data);
      if (successMsg) {
        showToast("success", successMsg);
      }
    } catch (err) {
      showToast(
        "error",
        err instanceof Error ? err.message : "Network request failed"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const navItems: Array<{
    id: QboNavTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }> = [
    { id: "home", label: "Dashboard", icon: LayoutDashboard },
    {
      id: "banking",
      label: "Bank Transactions",
      icon: Landmark,
      badge: state.kpis.forReviewCount,
    },
    { id: "sales", label: "Sales & Invoices", icon: FileText },
    { id: "expenses", label: "Expenses & Bills", icon: Receipt },
    { id: "coa", label: "Chart of Accounts", icon: ScrollText },
    { id: "journals", label: "Journal Entries", icon: Scale },
    { id: "reports", label: "Reports Center", icon: FileSpreadsheet },
    { id: "reconcile", label: "Reconcile & Lock", icon: Lock },
    { id: "audit", label: "Audit, Teams & Security", icon: History },
  ];

  return (
    <div className="min-h-screen flex bg-[#F4F5F8] text-slate-900">
      {/* Left QuickBooks Online Dark Navigation Rail */}
      <aside className="w-60 bg-[#1E252B] text-slate-200 flex flex-col justify-between shrink-0 select-none">
        <div>
          {/* QBO Brand Logo */}
          <div className="h-14 px-5 flex items-center gap-2.5 border-b border-slate-700/70">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#2CA01C] text-white font-bold">
              <BookOpenCheck className="h-4 w-4" />
            </div>
            <div className="leading-tight">
              <span className="font-bold text-sm tracking-tight text-white block">
                intuit{" "}
                <span className="text-[#2CA01C] font-extrabold">
                  quickbooks
                </span>
              </span>
              <span className="text-[10px] text-slate-400 block">
                Online Plus Clone
              </span>
            </div>
          </div>

          {/* Iconic "+ New" Button */}
          <div className="p-4">
            <button
              onClick={() => setActiveModal("quick_create")}
              className="w-full flex items-center justify-center gap-2 rounded-full bg-white text-slate-900 hover:bg-emerald-50 font-bold text-sm py-2 px-4 shadow-md transition-transform active:scale-[0.99]"
            >
              <Plus className="h-4 w-4 text-[#2CA01C] stroke-[3]" />
              <span>New</span>
            </button>
          </div>

          {/* Bookmarks / Navigation */}
          <div className="px-3">
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Bookmarks
            </p>
            <nav className="space-y-0.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center justify-between rounded-lg px-3 py-2.5 text-xs font-semibold transition-colors ${
                      isActive
                        ? "bg-[#2CA01C] text-white shadow-xs"
                        : "text-slate-300 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                    </span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                          isActive
                            ? "bg-white text-[#2CA01C]"
                            : "bg-amber-400 text-slate-950"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Bottom Sidebar Info */}
        <div className="p-4 border-t border-slate-700/70 text-[11px] text-slate-400 space-y-2">
          <div className="rounded-lg bg-slate-800/90 p-2.5 border border-slate-700">
            <p className="font-semibold text-slate-200">Static &amp; CSV Mode</p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              In-memory integer-cents engine. Manual &amp; CSV changes update reports live.
            </p>
          </div>
          <button
            onClick={() =>
              runAction(
                "reset_demo",
                {},
                "Reset sample company data to initial state"
              )
            }
            className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
          >
            <RotateCcw className="h-3 w-3" />
            Reset Sample Data
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top White QBO App Bar */}
        <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <span className="font-bold text-sm text-slate-800">
              {state.companyName}
            </span>
            <span className="hidden sm:inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-semibold text-[#2CA01C]">
              Sample Company · Integer Cents
            </span>
            <button
              onClick={() => setActiveTab("audit")}
              className={`hidden md:inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold capitalize border ${
                state.activeRole === "accountant"
                  ? "bg-amber-50 border-amber-300 text-amber-800"
                  : "bg-slate-100 border-slate-200 text-slate-700"
              }`}
              title="Click to switch role or manage team permissions"
            >
              Role:{" "}
              {state.activeRole === "accountant"
                ? "Accountant (Read-Only)"
                : state.activeRole}
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveModal("csv_import")}
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-bold text-[#2CA01C] hover:bg-emerald-100"
            >
              <Upload className="h-3.5 w-3.5" />
              Upload CSV
            </button>

            <button
              onClick={() => setActiveModal("quick_create")}
              className="inline-flex items-center gap-1 rounded-full bg-[#2CA01C] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#248217]"
            >
              <Plus className="h-3.5 w-3.5" />
              Quick Create
            </button>

            <div className="h-5 w-px bg-slate-200 mx-1" />

            <button
              onClick={() => setActiveTab("audit")}
              title="Audit Log & Settings"
              className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100"
            >
              <Settings className="h-4 w-4" />
            </button>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0077C5] text-white text-xs font-bold">
              CD
            </div>
          </div>
        </header>

        {/* Toast Notification Banner */}
        {toast && (
          <div
            className={`mx-6 mt-4 flex items-center justify-between rounded-lg px-4 py-2.5 text-xs font-semibold shadow-sm ${
              toast.type === "success"
                ? "bg-emerald-600 text-white"
                : "bg-red-600 text-white"
            }`}
          >
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              {toast.message}
            </span>
            <button
              onClick={() => setToast(null)}
              className="text-white/80 hover:text-white"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Active View Content */}
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
          {activeTab === "home" && (
            <DashboardHomeView
              state={state}
              setActiveTab={setActiveTab}
              setActiveModal={setActiveModal}
              runAction={runAction}
              isSubmitting={isSubmitting}
            />
          )}
          {activeTab === "banking" && (
            <BankingCenterView
              state={state}
              setActiveTab={setActiveTab}
              setActiveModal={setActiveModal}
              runAction={runAction}
              isSubmitting={isSubmitting}
            />
          )}
          {activeTab === "sales" && (
            <SalesAndInvoicesView
              state={state}
              setActiveTab={setActiveTab}
              setActiveModal={setActiveModal}
              runAction={runAction}
              isSubmitting={isSubmitting}
            />
          )}
          {activeTab === "expenses" && (
            <ExpensesAndVendorsView
              state={state}
              setActiveTab={setActiveTab}
              setActiveModal={setActiveModal}
              runAction={runAction}
              isSubmitting={isSubmitting}
            />
          )}
          {activeTab === "coa" && (
            <ChartOfAccountsView
              state={state}
              setActiveTab={setActiveTab}
              setActiveModal={setActiveModal}
              runAction={runAction}
              isSubmitting={isSubmitting}
            />
          )}
          {activeTab === "journals" && (
            <JournalEntriesView
              state={state}
              setActiveTab={setActiveTab}
              setActiveModal={setActiveModal}
              runAction={runAction}
              isSubmitting={isSubmitting}
            />
          )}
          {activeTab === "reports" && (
            <ReportsCenterView
              state={state}
              setActiveTab={setActiveTab}
              setActiveModal={setActiveModal}
              runAction={runAction}
              isSubmitting={isSubmitting}
            />
          )}
          {activeTab === "reconcile" && (
            <ReconcileView
              state={state}
              setActiveTab={setActiveTab}
              setActiveModal={setActiveModal}
              runAction={runAction}
              isSubmitting={isSubmitting}
            />
          )}
          {activeTab === "audit" && (
            <AuditLogView
              state={state}
              setActiveTab={setActiveTab}
              setActiveModal={setActiveModal}
              runAction={runAction}
              isSubmitting={isSubmitting}
            />
          )}
        </main>
      </div>

      {/* Modals */}
      <QboModals
        activeModal={activeModal}
        setActiveModal={setActiveModal}
        state={state}
        runAction={runAction}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
