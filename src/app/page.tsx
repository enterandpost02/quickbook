import { redirect } from "next/navigation";
import { getCurrentAuth } from "@/lib/auth";

export const instant = false;

export default async function HomePage() {
  const auth = await getCurrentAuth();
  if (auth) {
    redirect("/dashboard");
  } else {
    redirect("/login");
  }
}
