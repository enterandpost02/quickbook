import { Suspense } from "react";
import { loadQboStoreFromDb } from "@/lib/qbo-db";
import { QboWorkspace } from "@/components/qbo/qbo-workspace";

export const instant = false;

async function DashboardDataLoader() {
  const { state: initialState } = await loadQboStoreFromDb();
  return <QboWorkspace initialState={initialState} />;
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#F4F5F8] text-slate-600 text-sm font-semibold">
          Loading QuickBooks Online Ledger from Supabase PostgreSQL...
        </div>
      }
    >
      <DashboardDataLoader />
    </Suspense>
  );
}
