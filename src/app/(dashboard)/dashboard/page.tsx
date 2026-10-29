import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentAuth } from "@/lib/auth";
import { loadQboStoreFromDb } from "@/lib/qbo-db";
import { QboWorkspace } from "@/components/qbo/qbo-workspace";

export const instant = false;

async function DashboardDataLoader() {
  const auth = await getCurrentAuth();
  if (!auth) {
    redirect("/login");
  }

  const allowedOrgIds = auth.isSuperAdmin
    ? undefined
    : auth.memberships.map((m) => m.organization.id);

  const { state: initialState } = await loadQboStoreFromDb(
    auth.organization.id,
    { allowedOrgIds }
  );
  initialState.activeRole = auth.isSuperAdmin ? "owner" : auth.role;

  return (
    <QboWorkspace
      initialState={initialState}
      currentUser={{
        id: auth.user.id,
        email: auth.user.email,
        fullName: auth.user.fullName,
        role: auth.isSuperAdmin ? "owner" : auth.role,
        isSuperAdmin: auth.isSuperAdmin,
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
