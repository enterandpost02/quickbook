import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getCurrentAuth } from "@/lib/auth";

export const instant = false;

async function HomeRedirectLoader() {
  await connection();
  const auth = await getCurrentAuth();
  if (auth) {
    redirect(auth.isSuperAdmin ? "/admin" : "/dashboard");
  }
  redirect("/login");
  return null;
}

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomeRedirectLoader />
    </Suspense>
  );
}
