"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { SidebarLayout } from "@/components/SidebarLayout";
import { CsvImportModal } from "@/components/CsvImportModal";
import {
  Users,
  Compass,
  HeartHandshake,
  Accessibility,
  MessageSquare,
  Plus,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Star,
  Check,
  X,
  Lock,
} from "lucide-react";

interface OutreachRecordItem {
  _id: string;
  recordType: "REGIONAL_DIVERSITY" | "GENDER_DIVERSITY" | "FEE_SUPPORT" | "ACCESSIBILITY";
  aggregateCount: number;
  totalEligiblePopulation: number;
  studentReference?: string;
  isFullTuitionSupport?: boolean;
  sponsoringAgency?: string;
  facilityId?: string;
  facilityName?: string;
  facilityStatus?: "AVAILABLE" | "NOT_AVAILABLE" | "NOT_APPLICABLE";
  notes?: string;
  academicYear: string;
}

interface PerceptionRecordItem {
  _id: string;
  sourceType: "OFFICIAL_SCORE" | "INTERNAL_FEEDBACK" | "DEPARTMENT_SURVEY";
  score: number;
  maximumScore: number;
  surveyOrReferencePeriod: string;
  respondentCategory?: "EMPLOYER" | "ACADEMIC_PEER" | "ALUMNI" | "PARENT" | "OTHER";
  responseId?: string;
  rating?: number;
  ratingScale?: string;
  remarks?: string;
}

export default function OutreachPerceptionPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"escs" | "pcs" | "pr">("escs");
  const [outreachRecords, setOutreachRecords] = useState<OutreachRecordItem[]>([]);
  const [perceptionRecords, setPerceptionRecords] = useState<PerceptionRecordItem[]>([]);
  const [fetching, setFetching] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // CSV Import State
  const [csvModalModule, setCsvModalModule] = useState<"outreach" | "perception" | null>(null);

  // ESCS Form State
  const [studentRef, setStudentRef] = useState("");
  const [sponsoringAgency, setSponsoringAgency] = useState("State Govt");
  const [isFullSupport, setIsFullSupport] = useState(true);
  const [supportNotes, setSupportNotes] = useState("");
  const [submittingEscs, setSubmittingEscs] = useState(false);

  // PR Form State
  const [respCategory, setRespCategory] = useState<"EMPLOYER" | "ACADEMIC_PEER" | "ALUMNI" | "PARENT">("ACADEMIC_PEER");
  const [surveyRating, setSurveyRating] = useState("5");
  const [surveyRemarks, setSurveyRemarks] = useState("");
  const [submittingPr, setSubmittingPr] = useState(false);

  // PCS Facility Checklist State
  const [facilities, setFacilities] = useState<Record<string, { name: string; status: "AVAILABLE" | "NOT_AVAILABLE" | "NOT_APPLICABLE"; notes: string }>>({
    ramps_walkways: { name: "Ramps and Walkways across Department Blocks", status: "AVAILABLE", notes: "Wheelchair accessible gently sloped ramps" },
    lifts_elevators: { name: "Lifts and Elevators with Voice Announcements", status: "AVAILABLE", notes: "Wide elevator cars in main academic block" },
    accessible_toilets: { name: "Dedicated Accessible Toilets on Every Floor", status: "AVAILABLE", notes: "Equipped with grab bars and emergency call cord" },
    assistive_tech_labs: { name: "Assistive Technology Lab & Screen-Reader Tools", status: "AVAILABLE", notes: "NVDA and JAWS installed on lab systems" },
    directional_signage: { name: "Tactile and Accessible Directional Signage", status: "AVAILABLE", notes: "High contrast braille indicators at entrance" },
  });
  const [savingPcs, setSavingPcs] = useState(false);

  const canEdit = currentUser?.role === "DEPARTMENT_ADMIN" || currentUser?.role === "FACULTY_CONTRIBUTOR";

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

  const fetchData = useCallback(async () => {
    setFetching(true);
    try {
      const [resOutreach, resPerception] = await Promise.all([
        fetch("/api/outreach"),
        fetch("/api/perception"),
      ]);

      if (resOutreach.ok) {
        const d = await resOutreach.json();
        setOutreachRecords(d.records || []);
      }
      if (resPerception.ok) {
        const d = await resPerception.json();
        setPerceptionRecords(d.records || []);
      }
    } catch (err: any) {
      setActionMessage({ type: "error", text: "Failed to load records." });
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchData();
    }
  }, [currentUser, fetchData]);

  // Handle ESCS submit
  const handleEscsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    setSubmittingEscs(true);
    setActionMessage(null);

    try {
      const payload = {
        recordType: "FEE_SUPPORT",
        aggregateCount: 1,
        totalEligiblePopulation: 120,
        studentReference: studentRef.trim(),
        isFullTuitionSupport: isFullSupport,
        sponsoringAgency: sponsoringAgency.trim(),
        notes: supportNotes.trim(),
        academicYear: "2024-25",
        department: "MCA",
      };

      const res = await fetch("/api/outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setActionMessage({ type: "success", text: `Fee support record recorded for student ${studentRef}` });
        setStudentRef("");
        setSupportNotes("");
        await fetchData();
      } else {
        const d = await res.json();
        setActionMessage({ type: "error", text: d.error || "Failed to record fee support." });
      }
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message || "Request failed" });
    } finally {
      setSubmittingEscs(false);
    }
  };

  // Handle PR submit
  const handlePrSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    setSubmittingPr(true);
    setActionMessage(null);

    try {
      const ratingNum = parseFloat(surveyRating);
      const payload = {
        sourceType: "DEPARTMENT_SURVEY",
        score: ratingNum,
        maximumScore: 5,
        rating: ratingNum,
        ratingScale: "1-5",
        respondentCategory: respCategory,
        surveyOrReferencePeriod: "2024-25",
        surveyCycle: "2024-25",
        remarks: surveyRemarks.trim(),
        department: "MCA",
      };

      const res = await fetch("/api/perception", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setActionMessage({ type: "success", text: "Survey response recorded." });
        setSurveyRemarks("");
        await fetchData();
      } else {
        const d = await res.json();
        setActionMessage({ type: "error", text: d.error || "Failed to record survey response." });
      }
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message || "Request failed" });
    } finally {
      setSubmittingPr(false);
    }
  };

  // Save PCS checklist
  const handleSavePcsChecklist = async () => {
    if (!canEdit) return;
    setSavingPcs(true);
    setActionMessage(null);

    try {
      // Save each checklist item to OutreachRecord
      for (const [fId, item] of Object.entries(facilities)) {
        await fetch("/api/outreach", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recordType: "ACCESSIBILITY",
            facilityId: fId,
            facilityName: item.name,
            facilityStatus: item.status,
            notes: item.notes,
            aggregateCount: item.status === "AVAILABLE" ? 1 : 0,
            totalEligiblePopulation: 5,
            academicYear: "2024-25",
            department: "MCA",
          }),
        });
      }
      setActionMessage({ type: "success", text: "Campus accessibility checklist audit successfully saved." });
      await fetchData();
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message || "Failed to save checklist." });
    } finally {
      setSavingPcs(false);
    }
  };

  const feeSupportRecords = outreachRecords.filter((r) => r.recordType === "FEE_SUPPORT");
  const surveyRecords = perceptionRecords.filter((r) => r.sourceType === "DEPARTMENT_SURVEY" || r.rating !== undefined);
  const avgSurveyRating = surveyRecords.length > 0
    ? (surveyRecords.reduce((acc, cur) => acc + (cur.rating || cur.score || 0), 0) / surveyRecords.length).toFixed(2)
    : "—";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <RefreshCw className="h-6 w-6 animate-spin text-teal-600" />
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
              <span className="p-2 rounded-lg bg-teal-100 text-teal-700">
                <Users className="h-5 w-5" />
              </span>
              <h1 className="text-xl font-bold text-slate-900">Outreach &amp; Perception Workspace</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
                OI (100) &amp; PR (100)
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Deterministic departmental simulator for Regional Diversity, Women Diversity, Full-Tuition Fee Support, Campus Accessibility, and Perception Survey.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (activeTab === "pr") {
                  window.open("/api/csv/template?module=perception", "_blank");
                } else {
                  window.open("/api/csv/template?module=outreach", "_blank");
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              <Download className="h-3.5 w-3.5" />
              <span>CSV Template</span>
            </button>
            {canEdit && (
              <button
                onClick={() => setCsvModalModule(activeTab === "pr" ? "perception" : "outreach")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Import CSV</span>
              </button>
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

        {/* Workspace Sub-tabs */}
        <div className="flex border-b border-slate-200 gap-2">
          <button
            onClick={() => setActiveTab("escs")}
            className={`pb-3 px-3 text-xs font-semibold transition border-b-2 flex items-center gap-1.5 ${
              activeTab === "escs"
                ? "border-teal-600 text-teal-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <HeartHandshake className="h-4 w-4" />
            <span>Student Fee Support (ESCS, Max 20)</span>
          </button>
          <button
            onClick={() => setActiveTab("pcs")}
            className={`pb-3 px-3 text-xs font-semibold transition border-b-2 flex items-center gap-1.5 ${
              activeTab === "pcs"
                ? "border-teal-600 text-teal-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <Accessibility className="h-4 w-4" />
            <span>Campus Accessibility (PCS, Max 20)</span>
          </button>
          <button
            onClick={() => setActiveTab("pr")}
            className={`pb-3 px-3 text-xs font-semibold transition border-b-2 flex items-center gap-1.5 ${
              activeTab === "pr"
                ? "border-teal-600 text-teal-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            <span>Perception Survey (PR, Max 100)</span>
          </button>
        </div>

        {/* TAB 1: ESCS */}
        {activeTab === "escs" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Form */}
              <div className="md:col-span-1 bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <div className="border-b border-slate-100 pb-2">
                  <h3 className="text-sm font-bold text-slate-900">Record Fee Support</h3>
                  <p className="text-[11px] text-slate-500">
                    Model MCA_FULL_TUITION_SUPPORT_V1: Deduplicated students receiving full tuition reimbursement.
                  </p>
                </div>

                {canEdit ? (
                  <form onSubmit={handleEscsSubmit} className="space-y-3 text-xs">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Student Reference / ID</label>
                      <input
                        type="text"
                        required
                        value={studentRef}
                        onChange={(e) => setStudentRef(e.target.value)}
                        placeholder="1DS24MC001"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Funding Agency / Sponsor</label>
                      <input
                        type="text"
                        value={sponsoringAgency}
                        onChange={(e) => setSponsoringAgency(e.target.value)}
                        placeholder="State Govt / Institutional Scholarship"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="checkbox"
                        id="fullSupport"
                        checked={isFullSupport}
                        onChange={(e) => setIsFullSupport(e.target.checked)}
                        className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                      />
                      <label htmlFor="fullSupport" className="font-semibold text-slate-700">
                        Full Tuition Support (100% waiver)
                      </label>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Remarks</label>
                      <input
                        type="text"
                        value={supportNotes}
                        onChange={(e) => setSupportNotes(e.target.value)}
                        placeholder="e.g. Post-Matric Karnataka Govt scheme"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submittingEscs}
                      className="w-full py-2 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition disabled:opacity-50"
                    >
                      {submittingEscs ? "Saving..." : "Record Fee Support"}
                    </button>
                  </form>
                ) : (
                  <p className="text-xs text-slate-400 italic">Read-only mode for current role.</p>
                )}
              </div>

              {/* Records List */}
              <div className="md:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="px-5 py-3 border-b border-slate-100 flex justify-between items-center">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Deduplicated Full Tuition Support Records ({feeSupportRecords.length})
                  </h3>
                  <button onClick={fetchData} className="p-1 text-slate-400 hover:text-slate-600">
                    <RefreshCw className={`h-3.5 w-3.5 ${fetching ? "animate-spin" : ""}`} />
                  </button>
                </div>

                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-2.5">Student Reference</th>
                        <th className="px-4 py-2.5">Sponsor</th>
                        <th className="px-4 py-2.5">Support Type</th>
                        <th className="px-4 py-2.5">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {feeSupportRecords.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-6 text-center text-slate-400">
                            No fee support records recorded yet.
                          </td>
                        </tr>
                      ) : (
                        feeSupportRecords.map((r) => (
                          <tr key={r._id} className="hover:bg-slate-50">
                            <td className="px-4 py-2 font-mono font-semibold text-slate-900">
                              {r.studentReference || "—"}
                            </td>
                            <td className="px-4 py-2">{r.sponsoringAgency || "State / Central Govt"}</td>
                            <td className="px-4 py-2">
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                                Full Tuition Waiver
                              </span>
                            </td>
                            <td className="px-4 py-2 text-slate-500">{r.notes || "—"}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PCS */}
        {activeTab === "pcs" && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Campus Accessibility Checklist Audit</h3>
                <p className="text-xs text-slate-500">
                  Model MCA_CAMPUS_ACCESSIBILITY_V1: Evaluates 5 standard campus provisions. Empty checklist yields PENDING_INPUT.
                </p>
              </div>
              {canEdit && (
                <button
                  onClick={handleSavePcsChecklist}
                  disabled={savingPcs}
                  className="px-4 py-2 bg-teal-600 text-white text-xs font-semibold rounded-lg hover:bg-teal-700 transition disabled:opacity-50"
                >
                  {savingPcs ? "Saving Checklist..." : "Save Audit Checklist"}
                </button>
              )}
            </div>

            <div className="space-y-4">
              {Object.entries(facilities).map(([key, item]) => (
                <div key={key} className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-900">{item.name}</p>
                    <p className="text-[11px] text-slate-500">{item.notes}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={item.status}
                      disabled={!canEdit}
                      onChange={(e) => {
                        setFacilities({
                          ...facilities,
                          [key]: { ...item, status: e.target.value as any },
                        });
                      }}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-800"
                    >
                      <option value="AVAILABLE">Confirmed Available</option>
                      <option value="NOT_AVAILABLE">Not Available</option>
                      <option value="NOT_APPLICABLE">Not Applicable (Exempt)</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: PR */}
        {activeTab === "pr" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Survey Response Form */}
              <div className="md:col-span-1 bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <div className="border-b border-slate-100 pb-2">
                  <h3 className="text-sm font-bold text-slate-900">Record Survey Response</h3>
                  <p className="text-[11px] text-slate-500">
                    Model DEPARTMENT_SURVEY_V1: PR = 100 × (r̄ - 1) / 4 on 1–5 rating scale.
                  </p>
                </div>

                {canEdit ? (
                  <form onSubmit={handlePrSubmit} className="space-y-3 text-xs">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Respondent Category</label>
                      <select
                        value={respCategory}
                        onChange={(e) => setRespCategory(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 focus:ring-2 focus:ring-teal-500"
                      >
                        <option value="ACADEMIC_PEER">Academic Peer</option>
                        <option value="EMPLOYER">Employer / Industry Partner</option>
                        <option value="ALUMNI">Alumni</option>
                        <option value="PARENT">Parent</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Rating (1 to 5 scale)</label>
                      <select
                        value={surveyRating}
                        onChange={(e) => setSurveyRating(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 focus:ring-2 focus:ring-teal-500 font-bold"
                      >
                        <option value="5">5 - Excellent (100 marks)</option>
                        <option value="4.5">4.5 - Very Good (87.5 marks)</option>
                        <option value="4">4 - Good (75 marks)</option>
                        <option value="3.5">3.5 - Satisfactory (62.5 marks)</option>
                        <option value="3">3 - Average (50 marks)</option>
                        <option value="2">2 - Needs Improvement (25 marks)</option>
                        <option value="1">1 - Unsatisfactory (0 marks)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Remarks / Feedback</label>
                      <textarea
                        rows={3}
                        value={surveyRemarks}
                        onChange={(e) => setSurveyRemarks(e.target.value)}
                        placeholder="Feedback on curriculum, skills, lab infrastructure"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submittingPr}
                      className="w-full py-2 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition disabled:opacity-50"
                    >
                      {submittingPr ? "Recording..." : "Record Perception Response"}
                    </button>
                  </form>
                ) : (
                  <p className="text-xs text-slate-400 italic">Read-only mode for current role.</p>
                )}
              </div>

              {/* Responses List */}
              <div className="md:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="px-5 py-3 border-b border-slate-100 flex justify-between items-center">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Department Survey Responses ({surveyRecords.length})
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Average Rating r̄: <span className="font-bold text-teal-700">{avgSurveyRating} / 5</span>
                    </p>
                  </div>
                  <button onClick={fetchData} className="p-1 text-slate-400 hover:text-slate-600">
                    <RefreshCw className={`h-3.5 w-3.5 ${fetching ? "animate-spin" : ""}`} />
                  </button>
                </div>

                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-2.5">Category</th>
                        <th className="px-4 py-2.5 text-center">Rating (1-5)</th>
                        <th className="px-4 py-2.5">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {surveyRecords.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="p-6 text-center text-slate-400">
                            No survey responses recorded yet. Missing responses will be marked PENDING_INPUT without assuming zero.
                          </td>
                        </tr>
                      ) : (
                        surveyRecords.map((r) => (
                          <tr key={r._id} className="hover:bg-slate-50">
                            <td className="px-4 py-2 font-semibold text-slate-900">
                              {r.respondentCategory || "ACADEMIC_PEER"}
                            </td>
                            <td className="px-4 py-2 text-center font-bold text-teal-700">
                              {r.rating || r.score || "—"}
                            </td>
                            <td className="px-4 py-2 text-slate-500">{r.remarks || "—"}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <CsvImportModal
        isOpen={csvModalModule !== null}
        onClose={() => setCsvModalModule(null)}
        moduleName={csvModalModule || "outreach"}
        moduleTitle={csvModalModule === "perception" ? "Perception Survey Responses" : "Outreach & Inclusivity Records"}
        onImportSuccess={() => {
          setCsvModalModule(null);
          setActionMessage({ type: "success", text: "Batch CSV import completed successfully." });
          fetchData();
        }}
      />
    </SidebarLayout>
  );
}
