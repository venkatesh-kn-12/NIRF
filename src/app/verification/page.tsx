"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  AlertTriangle,
  FileQuestion,
  Clock,
  Search,
  ChevronDown,
  Loader2,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  RotateCcw,
  UserPlus,
  Paperclip,
  Bot,
  Info,
} from "lucide-react";

/* ──────────────────────────── Types ──────────────────────────── */

interface PopulatedUser {
  _id: string;
  name: string;
  email: string;
}

interface VerificationCaseItem {
  _id: string;
  relatedRecordType: string;
  relatedRecordId: string;
  parameter: string;
  issueType: string;
  severity: string;
  submittedValue?: string;
  proposedValue?: string;
  difference?: string;
  aiExplanation?: string;
  reviewerNotes?: string;
  assignedReviewer?: PopulatedUser | null;
  status: string;
  department: string;
  academicYear: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  resolvedBy?: PopulatedUser | null;
  evidenceReferences?: { fileName: string; fileUrl: string }[];
}

interface VerificationStats {
  totalOpen: number;
  highSeverity: number;
  missingEvidence: number;
  avgResolutionHours: number;
  byParameter: Record<string, number>;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface SafeUser {
  id: string;
  name: string;
  email: string;
  role: "DEPARTMENT_ADMIN" | "FACULTY_CONTRIBUTOR" | "REVIEWER" | "VIEWER";
  department: string;
}

/* ──────────────────────────── Constants ──────────────────────── */

const ISSUE_TYPES = [
  "All",
  "MISSING_EVIDENCE",
  "DUPLICATE",
  "CALCULATION_MISMATCH",
  "INVALID_DATE",
  "LOW_CONFIDENCE_EXTRACTION",
  "MANUAL_REVIEW",
  "UNSUPPORTED_CLAIM",
] as const;

const STATUSES = ["All", "OPEN", "IN_REVIEW", "RESOLVED", "REJECTED", "ESCALATED"] as const;
const PARAMETERS = ["All", "TLR", "RP", "GO", "OI", "PR"] as const;
const SEVERITIES = ["All", "HIGH", "MEDIUM", "LOW"] as const;

const issueTypeColors: Record<string, string> = {
  MISSING_EVIDENCE: "bg-red-100 text-red-700 border-red-200",
  DUPLICATE: "bg-orange-100 text-orange-700 border-orange-200",
  CALCULATION_MISMATCH: "bg-purple-100 text-purple-700 border-purple-200",
  INVALID_DATE: "bg-yellow-100 text-yellow-700 border-yellow-200",
  LOW_CONFIDENCE_EXTRACTION: "bg-blue-100 text-blue-700 border-blue-200",
  MANUAL_REVIEW: "bg-slate-100 text-slate-700 border-slate-200",
  UNSUPPORTED_CLAIM: "bg-pink-100 text-pink-700 border-pink-200",
};

const severityColors: Record<string, string> = {
  HIGH: "bg-red-50 text-red-700 border-red-200",
  MEDIUM: "bg-amber-50 text-amber-700 border-amber-200",
  LOW: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const statusColors: Record<string, string> = {
  OPEN: "bg-blue-50 text-blue-700 border-blue-200",
  IN_REVIEW: "bg-yellow-50 text-yellow-700 border-yellow-200",
  RESOLVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  REJECTED: "bg-red-50 text-red-700 border-red-200",
  ESCALATED: "bg-orange-50 text-orange-700 border-orange-200",
};

const paramColors: Record<string, string> = {
  TLR: "bg-indigo-50 text-indigo-700 border-indigo-200",
  RP: "bg-violet-50 text-violet-700 border-violet-200",
  GO: "bg-teal-50 text-teal-700 border-teal-200",
  OI: "bg-cyan-50 text-cyan-700 border-cyan-200",
  PR: "bg-rose-50 text-rose-700 border-rose-200",
};

function formatIssueType(t: string): string {
  return t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/* ──────────────────────────── Component ──────────────────────── */

export default function VerificationQueuePage() {
  const router = useRouter();

  const [user, setUser] = useState<SafeUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [stats, setStats] = useState<VerificationStats | null>(null);
  const [cases, setCases] = useState<VerificationCaseItem[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [issueFilter, setIssueFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [paramFilter, setParamFilter] = useState("All");
  const [severityFilter, setSeverityFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);

  // Action state
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Modal state
  const [modalType, setModalType] = useState<"reject" | "correction" | "assign" | null>(null);
  const [modalCaseId, setModalCaseId] = useState<string>("");
  const [modalInput, setModalInput] = useState("");

  // Inline notes editing
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [editingNotesValue, setEditingNotesValue] = useState("");

  /* ────── Auth ────── */
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
      } catch {
        router.push("/login");
      } finally {
        setAuthLoading(false);
      }
    }
    loadUser();
  }, [router]);

  /* ────── Fetch Stats ────── */
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/verification-cases/stats");
      if (res.ok) setStats(await res.json());
    } catch (err) {
      console.error("Failed to load stats:", err);
    }
  }, []);

  /* ────── Fetch Cases ────── */
  const fetchCases = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "20");
      if (statusFilter !== "All") params.set("status", statusFilter);
      if (issueFilter !== "All") params.set("issueType", issueFilter);
      if (paramFilter !== "All") params.set("parameter", paramFilter);
      if (severityFilter !== "All") params.set("severity", severityFilter);
      if (searchQuery.trim()) params.set("q", searchQuery.trim());

      const res = await fetch(`/api/verification-cases?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setCases(data.cases);
        setPagination(data.pagination);
      }
    } catch (err) {
      console.error("Failed to load cases:", err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, issueFilter, paramFilter, severityFilter, searchQuery]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchStats();
      fetchCases();
    }
  }, [authLoading, user, fetchStats, fetchCases]);

  /* ────── Actions ────── */

  const clearFeedback = () => {
    setActionError(null);
    setActionSuccess(null);
  };

  async function handleApprove(caseId: string) {
    clearFeedback();
    setActionLoading(caseId);
    try {
      const res = await fetch(`/api/verification-cases/${caseId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Approve failed");
      setActionSuccess(
        data.fullyApproved
          ? "Record fully approved — all verification cases resolved."
          : "Verification case resolved. Other open cases remain."
      );
      fetchStats();
      fetchCases();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Approve failed");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject(caseId: string, reason: string) {
    clearFeedback();
    setActionLoading(caseId);
    try {
      const res = await fetch(`/api/verification-cases/${caseId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reject failed");
      setActionSuccess("Record rejected successfully.");
      setModalType(null);
      setModalInput("");
      fetchStats();
      fetchCases();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Reject failed");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRequestCorrection(caseId: string, instructions: string) {
    clearFeedback();
    setActionLoading(caseId);
    try {
      const res = await fetch(`/api/verification-cases/${caseId}/request-correction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instructions }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request correction failed");
      setActionSuccess("Correction requested — contributor notified.");
      setModalType(null);
      setModalInput("");
      fetchStats();
      fetchCases();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Request correction failed");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleAssignReviewer(caseId: string, reviewerId: string) {
    clearFeedback();
    setActionLoading(caseId);
    try {
      const res = await fetch(`/api/verification-cases/${caseId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewerId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Assign failed");
      setActionSuccess("Reviewer assigned.");
      setModalType(null);
      setModalInput("");
      fetchStats();
      fetchCases();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Assign failed");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleSaveNotes(caseId: string) {
    try {
      const res = await fetch(`/api/verification-cases/${caseId}/notes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: editingNotesValue }),
      });
      if (res.ok) {
        setCases((prev) =>
          prev.map((c) =>
            c._id === caseId ? { ...c, reviewerNotes: editingNotesValue } : c
          )
        );
      }
    } catch (err) {
      console.error("Failed to save notes:", err);
    }
    setEditingNotesId(null);
  }

  /* ────── Loading State ────── */
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 text-[#1D4ED8] animate-spin" />
          <p className="text-sm font-medium text-slate-600">
            Verifying security session...
          </p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const canReview = user.role === "DEPARTMENT_ADMIN" || user.role === "REVIEWER";

  /* ────── Render ────── */
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard")}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="h-8 w-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900">
              Verification Queue
            </div>
            <div className="text-[11px] text-slate-500">
              MCA Department — NIRF Data Integrity Review
            </div>
          </div>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 bg-blue-50 text-[#1D4ED8] rounded-full border border-blue-200">
          {user.role.replace(/_/g, " ")}
        </span>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* KPI Ribbon */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard
            icon={<ShieldCheck className="h-5 w-5" />}
            iconBg="bg-blue-50 text-blue-700"
            label="Queue Total"
            value={stats?.totalOpen ?? "—"}
          />
          <KpiCard
            icon={<AlertTriangle className="h-5 w-5" />}
            iconBg="bg-red-50 text-red-700"
            label="High Risk"
            value={stats?.highSeverity ?? "—"}
          />
          <KpiCard
            icon={<FileQuestion className="h-5 w-5" />}
            iconBg="bg-amber-50 text-amber-700"
            label="Missing Evidence"
            value={stats?.missingEvidence ?? "—"}
          />
          <KpiCard
            icon={<Clock className="h-5 w-5" />}
            iconBg="bg-emerald-50 text-emerald-700"
            label="Avg Resolution"
            value={stats ? `${stats.avgResolutionHours}h` : "—"}
          />
        </div>

        {/* Feedback Banner */}
        {(actionError || actionSuccess) && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
              actionSuccess
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-red-50 border-red-200 text-red-800"
            }`}
          >
            {actionSuccess ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <XCircle className="h-4 w-4 shrink-0" />
            )}
            <span className="font-medium">{actionSuccess || actionError}</span>
            <button
              onClick={clearFeedback}
              className="ml-auto text-slate-500 hover:text-slate-700"
            >
              ✕
            </button>
          </div>
        )}

        {/* Filter Bar */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
          {/* Issue Type Tabs */}
          <div className="flex flex-wrap gap-1.5">
            {ISSUE_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => {
                  setIssueFilter(t);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                  issueFilter === t
                    ? "bg-[#1D4ED8] text-white border-[#1D4ED8]"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                {t === "All" ? "All Types" : formatIssueType(t)}
              </button>
            ))}
          </div>

          {/* Dropdowns + Search */}
          <div className="flex flex-wrap gap-3 items-center">
            <FilterSelect
              label="Status"
              value={statusFilter}
              options={STATUSES as unknown as string[]}
              onChange={(v) => {
                setStatusFilter(v);
                setPage(1);
              }}
            />
            <FilterSelect
              label="Parameter"
              value={paramFilter}
              options={PARAMETERS as unknown as string[]}
              onChange={(v) => {
                setParamFilter(v);
                setPage(1);
              }}
            />
            <FilterSelect
              label="Severity"
              value={severityFilter}
              options={SEVERITIES as unknown as string[]}
              onChange={(v) => {
                setSeverityFilter(v);
                setPage(1);
              }}
            />
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search cases..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#1D4ED8] focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Cases List */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 text-[#1D4ED8] animate-spin" />
          </div>
        ) : cases.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
            <ShieldCheck className="h-10 w-10 text-emerald-400 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-700">
              No verification cases match your filters
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Adjust filters or create records to trigger automated checks.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {cases.map((c) => (
              <div
                key={c._id}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm"
              >
                {/* Case Header */}
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                      paramColors[c.parameter] || "bg-slate-50 text-slate-700 border-slate-200"
                    }`}
                  >
                    {c.parameter}
                  </span>
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                      issueTypeColors[c.issueType] || "bg-slate-100 text-slate-700 border-slate-200"
                    }`}
                  >
                    {formatIssueType(c.issueType)}
                  </span>
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                      severityColors[c.severity] || "bg-slate-50 text-slate-700"
                    }`}
                  >
                    {c.severity}
                  </span>
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                      statusColors[c.status] || "bg-slate-50 text-slate-700"
                    }`}
                  >
                    {c.status.replace(/_/g, " ")}
                  </span>
                  <span className="text-[11px] font-medium text-slate-400 ml-auto">
                    {c.relatedRecordType} · {timeAgo(c.createdAt)}
                  </span>
                </div>

                {/* Value Comparison */}
                {(c.submittedValue || c.proposedValue || c.difference) && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                    <ValueBox label="Submitted Value" value={c.submittedValue} />
                    <ValueBox label="Proposed Value" value={c.proposedValue} />
                    <ValueBox
                      label="Difference"
                      value={c.difference}
                      highlight
                    />
                  </div>
                )}

                {/* AI Explanation */}
                {c.aiExplanation && (
                  <div className="mb-4 p-3 rounded-lg bg-blue-50/50 border border-blue-100">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Bot className="h-3.5 w-3.5 text-blue-500" />
                      <span className="text-[11px] font-semibold text-blue-600">
                        AI Analysis (non-authoritative)
                      </span>
                      <Info className="h-3 w-3 text-blue-400" />
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {c.aiExplanation}
                    </p>
                  </div>
                )}

                {/* Evidence */}
                {c.evidenceReferences && c.evidenceReferences.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Paperclip className="h-3.5 w-3.5 text-slate-400" />
                      <span className="text-[11px] font-semibold text-slate-600">
                        Evidence ({c.evidenceReferences.length})
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {c.evidenceReferences.map((ev, i) => (
                        <span
                          key={i}
                          className="text-[11px] px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 truncate max-w-[200px]"
                        >
                          {ev.fileName}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reviewer Notes (inline edit) */}
                <div className="mb-4">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-[11px] font-semibold text-slate-600">
                      Reviewer Notes
                    </span>
                    {c.assignedReviewer && (
                      <span className="text-[10px] text-slate-400">
                        (Assigned: {c.assignedReviewer.name})
                      </span>
                    )}
                  </div>
                  {editingNotesId === c._id ? (
                    <div className="flex gap-2">
                      <textarea
                        value={editingNotesValue}
                        onChange={(e) => setEditingNotesValue(e.target.value)}
                        className="flex-1 text-xs p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D4ED8] resize-none"
                        rows={2}
                      />
                      <button
                        onClick={() => handleSaveNotes(c._id)}
                        className="px-3 py-1 text-xs font-semibold bg-[#1D4ED8] text-white rounded-lg hover:bg-blue-800 self-end"
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => {
                        if (canReview) {
                          setEditingNotesId(c._id);
                          setEditingNotesValue(c.reviewerNotes || "");
                        }
                      }}
                      className={`text-xs p-2 rounded-lg border border-dashed border-slate-200 min-h-[36px] ${
                        canReview
                          ? "cursor-pointer hover:border-blue-300 hover:bg-blue-50/30"
                          : ""
                      } ${
                        c.reviewerNotes
                          ? "text-slate-700"
                          : "text-slate-400 italic"
                      }`}
                    >
                      {c.reviewerNotes || (canReview ? "Click to add notes..." : "No notes")}
                    </div>
                  )}
                </div>

                {/* Action Footer — role-gated */}
                {canReview && (c.status === "OPEN" || c.status === "IN_REVIEW") && (
                  <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-100">
                    <button
                      onClick={() => {
                        setModalType("correction");
                        setModalCaseId(c._id);
                        setModalInput("");
                      }}
                      disabled={actionLoading === c._id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold hover:bg-amber-100 transition disabled:opacity-50"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Request Correction
                    </button>
                    <button
                      onClick={() => {
                        setModalType("reject");
                        setModalCaseId(c._id);
                        setModalInput("");
                      }}
                      disabled={actionLoading === c._id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-700 border border-red-200 text-xs font-semibold hover:bg-red-100 transition disabled:opacity-50"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Reject Record
                    </button>
                    <button
                      onClick={() => handleApprove(c._id)}
                      disabled={actionLoading === c._id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100 transition disabled:opacity-50"
                    >
                      {actionLoading === c._id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      )}
                      Approve
                    </button>
                    {user.role === "DEPARTMENT_ADMIN" && (
                      <button
                        onClick={() => {
                          setModalType("assign");
                          setModalCaseId(c._id);
                          setModalInput("");
                        }}
                        disabled={actionLoading === c._id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold hover:bg-slate-100 transition disabled:opacity-50 ml-auto"
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        Assign Reviewer
                      </button>
                    )}
                  </div>
                )}

                {/* Resolved Info */}
                {c.status === "RESOLVED" && c.resolvedBy && (
                  <div className="pt-3 border-t border-slate-100 text-[11px] text-emerald-600 font-medium">
                    ✓ Resolved by {c.resolvedBy.name} · {c.resolvedAt ? timeAgo(c.resolvedAt) : ""}
                  </div>
                )}
              </div>
            ))}

            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="text-xs text-slate-500">
                  Page {pagination.page} of {pagination.pages} · {pagination.total} cases
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                  disabled={page >= pagination.pages}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Action Modal */}
      {modalType && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              {modalType === "reject"
                ? "Reject Record"
                : modalType === "correction"
                ? "Request Correction"
                : "Assign Reviewer"}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              {modalType === "reject"
                ? "Provide a mandatory reason for rejection."
                : modalType === "correction"
                ? "Provide correction instructions for the contributor."
                : "Enter the reviewer User ID to assign."}
            </p>
            {modalType === "assign" ? (
              <input
                type="text"
                value={modalInput}
                onChange={(e) => setModalInput(e.target.value)}
                placeholder="Reviewer User ID (MongoDB ObjectId)"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8] mb-4"
              />
            ) : (
              <textarea
                value={modalInput}
                onChange={(e) => setModalInput(e.target.value)}
                placeholder={
                  modalType === "reject"
                    ? "Rejection reason (required)..."
                    : "Correction instructions..."
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8] resize-none mb-4"
                rows={3}
              />
            )}
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setModalType(null);
                  setModalInput("");
                }}
                className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (modalType === "reject") handleReject(modalCaseId, modalInput);
                  else if (modalType === "correction")
                    handleRequestCorrection(modalCaseId, modalInput);
                  else handleAssignReviewer(modalCaseId, modalInput);
                }}
                disabled={!modalInput.trim() || actionLoading !== null}
                className={`px-4 py-2 rounded-lg text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50 ${
                  modalType === "reject"
                    ? "bg-red-600 hover:bg-red-700"
                    : modalType === "correction"
                    ? "bg-amber-600 hover:bg-amber-700"
                    : "bg-[#1D4ED8] hover:bg-blue-800"
                }`}
              >
                {actionLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {modalType === "reject"
                  ? "Reject"
                  : modalType === "correction"
                  ? "Request Correction"
                  : "Assign"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ──────────────── Sub-components ──────────────── */

function KpiCard({
  icon,
  iconBg,
  label,
  value,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string | number;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center gap-3">
      <div
        className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}
      >
        {icon}
      </div>
      <div>
        <div className="text-xs text-slate-500 font-medium">{label}</div>
        <div className="text-lg font-bold text-slate-900">{value}</div>
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <label className="text-[10px] font-semibold uppercase text-slate-500 block mb-0.5">
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="appearance-none pl-3 pr-7 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#1D4ED8] cursor-pointer"
        >
          {options.map((o) => (
            <option key={o} value={o}>
              {o === "All" ? `All ${label}s` : o.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
      </div>
    </div>
  );
}

function ValueBox({
  label,
  value,
  highlight,
}: {
  label: string;
  value?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`p-3 rounded-lg border ${
        highlight
          ? "bg-red-50/50 border-red-100"
          : "bg-slate-50 border-slate-100"
      }`}
    >
      <div className="text-[10px] font-semibold uppercase text-slate-500 mb-0.5">
        {label}
      </div>
      <div
        className={`text-xs font-medium ${
          highlight ? "text-red-700" : "text-slate-800"
        }`}
      >
        {value || "—"}
      </div>
    </div>
  );
}

