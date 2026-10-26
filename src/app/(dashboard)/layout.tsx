import Link from "next/link";
import {
  BookOpenCheck,
  Building2,
  FileSpreadsheet,
  Landmark,
  LayoutDashboard,
  Lock,
  LogOut,
  Scale,
  ScrollText,
} from "lucide-react";
import { requireAuth } from "@/lib/auth";
import {
  logoutAction,
  switchOrganizationAction,
} from "@/app/(auth)/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const instant = false;

const navItems = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    active: true,
    phase: "Phase 0",
  },
  {
    name: "Chart of Accounts",
    href: "/dashboard#phase-1",
    icon: ScrollText,
    active: false,
    phase: "Phase 1",
  },
  {
    name: "Journal Entries",
    href: "/dashboard#phase-1",
    icon: Scale,
    active: false,
    phase: "Phase 1",
  },
  {
    name: "Bank Import",
    href: "/dashboard#phase-2",
    icon: Landmark,
    active: false,
    phase: "Phase 2",
  },
  {
    name: "Financial Reports",
    href: "/dashboard#phase-3",
    icon: FileSpreadsheet,
    active: false,
    phase: "Phase 3",
  },
  {
    name: "Reconciliation",
    href: "/dashboard#phase-4",
    icon: Lock,
    active: false,
    phase: "Phase 4",
  },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await requireAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-200 bg-white flex flex-col justify-between shrink-0">
        <div>
          <div className="h-16 px-5 border-b border-slate-200 flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
              <BookOpenCheck className="h-4 w-4" />
            </div>
            <span className="font-bold text-slate-900 tracking-tight">
              QuickBoooks
            </span>
          </div>

          {/* Active Organization Card */}
          <div className="p-4 border-b border-slate-100">
            <div className="rounded-lg bg-slate-50 p-3 border border-slate-200/80">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Building2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {auth.organization.name}
                  </p>
                </div>
                <Badge variant="default" className="text-[10px] px-1.5 py-0 capitalize">
                  {auth.role}
                </Badge>
              </div>
              <p className="mt-1 text-[11px] text-slate-500 font-mono truncate">
                org: {auth.organization.slug} ({auth.organization.baseCurrency})
              </p>

              {auth.memberships.length > 1 && (
                <div className="mt-2.5 pt-2.5 border-t border-slate-200">
                  <p className="text-[11px] font-medium text-slate-500 mb-1.5">
                    Switch organization:
                  </p>
                  <div className="space-y-1">
                    {auth.memberships.map((m) => {
                      const isCurrent =
                        m.organization.id === auth.organization.id;
                      return (
                        <form
                          key={m.organization.id}
                          action={switchOrganizationAction}
                        >
                          <input
                            type="hidden"
                            name="organizationId"
                            value={m.organization.id}
                          />
                          <button
                            type="submit"
                            disabled={isCurrent}
                            className={`w-full text-left text-xs px-2 py-1 rounded transition-colors ${
                              isCurrent
                                ? "bg-emerald-50 text-emerald-800 font-semibold"
                                : "text-slate-600 hover:bg-slate-200/60"
                            }`}
                          >
                            {m.organization.name} ({m.organization.baseCurrency})
                          </button>
                        </form>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    item.active
                      ? "bg-emerald-50 text-emerald-800"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon
                      className={`h-4 w-4 ${
                        item.active ? "text-emerald-600" : "text-slate-400"
                      }`}
                    />
                    {item.name}
                  </span>
                  {!item.active && (
                    <span className="text-[10px] font-medium text-slate-400">
                      {item.phase}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/50">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">
                {auth.user.fullName}
              </p>
              <p className="text-xs text-slate-500 truncate">
                {auth.user.email}
              </p>
            </div>
            <form action={logoutAction}>
              <Button
                type="submit"
                variant="outline"
                size="sm"
                title="Sign out"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-slate-200 bg-white px-8 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">
              {auth.organization.name}
            </h1>
            <p className="text-xs text-slate-500">
              Organization ID:{" "}
              <code className="font-mono text-slate-700">
                {auth.organization.id}
              </code>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              Base Currency: {auth.organization.baseCurrency}
            </Badge>
            <Badge variant="secondary">
              Fiscal Year Starts: Month {auth.organization.fiscalYearStartMonth}
            </Badge>
          </div>
        </header>

        <main className="flex-1 p-8 max-w-6xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
