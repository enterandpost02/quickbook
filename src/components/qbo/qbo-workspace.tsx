"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  BookOpenCheck,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  FileSpreadsheet,
  FileText,
  History,
  Landmark,
  LayoutDashboard,
  Lock,
  LogOut,
  Menu,
  Plus,
  Receipt,
  RotateCcw,
  Scale,
  ScrollText,
  Search,
  Settings,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import type { ComputedQboState } from "@/lib/qbo-store";
import {
  searchQboState,
  SEARCH_KIND_LABELS,
  type QboSearchResult,
  type QboSearchResultKind,
} from "@/lib/qbo-search";
import { formatCents } from "@/lib/money";
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

export interface CurrentUserSession {
  id?: string;
  email?: string;
  fullName?: string;
  role?: "owner" | "staff" | "accountant";
}

export function QboWorkspace({
  initialState,
  currentUser,
}: {
  initialState: ComputedQboState;
  currentUser?: CurrentUserSession;
}) {
  const [state, setState] = useState<ComputedQboState>(initialState);
  const [activeTab, setActiveTab] = useState<QboNavTab>("home");
  const [activeModal, setActiveModal] = useState<ActiveModalType>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showOrgDropdown, setShowOrgDropdown] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNewCompanyModal, setShowNewCompanyModal] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newCompanyIndustry, setNewCompanyIndustry] = useState("Professional, Scientific & Technical Services");
  const [newCompanyTaxId, setNewCompanyTaxId] = useState("");
  const [newCompanyTemplate, setNewCompanyTemplate] = useState<
    "empty" | "sample"
  >("empty");
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) {
      console.warn("Logout error:", e);
    } finally {
      window.location.href = "/login";
    }
  }

  // Top Global Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const searchResults = searchQuery.trim()
    ? searchQboState(state, searchQuery, 5)
    : [];

  // Group search results by kind
  const searchResultsByKind = searchResults.reduce<
    Record<string, QboSearchResult[]>
  >((acc, res) => {
    acc[res.kind] = acc[res.kind] ?? [];
    acc[res.kind].push(res);
    return acc;
  }, {});

  const KIND_TO_TAB: Record<QboSearchResultKind, QboNavTab> = {
    customer: "sales",
    vendor: "expenses",
    invoice: "sales",
    estimate: "sales",
    expense: "expenses",
    bank_transaction: "banking",
    account: "coa",
    journal_entry: "journals",
    product: "sales",
  };

  function handleSelectSearchResult(result: QboSearchResult) {
    setActiveTab(KIND_TO_TAB[result.kind]);
    setIsSearchOpen(false);
    setSearchQuery("");
  }

  // Keyboard shortcut listener for Ctrl+K, Cmd+K, and /
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSearchOpen(true);
        searchInputRef.current?.focus();
      } else if (
        e.key === "/" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        setIsSearchOpen(true);
        searchInputRef.current?.focus();
      } else if (e.key === "Escape") {
        setIsSearchOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Close search when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setIsSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function showToast(type: "success" | "error", message: string) {
    setToast({ type, message });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4000);
  }

  const isAuthenticatedOwner = (currentUser?.role ?? "owner") === "owner";

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
        body: JSON.stringify({
          action,
          payload,
          previewRole: state.activeRole,
        }),
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

  const renderSidebarContent = (isMobile = false) => (
    <div className="flex flex-col justify-between h-full select-none">
      <div>
        {/* Brand Logo Header */}
        <div className="h-14 px-5 flex items-center justify-between border-b border-slate-700/70">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#2CA01C] text-white font-bold">
              <BookOpenCheck className="h-4 w-4" />
            </div>
            <div className="leading-tight">
              <span className="font-bold text-sm tracking-tight text-white block">
                Pro <span className="text-[#2CA01C] font-extrabold">E Books</span>
              </span>
              <span className="text-[10px] text-slate-400 block">
                Cloud Accounting
              </span>
            </div>
          </div>
          {isMobile && (
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Close navigation menu"
              aria-label="Close navigation menu"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Iconic "+ New" Button */}
        <div className="p-4">
          <button
            onClick={() => {
              if (isMobile) setIsMobileMenuOpen(false);
              setActiveModal("quick_create");
            }}
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
                  onClick={() => {
                    setActiveTab(item.id);
                    if (isMobile) setIsMobileMenuOpen(false);
                  }}
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

      {/* Bottom Sidebar Info & Controls */}
      <div className="p-4 border-t border-slate-700/70 text-[11px] text-slate-400 space-y-2">
        <div className="rounded-lg bg-slate-800/90 p-2.5 border border-slate-700">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-slate-200">Company Ledger</p>
            <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/80 px-1.5 py-0.2 rounded border border-emerald-800">
              Production Ready
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1 truncate">
            Active: <span className="text-slate-200 font-medium">{state.companyName}</span>
          </p>
        </div>

        {isAuthenticatedOwner && (
          <>
            <button
              onClick={async () => {
                if (
                  window.confirm(
                    `Wipe all sample data for "${state.companyName}"?\n\nThis removes all invoices, bills, journal entries, and bank transactions so you can start with fresh $0.00 books for your real business.`
                  )
                ) {
                  if (isMobile) setIsMobileMenuOpen(false);
                  await runAction(
                    "wipe_transactions",
                    {},
                    `Wiped all sample transactions for "${state.companyName}". Books are now fresh with $0.00 balances!`
                  );
                }
              }}
              className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-rose-900/60 bg-rose-950/30 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-900/50 hover:text-rose-100 transition-colors"
              title="Delete all sample transactions and reset to $0.00"
            >
              <Trash2 className="h-3 w-3 text-rose-400" />
              Wipe Sample Data ($0.00)
            </button>

            <button
              onClick={async () => {
                if (
                  window.confirm(
                    `Reset "${state.companyName}" to pre-loaded sample practice data?`
                  )
                ) {
                  if (isMobile) setIsMobileMenuOpen(false);
                  await runAction(
                    "reset_demo",
                    {},
                    "Reset sample company data to initial state"
                  );
                }
              }}
              className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 py-1 text-[11px] text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              Load Demo Practice Data
            </button>
          </>
        )}

        <button
          onClick={() => {
            if (isMobile) setIsMobileMenuOpen(false);
            handleLogout();
          }}
          className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-red-500/40 bg-red-950/20 py-1.5 text-[11px] font-bold text-red-300 hover:text-white hover:bg-red-900/50 hover:border-red-500 transition-colors"
          title="Sign out of Pro E Books session and return to login"
        >
          <LogOut className="h-3 w-3" />
          Sign Out / Log Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[#F4F5F8] text-slate-900 relative">
      {/* Desktop Left Dark Navigation Rail */}
      <aside className="hidden lg:flex w-60 bg-[#1E252B] text-slate-200 flex-col justify-between shrink-0 select-none">
        {renderSidebarContent(false)}
      </aside>

      {/* Mobile Drawer (Slide-out Off-Canvas Navigation) */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <aside className="relative w-72 max-w-[85vw] bg-[#1E252B] text-slate-200 flex flex-col justify-between shrink-0 shadow-2xl z-10 select-none h-full overflow-y-auto animate-in slide-in-from-left duration-200">
            {renderSidebarContent(true)}
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top White QBO App Bar */}
        <header className="h-14 bg-white border-b border-slate-200 px-3 sm:px-6 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Mobile Hamburger Toggle Button */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 shrink-0"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Multi-Company Switcher Dropdown */}
            <div className="relative shrink-0 min-w-0 max-w-[130px] sm:max-w-xs">
              <button
                onClick={() => setShowOrgDropdown((v) => !v)}
                className="inline-flex items-center gap-1.5 sm:gap-2 rounded-lg border border-slate-200 bg-slate-50/80 hover:bg-slate-100 px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-bold text-slate-800 transition-colors w-full"
              >
                <Building2 className="h-4 w-4 text-[#2CA01C] shrink-0" />
                <span className="truncate">{state.companyName}</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-500 shrink-0 ml-auto" />
              </button>

              {showOrgDropdown && (
                <div className="absolute left-0 mt-2 w-80 rounded-xl border border-slate-200 bg-white shadow-xl z-50 overflow-hidden">
                  <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Switch Company ({state.organizations?.length ?? 1})
                    </span>
                    <span className="text-[10px] font-semibold text-[#2CA01C]">
                      Multi-Company
                    </span>
                  </div>

                  <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
                    {(
                      state.organizations ?? [
                        {
                          id: "default",
                          name: state.companyName,
                          slug: "default",
                        },
                      ]
                    ).map((org) => {
                      const isCurrent =
                        org.id === state.activeOrganizationId ||
                        org.name === state.companyName;
                      return (
                        <button
                          key={org.id}
                          onClick={async () => {
                            setShowOrgDropdown(false);
                            await runAction(
                              "switch_organization",
                              { organizationId: org.id },
                              `Switched active company to ${org.name}`
                            );
                          }}
                          className={`w-full flex items-center justify-between px-3.5 py-2.5 text-left text-xs transition-colors ${
                            isCurrent
                              ? "bg-emerald-50/80 font-bold text-[#2CA01C]"
                              : "text-slate-700 hover:bg-slate-50 font-medium"
                          }`}
                        >
                          <div className="truncate pr-2">
                            <span className="block truncate">{org.name}</span>
                            <span className="block text-[10px] text-slate-400 font-mono">
                              ID: {org.id.slice(0, 8)}...
                            </span>
                          </div>
                          {isCurrent && (
                            <Check className="h-4 w-4 text-[#2CA01C] shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {isAuthenticatedOwner && (
                    <div className="p-2 bg-slate-50 border-t border-slate-200">
                      <button
                        onClick={() => {
                          setShowOrgDropdown(false);
                          setShowNewCompanyModal(true);
                        }}
                        className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-[#2CA01C] px-3 py-2 text-xs font-bold text-white hover:bg-[#248217]"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Create New Company
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {isAuthenticatedOwner && (
              <button
                onClick={() => setShowNewCompanyModal(true)}
                className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-semibold text-[#2CA01C] hover:bg-emerald-100"
              >
                <Plus className="h-3 w-3" />
                New Company
              </button>
            )}

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

          {/* Global QuickBooks Search Bar */}
          <div
            ref={searchContainerRef}
            className="relative flex-1 max-w-md mx-4 hidden sm:block"
          >
            <div className="relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchOpen(true);
                }}
                onFocus={() => setIsSearchOpen(true)}
                placeholder="Search transactions, customers, vendors, accounts (Ctrl+K or /)..."
                className="w-full rounded-full border border-slate-200 bg-slate-50/90 pl-9 pr-14 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#2CA01C] focus:ring-1 focus:ring-[#2CA01C] focus:outline-none transition-all shadow-2xs"
              />
              {searchQuery ? (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    searchInputRef.current?.focus();
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200"
                  title="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : (
                <kbd className="hidden lg:inline-block absolute right-3 top-1/2 -translate-y-1/2 rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[10px] font-mono text-slate-400 shadow-2xs pointer-events-none">
                  Ctrl+K
                </kbd>
              )}
            </div>

            {/* Search Dropdown Popover */}
            {isSearchOpen && searchQuery.trim().length > 0 && (
              <div className="absolute left-0 right-0 mt-2 rounded-xl border border-slate-200 bg-white shadow-2xl z-50 overflow-hidden max-h-[75vh] flex flex-col animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span className="font-semibold">
                    Search results for <span className="text-slate-900 font-bold">&quot;{searchQuery.trim()}&quot;</span>
                  </span>
                  <span className="text-[11px] font-mono">
                    {searchResults.length} match{searchResults.length === 1 ? "" : "es"}
                  </span>
                </div>

                <div className="overflow-y-auto divide-y divide-slate-100 p-1">
                  {searchResults.length === 0 ? (
                    <div className="py-8 px-4 text-center">
                      <Search className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-slate-700">
                        No matching records found
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
                        Try searching by invoice #, vendor or customer name, chart of accounts code, or dollar amount (e.g. &quot;$1,250&quot;).
                      </p>
                    </div>
                  ) : (
                    Object.entries(searchResultsByKind).map(([kind, items]) => (
                      <div key={kind} className="py-1">
                        <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/50">
                          {SEARCH_KIND_LABELS[kind as QboSearchResultKind] ?? kind} ({items.length})
                        </div>
                        <div className="divide-y divide-slate-50">
                          {items.map((item) => (
                            <button
                              key={`${item.kind}-${item.id}`}
                              onClick={() => handleSelectSearchResult(item)}
                              className="w-full text-left px-3 py-2 hover:bg-emerald-50/60 rounded-md flex items-center justify-between gap-3 transition-colors group"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-bold text-slate-800 group-hover:text-[#2CA01C] truncate">
                                  {item.title}
                                </div>
                                <div className="text-[11px] text-slate-500 truncate mt-0.5">
                                  {item.subtitle}
                                </div>
                              </div>
                              {item.amountCents !== undefined && (
                                <span className="shrink-0 font-mono text-xs font-bold text-slate-900 bg-slate-100 group-hover:bg-white px-2 py-0.5 rounded border border-slate-200">
                                  {formatCents(item.amountCents)}
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="px-3 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Press <kbd className="font-mono bg-white border border-slate-200 px-1 py-0.5 rounded">Esc</kbd> to close</span>
                  <span>Click any item to navigate</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Mobile Search Toggle */}
            <button
              onClick={() => setIsMobileSearchOpen((v) => !v)}
              className="sm:hidden p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              title="Search"
              aria-label="Toggle mobile search"
            >
              <Search className="h-4 w-4" />
            </button>

            <button
              onClick={() => setActiveModal("csv_import")}
              className="hidden md:inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-bold text-[#2CA01C] hover:bg-emerald-100"
            >
              <Upload className="h-3.5 w-3.5" />
              Upload CSV
            </button>

            <button
              onClick={() => setActiveModal("quick_create")}
              className="inline-flex items-center gap-1 rounded-full bg-[#2CA01C] px-2.5 sm:px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#248217]"
              title="Quick Create"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Quick Create</span>
            </button>

            <div className="h-5 w-px bg-slate-200 mx-1" />

            <button
              onClick={() => setActiveTab("audit")}
              title="Audit Log & Settings"
              className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100"
            >
              <Settings className="h-4 w-4" />
            </button>

            {/* Authenticated User Session & Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu((v) => !v)}
                className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 hover:bg-slate-100 pl-1 pr-2.5 py-1 transition-colors"
                title="User Profile & Session"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0077C5] text-white text-xs font-bold">
                  {(
                    currentUser?.fullName ||
                    state.teamMembers.find((m) => m.role === state.activeRole)?.name ||
                    "Company Owner"
                  )
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <span className="hidden lg:inline text-xs font-semibold text-slate-700">
                  {currentUser?.fullName ||
                    state.teamMembers.find((m) => m.role === state.activeRole)?.name ||
                    "Company Owner"}
                </span>
                <ChevronDown className="h-3 w-3 text-slate-400" />
              </button>

              {showUserMenu && (() => {
                const sanitizedMembers = (state.teamMembers || []).filter(
                  (m) =>
                    m.email.toLowerCase() !== "enterandpost02@gmail.com" &&
                    m.name !== "Sarah Jenkins" &&
                    m.name !== "Arthur Andersen, CPA" &&
                    !m.email.includes("bayareacpa.com") &&
                    m.email !== "sarah@enterandpost.com" &&
                    m.email !== "sarah@craigslandscaping.com"
                );
                const activeMember =
                  sanitizedMembers.find((m) => m.role === state.activeRole) ||
                  sanitizedMembers[0];
                const displayName =
                  currentUser?.fullName || activeMember?.name || "Company Owner";
                const displayEmail =
                  currentUser?.email || activeMember?.email || "";

                return (
                  <div className="absolute right-0 mt-2 w-72 rounded-xl border border-slate-200 bg-white shadow-xl z-50 overflow-hidden">
                    <div className="p-3.5 bg-[#1E252B] text-white">
                      <p className="text-xs font-bold">{displayName}</p>
                      {displayEmail && (
                        <p className="text-[11px] text-slate-300 truncate font-mono">
                          {displayEmail}
                        </p>
                      )}
                      <div className="mt-2 flex items-center gap-1.5">
                        <span className="rounded bg-[#2CA01C] px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                          {state.activeRole === "accountant"
                            ? "Accountant (Read-Only)"
                            : state.activeRole === "staff"
                            ? "Staff Bookkeeper"
                            : "Company Owner"}
                        </span>
                        <span className="text-[10px] text-slate-300 truncate">
                          · {state.companyName}
                        </span>
                      </div>
                    </div>

                    {isAuthenticatedOwner && sanitizedMembers.length > 1 ? (
                      <div className="p-2 border-b border-slate-100">
                        <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Preview Role Permissions ({sanitizedMembers.length})
                        </p>
                        {sanitizedMembers.map((m) => {
                          const isSelected = state.activeRole === m.role;
                          return (
                            <button
                              key={m.id}
                              onClick={async () => {
                                setShowUserMenu(false);
                                await runAction(
                                  "switch_role",
                                  { role: m.role },
                                  `Previewing permissions as ${m.name} (${m.role.toUpperCase()})`
                                );
                              }}
                              className={`w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs font-medium transition-colors ${
                                isSelected
                                  ? "bg-emerald-50 text-[#2CA01C] font-bold"
                                  : "text-slate-700 hover:bg-slate-50"
                              }`}
                            >
                              <div className="flex flex-col min-w-0 pr-2">
                                <span className="font-semibold text-slate-900 truncate">
                                  {m.role === "accountant"
                                    ? "Accountant (Read-Only)"
                                    : m.role === "staff"
                                    ? "Staff Bookkeeper"
                                    : "Owner"}{" "}
                                  ({m.name})
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono truncate">
                                  {m.email}
                                </span>
                              </div>
                              {isSelected && (
                                <Check className="h-3.5 w-3.5 text-[#2CA01C] shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-2.5 border-b border-slate-100 bg-slate-50/50">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-700">
                            Authenticated Role:
                          </span>
                          <span className="text-[10px] font-bold text-[#2CA01C] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            {state.activeRole === "accountant"
                              ? "Accountant (Read-Only)"
                              : state.activeRole === "staff"
                              ? "Staff Bookkeeper (Active)"
                              : "Owner (Active)"}
                          </span>
                        </div>
                        {isAuthenticatedOwner && (
                          <p className="text-[10px] text-slate-400 mt-1">
                            Manage or invite staff bookkeepers &amp; accountants in{" "}
                            <strong>Audit, Teams &amp; Security</strong>.
                          </p>
                        )}
                      </div>
                    )}

                    <div className="p-2 bg-slate-50 flex flex-col gap-1">
                      {isAuthenticatedOwner && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowUserMenu(false);
                            setActiveTab("audit");
                          }}
                          className="w-full rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200/70 text-left"
                        >
                          Manage Staff &amp; Team Roles
                        </button>
                      )}
                      <a
                        href="/login"
                        className="w-full rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200/70 text-left"
                      >
                        Switch Account (/login)
                      </a>

                      <div className="my-1 border-t border-slate-200" />

                      <button
                        onClick={() => handleLogout()}
                        className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-bold text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors text-left border border-red-200/60 bg-red-50/30"
                      >
                        <LogOut className="h-3.5 w-3.5 text-red-600" />
                        Sign Out / Log Out
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </header>

        {/* Mobile Search Input Row */}
        {isMobileSearchOpen && (
          <div className="sm:hidden border-b border-slate-200 bg-white p-2.5 px-3 shadow-xs animate-in slide-in-from-top-1">
            <div className="relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                autoFocus
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchOpen(true);
                }}
                onFocus={() => setIsSearchOpen(true)}
                placeholder="Search transactions, customers, accounts..."
                className="w-full rounded-full border border-slate-200 bg-slate-50 pl-9 pr-14 py-1.5 text-xs text-slate-900 focus:bg-white focus:border-[#2CA01C] focus:outline-none"
              />
              {searchQuery ? (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : (
                <button
                  onClick={() => setIsMobileSearchOpen(false)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold uppercase hover:text-slate-600"
                >
                  Done
                </button>
              )}
            </div>
          </div>
        )}

        {/* Toast Notification Banner */}
        {toast && (
          <div
            className={`mx-3 sm:mx-6 mt-3 sm:mt-4 flex items-center justify-between rounded-lg px-4 py-2.5 text-xs font-semibold shadow-sm ${
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
        <main className="flex-1 p-3 sm:p-5 lg:p-6 max-w-7xl w-full mx-auto min-w-0 overflow-x-hidden">
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
              canManageTeam={isAuthenticatedOwner}
              currentUserEmail={currentUser?.email}
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

      {/* Create New Company Modal */}
      {showNewCompanyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
            <div className="px-6 py-4 bg-[#1E252B] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-[#2CA01C] border border-emerald-500/30">
                  <Building2 className="h-4 w-4 text-[#2CA01C]" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Create New Company</h2>
                  <p className="text-[11px] text-slate-300">
                    Set up an isolated business ledger with a custom Chart of Accounts
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowNewCompanyModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newCompanyName.trim()) return;
                const createdName = newCompanyName.trim();
                setShowNewCompanyModal(false);
                setNewCompanyName("");
                setNewCompanyTaxId("");
                await runAction(
                  "create_organization",
                  {
                    name: createdName,
                    template: newCompanyTemplate,
                    industry: newCompanyIndustry,
                    taxId: newCompanyTaxId.trim() || undefined,
                  },
                  `Created and switched to company "${createdName}"!`
                );
              }}
              className="p-6 space-y-4 overflow-y-auto flex-1"
            >
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Company / Legal Business Name *
                </label>
                <input
                  type="text"
                  required
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  placeholder="e.g. Apex Software Solutions LLC"
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#2CA01C] focus:ring-1 focus:ring-[#2CA01C] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Industry / Business Type
                  </label>
                  <select
                    value={newCompanyIndustry}
                    onChange={(e) => setNewCompanyIndustry(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-[#2CA01C] focus:ring-1 focus:ring-[#2CA01C] focus:outline-none"
                  >
                    <option value="Professional, Scientific & Technical Services">Professional &amp; Technical Services</option>
                    <option value="Software & Information Technology">Software &amp; Information Technology</option>
                    <option value="Construction & Contracting">Construction &amp; Contracting</option>
                    <option value="Retail, E-commerce & Wholesale">Retail, E-commerce &amp; Wholesale</option>
                    <option value="Consulting & Agency Services">Consulting &amp; Agency Services</option>
                    <option value="Healthcare, Medical & Wellness">Healthcare &amp; Medical</option>
                    <option value="Real Estate & Property Management">Real Estate &amp; Property</option>
                    <option value="Landscaping, Facilities & Trades">Landscaping &amp; Trades</option>
                    <option value="Other / General Business">Other / General Business</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Tax ID / EIN <span className="font-normal text-slate-400 lowercase">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={newCompanyTaxId}
                    onChange={(e) => setNewCompanyTaxId(e.target.value)}
                    placeholder="XX-XXXXXXX"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#2CA01C] focus:ring-1 focus:ring-[#2CA01C] focus:outline-none"
                  />
                </div>
              </div>

              {/* Informative currency and fiscal banner */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 flex items-center justify-between text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800">Currency &amp; Ledger:</span>
                  <span>United States Dollar (USD $)</span>
                </div>
                <span className="text-[11px] text-slate-500 font-medium">Fiscal Year: Jan – Dec</span>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Initial Books Setup
                </label>
                <div className="space-y-2.5">
                  <label
                    className={`flex items-start gap-3 rounded-xl border p-3.5 cursor-pointer transition-all ${
                      newCompanyTemplate === "empty"
                        ? "border-[#2CA01C] bg-emerald-50/70 shadow-2xs ring-1 ring-[#2CA01C]/30"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="companyTemplate"
                      checked={newCompanyTemplate === "empty"}
                      onChange={() => setNewCompanyTemplate("empty")}
                      className="mt-1 accent-[#2CA01C]"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900">
                          Fresh Company ($0.00 Balances)
                        </span>
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-[#2CA01C]">
                          Recommended for Live
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                        Starts clean with the 31 standard Pro E Books Chart of Accounts and 0 transactions—ready for your real invoices, bills, and bank imports.
                      </p>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-3 rounded-xl border p-3.5 cursor-pointer transition-all ${
                      newCompanyTemplate === "sample"
                        ? "border-[#2CA01C] bg-emerald-50/70 shadow-2xs ring-1 ring-[#2CA01C]/30"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="companyTemplate"
                      checked={newCompanyTemplate === "sample"}
                      onChange={() => setNewCompanyTemplate("sample")}
                      className="mt-1 accent-[#2CA01C]"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900">
                          Pre-loaded Practice Data
                        </span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                          Demo &amp; Testing
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                        Pre-populates sample invoices, bills, journal entries, and bank feed rows for exploring features before entering real data.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewCompanyModal(false)}
                  className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newCompanyName.trim()}
                  className="rounded-full bg-[#2CA01C] px-5 py-2 text-xs font-bold text-white hover:bg-[#248217] disabled:opacity-50 transition-colors shadow-2xs"
                >
                  {isSubmitting ? "Creating Company..." : "Create & Switch Company"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
