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

  const { state: initialState } = await loadQboStoreFromDb(auth.organization.id);
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
        <div className="min-h-screen flex items-center justify-center bg-[#F4F5F8] text-slate-600 text-sm font-semibold">
          Loading Pro E Books Ledger from Supabase PostgreSQL...
        </div>
      }
    >
      <DashboardDataLoader />
    </Suspense>
  );
}
