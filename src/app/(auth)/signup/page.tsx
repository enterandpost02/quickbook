"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signupAction, type AuthActionState } from "../actions";
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

export default function SignupPage() {
  const [state, formAction, isPending] = useActionState(
    signupAction,
    initialState
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Create your business account</CardTitle>
        <CardDescription>
          Set up your login and initialize an isolated organization ledger.
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
            <Label htmlFor="fullName">Your full name</Label>
            <Input
              id="fullName"
              name="fullName"
              type="text"
              placeholder="Ada Lovelace"
              required
              autoComplete="name"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Work email</Label>
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
              placeholder="At least 8 characters"
              minLength={8}
              required
              autoComplete="new-password"
            />
          </div>

          <div className="grid grid-cols-3 gap-3 pt-1">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="organizationName">Business / Organization name</Label>
              <Input
                id="organizationName"
                name="organizationName"
                type="text"
                placeholder="Analytical Engine LLC"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="baseCurrency">Currency</Label>
              <select
                id="baseCurrency"
                name="baseCurrency"
                defaultValue="USD"
                className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-xs focus-visible:border-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/20"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="CAD">CAD ($)</option>
                <option value="AUD">AUD ($)</option>
              </select>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col space-y-3">
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Creating organization..." : "Create Account & Organization"}
          </Button>
          <p className="text-center text-sm text-slate-600">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-emerald-600 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
