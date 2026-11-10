"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Calculator,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Search,
  Filter,
  ArrowLeft,
  ChevronDown,
  Loader2,
  FileText,
  HelpCircle,
  Eye,
  Info,
  Calendar,
  Sparkles,
  ExternalLink,
  X,
  Play,
  RotateCw,
} from "lucide-react";

/* ──────────────────────────── Types ──────────────────────────── */

interface SafeUser {
  id: string;
  name: string;
  email: string;
  role: "DEPARTMENT_ADMIN" | "FACULTY_CONTRIBUTOR" | "REVIEWER" | "VIEWER";
  department: string;
}

interface TraceStep {
  step: string;
  expression: string;
  value: string | number;
}

interface MetricResultItem {
  _id: string;
  metricCode: string;
  parameter: "TLR" | "RP" | "GO" | "OI" | "PR" | "OVERALL";
  name: string;
  status: "COMPUTED" | "NOT_COMPUTABLE" | "AWAITING_SOURCE" | "PENDING_INPUT";
  result: {
    rawScore: number | null;
    normalisedScore: number | null;
    weightedScore: number | null;
    maxMarks: number;
    trace: {
      formula: string;
      steps: TraceStep[];
      notes?: string;
    };
  };
  inputValueSnapshot?: Record<string, any>;
  notes?: string;
  calculatedAt: string;
  calculatedBy?: {
    name: string;
    email: string;
    role: string;
  };
}

interface ParameterSummary {
  parameter: string;
  name: string;
  weight: number;
  maxMarks: number;
  rawScore: number;
  weightedScore: number;
  metricsCount: number;
  computedCount: number;
}

interface MetricsApiResponse {
  department: string;
  academicYear: string;
  methodologyVersion: string;
  isLabel: string;
  lastCalculated: string | null;
  overallIndicativeScore: number | null;
  counts: {
    total: number;
    computed: number;
    notComputable: number;
    awaitingSource: number;
    pendingInput: number;
  };
  parameterSummaries: Record<string, ParameterSummary>;
  results: MetricResultItem[];
}

/* ──────────────────────────── Component ──────────────────────── */

export default function MetricComputationPage() {
  const router = useRouter();

  const [user, setUser] = useState<SafeUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Filter & State
  const [academicYear, setAcademicYear] = useState("2024-25");
  const [activeTab, setActiveTab] = useState<"ALL" | "TLR" | "RP" | "GO" | "OI" | "PR">("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Data
  const [data, setData] = useState<MetricsApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Inspector
  const [inspectedMetric, setInspectedMetric] = useState<MetricResultItem | null>(null);

  /* ────── Authenticate ────── */
  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const authData = await res.json();
          setUser(authData.user);
        } else {
          router.push("/login");
        }
      } catch {
        router.push("/login");
      } finally {
        setAuthLoading(false);
      }
    }
    loadUser();
  }, [router]);

  /* ────── Fetch Metrics ────── */
  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/metrics/results?academicYear=${academicYear}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
        if (json.results && json.results.length > 0 && !inspectedMetric) {
          // Default inspect the first computed or first item
          const first = json.results.find((m: MetricResultItem) => m.metricCode === "FSR") || json.results[0];
          setInspectedMetric(first);
        }
      }
    } catch (err) {
      console.error("Failed to fetch metric results:", err);
    } finally {
      setLoading(false);
    }
  }, [academicYear, inspectedMetric]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchMetrics();
    }
  }, [authLoading, user, fetchMetrics]);

  /* ────── Trigger Recalculation ────── */
  const handleRunCalculation = async () => {
    if (user?.role !== "DEPARTMENT_ADMIN") return;
    setCalculating(true);
    setActionMessage(null);

    try {
      const res = await fetch("/api/metrics/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ academicYear }),
      });
      const result = await res.json();

      if (res.ok) {
        setActionMessage({
          type: "success",
          text: `Deterministic calculation completed for AY ${academicYear}. Snapshot locked.`,
        });
        await fetchMetrics();
      } else {
        setActionMessage({
          type: "error",
          text: result.error || "Calculation failed.",
        });
      }
    } catch (err: unknown) {
      setActionMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Calculation failed",
      });
    } finally {
      setCalculating(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 text-[#1D4ED8] animate-spin" />
          <p className="text-sm font-medium text-slate-600">Verifying session authority...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  // Filter list
  const metricsList = (data?.results || []).filter((item) => {
    if (activeTab !== "ALL" && item.parameter !== activeTab) return false;
    if (statusFilter !== "ALL" && item.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.metricCode.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q) ||
        item.parameter.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPUTED":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "AWAITING_SOURCE":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "PENDING_INPUT":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "NOT_COMPUTABLE":
        return "bg-rose-50 text-rose-700 border-rose-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Top Header */}
      <header className="h-16 bg-white border-b border-slate-200 px-6 sm:px-8 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard")}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="h-9 w-9 rounded-xl bg-blue-100 text-[#1D4ED8] flex items-center justify-center font-bold">
            <Calculator className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Metric Computation Engine</span>
              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-[#1D4ED8] text-[10px] font-bold border border-blue-200">
                NIRF Eng. 2025
              </span>
            </div>
            <div className="text-[11px] text-slate-500 font-medium">
              MCA Department Indicative Metrics · Deterministic Core
            </div>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-3">
          {/* Academic Year Selector */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="2024-25">AY 2024-25</option>
              <option value="2023-24">AY 2023-24</option>
            </select>
          </div>

          {/* Recalculate Button (Admins only) */}
          {user.role === "DEPARTMENT_ADMIN" && (
            <button
              onClick={handleRunCalculation}
              disabled={calculating}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#1D4ED8] text-white text-xs font-semibold hover:bg-blue-800 transition shadow-sm disabled:opacity-50"
            >
              {calculating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RotateCw className="h-3.5 w-3.5" />
              )}
              <span>Run Calculation</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Action Message Feedback */}
        {actionMessage && (
          <div
            className={`p-3.5 rounded-xl border text-xs flex items-center justify-between shadow-sm ${
              actionMessage.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-red-50 border-red-200 text-red-800"
            }`}
          >
            <div className="flex items-center gap-2">
              {actionMessage.type === "success" ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
              )}
              <span className="font-medium">{actionMessage.text}</span>
            </div>
            <button onClick={() => setActionMessage(null)} className="text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Mandatory Regulatory Info Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#1D4ED8]" />
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1D4ED8] flex items-center justify-center shrink-0 mt-0.5">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                  NIRF Deterministic Compliance Mandate
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-[#1D4ED8] text-[10px] font-bold uppercase tracking-wider">
                  Zero Estimation Policy
                </span>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-medium">
                  MCA Departmental Indicative Metrics
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-800">
                Only approved records are used for calculation. Missing inputs are marked as Not Computable or Pending Input and are never estimated.
              </p>
              <p className="text-xs text-slate-500 leading-relaxed">
                National Institutional Ranking Framework (NIRF) reporting guidelines strictly prohibit heuristic or predictive score imputation. Where empirical verification documents are unverified or absent, indicators default deterministically to an uncomputed state. Results reflect indicative departmental alignment and do not constitute official institutional NIRF ranks.
              </p>
            </div>
          </div>
        </div>

        {/* 4-Card KPI Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Parameters Tracked */}
          <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <span>Parameters Tracked</span>
              <div className="h-7 w-7 rounded-lg bg-blue-50 text-[#1D4ED8] flex items-center justify-center font-bold">
                5
              </div>
            </div>
            <div className="my-2">
              <div className="text-2xl font-bold text-slate-900">5 / 5</div>
              <div className="text-[11px] text-slate-500">Core NIRF Architecture</div>
            </div>
            <div className="flex items-center gap-1 pt-2 border-t border-slate-100 text-[10px] font-mono font-semibold text-slate-600">
              <span className="px-1.5 py-0.5 rounded bg-slate-100">TLR</span>
              <span className="px-1.5 py-0.5 rounded bg-slate-100">RP</span>
              <span className="px-1.5 py-0.5 rounded bg-slate-100">GO</span>
              <span className="px-1.5 py-0.5 rounded bg-slate-100">OI</span>
              <span className="px-1.5 py-0.5 rounded bg-slate-100">PR</span>
            </div>
          </div>

          {/* Card 2: Metrics Computed */}
          <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <span>Metrics Computed</span>
              <div className="h-7 w-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <div className="my-2">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900">
                  {data?.counts?.computed ?? 0}
                  <span className="text-sm font-normal text-slate-400"> / {data?.counts?.total ?? 17}</span>
                </span>
                <span className="text-xs font-bold text-emerald-600">
                  {data?.counts?.total ? Math.round(((data.counts.computed) / data.counts.total) * 100) : 0}%
                </span>
              </div>
              <div className="text-[11px] text-slate-500">Verified deterministic indicators</div>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-emerald-500 h-1.5 rounded-full"
                style={{
                  width: `${data?.counts?.total ? Math.round((data.counts.computed / data.counts.total) * 100) : 0}%`,
                }}
              />
            </div>
          </div>

          {/* Card 3: Pending / Awaiting Source */}
          <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <span>Awaiting Source / Pending</span>
              <div className="h-7 w-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div className="my-2">
              <div className="text-2xl font-bold text-slate-900">
                {(data?.counts?.awaitingSource ?? 0) + (data?.counts?.pendingInput ?? 0) + (data?.counts?.notComputable ?? 0)}
              </div>
              <div className="text-[11px] text-slate-500">
                {data?.counts?.awaitingSource ?? 0} external sync · {data?.counts?.pendingInput ?? 0} input required
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-100 text-slate-500">
              <span className="text-blue-600 font-semibold">QP &amp; PU Bibliometric</span>
              <span className="text-amber-600 font-semibold">PR Survey</span>
            </div>
          </div>

          {/* Card 4: Overall Indicative Score */}
          <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <span>Indicative Index</span>
              <div className="h-7 w-7 rounded-lg bg-blue-50 text-[#1D4ED8] flex items-center justify-center font-bold">
                %
              </div>
            </div>
            <div className="my-2">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold font-mono text-[#1D4ED8]">
                  {data?.overallIndicativeScore !== null ? Number(data?.overallIndicativeScore).toFixed(2) : "—"}
                </span>
                <span className="text-xs text-slate-400 font-semibold">/ 100</span>
              </div>
              <div className="text-[11px] text-slate-500">Weighted MCA Departmental baseline</div>
            </div>
            <div className="text-[10px] text-slate-400 font-medium pt-2 border-t border-slate-100">
              Excludes unverified institutional feeds
            </div>
          </div>
        </div>

        {/* Detailed Formula & Trace Inspector Card */}
        {inspectedMetric && (
          <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 rounded-lg bg-[#1D4ED8] text-white font-mono font-bold text-xs">
                  {inspectedMetric.parameter} · {inspectedMetric.metricCode}
                </span>
                <div>
                  <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <span>{inspectedMetric.name}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusBadge(
                        inspectedMetric.status
                      )}`}
                    >
                      {inspectedMetric.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">
                    NIRF Engineering 2025 Specification · Maximum Marks: {inspectedMetric.result.maxMarks}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto text-xs font-mono text-slate-500">
                <span>Score: </span>
                <span className="font-bold text-slate-900 text-sm">
                  {inspectedMetric.result.rawScore !== null ? inspectedMetric.result.rawScore : "N/A"}
                </span>
                <span> / {inspectedMetric.result.maxMarks}</span>
              </div>
            </div>

            {/* Formula Expression Box */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-7 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
                    Methodology Expression
                  </span>
                  <span className="font-mono text-blue-600 font-semibold text-[11px]">
                    v2025.1 Deterministic
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-white border border-slate-200 text-center font-mono text-xs md:text-sm text-slate-800 shadow-inner overflow-x-auto">
                  <code>{inspectedMetric.result.trace.formula}</code>
                </div>

                {inspectedMetric.result.trace.notes && (
                  <div className="p-2.5 rounded-lg bg-blue-50/70 border border-blue-100 text-[11px] text-blue-800 flex items-start gap-2">
                    <Info className="h-4 w-4 shrink-0 text-blue-600 mt-0.5" />
                    <span>{inspectedMetric.result.trace.notes}</span>
                  </div>
                )}
              </div>

              {/* Execution Pipeline Steps */}
              <div className="lg:col-span-5 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
                      Execution Trace
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">Deterministic</span>
                  </div>

                  <div className="space-y-1.5 font-mono text-xs">
                    {inspectedMetric.result.trace.steps && inspectedMetric.result.trace.steps.length > 0 ? (
                      inspectedMetric.result.trace.steps.map((step, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 rounded bg-white border border-slate-200 text-[11px]"
                        >
                          <span className="text-slate-500 truncate mr-2">{step.step}:</span>
                          <span className="font-semibold text-slate-800">{String(step.value)}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-[11px] text-slate-400 italic p-2">
                        No execution trace available for uncomputed indicator.
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                  <span className="text-slate-500 text-[11px]">Normalized (100pt base):</span>
                  <span className="font-bold font-mono text-[#1D4ED8]">
                    {inspectedMetric.result.normalisedScore !== null
                      ? `${inspectedMetric.result.normalisedScore} pts`
                      : "Uncomputed"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filter Bar & Tabs */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-white border border-slate-200 shadow-sm">
              {(["ALL", "TLR", "RP", "GO", "OI", "PR"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                    activeTab === tab
                      ? "bg-[#1D4ED8] text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {tab === "ALL" ? "All Indicators (17)" : `${tab}`}
                </button>
              ))}
            </div>

            {/* Search & Status Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[200px]">
                <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search code or metric..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
                />
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700">
                <Filter className="h-3.5 w-3.5 text-slate-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-transparent focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="COMPUTED">Computed</option>
                  <option value="AWAITING_SOURCE">Awaiting Source</option>
                  <option value="PENDING_INPUT">Pending Input</option>
                  <option value="NOT_COMPUTABLE">Not Computable</option>
                </select>
              </div>
            </div>
          </div>

          {/* Metric Calculation Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4">Parameter</th>
                    <th className="py-3 px-4">Metric Specification</th>
                    <th className="py-3 px-4 text-center">Max Marks</th>
                    <th className="py-3 px-4 text-center">Raw Score</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Inspection</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-[#1D4ED8] mb-2" />
                        <span>Evaluating deterministic pipeline...</span>
                      </td>
                    </tr>
                  ) : metricsList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        No metric indicators match your criteria.
                      </td>
                    </tr>
                  ) : (
                    metricsList.map((item) => {
                      const isInspected = inspectedMetric?._id === item._id;
                      return (
                        <tr
                          key={item._id}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            isInspected ? "bg-blue-50/30" : ""
                          }`}
                        >
                          <td className="py-3 px-4 font-mono font-bold text-slate-800">
                            {item.metricCode}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px] font-semibold">
                              {item.parameter}
                            </span>
                          </td>
                          <td className="py-3 px-4 max-w-xs">
                            <div className="font-semibold text-slate-800 truncate">{item.name}</div>
                            <div className="text-[11px] text-slate-400 font-mono truncate">
                              {item.result.trace.formula}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center font-semibold text-slate-600">
                            {item.result.maxMarks}
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-bold">
                            {item.result.rawScore !== null ? (
                              <span className="text-slate-900">{item.result.rawScore}</span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusBadge(
                                item.status
                              )}`}
                            >
                              {item.status.replace(/_/g, " ")}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => setInspectedMetric(item)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                                isInspected
                                  ? "bg-[#1D4ED8] text-white border-[#1D4ED8]"
                                  : "border-slate-200 text-slate-600 hover:bg-slate-50"
                              }`}
                            >
                              Inspect
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

