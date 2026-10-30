import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getCurrentAuth } from "@/lib/auth";
import { loadQboStoreFromDb } from "@/lib/qbo-db";
import { QboWorkspace } from "@/components/qbo/qbo-workspace";

export const instant = false;

async function DashboardDataLoader() {
  await connection();
  const auth = await getCurrentAuth();
  if (!auth) {
    redirect("/login");
  }

  // Platform Super Admin ("Godfather") manages platform tenants & users at /admin only,
  // and must never open customer ledgers or bookkeeping workspaces.
  if (auth.isSuperAdmin) {
    redirect("/admin");
  }

  const allowedOrgIds = auth.memberships.map((m) => m.organization.id);

  const { state: initialState } = await loadQboStoreFromDb(
    auth.organization.id,
    { allowedOrgIds }
  );
  initialState.activeRole = auth.role;

  return (
    <QboWorkspace
      initialState={initialState}
      currentUser={{
        id: auth.user.id,
        email: auth.user.email,
        fullName: auth.user.fullName,
        role: auth.role,
      }}
    />
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#F4F5F8] text-slate-600 text-sm font-semibold px-4 text-center">
          Loading Pro E Books Ledger from PostgreSQL...
        </div>
      }
    >
      <DashboardDataLoader />
    </Suspense>
  );
}
