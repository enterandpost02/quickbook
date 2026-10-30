"use client";

import React, { useState } from "react";
import {
  Activity,
  Ban,
  Building2,
  CheckCircle2,
  Crown,
  KeyRound,
  LogOut,
  Mail,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import type { PlatformAdminOverview } from "@/lib/admin";
import type { OrganizationRole } from "@/db/schema";

export function GodfatherAdminConsole({
  initialOverview,
  adminUser,
}: {
  initialOverview: PlatformAdminOverview;
  adminUser: { id: string; email: string; fullName: string };
}) {
  const [overview, setOverview] =
    useState<PlatformAdminOverview>(initialOverview);
  const [activeTab, setActiveTab] = useState<
    "organizations" | "users" | "pending"
  >("organizations");
  const [searchQuery, setSearchQuery] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Modals
  const [showNewTenantModal, setShowNewTenantModal] = useState(false);
  const [showNewUserModal, setShowNewUserModal] = useState(false);
  const [resetPasswordUser, setResetPasswordUser] = useState<{
    id: string;
    email: string;
    fullName: string;
  } | null>(null);

  // New Tenant & Owner Form
  const [tenantName, setTenantName] = useState("");
  const [tenantCurrency, setTenantCurrency] = useState("USD");
  const [tenantTemplate, setTenantTemplate] = useState<"empty" | "sample">(
    "empty"
  );
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");

  // New / Assign User Form
  const [uFullName, setUFullName] = useState("");
  const [uEmail, setUEmail] = useState("");
  const [uPassword, setUPassword] = useState("");
  const [uOrgId, setUOrgId] = useState(
    initialOverview.organizations[0]?.id || ""
  );
  const [uRole, setURole] = useState<OrganizationRole>("staff");

  // Reset Password Form
  const [newResetPass, setNewResetPass] = useState("");

  function notify(type: "success" | "error", message: string) {
    setToast({ type, message });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  }

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    } finally {
      window.location.href = "/login";
    }
  }

  async function refreshOverview() {
    setIsBusy(true);
    try {
      const res = await fetch("/api/admin");
      const data = await res.json();
      if (res.ok) {
        setOverview(data);
        notify("success", "Platform telemetry refreshed.");
      } else {
        notify("error", data.error || "Failed to refresh overview.");
      }
    } catch {
      notify("error", "Network error refreshing platform telemetry.");
    } finally {
      setIsBusy(false);
    }
  }

  async function runAdminAction(
    action: string,
    payload: Record<string, unknown>,
    successMsg?: string
  ): Promise<boolean> {
    setIsBusy(true);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, payload }),
      });
      const data = await res.json();
      if (!res.ok) {
        notify("error", data.error || "Admin operation failed.");
        return false;
      }
      if (data.redirectTo) {
        window.location.href = data.redirectTo;
        return true;
      }
      setOverview(data);
      if (successMsg) notify("success", successMsg);
      return true;
    } catch {
      notify("error", "Network error executing admin action.");
      return false;
    } finally {
      setIsBusy(false);
    }
  }

  const q = searchQuery.trim().toLowerCase();
  const filteredOrgs = overview.organizations.filter(
    (o) =>
      !q ||
      o.name.toLowerCase().includes(q) ||
      (o.ownerEmail || "").toLowerCase().includes(q) ||
      (o.ownerName || "").toLowerCase().includes(q) ||
      o.slug.toLowerCase().includes(q)
  );

  const filteredUsers = overview.users.filter(
    (u) =>
      !q ||
      u.email.toLowerCase().includes(q) ||
      u.fullName.toLowerCase().includes(q) ||
      u.memberships.some((m) => m.organizationName.toLowerCase().includes(q))
  );

  return (
    <div className="min-h-screen bg-[#F4F5F8] text-slate-900 flex flex-col">
      {/* Top Godfather Super Admin Header */}
      <header className="bg-[#111827] text-white border-b-2 border-[#2CA01C] sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#2CA01C] text-white shadow-sm">
              <Crown className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-sm sm:text-base tracking-tight">
                  Pro <span className="text-[#2CA01C]">E Books</span> · Platform
                  Super Admin
                </span>
                <span className="rounded-full bg-amber-400/20 border border-amber-400/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                  Godfather Access
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono truncate">
                {adminUser.email} · Tenant &amp; User Governance (Customer Ledgers Private)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={refreshOverview}
              disabled={isBusy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 transition-colors"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isBusy ? "animate-spin" : ""}`}
              />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/40 bg-red-950/40 hover:bg-red-900/60 px-3 py-1.5 text-xs font-bold text-red-300 hover:text-white transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 space-y-6">
        {toast && (
          <div
            className={`flex items-center justify-between rounded-xl px-4 py-3 text-xs sm:text-sm font-semibold shadow-sm ${
              toast.type === "success"
                ? "bg-emerald-600 text-white"
                : "bg-red-600 text-white"
            }`}
          >
            <span>{toast.message}</span>
            <button onClick={() => setToast(null)}>
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Platform KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>Total Companies</span>
              <Building2 className="h-4 w-4 text-[#2CA01C]" />
            </div>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">
              {overview.kpis.totalOrganizations}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              <span className="text-emerald-600 font-semibold">
                {overview.kpis.activeOrganizations} active
              </span>
              {overview.kpis.suspendedOrganizations > 0 && (
                <span className="text-red-600 font-semibold ml-1.5">
                  · {overview.kpis.suspendedOrganizations} suspended
                </span>
              )}
            </p>
          </div>

          <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>Registered Users</span>
              <Users className="h-4 w-4 text-[#0077C5]" />
            </div>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">
              {overview.kpis.totalUsers}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              {overview.kpis.totalOwners} Owners · {overview.kpis.totalStaff}{" "}
              Staff · {overview.kpis.totalAccountants} CPAs
            </p>
          </div>

          <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>Platform Ledger Volume</span>
              <Activity className="h-4 w-4 text-indigo-600" />
            </div>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">
              {overview.kpis.totalJournalEntriesAcrossPlatform}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Journals · {overview.kpis.totalInvoicesAcrossPlatform} Invoices ·{" "}
              {overview.kpis.totalBankTransactionsAcrossPlatform} Bank Tx
            </p>
          </div>

          <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>Live Sessions &amp; OTPs</span>
              <ShieldCheck className="h-4 w-4 text-amber-600" />
            </div>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">
              {overview.kpis.activeSessionsCount}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              {overview.kpis.pendingOtpsCount} Pending OTPs ·{" "}
              {overview.kpis.pendingInvitationsCount} Pending Invites
            </p>
          </div>
        </div>

        {/* Action Toolbar & Tabs */}
        <div className="rounded-xl bg-white border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-3 sm:p-4 border-b border-slate-200 bg-slate-50/70 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveTab("organizations")}
                className={`rounded-lg px-3 py-2 text-xs font-bold whitespace-nowrap transition-colors ${
                  activeTab === "organizations"
                    ? "bg-[#2CA01C] text-white"
                    : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                All Customer Organizations ({overview.organizations.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("users")}
                className={`rounded-lg px-3 py-2 text-xs font-bold whitespace-nowrap transition-colors ${
                  activeTab === "users"
                    ? "bg-[#2CA01C] text-white"
                    : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                All Platform Users ({overview.users.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("pending")}
                className={`rounded-lg px-3 py-2 text-xs font-bold whitespace-nowrap transition-colors ${
                  activeTab === "pending"
                    ? "bg-[#2CA01C] text-white"
                    : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                Pending OTPs &amp; Invites (
                {overview.pendingOtps.length +
                  overview.pendingInvitations.length}
                )
              </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 sm:w-64 min-w-[180px]">
                <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter companies or users..."
                  className="w-full rounded-lg border border-slate-300 bg-white pl-8 pr-3 py-1.5 text-xs focus:border-[#2CA01C] focus:outline-none"
                />
              </div>

              <button
                type="button"
                onClick={() => setShowNewTenantModal(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#2CA01C] hover:bg-[#248217] px-3 py-1.5 text-xs font-bold text-white"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Provision Owner &amp; Company</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!uOrgId && overview.organizations[0]) {
                    setUOrgId(overview.organizations[0].id);
                  }
                  setShowNewUserModal(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-800"
              >
                <UserPlus className="h-3.5 w-3.5 text-[#0077C5]" />
                <span>Add / Assign User</span>
              </button>
            </div>
          </div>

          {/* Tab 1: Organizations */}
          {activeTab === "organizations" && (
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-xs min-w-[780px]">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[11px]">
                  <tr>
                    <th className="px-4 py-3">Company / Organization</th>
                    <th className="px-4 py-3">Company Owner</th>
                    <th className="px-4 py-3">Team</th>
                    <th className="px-4 py-3">Ledger Activity</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Godfather Controls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOrgs.map((org) => (
                    <tr key={org.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-900">{org.name}</p>
                        <p className="text-[11px] text-slate-400 font-mono">
                          {org.baseCurrency} · Created{" "}
                          {org.createdAt.slice(0, 10)}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        {org.ownerEmail ? (
                          <div>
                            <p className="font-semibold text-slate-800">
                              {org.ownerName || "Company Owner"}
                            </p>
                            <p className="text-[11px] font-mono text-slate-500">
                              {org.ownerEmail}
                            </p>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">
                            Platform Sandbox (Unassigned)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-700">
                        {org.memberCount} member
                        {org.memberCount === 1 ? "" : "s"}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {org.invoicesCount} Inv · {org.journalEntriesCount} JE ·{" "}
                        {org.accountsCount} Accts
                      </td>
                      <td className="px-4 py-3">
                        {org.isSuspended ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-bold text-red-700">
                            <Ban className="h-3 w-3" />
                            Suspended
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                            <CheckCircle2 className="h-3 w-3" />
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() =>
                              runAdminAction(
                                "toggle_org_suspension",
                                {
                                  organizationId: org.id,
                                  suspend: !org.isSuspended,
                                },
                                org.isSuspended
                                  ? `Reactivated "${org.name}".`
                                  : `Suspended "${org.name}".`
                              )
                            }
                            className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-bold ${
                              org.isSuspended
                                ? "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                                : "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
                            }`}
                          >
                            {org.isSuspended ? "Reactivate" : "Suspend"}
                          </button>

                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Permanently delete organization "${org.name}" and all of its accounting records?`
                                )
                              ) {
                                runAdminAction(
                                  "delete_organization",
                                  { organizationId: org.id },
                                  `Deleted organization "${org.name}".`
                                );
                              }
                            }}
                            className="rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 p-1.5 text-red-600"
                            title="Delete Organization"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredOrgs.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-10 text-center text-slate-400"
                      >
                        No organizations match your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Tab 2: All Platform Users */}
          {activeTab === "users" && (
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-xs min-w-[820px]">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[11px]">
                  <tr>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Organizations &amp; Roles</th>
                    <th className="px-4 py-3">Sessions</th>
                    <th className="px-4 py-3">Account Status</th>
                    <th className="px-4 py-3 text-right">Godfather Controls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">
                            {u.fullName}
                          </span>
                          {u.isSuperAdmin && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-300 px-2 py-0.5 text-[10px] font-extrabold text-amber-900">
                              <Crown className="h-3 w-3" />
                              SUPER ADMIN
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] font-mono text-slate-500">
                          {u.email}
                        </p>
                      </td>

                       <td className="px-4 py-3">
                        {u.isSuperAdmin ? (
                          <span className="text-xs font-semibold text-emerald-700">
                            Platform Administration Console Only (No Ledger Access)
                          </span>
                        ) : u.memberships.length === 0 ? (
                          <span className="text-slate-400 italic">
                            No organization assigned
                          </span>
                        ) : (
                          <div className="space-y-1">
                            {u.memberships.map((m) => (
                              <div
                                key={`${u.id}-${m.organizationId}`}
                                className="flex items-center gap-2"
                              >
                                <span className="font-medium text-slate-800">
                                  {m.organizationName}:
                                </span>
                                <select
                                  value={m.role}
                                  disabled={isBusy}
                                  onChange={(e) =>
                                    runAdminAction(
                                      "update_membership_role",
                                      {
                                        userId: u.id,
                                        organizationId: m.organizationId,
                                        role: e.target
                                          .value as OrganizationRole,
                                      },
                                      `Updated ${u.fullName}'s role in ${m.organizationName} to ${e.target.value.toUpperCase()}`
                                    )
                                  }
                                  className="rounded border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-bold uppercase text-slate-700"
                                >
                                  <option value="owner">OWNER</option>
                                  <option value="staff">STAFF</option>
                                  <option value="accountant">
                                    ACCOUNTANT (READ-ONLY)
                                  </option>
                                </select>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3 font-mono text-slate-700">
                        {u.activeSessions} active
                      </td>

                      <td className="px-4 py-3">
                        {u.isSuspended ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-bold text-red-700">
                            Suspended
                          </span>
                        ) : u.emailVerified ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                            Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
                            Unverified
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right">
                        {u.isSuperAdmin ? (
                          <span className="text-[11px] font-semibold text-slate-400">
                            Protected Root Account
                          </span>
                        ) : (
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => {
                                setResetPasswordUser({
                                  id: u.id,
                                  email: u.email,
                                  fullName: u.fullName,
                                });
                                setNewResetPass("");
                              }}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700"
                              title="Reset user password"
                            >
                              <KeyRound className="h-3 w-3" />
                              Reset Pass
                            </button>

                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() =>
                                runAdminAction(
                                  "toggle_user_suspension",
                                  { userId: u.id, suspend: !u.isSuspended },
                                  u.isSuspended
                                    ? `Reactivated ${u.email}.`
                                    : `Suspended ${u.email} and revoked active sessions.`
                                )
                              }
                              className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-bold ${
                                u.isSuspended
                                  ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                                  : "border-amber-300 bg-amber-50 text-amber-800"
                              }`}
                            >
                              {u.isSuspended ? "Reactivate" : "Suspend"}
                            </button>

                            {u.activeSessions > 0 && (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() =>
                                  runAdminAction(
                                    "revoke_user_sessions",
                                    { userId: u.id },
                                    `Force-signed out all active sessions for ${u.email}.`
                                  )
                                }
                                className="rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 px-2 py-1.5 text-[11px] font-semibold text-slate-600"
                                title="Force sign out user"
                              >
                                Force Logout
                              </button>
                            )}

                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `Delete user "${u.fullName}" (${u.email}) permanently?`
                                  )
                                ) {
                                  runAdminAction(
                                    "delete_user",
                                    { userId: u.id },
                                    `Deleted user ${u.email}.`
                                  );
                                }
                              }}
                              className="rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 p-1.5 text-red-600"
                              title="Delete User"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Tab 3: Pending OTP Signups & Team Invitations */}
          {activeTab === "pending" && (
            <div className="p-4 sm:p-5 space-y-6">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                  <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
                  Pending Email OTP Verifications ({overview.pendingOtps.length}
                  )
                </h3>
                {overview.pendingOtps.length === 0 ? (
                  <p className="text-xs text-slate-400 bg-slate-50 rounded-lg p-4 border border-slate-100">
                    No pending OTP verifications right now.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs min-w-[560px]">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[11px]">
                        <tr>
                          <th className="px-3 py-2">Applicant</th>
                          <th className="px-3 py-2">Email</th>
                          <th className="px-3 py-2">Organization</th>
                          <th className="px-3 py-2">Attempts</th>
                          <th className="px-3 py-2">Expires</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {overview.pendingOtps.map((o) => (
                          <tr key={o.id}>
                            <td className="px-3 py-2.5 font-semibold">
                              {o.fullName}
                            </td>
                            <td className="px-3 py-2.5 font-mono">{o.email}</td>
                            <td className="px-3 py-2.5">
                              {o.organizationName}
                            </td>
                            <td className="px-3 py-2.5">{o.attempts} / 5</td>
                            <td className="px-3 py-2.5 text-slate-500 font-mono">
                              {o.expiresAt.replace("T", " ").slice(0, 19)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-[#0077C5]" />
                  Pending Staff &amp; Accountant Invitations (
                  {overview.pendingInvitations.length})
                </h3>
                {overview.pendingInvitations.length === 0 ? (
                  <p className="text-xs text-slate-400 bg-slate-50 rounded-lg p-4 border border-slate-100">
                    No pending employee invitations right now.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs min-w-[560px]">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[11px]">
                        <tr>
                          <th className="px-3 py-2">Invitee</th>
                          <th className="px-3 py-2">Email</th>
                          <th className="px-3 py-2">Company</th>
                          <th className="px-3 py-2">Role</th>
                          <th className="px-3 py-2">Expires</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {overview.pendingInvitations.map((inv) => (
                          <tr key={inv.id}>
                            <td className="px-3 py-2.5 font-semibold">
                              {inv.fullName}
                            </td>
                            <td className="px-3 py-2.5 font-mono">
                              {inv.email}
                            </td>
                            <td className="px-3 py-2.5">
                              {inv.organizationName}
                            </td>
                            <td className="px-3 py-2.5 uppercase font-bold text-slate-700">
                              {inv.role}
                            </td>
                            <td className="px-3 py-2.5 text-slate-500 font-mono">
                              {inv.expiresAt.slice(0, 10)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modal 1: Provision New Company & Owner */}
      {showNewTenantModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden">
            <div className="px-5 py-4 bg-[#111827] text-white flex items-center justify-between">
              <h2 className="text-sm font-bold">
                Provision Customer Company &amp; Owner
              </h2>
              <button onClick={() => setShowNewTenantModal(false)}>
                <X className="h-4 w-4 text-slate-400 hover:text-white" />
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const ok = await runAdminAction(
                  "create_org_and_owner",
                  {
                    organizationName: tenantName,
                    baseCurrency: tenantCurrency,
                    template: tenantTemplate,
                    ownerName,
                    ownerEmail,
                    ownerPassword,
                  },
                  `Provisioned "${tenantName}" for Owner ${ownerEmail}.`
                );
                if (ok) {
                  setShowNewTenantModal(false);
                  setTenantName("");
                  setOwnerName("");
                  setOwnerEmail("");
                  setOwnerPassword("");
                }
              }}
              className="p-5 space-y-3.5 text-xs"
            >
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Company / Organization Name
                </label>
                <input
                  type="text"
                  required
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  placeholder="Sterling Logistics LLC"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Base Currency
                  </label>
                  <select
                    value={tenantCurrency}
                    onChange={(e) => setTenantCurrency(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 bg-white"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="CAD">CAD ($)</option>
                    <option value="AUD">AUD ($)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Initial Ledger
                  </label>
                  <select
                    value={tenantTemplate}
                    onChange={(e) =>
                      setTenantTemplate(e.target.value as "empty" | "sample")
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 bg-white"
                  >
                    <option value="empty">Clean $0.00 Books</option>
                    <option value="sample">Sample Demo Data</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-3">
                <label className="block font-semibold text-slate-700 mb-1">
                  Owner Full Name
                </label>
                <input
                  type="text"
                  required
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="Rachel Sterling"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Owner Email Address
                </label>
                <input
                  type="email"
                  required
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  placeholder="rachel@sterlinglogistics.com"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Owner Initial Password (min. 8 chars)
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={ownerPassword}
                  onChange={(e) => setOwnerPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewTenantModal(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isBusy}
                  className="rounded-lg bg-[#2CA01C] hover:bg-[#248217] px-4 py-2 font-bold text-white"
                >
                  Create Tenant &amp; Owner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Create / Assign User to Organization */}
      {showNewUserModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden">
            <div className="px-5 py-4 bg-[#111827] text-white flex items-center justify-between">
              <h2 className="text-sm font-bold">
                Create or Assign User to Organization
              </h2>
              <button onClick={() => setShowNewUserModal(false)}>
                <X className="h-4 w-4 text-slate-400 hover:text-white" />
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const ok = await runAdminAction(
                  "create_or_assign_user",
                  {
                    fullName: uFullName,
                    email: uEmail,
                    password: uPassword,
                    organizationId: uOrgId,
                    role: uRole,
                  },
                  `Assigned ${uEmail} as ${uRole.toUpperCase()}.`
                );
                if (ok) {
                  setShowNewUserModal(false);
                  setUFullName("");
                  setUEmail("");
                  setUPassword("");
                }
              }}
              className="p-5 space-y-3.5 text-xs"
            >
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={uFullName}
                  onChange={(e) => setUFullName(e.target.value)}
                  placeholder="David Kim"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={uEmail}
                  onChange={(e) => setUEmail(e.target.value)}
                  placeholder="david@company.com"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Password (min. 8 chars for new user)
                </label>
                <input
                  type="password"
                  value={uPassword}
                  onChange={(e) => setUPassword(e.target.value)}
                  placeholder="Leave blank only if user already exists"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Target Organization
                </label>
                <select
                  value={uOrgId}
                  onChange={(e) => setUOrgId(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 bg-white"
                >
                  {overview.organizations.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name} ({o.ownerEmail || "Sandbox"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Assigned Role
                </label>
                <select
                  value={uRole}
                  onChange={(e) => setURole(e.target.value as OrganizationRole)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 bg-white"
                >
                  <option value="owner">Company Owner (Full Admin)</option>
                  <option value="staff">Staff Bookkeeper (Operations)</option>
                  <option value="accountant">
                    Accountant / Auditor (Read-Only)
                  </option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewUserModal(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isBusy}
                  className="rounded-lg bg-[#2CA01C] hover:bg-[#248217] px-4 py-2 font-bold text-white"
                >
                  Save User Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Reset User Password */}
      {resetPasswordUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full overflow-hidden">
            <div className="px-5 py-4 bg-[#111827] text-white flex items-center justify-between">
              <h2 className="text-sm font-bold">Reset User Password</h2>
              <button onClick={() => setResetPasswordUser(null)}>
                <X className="h-4 w-4 text-slate-400 hover:text-white" />
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const ok = await runAdminAction(
                  "reset_user_password",
                  {
                    userId: resetPasswordUser.id,
                    newPassword: newResetPass,
                  },
                  `Password updated for ${resetPasswordUser.email}.`
                );
                if (ok) {
                  setResetPasswordUser(null);
                  setNewResetPass("");
                }
              }}
              className="p-5 space-y-3.5 text-xs"
            >
              <p className="text-slate-600">
                Set a new password for{" "}
                <strong>{resetPasswordUser.fullName}</strong> (
                <span className="font-mono">{resetPasswordUser.email}</span>):
              </p>
              <input
                type="password"
                required
                minLength={8}
                value={newResetPass}
                onChange={(e) => setNewResetPass(e.target.value)}
                placeholder="New password (at least 8 characters)"
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              />
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setResetPasswordUser(null)}
                  className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isBusy}
                  className="rounded-lg bg-[#2CA01C] hover:bg-[#248217] px-4 py-2 font-bold text-white"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
