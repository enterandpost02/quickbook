import {
  Building2,
  CheckCircle2,
  FolderKanban,
  Plus,
  Scale,
  ShieldCheck,
} from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { formatCents } from "@/lib/money";
import { createOrganizationAction } from "@/app/(auth)/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function DashboardPage() {
  const auth = await requireAuth();
  const currency = auth.organization.baseCurrency;

  return (
    <div className="space-y-8">
      {/* Zeroed Bookkeeping Summary Cards (Integer Cents) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Cash Balance</CardDescription>
            <CardTitle className="text-2xl font-mono">
              {formatCents(0, currency)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-500">
              No bank accounts or entries posted yet
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Income (MTD)</CardDescription>
            <CardTitle className="text-2xl font-mono text-emerald-700">
              {formatCents(0, currency)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-500">0 posted journal lines</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Expenses (MTD)</CardDescription>
            <CardTitle className="text-2xl font-mono text-slate-900">
              {formatCents(0, currency)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-500">0 posted journal lines</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Net Profit (MTD)</CardDescription>
            <CardTitle className="text-2xl font-mono">
              {formatCents(0, currency)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-500">
              Integer-cents engine active
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Empty Ledger State + Multi-Tenant Organization Isolation Card */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <Badge variant="default">Phase 0 Complete</Badge>
              <span className="text-xs text-slate-400 font-mono">
                organization_id: {auth.organization.id.slice(0, 8)}…
              </span>
            </div>
            <CardTitle className="text-xl pt-2">
              Welcome to {auth.organization.name}&apos;s empty dashboard
            </CardTitle>
            <CardDescription>
              Your organization is isolated in PostgreSQL and ready for Phase 1
              (Chart of Accounts &amp; Double-Entry Journal Core).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/70 p-6 text-center">
              <Scale className="mx-auto h-8 w-8 text-emerald-600 mb-2" />
              <h3 className="text-sm font-semibold text-slate-900">
                No journal entries posted yet
              </h3>
              <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
                Every financial transaction in{" "}
                <span className="font-medium text-slate-700">
                  {auth.organization.name}
                </span>{" "}
                will be stored in integer cents, verified for balanced debits and
                credits inside a database transaction, and scoped strictly to
                this organization.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="flex items-start gap-2.5 rounded-lg border border-slate-200 p-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-slate-900">
                    Integer Cents Only
                  </p>
                  <p className="text-[11px] text-slate-500">
                    $100.00 = 10000 cents. Zero float rounding bugs.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 rounded-lg border border-slate-200 p-3">
                <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-slate-900">
                    Tenant Isolation
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Scoped to organization_id from day one.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 rounded-lg border border-slate-200 p-3">
                <FolderKanban className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-slate-900">
                    Immutable Ledger
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Posted entries never edit; reversals only.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Create Another Separate Business / Organization to verify multi-tenancy */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-emerald-600" />
              <CardTitle className="text-base">
                Multi-Business Separation
              </CardTitle>
            </div>
            <CardDescription>
              Create an additional organization to verify separate business books
              under your login.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createOrganizationAction} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="newOrgName">New business name</Label>
                <Input
                  id="newOrgName"
                  name="name"
                  placeholder="Second Venture Co."
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="newOrgCurrency">Base currency</Label>
                <select
                  id="newOrgCurrency"
                  name="baseCurrency"
                  defaultValue="USD"
                  className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-xs focus-visible:border-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/20"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="CAD">CAD ($)</option>
                </select>
              </div>

              <Button type="submit" variant="outline" className="w-full">
                <Plus className="h-4 w-4" />
                Add Separate Business
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
