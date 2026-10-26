"use client";

import { useActionState } from "react";
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

          <div className="space-y-1.5">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="ada@analyticalengine.co"
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
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>
        </CardContent>

        <CardFooter className="flex flex-col space-y-3">
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Signing in..." : "Sign In"}
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
