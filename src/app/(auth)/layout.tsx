import { redirect } from "next/navigation";
import { BookOpenCheck, ShieldCheck } from "lucide-react";
import { getCurrentAuth } from "@/lib/auth";

export const instant = false;

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await getCurrentAuth();
  if (auth) {
    redirect(auth.isSuperAdmin ? "/admin" : "/dashboard");
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex items-center justify-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2CA01C] text-white shadow-sm">
            <BookOpenCheck className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight text-slate-900">
              Pro <span className="text-[#2CA01C]">E Books</span>
            </span>
            <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
              Cloud Accounting
            </span>
          </div>
        </div>
        <p className="mt-2 text-center text-xs text-slate-500 flex items-center justify-center gap-1.5 flex-wrap">
          <ShieldCheck className="h-3.5 w-3.5 text-[#2CA01C] shrink-0" />
          <span>Integer-cents precision · Multi-tenant isolation · Verified RBAC</span>
        </p>
      </div>

      <div className="mt-6 sm:mt-8 sm:mx-auto sm:w-full sm:max-w-md w-full">
        {children}
      </div>
    </div>
  );
}
