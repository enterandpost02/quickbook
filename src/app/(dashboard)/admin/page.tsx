import { Suspense } from "react";
import { requireSuperAdmin } from "@/lib/auth";
import { getPlatformAdminOverview } from "@/lib/admin";
import { GodfatherAdminConsole } from "@/components/admin/godfather-console";

export const instant = false;

async function AdminDataLoader() {
  const auth = await requireSuperAdmin();
  const initialOverview = await getPlatformAdminOverview();

  return (
    <GodfatherAdminConsole
      initialOverview={initialOverview}
      adminUser={{
        id: auth.user.id,
        email: auth.user.email,
        fullName: auth.user.fullName,
      }}
    />
  );
}

export default function SuperAdminPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#0F172A] text-slate-200 text-sm font-semibold px-4 text-center">
          Loading Pro E Books Super Admin Platform Console...
        </div>
      }
    >
      <AdminDataLoader />
    </Suspense>
  );
}
