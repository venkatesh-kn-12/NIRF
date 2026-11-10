"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  GraduationCap,
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  ShieldCheck,
  FileSignature,
  Fingerprint,
  Check,
  ArrowRight,
  Loader2,
} from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/dashboard";

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setupRequired, setSetupRequired] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(true);

  useEffect(() => {
    // Check if initial admin setup is required
    async function checkSetup() {
      try {
        const res = await fetch("/api/setup/admin");
        if (res.ok) {
          const data = await res.json();
          if (data.setupAvailable) {
            setSetupRequired(true);
          }
        }
      } catch (err) {
        console.error("Failed to check setup status:", err);
      } finally {
        setCheckingSetup(false);
      }
    }
    checkSetup();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Authentication failed");
      }

      // Login successful, redirect to destination
      router.push(from);
      router.refresh();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred during sign in.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      {/* Mobile branding header */}
      <div className="lg:hidden mb-8 text-center">
        <div className="inline-flex h-12 w-12 rounded-xl bg-[#1D4ED8] text-white items-center justify-center shadow-md mb-3">
          <GraduationCap className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">MCA NIRF Assist</h2>
        <p className="text-xs text-slate-500">Department of Computer Applications</p>
      </div>

      {/* Setup Required Notification Banner */}
      {!checkingSetup && setupRequired && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-bold block text-sm mb-1">
                Initial System Setup Required
              </span>
              No Department Administrator has been configured yet. The initial admin account must
              be created via the secure setup flow.
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => router.push("/setup-admin")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 text-white font-medium text-xs hover:bg-amber-700 transition"
                >
                  <span>Proceed to Admin Setup</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Login Card */}
      <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-200/80 p-8 sm:p-10 transition-all">
        {/* Header */}
        <div className="mb-7">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-[#1D4ED8] text-xs font-semibold mb-3 border border-blue-100">
            <Lock className="h-3.5 w-3.5" />
            Portal Sign In
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Sign in to MCA NIRF Assist
          </h2>
          <p className="text-sm text-slate-500 mt-1.5">
            Manage departmental NIRF data, evidence and analytics.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-5 p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          {/* Email or Institutional ID */}
          <div>
            <label
              htmlFor="identifier"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5"
            >
              Email or Institutional ID <span className="text-rose-500">*</span>
            </label>
            <div className="relative rounded-lg shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="h-4 w-4" />
              </div>
              <input
                type="text"
                id="identifier"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="e.g. faculty.name@college.edu or FAC-1049"
                className="block w-full pl-10 pr-3.5 py-2.5 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8] focus:border-[#1D4ED8] transition"
                required
              />
            </div>
            <p className="mt-1.5 text-xs text-slate-500">
              Enter your registered institutional email or assigned employee ID.
            </p>
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="password"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
              >
                Password <span className="text-rose-500">*</span>
              </label>
            </div>
            <div className="relative rounded-lg shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="h-4 w-4" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="block w-full pl-10 pr-10 py-2.5 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8] focus:border-[#1D4ED8] transition"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
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

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-[#1D4ED8] text-white text-sm font-semibold hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1D4ED8] shadow-md shadow-blue-500/20 disabled:opacity-60 transition"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Verifying Credentials...</span>
              </>
            ) : (
              <>
                <span>Sign In to Department Portal</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {/* Security note */}
        <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            Session protected via HTTP-only cookie
          </span>
          {setupRequired && (
            <button
              type="button"
              onClick={() => router.push("/setup-admin")}
              className="text-[#1D4ED8] font-semibold hover:underline"
            >
              Admin Setup →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#F8FAFC]">
      {/* LEFT PANEL: Academic Branding & Department Stamps */}
      <div className="relative lg:w-1/2 bg-gradient-to-br from-[#1E3A8A] via-[#1D4ED8] to-[#0F172A] text-white p-8 sm:p-12 lg:p-16 flex flex-col justify-between overflow-hidden">
        {/* Subtle grid and glow effects */}
        <div className="absolute inset-0 grid-bg pointer-events-none opacity-60" />
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="relative z-10">
          <div className="flex items-center gap-3.5 mb-8">
            <div className="h-11 w-11 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-inner">
              <GraduationCap className="h-6 w-6 text-blue-200" />
            </div>
            <div>
              <span className="text-xs font-semibold tracking-wider uppercase text-blue-200 block">
                Department of Computer Applications
              </span>
              <span className="text-xs text-blue-300/80 font-medium">
                Engineering College • AISHE C-18492
              </span>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-medium mb-4">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            NIRF 2025 Data Preparation & Institutional Audit
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white mb-4 leading-tight">
            MCA NIRF Assist
          </h1>
          <p className="text-base sm:text-lg text-blue-100/90 max-w-xl font-normal leading-relaxed">
            Integrated academic data intelligence repository for NIRF metric compilation, verification
            workflows, and DCS parameter analytics.
          </p>
        </div>

        {/* Center Compliance Badges */}
        <div className="relative z-10 my-8 sm:my-10">
          <div className="text-xs font-semibold uppercase tracking-wider text-blue-200/90 mb-3">
            Institutional Compliance & Capabilities
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-blue-100">
              <Check className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Verified Department Submissions</span>
            </div>
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-blue-100">
              <FileSignature className="h-4 w-4 text-blue-300 shrink-0" />
              <span>DCS Regulatory Export Format</span>
            </div>
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-blue-100">
              <Fingerprint className="h-4 w-4 text-indigo-300 shrink-0" />
              <span>Role-Based Audit Verification</span>
            </div>
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-blue-200">
              <ShieldCheck className="h-4 w-4 text-blue-200 shrink-0" />
              <span>Institutional Data Integrity</span>
            </div>
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="relative z-10 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-blue-200/80 gap-2">
          <p>© 2025 Department of Computer Applications. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span className="hover:text-white transition-colors">Security Protocol</span>
            <span className="w-1 h-1 rounded-full bg-blue-300/40" />
            <span className="hover:text-white transition-colors">NIRF Portal Guidelines</span>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: Sign-In Card */}
      <div className="lg:w-1/2 flex items-center justify-center p-6 sm:p-10 lg:p-14 bg-[#F8FAFC]">
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 text-[#1D4ED8] animate-spin" />
            </div>
          }
        >
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
