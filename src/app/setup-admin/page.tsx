"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  GraduationCap,
  ShieldAlert,
  ShieldCheck,
  User,
  Mail,
  Lock,
  BadgeAlert,
  IdCard,
  Check,
  X,
  ArrowRight,
  Loader2,
  Building2,
  LockKeyhole,
} from "lucide-react";

export default function SetupAdminPage() {
  const router = useRouter();

  const [loadingCheck, setLoadingCheck] = useState(true);
  const [setupAvailable, setSetupAvailable] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string[]>([]);
  const [setupSuccess, setSetupSuccess] = useState(false);

  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch("/api/setup/admin");
        if (res.ok) {
          const data = await res.json();
          setSetupAvailable(Boolean(data.setupAvailable));
        } else {
          setSetupAvailable(false);
        }
      } catch (err) {
        console.error("Setup check error:", err);
        setSetupAvailable(false);
      } finally {
        setLoadingCheck(false);
      }
    }
    checkStatus();
  }, []);

  // Password criteria check
  const hasLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const isFormValid =
    hasLength &&
    hasUpper &&
    hasLower &&
    hasNumber &&
    hasSpecial &&
    passwordsMatch &&
    name.trim().length >= 2 &&
    /^\S+@\S+\.\S+$/.test(email) &&
    employeeId.trim().length >= 2;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setErrorDetails([]);

    if (!isFormValid) {
      setErrorMessage("Please fulfill all institutional requirements before continuing.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/setup/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          employeeId: employeeId.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "Admin setup failed");
        if (Array.isArray(data.details)) {
          setErrorDetails(data.details);
        }
        return;
      }

      setSetupSuccess(true);
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 1500);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("An unexpected network error occurred.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingCheck) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 text-[#1D4ED8] animate-spin" />
          <p className="text-sm font-medium text-slate-600">Verifying system configuration...</p>
        </div>
      </div>
    );
  }

  // If DEPARTMENT_ADMIN already exists, setup is permanently locked
  if (!setupAvailable && !setupSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#F8FAFC]">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center">
          <div className="inline-flex h-16 w-16 rounded-2xl bg-amber-100 text-amber-700 items-center justify-center mb-5">
            <LockKeyhole className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Admin Setup Locked</h2>
          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            A Department Administrator has already been established for the MCA Department. Public
            administrative setup is <strong>permanently disabled</strong> to protect institutional data
            integrity.
          </p>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 mb-6 text-left space-y-1">
            <div className="font-semibold text-slate-800">Institutional Rule 4:</div>
            <div>
              Only one initial admin setup is permitted. Additional user accounts must be granted by
              the existing Department Administrator.
            </div>
          </div>
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="w-full py-2.5 px-4 rounded-lg bg-[#1D4ED8] text-white text-sm font-semibold hover:bg-blue-800 transition"
          >
            Return to Portal Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="inline-flex h-12 w-12 rounded-xl bg-[#1D4ED8] text-white items-center justify-center shadow-md mb-3">
            <GraduationCap className="h-6 w-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            One-Time Initial Admin Setup
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-lg mx-auto">
            Initialize the primary Department Administrator account for MCA NIRF Assist. This route
            will be permanently locked once completed.
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-200 p-8 sm:p-10">
          {setupSuccess ? (
            <div className="text-center py-6">
              <div className="inline-flex h-16 w-16 rounded-full bg-emerald-100 text-emerald-600 items-center justify-center mb-4">
                <Check className="h-8 w-8 stroke-[3]" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                Department Administrator Configured
              </h2>
              <p className="text-sm text-slate-600 mb-6">
                Your administrative credentials have been securely stored with bcrypt hashing.
                Redirecting to the dashboard...
              </p>
              <div className="flex items-center justify-center gap-2 text-xs text-blue-700 font-medium">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Entering Department Workspace...</span>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Department & Role Institutional Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-blue-50/70 border border-blue-100">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-blue-100 flex items-center justify-center text-[#1D4ED8]">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-700 block">
                      Target Department
                    </span>
                    <span className="text-sm font-bold text-slate-900">MCA</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-blue-100 flex items-center justify-center text-[#1D4ED8]">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-700 block">
                      Assigned Role
                    </span>
                    <span className="text-sm font-bold text-slate-900">DEPARTMENT_ADMIN</span>
                  </div>
                </div>
              </div>

              {/* Error Alert */}
              {errorMessage && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
                  <div className="flex items-start gap-2.5 font-semibold">
                    <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{errorMessage}</span>
                  </div>
                  {errorDetails.length > 0 && (
                    <ul className="mt-2 list-disc list-inside space-y-1 pl-4">
                      {errorDetails.map((det, idx) => (
                        <li key={idx}>{det}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Prof. Rajesh Kumar"
                    className="block w-full pl-10 pr-3.5 py-2.5 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
                    required
                  />
                </div>
              </div>

              {/* Institutional Email */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Institutional Email <span className="text-rose-500">*</span>
                </label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. hod.mca@college.edu"
                    className="block w-full pl-10 pr-3.5 py-2.5 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
                    required
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  Must be an official institutional email address.
                </p>
              </div>

              {/* Employee ID */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Institutional Employee ID <span className="text-rose-500">*</span>
                </label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <IdCard className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    placeholder="e.g. FAC-MCA-001"
                    className="block w-full pl-10 pr-3.5 py-2.5 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Strong Administrator Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="block w-full pl-10 pr-3.5 py-2.5 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
                    required
                  />
                </div>

                {/* Password Criteria Checklist */}
                <div className="mt-3 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                  <div className="font-semibold text-slate-700 text-[11px] uppercase tracking-wider mb-1">
                    Institutional Password Requirements:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    <div
                      className={`flex items-center gap-1.5 ${hasLength ? "text-emerald-600 font-medium" : "text-slate-500"}`}
                    >
                      {hasLength ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                      <span>At least 8 characters</span>
                    </div>
                    <div
                      className={`flex items-center gap-1.5 ${hasUpper ? "text-emerald-600 font-medium" : "text-slate-500"}`}
                    >
                      {hasUpper ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                      <span>One uppercase letter</span>
                    </div>
                    <div
                      className={`flex items-center gap-1.5 ${hasLower ? "text-emerald-600 font-medium" : "text-slate-500"}`}
                    >
                      {hasLower ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                      <span>One lowercase letter</span>
                    </div>
                    <div
                      className={`flex items-center gap-1.5 ${hasNumber ? "text-emerald-600 font-medium" : "text-slate-500"}`}
                    >
                      {hasNumber ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                      <span>One number (0-9)</span>
                    </div>
                    <div
                      className={`flex items-center gap-1.5 ${hasSpecial ? "text-emerald-600 font-medium" : "text-slate-500"}`}
                    >
                      {hasSpecial ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                      <span>One special character (!@#$...)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Confirm Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="block w-full pl-10 pr-3.5 py-2.5 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
                    required
                  />
                </div>
                {confirmPassword.length > 0 && !passwordsMatch && (
                  <p className="mt-1 text-xs text-rose-500 flex items-center gap-1">
                    <X className="h-3.5 w-3.5" /> Passwords do not match
                  </p>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting || !isFormValid}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-[#1D4ED8] text-white text-sm font-semibold hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8] disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Initializing Department Administrator...</span>
                  </>
                ) : (
                  <>
                    <span>Complete Setup & Create Admin Account</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => router.push("/login")}
                  className="text-xs text-slate-500 hover:text-slate-800 transition"
                >
                  Already have an account? Sign In
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

