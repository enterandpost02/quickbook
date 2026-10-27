"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { loginAction, type AuthActionState } from "../actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: AuthActionState = {};

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(
    loginAction,
    initialState
  );

  const [email, setEmail] = useState("enterandpost02@gmail.com");
  const [password, setPassword] = useState("Standard@1122");

  function fillAdminCredentials() {
    setEmail("enterandpost02@gmail.com");
    setPassword("Standard@1122");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Sign in to your books</CardTitle>
        <CardDescription>
          Enter your credentials to access your organization&apos;s ledger.
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-4">
          {state.error && (
            <div
              role="alert"
              className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {state.error}
            </div>
          )}

          <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 text-xs text-emerald-900">
            <div className="flex items-center justify-between font-bold text-emerald-800 mb-1">
              <span>QuickBooks Admin Credentials:</span>
              <button
                type="button"
                onClick={fillAdminCredentials}
                className="underline hover:text-emerald-950 font-semibold"
              >
                Auto-fill
              </button>
            </div>
            <p className="font-mono text-[11px] text-emerald-700">
              Email: <strong>enterandpost02@gmail.com</strong>
            </p>
            <p className="font-mono text-[11px] text-emerald-700">
              Password: <strong>Standard@1122</strong>
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="enterandpost02@gmail.com"
              required
              autoComplete="email"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>
        </CardContent>

        <CardFooter className="flex flex-col space-y-3">
          <Button type="submit" className="w-full bg-[#2CA01C] hover:bg-[#248217] text-white font-bold" disabled={isPending}>
            {isPending ? "Signing in..." : "Sign In to QuickBooks"}
          </Button>
          <p className="text-center text-sm text-slate-600">
            New to QuickBoooks?{" "}
            <Link
              href="/signup"
              className="font-medium text-emerald-600 hover:underline"
            >
              Create an account
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
