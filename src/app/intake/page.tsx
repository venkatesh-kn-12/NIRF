"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { SidebarLayout } from "@/components/SidebarLayout";
import { CsvImportModal } from "@/components/CsvImportModal";
import {
  Shield,
  Download,
  Upload,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  History,
  FileText,
  Calendar,
  Lock,
  ArrowLeft,
  X,
} from "lucide-react";

interface IntakeRevision {
  approvedIntake: number;
  approvalOrderNumber: string;
  revisedAt: string;
  reason: string;
}

interface SanctionedIntakeRecord {
  _id: string;
  programme: string;
  cohortYear: string;
  intakeYear: number;
  approvedIntake: number;
  approvalAuthority: "AICTE" | "VTU" | "STATE_GOVT" | "UNIVERSITY" | "OTHER";
  approvalOrderNumber: string;
  approvalDate?: string;
  effectiveAcademicYear: string;
  scope: string;
  revisions: IntakeRevision[];
  createdAt: string;
  updatedAt: string;
}

export default function IntakePage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<SanctionedIntakeRecord[]>([]);
  const [fetching, setFetching] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [selectedRevisionHistory, setSelectedRevisionHistory] = useState<SanctionedIntakeRecord | null>(null);

  // Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formCohortYear, setFormCohortYear] = useState("2024-2026");
  const [formIntakeYear, setFormIntakeYear] = useState("2024");
  const [formApprovedIntake, setFormApprovedIntake] = useState("60");
  const [formAuthority, setFormAuthority] = useState<string>("AICTE");
  const [formOrderNumber, setFormOrderNumber] = useState("");
  const [formEffectiveYear, setFormEffectiveYear] = useState("2024-25");
  const [formRevisionReason, setFormRevisionReason] = useState("");

  const isAdmin = currentUser?.role === "DEPARTMENT_ADMIN";

  // Auth fetch
  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setCurrentUser(data.user);
        } else {
          router.push("/login");
        }
      } catch {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, [router]);

  const fetchRecords = useCallback(async () => {
    setFetching(true);
    try {
      const res = await fetch("/api/intake");
      if (res.ok) {
        const data = await res.json();
        setRecords(data.records || []);
      } else {
        setActionMessage({ type: "error", text: "Failed to load sanctioned intake records." });
      }
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message || "Failed to load records." });
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchRecords();
    }
  }, [currentUser, fetchRecords]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      setActionMessage({ type: "error", text: "Only Department Admin is authorized to record intake." });
      return;
    }

    setSubmitting(true);
    setActionMessage(null);

    try {
      const payload = {
        programme: "MCA",
        cohortYear: formCohortYear,
        intakeYear: parseInt(formIntakeYear, 10),
        approvedIntake: parseInt(formApprovedIntake, 10),
        approvalAuthority: formAuthority,
        approvalOrderNumber: formOrderNumber,
        effectiveAcademicYear: formEffectiveYear,
        scope: "DEPARTMENT",
        reason: formRevisionReason,
      };

      const res = await fetch("/api/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        setActionMessage({ type: "success", text: "Sanctioned intake record successfully saved." });
        setShowAddForm(false);
        setFormOrderNumber("");
        setFormRevisionReason("");
        await fetchRecords();
      } else {
        setActionMessage({ type: "error", text: data.error || "Failed to save record." });
      }
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message || "Request failed." });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <RefreshCw className="h-6 w-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <SidebarLayout
      userName={currentUser?.name}
      userRole={currentUser?.role}
      onLogout={() => {
        fetch("/api/auth/logout", { method: "POST" }).then(() => router.push("/login"));
      }}
    >
      <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-lg bg-indigo-100 text-indigo-700">
                <Shield className="h-5 w-5" />
              </span>
              <h1 className="text-xl font-bold text-slate-900">Sanctioned Intake Management</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                Multi-Cohort Audit
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Deterministic approved admission seat capacity by cohort (NT = I_Y + I_Y-1 for MCA 2-Year PG). Strict RBAC controls.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => window.open("/api/csv/template?module=intake", "_blank")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              <Download className="h-3.5 w-3.5" />
              <span>CSV Template</span>
            </button>

            {isAdmin && (
              <>
                <button
                  onClick={() => setIsCsvModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>Import CSV</span>
                </button>
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition shadow-sm"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>{showAddForm ? "Cancel" : "Add / Revise Cohort"}</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Action Message Feedback */}
        {actionMessage && (
          <div
            className={`p-4 rounded-xl border text-xs flex items-center justify-between ${
              actionMessage.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
          >
            <div className="flex items-center gap-2">
              {actionMessage.type === "success" ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-rose-600" />
              )}
              <span className="font-medium">{actionMessage.text}</span>
            </div>
            <button onClick={() => setActionMessage(null)}>
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Non-Admin Notice */}
        {!isAdmin && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-3">
            <Lock className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Read-Only Access for {currentUser?.role}</p>
              <p className="mt-0.5 text-amber-700">
                You have permission to view the applicable cohort intake used in NIRF simulation scores. Only Department Administrators can record or revise sanctioned intake figures.
              </p>
            </div>
          </div>
        )}

        {/* Add/Revise Form */}
        {isAdmin && showAddForm && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900">Record or Revise Sanctioned Intake</h2>
              <p className="text-xs text-slate-500">
                Updating an existing cohort appends to its revision audit log and automatically marks active simulation scores stale.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Programme</label>
                <input
                  type="text"
                  value="MCA"
                  disabled
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Admission Cohort (e.g. 2024-2026)</label>
                <input
                  type="text"
                  required
                  value={formCohortYear}
                  onChange={(e) => setFormCohortYear(e.target.value)}
                  placeholder="2024-2026"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-800 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Intake Year (Admission Year)</label>
                <input
                  type="number"
                  required
                  min={2000}
                  max={2100}
                  value={formIntakeYear}
                  onChange={(e) => setFormIntakeYear(e.target.value)}
                  placeholder="2024"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-800 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Approved Intake Count (Annual)</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={formApprovedIntake}
                  onChange={(e) => setFormApprovedIntake(e.target.value)}
                  placeholder="60"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-800 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Approval Authority</label>
                <select
                  value={formAuthority}
                  onChange={(e) => setFormAuthority(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="AICTE">AICTE</option>
                  <option value="VTU">VTU</option>
                  <option value="STATE_GOVT">State Government</option>
                  <option value="UNIVERSITY">University</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Approval Order / EOA Reference</label>
                <input
                  type="text"
                  required
                  value={formOrderNumber}
                  onChange={(e) => setFormOrderNumber(e.target.value)}
                  placeholder="F.No. South-West/1-2024/EOA"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-800 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Effective Academic Year</label>
                <input
                  type="text"
                  required
                  value={formEffectiveYear}
                  onChange={(e) => setFormEffectiveYear(e.target.value)}
                  placeholder="2024-25"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-800 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Revision Reason / Remarks</label>
                <input
                  type="text"
                  value={formRevisionReason}
                  onChange={(e) => setFormRevisionReason(e.target.value)}
                  placeholder="e.g. Regular EOA annual sanction approval"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-800 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="sm:col-span-3 flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save Cohort Intake"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Records Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Recorded Sanctioned Intake by Cohort</h2>
            <button
              onClick={fetchRecords}
              disabled={fetching}
              className="p-1 text-slate-400 hover:text-slate-600 transition"
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${fetching ? "animate-spin" : ""}`} />
            </button>
          </div>

          {records.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No sanctioned intake records found. {isAdmin ? "Add a cohort or import from CSV." : ""}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Admission Cohort</th>
                    <th className="px-4 py-3">Intake Year</th>
                    <th className="px-4 py-3 text-right">Approved Intake</th>
                    <th className="px-4 py-3">Authority</th>
                    <th className="px-4 py-3">Approval Order No.</th>
                    <th className="px-4 py-3">Effective AY</th>
                    <th className="px-4 py-3 text-center">Revisions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {records.map((r) => (
                    <tr key={r._id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3 font-semibold text-slate-900">{r.cohortYear}</td>
                      <td className="px-4 py-3 font-mono">{r.intakeYear}</td>
                      <td className="px-4 py-3 text-right font-bold text-indigo-600 text-sm">
                        {r.approvedIntake}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded bg-slate-100 font-semibold text-[10px]">
                          {r.approvalAuthority}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600">{r.approvalOrderNumber}</td>
                      <td className="px-4 py-3">{r.effectiveAcademicYear}</td>
                      <td className="px-4 py-3 text-center">
                        {r.revisions && r.revisions.length > 0 ? (
                          <button
                            onClick={() => setSelectedRevisionHistory(r)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-semibold"
                          >
                            <History className="h-3 w-3" />
                            <span>{r.revisions.length}</span>
                          </button>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Revision History Modal */}
        {selectedRevisionHistory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-indigo-600" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Intake Revision History: {selectedRevisionHistory.cohortYear}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedRevisionHistory(null)}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3 max-h-80 overflow-y-auto">
                {selectedRevisionHistory.revisions.map((rev, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1">
                    <div className="flex justify-between font-semibold text-slate-900">
                      <span>Prior Intake: {rev.approvedIntake} seats</span>
                      <span className="text-slate-400 text-[10px]">
                        {new Date(rev.revisedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="text-slate-600 font-mono text-[11px]">
                      Order: {rev.approvalOrderNumber}
                    </div>
                    {rev.reason && (
                      <div className="text-slate-500 italic text-[11px]">Reason: {rev.reason}</div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setSelectedRevisionHistory(null)}
                  className="px-4 py-1.5 rounded-lg bg-slate-100 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <CsvImportModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        moduleName="intake"
        moduleTitle="Sanctioned Intake"
        onImportSuccess={() => {
          setIsCsvModalOpen(false);
          setActionMessage({ type: "success", text: "Sanctioned intake batch CSV import completed." });
          fetchRecords();
        }}
      />
    </SidebarLayout>
  );
}
