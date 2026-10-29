"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  RefreshCw,
  ShieldCheck,
  User,
} from "lucide-react";
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

function SignupFlowForm() {
  const searchParams = useSearchParams();
  const inviteTokenParam = searchParams.get("invite") || "";
  const prefillEmailParam = searchParams.get("email") || "";
  const prefillNameParam = searchParams.get("name") || "";

  const [step, setStep] = useState<"details" | "otp">("details");

  const [fullName, setFullName] = useState(prefillNameParam);
  const [email, setEmail] = useState(prefillEmailParam);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [organizationName, setOrganizationName] = useState("");
  const [baseCurrency, setBaseCurrency] = useState("USD");

  const [inviteInfo, setInviteInfo] = useState<{
    valid: boolean;
    role?: string;
    organizationName?: string;
  } | null>(null);

  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [simulatedOtpCode, setSimulatedOtpCode] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!inviteTokenParam) return;
    let active = true;
    fetch(
      `/api/auth/signup/invite-info?token=${encodeURIComponent(
        inviteTokenParam
      )}`
    )
      .then((r) => r.json())
      .then((data) => {
        if (!active) return;
        if (data.valid) {
          setInviteInfo({
            valid: true,
            role: data.role,
            organizationName: data.organizationName,
          });
          if (data.email) setEmail(data.email);
          if (data.fullName) setFullName(data.fullName);
          if (data.organizationName) setOrganizationName(data.organizationName);
        } else {
          setError(data.error || "Invalid or expired invitation link.");
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [inviteTokenParam]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  async function handleRequestOtp(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setError(null);
    setStatusMessage(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match. Please verify both password fields.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/signup/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          email,
          password,
          organizationName,
          baseCurrency,
          inviteToken: inviteTokenParam || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not send verification code.");
        return;
      }

      if (data.organizationName) {
        setOrganizationName(data.organizationName);
      }
      setSimulatedOtpCode(data.simulated ? data.simulatedOtpCode || null : null);
      setOtpDigits(["", "", "", "", "", ""]);
      setStep("otp");
      setResendCooldown(30);
      setStatusMessage(`6-digit verification code sent to ${data.email}`);
      setTimeout(() => {
        otpRefs.current[0]?.focus();
      }, 100);
    } catch {
      setError("Network error while sending OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleOtpChange(index: number, rawVal: string) {
    const digitsOnly = rawVal.replace(/\D/g, "");
    if (!digitsOnly) {
      const next = [...otpDigits];
      next[index] = "";
      setOtpDigits(next);
      return;
    }

    // Handle multi-digit paste
    if (digitsOnly.length > 1) {
      const next = [...otpDigits];
      for (let i = 0; i < 6; i++) {
        next[i] = digitsOnly[i] || next[i] || "";
      }
      setOtpDigits(next);
      const focusIdx = Math.min(digitsOnly.length, 5);
      otpRefs.current[focusIdx]?.focus();
      return;
    }

    const next = [...otpDigits];
    next[index] = digitsOnly[0];
    setOtpDigits(next);
    if (index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  }

  function handleOtpKeyDown(
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const next = ["", "", "", "", "", ""];
    for (let i = 0; i < pasted.length; i++) {
      next[i] = pasted[i];
    }
    setOtpDigits(next);
    otpRefs.current[Math.min(pasted.length, 5)]?.focus();
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const code = otpDigits.join("");
    if (code.length !== 6) {
      setError("Please enter all 6 digits of your verification code.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/signup/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          otpCode: code,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Invalid verification code.");
        return;
      }

      window.location.href = data.redirectTo || "/dashboard";
    } catch {
      setError("Network error while verifying code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  if (step === "otp") {
    return (
      <Card className="shadow-md border-slate-200">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
              <KeyRound className="h-3 w-3" />
              Step 2 of 2 · Email OTP Verification
            </span>
            <button
              type="button"
              onClick={() => {
                setStep("details");
                setError(null);
              }}
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Edit details
            </button>
          </div>
          <CardTitle className="text-xl font-bold text-slate-900 pt-1">
            Verify your email
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm text-slate-600">
            We sent a 6-digit verification code to{" "}
            <strong className="text-slate-900 break-all">{email}</strong> to
            activate{" "}
            <strong className="text-slate-900">
              {organizationName || "your workspace"}
            </strong>
            .
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleVerifyOtp} autoComplete="off">
          <CardContent className="space-y-4">
            {error && (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs sm:text-sm font-medium text-red-700"
              >
                {error}
              </div>
            )}

            {statusMessage && !error && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 px-3.5 py-2 text-xs font-semibold text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#2CA01C] shrink-0" />
                <span>{statusMessage}</span>
              </div>
            )}

            {simulatedOtpCode && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-950">
                <p className="font-bold text-amber-900">
                  Local / Sandbox Mailer Mode (GMAIL_APP_PASSWORD not set):
                </p>
                <p className="mt-1">
                  Your 6-digit verification code is:{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setOtpDigits(simulatedOtpCode.split(""));
                    }}
                    className="font-mono text-sm font-extrabold tracking-widest bg-white border border-amber-300 px-2 py-0.5 rounded text-emerald-800 hover:bg-emerald-50"
                    title="Click to enter code"
                  >
                    {simulatedOtpCode}
                  </button>
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-700 block text-center">
                Enter 6-digit verification code
              </Label>
              <div className="flex items-center justify-center gap-1.5 sm:gap-2.5">
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      otpRefs.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    onPaste={handleOtpPaste}
                    aria-label={`Verification digit ${idx + 1}`}
                    className="h-11 w-10 sm:h-12 sm:w-12 rounded-lg border border-slate-300 bg-white text-center font-mono text-lg sm:text-xl font-bold text-slate-900 shadow-2xs focus:border-[#2CA01C] focus:ring-2 focus:ring-[#2CA01C]/20 focus:outline-none"
                  />
                ))}
              </div>
              <p className="text-center text-[11px] text-slate-500">
                Code expires in 10 minutes · Paste or type your 6-digit OTP
              </p>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-3 pt-2">
            <Button
              type="submit"
              className="w-full bg-[#2CA01C] hover:bg-[#248217] text-white font-bold"
              disabled={isLoading || otpDigits.join("").length !== 6}
            >
              {isLoading
                ? "Verifying & Creating Account..."
                : "Verify OTP & Launch Pro E Books"}
            </Button>

            <div className="flex items-center justify-between w-full text-xs text-slate-600 pt-1">
              <span>Didn&apos;t receive the email?</span>
              <button
                type="button"
                disabled={resendCooldown > 0 || isLoading}
                onClick={() => handleRequestOtp()}
                className="inline-flex items-center gap-1 font-semibold text-[#2CA01C] hover:underline disabled:text-slate-400 disabled:no-underline"
              >
                <RefreshCw className="h-3 w-3" />
                {resendCooldown > 0
                  ? `Resend in ${resendCooldown}s`
                  : "Resend OTP Code"}
              </button>
            </div>
          </CardFooter>
        </form>
      </Card>
    );
  }

  return (
    <Card className="shadow-md border-slate-200">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
            <ShieldCheck className="h-3 w-3" />
            Step 1 of 2 · Verified Owner Registration
          </span>
        </div>
        <CardTitle className="text-xl font-bold text-slate-900 pt-1">
          {inviteInfo?.valid
            ? `Join ${inviteInfo.organizationName}`
            : "Create your Pro E Books account"}
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm text-slate-500">
          {inviteInfo?.valid
            ? `Verify your email via OTP to activate your ${inviteInfo.role?.toUpperCase()} access.`
            : "Register as a Company Owner, verify your email with a 6-digit OTP, and launch your isolated double-entry books."}
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleRequestOtp} autoComplete="off">
        <CardContent className="space-y-3.5">
          {error && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs sm:text-sm font-medium text-red-700"
            >
              {error}
            </div>
          )}

          {inviteInfo?.valid && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-900">
              You have been invited to{" "}
              <strong>{inviteInfo.organizationName}</strong> as{" "}
              <strong className="uppercase">{inviteInfo.role}</strong>.
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="fullName" className="text-xs font-semibold text-slate-700">
              Your full name
            </Label>
            <div className="relative">
              <User className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                id="fullName"
                name="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Anderson"
                required
                autoComplete="off"
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-semibold text-slate-700">
              Work email address
            </Label>
            <div className="relative">
              <Mail className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="owner@yourcompany.com"
                required
                readOnly={Boolean(inviteInfo?.valid)}
                autoComplete="off"
                className={`pl-9 ${inviteInfo?.valid ? "bg-slate-100 text-slate-600" : ""}`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-semibold text-slate-700">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  minLength={8}
                  required
                  autoComplete="new-password"
                  className="pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-xs font-semibold text-slate-700">
                Confirm password
              </Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                minLength={8}
                required
                autoComplete="new-password"
              />
            </div>
          </div>

          {!inviteInfo?.valid && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="sm:col-span-2 space-y-1.5">
                <Label
                  htmlFor="organizationName"
                  className="text-xs font-semibold text-slate-700"
                >
                  Business / Company name
                </Label>
                <div className="relative">
                  <Building2 className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <Input
                    id="organizationName"
                    name="organizationName"
                    type="text"
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    placeholder="Apex Consulting LLC"
                    required
                    autoComplete="off"
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="baseCurrency"
                  className="text-xs font-semibold text-slate-700"
                >
                  Base currency
                </Label>
                <select
                  id="baseCurrency"
                  name="baseCurrency"
                  value={baseCurrency}
                  onChange={(e) => setBaseCurrency(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-2xs focus-visible:border-[#2CA01C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2CA01C]/20"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="CAD">CAD ($)</option>
                  <option value="AUD">AUD ($)</option>
                </select>
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col space-y-3 pt-2">
          <Button
            type="submit"
            className="w-full bg-[#2CA01C] hover:bg-[#248217] text-white font-bold"
            disabled={isLoading}
          >
            {isLoading
              ? "Sending Verification OTP..."
              : "Send Email Verification Code (OTP)"}
          </Button>
          <p className="text-center text-xs sm:text-sm text-slate-600">
            Already have a verified account?{" "}
            <Link
              href="/login"
              className="font-semibold text-[#2CA01C] hover:underline"
            >
              Sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <Card className="shadow-md border-slate-200 p-8 text-center text-xs text-slate-500">
          Loading registration form...
        </Card>
      }
    >
      <SignupFlowForm />
    </Suspense>
  );
}
