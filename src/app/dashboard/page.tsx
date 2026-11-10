"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  GraduationCap,
  LogOut,
  KeyRound,
  ShieldCheck,
  Building2,
  Mail,
  IdCard,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Upload,
  Calculator,
  History,
  Users,
  Loader2,
  X,
  Check,
  ArrowRight,
  BarChart3,
  FileSpreadsheet,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  FolderCheck,
  Award,
} from "lucide-react";

interface SafeUser {
  id: string;
  name: string;
  email: string;
  role: "DEPARTMENT_ADMIN" | "FACULTY_CONTRIBUTOR" | "REVIEWER" | "VIEWER";
  department: string;
  employeeId?: string;
  studentId?: string;
  status: string;
  lastLoginAt?: string;
}

interface DashboardSummary {
  department: "MCA";
  academicYear: string;
  completeness: {
    totalRecords: number;
    approvedRecords: number;
    pendingRecords: number;
    reviewNeededRecords: number;
    completenessPercentage: number;
  };
  parameterReadiness: Record<
    string,
    {
      name: string;
      weight: number;
      totalRecords: number;
      approvedRecords: number;
      readinessPercentage: number;
      status: "HIGH" | "MEDIUM" | "LOW";
    }
  >;
  metricsSummary: {
    totalMetrics: number;
    computed: number;
    awaitingSource: number;
    pendingInput: number;
    notComputable: number;
    indicativeOverallScore: number | null;
  };
  recentActivity: Array<{
    id: string;
    action: string;
    userEmail: string;
    userRole: string;
    resourceType?: string;
    timestamp: string;
    status: string;
    details?: any;
  }>;
}

export default function DashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState<SafeUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [selectedYear, setSelectedYear] = useState("2024-25");

  // Live Dashboard Summary State
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // Change password modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  // Quick Action execution state
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          router.push("/login");
        }
      } catch (err) {
        console.error("Failed to fetch user session:", err);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, [router]);

  const loadSummary = async (year: string) => {
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const res = await fetch(`/api/dashboard/summary?academicYear=${encodeURIComponent(year)}`);
      if (!res.ok) {
        throw new Error("Failed to load dashboard metrics aggregation");
      }
      const data = await res.json();
      setSummary(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setSummaryError(err.message);
      } else {
        setSummaryError("Failed to fetch department summary");
      }
    } finally {
      setSummaryLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadSummary(selectedYear);
    }
  }, [user, selectedYear]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Logout failed:", err);
      router.push("/login");
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword !== confirmNewPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to change password");
      }

      setPasswordSuccess("Password successfully changed!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordSuccess(null);
      }, 1500);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setPasswordError(err.message);
      } else {
        setPasswordError("An unexpected error occurred.");
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  // Quick test action for RBAC demonstration
  const handleTriggerAction = async (actionType: string) => {
    setActionLoading(actionType);
    setActionFeedback(null);

    try {
      let res;
      if (actionType === "CREATE_RECORD") {
        res = await fetch("/api/records", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: `Student Enrolment Batch ${new Date().getFullYear()}`,
            category: "STUDENTS",
            academicYear: "2023-24",
            data: { intake: 60, admitted: 60 },
          }),
        });
      } else if (actionType === "UPLOAD_EVIDENCE") {
        res = await fetch("/api/upload/evidence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: "MCA_Intake_Approval_2023_24.pdf",
            fileUrl: "https://dsatm.edu.in/evidence/mca/2023_24_approval.pdf",
            fileSize: 2048576,
          }),
        });
      } else if (actionType === "CALCULATE_METRICS") {
        res = await fetch("/api/metrics/calculate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ academicYear: selectedYear, parameter: "SS" }),
        });
      }

      if (res) {
        const data = await res.json();
        if (res.ok) {
          setActionFeedback({
            success: true,
            message: data.message || `Action [${actionType}] completed successfully.`,
          });
          loadSummary(selectedYear);
        } else {
          setActionFeedback({
            success: false,
            message: data.error || `Action [${actionType}] was rejected by RBAC policy.`,
          });
        }
      }
    } catch (err: unknown) {
      setActionFeedback({
        success: false,
        message: err instanceof Error ? err.message : "Request failed",
      });
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 text-[#1D4ED8] animate-spin" />
          <p className="text-sm font-medium text-slate-600">Verifying security session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const roleBadgeStyles: Record<string, string> = {
    DEPARTMENT_ADMIN: "bg-blue-100 text-blue-800 border-blue-200",
    FACULTY_CONTRIBUTOR: "bg-emerald-100 text-emerald-800 border-emerald-200",
    REVIEWER: "bg-amber-100 text-amber-800 border-amber-200",
    VIEWER: "bg-slate-100 text-slate-800 border-slate-200",
  };

  const roleLabel: Record<string, string> = {
    DEPARTMENT_ADMIN: "Department Administrator",
    FACULTY_CONTRIBUTOR: "Faculty Contributor",
    REVIEWER: "Reviewer / Coordinator",
    VIEWER: "Viewer",
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Top Navigation Bar */}
      <header className="h-16 bg-white border-b border-slate-200 px-6 sm:px-8 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-[#1D4ED8] flex items-center justify-center text-white shadow-sm">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900 tracking-tight">MCA NIRF Assist</div>
            <div className="text-[11px] text-slate-500 font-medium">
              Department of Computer Applications • NIRF Engineering 2025
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Quick Nav Links */}
          <button
            onClick={() => router.push("/analytics")}
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition"
          >
            <BarChart3 className="h-3.5 w-3.5 text-blue-600" />
            <span>Analytics</span>
          </button>

          <button
            onClick={() => router.push("/reports")}
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
            <span>Reports &amp; DCS</span>
          </button>

          {(user.role === "DEPARTMENT_ADMIN" || user.role === "REVIEWER") && (
            <button
              onClick={() => router.push("/audit")}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition"
            >
              <History className="h-3.5 w-3.5" />
              <span>Audit Trail</span>
            </button>
          )}

          {/* Change password button */}
          <button
            onClick={() => setShowPasswordModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition"
          >
            <KeyRound className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Password</span>
          </button>

          {/* Sign out button */}
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 text-xs font-semibold transition border border-red-200 disabled:opacity-50"
          >
            {loggingOut ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <LogOut className="h-3.5 w-3.5" />
            )}
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* User Profile Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-[#1E3A8A] to-[#1D4ED8] text-white flex items-center justify-center font-bold text-2xl shadow-md">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                    {user.name}
                  </h1>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${roleBadgeStyles[user.role] || "bg-slate-100 text-slate-800"}`}
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {roleLabel[user.role] || user.role}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-y-1 gap-x-4 mt-2 text-xs text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                    {user.email}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <IdCard className="h-3.5 w-3.5 text-slate-400" />
                    ID: {user.employeeId || user.studentId || "N/A"}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-slate-400" />
                    Dept: {user.department}
                  </span>
                  {user.lastLoginAt && (
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      Last login: {new Date(user.lastLoginAt).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 self-start md:self-auto">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                <span className="text-[11px] font-semibold text-slate-500 uppercase">Cycle:</span>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                >
                  <option value="2024-25">2024-25 (Current)</option>
                  <option value="2023-24">2023-24</option>
                  <option value="2022-23">2022-23</option>
                </select>
              </div>
              <button
                onClick={() => loadSummary(selectedYear)}
                disabled={summaryLoading}
                className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
                title="Refresh Metrics"
              >
                <RefreshCw className={`h-4 w-4 ${summaryLoading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Action feedback */}
        {actionFeedback && (
          <div
            className={`p-4 rounded-xl border text-xs flex items-start gap-3 shadow-sm ${
              actionFeedback.success
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-red-50 border-red-200 text-red-800"
            }`}
          >
            {actionFeedback.success ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
            )}
            <div className="flex-1 font-medium">{actionFeedback.message}</div>
            <button
              onClick={() => setActionFeedback(null)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Live Aggregation KPI Metrics Bar */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Institutional Readiness &amp; Status Overview
              </h2>
              <p className="text-xs text-slate-500">
                Departmental NIRF data completeness, approval pipeline, and deterministic computation
              </p>
            </div>
            <span className="text-[11px] font-semibold text-slate-500">
              Methodology: NIRF_ENGINEERING_2025
            </span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: Data Completeness */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Completeness</span>
                <span className="h-8 w-8 rounded-lg bg-blue-50 text-[#1D4ED8] flex items-center justify-center">
                  <FolderCheck className="h-4 w-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900">
                {summary?.completeness.completenessPercentage ?? 0}%
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 mt-2 overflow-hidden">
                <div
                  className="bg-[#1D4ED8] h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(summary?.completeness.completenessPercentage ?? 0, 100)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
                <span>{summary?.completeness.approvedRecords ?? 0} approved</span>
                <span>{summary?.completeness.totalRecords ?? 0} total</span>
              </div>
            </div>

            {/* KPI 2: Review Queue */}
            <div
              onClick={() => router.push("/verification")}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:border-amber-400 transition cursor-pointer group"
            >
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider group-hover:text-amber-700">
                  Review Queue
                </span>
                <span className="h-8 w-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                  <AlertTriangle className="h-4 w-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900">
                {summary?.completeness.reviewNeededRecords ?? 0}
              </div>
              <p className="text-[11px] text-amber-700 font-medium mt-1">
                {(summary?.completeness.reviewNeededRecords ?? 0) > 0
                  ? "Cases require verification action"
                  : "All cases verified"}
              </p>
              <div className="flex items-center text-[11px] font-semibold text-amber-800 mt-2 gap-1 group-hover:underline">
                <span>Open Verification Queue</span>
                <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>

            {/* KPI 3: Computed Metrics */}
            <div
              onClick={() => router.push("/metrics")}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:border-indigo-400 transition cursor-pointer group"
            >
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider group-hover:text-indigo-700">
                  Computed Metrics
                </span>
                <span className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
                  <Calculator className="h-4 w-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900">
                {summary?.metricsSummary.computed ?? 0}
                <span className="text-sm font-normal text-slate-400"> / {summary?.metricsSummary.totalMetrics ?? 17}</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {summary?.metricsSummary.awaitingSource ?? 0} awaiting source • {summary?.metricsSummary.pendingInput ?? 0} pending input
              </p>
              <div className="flex items-center text-[11px] font-semibold text-indigo-700 mt-2 gap-1 group-hover:underline">
                <span>View Engine Formula Traces</span>
                <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>

            {/* KPI 4: Indicative Overall Score */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Indicative Score</span>
                <span className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Award className="h-4 w-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-emerald-700">
                {summary?.metricsSummary.indicativeOverallScore !== null && summary?.metricsSummary.indicativeOverallScore !== undefined
                  ? summary.metricsSummary.indicativeOverallScore.toFixed(2)
                  : "Pending"}
                <span className="text-xs font-normal text-slate-400"> / 100</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Subject to approved verified data only
              </p>
              <div className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200 mt-2 inline-block">
                Indicative Departmental Only
              </div>
            </div>
          </div>
        </div>

        {/* Parameter Readiness Visualizer */}
        {summary?.parameterReadiness && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                  Parameter-Wise NIRF Readiness (5 Pillars)
                </h3>
                <p className="text-xs text-slate-500">
                  Status of approved records required to satisfy NIRF Engineering parameters
                </p>
              </div>
              <span className="text-xs text-slate-400">Weights total 100%</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {Object.entries(summary.parameterReadiness).map(([paramCode, pData]) => {
                const badgeColor =
                  pData.status === "HIGH"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : pData.status === "MEDIUM"
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-slate-100 text-slate-600 border-slate-200";

                return (
                  <div
                    key={paramCode}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-slate-900 text-xs">{paramCode}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${badgeColor}`}>
                          {pData.readinessPercentage}%
                        </span>
                      </div>
                      <div className="text-[11px] font-medium text-slate-700 truncate" title={pData.name}>
                        {pData.name}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Weight: {Math.round(pData.weight * 100)}%
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-1.5 rounded-full ${
                            pData.status === "HIGH"
                              ? "bg-emerald-500"
                              : pData.status === "MEDIUM"
                              ? "bg-amber-500"
                              : "bg-slate-400"
                          }`}
                          style={{ width: `${Math.min(pData.readinessPercentage, 100)}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1 flex justify-between">
                        <span>{pData.approvedRecords} approved</span>
                        <span>{pData.totalRecords} records</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Primary Functional Hub: Data Pipelines & Reports Navigation */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                MCA Department Functional Hub
              </h2>
              <p className="text-xs text-slate-500">
                Institutional NIRF modules, analytics, regulatory reporting, and data pipelines
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-blue-50 text-[#1D4ED8] rounded-full border border-blue-200">
              Department: MCA
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Department Analytics */}
            <div
              onClick={() => router.push("/analytics")}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:border-blue-500 hover:shadow-md transition cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="h-10 w-10 rounded-xl bg-blue-50 text-[#1D4ED8] flex items-center justify-center group-hover:scale-105 transition-transform">
                    <BarChart3 className="h-5 w-5" />
                  </div>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    Analytics Hub
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 mb-1 group-hover:text-[#1D4ED8] transition-colors">
                  Department Analytics
                </h3>
                <p className="text-xs text-slate-500 line-clamp-2">
                  Multi-year trends, verification funnels, parameter completeness, and data quality gap diagnosis.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-[#1D4ED8]">
                <span>Open Analytics</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Card 2: Regulatory Reports & DCS */}
            <div
              onClick={() => router.push("/reports")}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:border-emerald-500 hover:shadow-md transition cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <FileSpreadsheet className="h-5 w-5" />
                  </div>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Regulatory Exports
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 mb-1 group-hover:text-emerald-700 transition-colors">
                  Reports &amp; DCS Export
                </h3>
                <p className="text-xs text-slate-500 line-clamp-2">
                  Generate 7 official report types, evidence dossiers, and export directly to PDF, XLSX, or CSV.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-emerald-700">
                <span>Generate Reports</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Card 3: Metrics Engine */}
            <div
              onClick={() => router.push("/metrics")}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:border-indigo-500 hover:shadow-md transition cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Calculator className="h-5 w-5" />
                  </div>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                    Engine
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 mb-1 group-hover:text-indigo-700 transition-colors">
                  Metric Calculations
                </h3>
                <p className="text-xs text-slate-500 line-clamp-2">
                  Deterministic NIRF calculation engine with formula snapshots, zero-estimation enforcement, and trace logs.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-indigo-700">
                <span>Run Computation</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Card 4: Verification Queue */}
            <div
              onClick={() => router.push("/verification")}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:border-amber-500 hover:shadow-md transition cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                    Verification
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 mb-1 group-hover:text-amber-700 transition-colors">
                  Verification Queue
                </h3>
                <p className="text-xs text-slate-500 line-clamp-2">
                  Review data integrity cases — duplicates, missing evidence, AI extraction confidence, and reviewer notes.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-amber-700">
                <span>Review Cases</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </div>

        {/* Data Pipelines Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Student Records Card */}
          <div
            onClick={() => router.push("/students")}
            className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:border-blue-400 hover:shadow-md transition cursor-pointer flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="h-10 w-10 rounded-xl bg-blue-50 text-[#1D4ED8] flex items-center justify-center group-hover:scale-105 transition-transform">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  SS / TLR
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-1 group-hover:text-[#1D4ED8] transition-colors">
                Student Records
              </h3>
              <p className="text-xs text-slate-500 line-clamp-2">
                PRN, demographics, domicile (Home State/Other State/International), graduation timeline.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-[#1D4ED8]">
              <span>Manage Students</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Faculty Records Card */}
          <div
            onClick={() => router.push("/faculty")}
            className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:border-indigo-400 hover:shadow-md transition cursor-pointer flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Users className="h-5 w-5" />
                </div>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  FSR / FQE
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-1 group-hover:text-indigo-600 transition-colors">
                Faculty Records
              </h3>
              <p className="text-xs text-slate-500 line-clamp-2">
                Credentials, designation, employment type, PhD qualification, experience, and domains.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-indigo-600">
              <span>Manage Faculty</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Uploads & Evidences Card */}
          <div
            onClick={() => router.push("/uploads-and-evidences")}
            className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:border-purple-400 hover:shadow-md transition cursor-pointer flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Upload className="h-5 w-5" />
                </div>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                  AI Ingestion
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-1 group-hover:text-purple-700 transition-colors">
                Uploads &amp; Evidences
              </h3>
              <p className="text-xs text-slate-500 line-clamp-2">
                Isolated secure storage, SHA-256 integrity, AI extraction preview, confidence scoring.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-purple-700">
              <span>Upload Documents</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Audit Trail Card */}
          <div
            onClick={() => router.push("/audit")}
            className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:border-slate-400 hover:shadow-md transition cursor-pointer flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <History className="h-5 w-5" />
                </div>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  Audit Logs
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-1 group-hover:text-slate-900 transition-colors">
                Audit Trail
              </h3>
              <p className="text-xs text-slate-500 line-clamp-2">
                Chronological log of logins, updates, deletes, approvals, rejections, and evidence uploads.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700">
              <span>View Audit Trail</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>

        {/* Bottom Split: Recent Institutional Activity + RBAC Live Verification */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Card 1: Recent Activity Stream */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                  Recent Institutional Activity
                </h3>
                <p className="text-xs text-slate-500">Live feed from departmental audit log</p>
              </div>
              <button
                onClick={() => router.push("/audit")}
                className="text-xs font-semibold text-[#1D4ED8] hover:underline"
              >
                View full audit →
              </button>
            </div>

            {summary?.recentActivity && summary.recentActivity.length > 0 ? (
              <div className="divide-y divide-slate-100 text-xs">
                {summary.recentActivity.slice(0, 5).map((act) => (
                  <div key={act.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-[10px]">
                        {act.action.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800 capitalize">
                          {act.action}
                          {act.resourceType && <span className="text-slate-400 font-normal"> • {act.resourceType}</span>}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {act.userEmail} ({act.userRole})
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          act.status === "SUCCESS"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {act.status}
                      </span>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {new Date(act.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                No recent activity logged for MCA department.
              </div>
            )}
          </div>

          {/* Card 2: Interactive RBAC Action Test */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                  RBAC Live Verification
                </h3>
                <span className="text-[11px] font-semibold text-slate-500">API Testing</span>
              </div>
              <p className="text-xs text-slate-600 mb-4">
                Test server-side access control against your current session role (<strong>{user.role}</strong>).
              </p>
              <div className="space-y-3">
                {/* Record Creation */}
                <button
                  onClick={() => handleTriggerAction("CREATE_RECORD")}
                  disabled={actionLoading !== null}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-left transition text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <FileText className="h-4 w-4 text-blue-600 shrink-0" />
                    <div>
                      <div className="font-semibold text-slate-800">Create Record</div>
                      <div className="text-[10px] text-slate-500">Requires Admin or Contributor</div>
                    </div>
                  </div>
                  {actionLoading === "CREATE_RECORD" ? (
                    <Loader2 className="h-4 w-4 animate-spin text-[#1D4ED8]" />
                  ) : (
                    <span className="text-slate-400 font-bold">→</span>
                  )}
                </button>

                {/* Upload Evidence */}
                <button
                  onClick={() => handleTriggerAction("UPLOAD_EVIDENCE")}
                  disabled={actionLoading !== null}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-left transition text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <Upload className="h-4 w-4 text-emerald-600 shrink-0" />
                    <div>
                      <div className="font-semibold text-slate-800">Upload Evidence</div>
                      <div className="text-[10px] text-slate-500">Requires Admin or Contributor</div>
                    </div>
                  </div>
                  {actionLoading === "UPLOAD_EVIDENCE" ? (
                    <Loader2 className="h-4 w-4 animate-spin text-[#1D4ED8]" />
                  ) : (
                    <span className="text-slate-400 font-bold">→</span>
                  )}
                </button>

                {/* Calculate Metrics */}
                <button
                  onClick={() => handleTriggerAction("CALCULATE_METRICS")}
                  disabled={actionLoading !== null}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-left transition text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <Calculator className="h-4 w-4 text-indigo-600 shrink-0" />
                    <div>
                      <div className="font-semibold text-slate-800">Calculate Metrics</div>
                      <div className="text-[10px] text-slate-500">Restricted to Dept Admin</div>
                    </div>
                  </div>
                  {actionLoading === "CALCULATE_METRICS" ? (
                    <Loader2 className="h-4 w-4 animate-spin text-[#1D4ED8]" />
                  ) : (
                    <span className="text-slate-400 font-bold">→</span>
                  )}
                </button>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
              Validated on backend by RBAC middleware
            </div>
          </div>
        </div>
      </main>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 sm:p-8">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-lg bg-blue-50 text-[#1D4ED8] flex items-center justify-center">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Change Password</h3>
                  <p className="text-xs text-slate-500">Update your institutional account credentials</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordError(null);
                  setPasswordSuccess(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {passwordError && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{passwordError}</span>
              </div>
            )}

            {passwordSuccess && (
              <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
                <Check className="h-4 w-4 shrink-0" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
                  required
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Min 8 characters, with uppercase, lowercase, digit, and special symbol.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="px-4 py-2 rounded-lg bg-[#1D4ED8] hover:bg-blue-800 text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
                >
                  {passwordLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Update Password</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
