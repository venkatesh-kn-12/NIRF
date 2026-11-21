"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  GraduationCap,
  Briefcase,
  Award,
  BookOpen,
  Plus,
  RefreshCw,
  Search,
  Download,
  Trash2,
  Edit,
  Loader2,
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  Settings,
  TrendingUp,
  Building,
  Calendar,
  X,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import { CsvImportModal } from "@/components/CsvImportModal";

interface PlacementItem {
  _id: string;
  studentReference: string;
  programme: string;
  batch: string;
  employer: string;
  offerType: string;
  ctc: number;
  offerDate: string;
  joiningStatus: string;
  higherStudiesStatus: string;
  placementYear: number;
  status: string;
  createdAt: string;
}

interface CohortGraduationItem {
  _id: string;
  programme: string;
  batch: string;
  eligibleGraduates: number;
  graduatesInStipulatedTime: number;
  examinationPassCount: number;
  higherStudiesCount: number;
  phdCompletionCount: number;
  status: string;
}

interface DoctoralAwardItem {
  _id: string;
  scholarName: string;
  studentReference?: string;
  programme: string;
  thesisTitle: string;
  supervisorName: string;
  awardDate: string;
  awardYear: number;
  status: string;
}

interface ZeroDeclarationItem {
  _id: string;
  activityType: string;
  reason?: string;
  declaredByName: string;
  declaredAt: string;
}

export default function GOPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "placements" | "cohorts" | "doctoral" | "settings">("overview");
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Data states
  const [placements, setPlacements] = useState<PlacementItem[]>([]);
  const [cohorts, setCohorts] = useState<CohortGraduationItem[]>([]);
  const [doctoralAwards, setDoctoralAwards] = useState<DoctoralAwardItem[]>([]);
  const [zeroDeclarations, setZeroDeclarations] = useState<ZeroDeclarationItem[]>([]);
  const [metricResults, setMetricResults] = useState<any[]>([]);
  const [overallScore, setOverallScore] = useState<number | null>(null);
  const [isStale, setIsStale] = useState(false);
  const [staleReason, setStaleReason] = useState<string>("");

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [csvTargetModule, setCsvTargetModule] = useState<"placements" | "graduation-outcomes" | "doctoral-awards">("placements");
  const [isAddPlacementOpen, setIsAddPlacementOpen] = useState(false);
  const [isAddCohortOpen, setIsAddCohortOpen] = useState(false);
  const [isAddDoctoralOpen, setIsAddDoctoralOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Settings State
  const [salaryTarget, setSalaryTarget] = useState(800000);
  const [phdTarget, setPhdTarget] = useState(1.0);
  const [savingSettings, setSavingSettings] = useState(false);

  // Placement Form
  const [placementForm, setPlacementForm] = useState({
    studentReference: "",
    employer: "",
    batch: "2022-2024",
    offerType: "ON_CAMPUS",
    ctc: "",
    offerDate: new Date().toISOString().slice(0, 10),
    joiningStatus: "JOINED",
    higherStudiesStatus: "NO",
    placementYear: 2024,
  });

  // Cohort Form
  const [cohortForm, setCohortForm] = useState({
    programme: "MCA",
    batch: "2022-2024",
    eligibleGraduates: 120,
    graduatesInStipulatedTime: 110,
    examinationPassCount: 115,
    higherStudiesCount: 6,
    phdCompletionCount: 0,
  });

  // Doctoral Award Form
  const [doctoralForm, setDoctoralForm] = useState({
    scholarName: "",
    studentReference: "",
    programme: "MCA",
    thesisTitle: "",
    supervisorName: "",
    awardDate: new Date().toISOString().slice(0, 10),
    awardYear: 2024,
  });

  const fetchSession = async () => {
    try {
      const res = await fetch("/api/auth/me");
      const d = await res.json();
      if (d.success) setCurrentUser(d.user);
    } catch {}
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setActionError(null);
    try {
      const [pRes, cRes, dRes, zRes, mRes, sRes] = await Promise.all([
        fetch("/api/placements?limit=200"),
        fetch("/api/graduation-outcomes?limit=50"),
        fetch("/api/doctoral-awards?limit=50"),
        fetch("/api/zero-declarations?academicYear=2024-25"),
        fetch("/api/metrics/results?academicYear=2024-25&parameter=GO"),
        fetch("/api/settings/department"),
      ]);

      const [pData, cData, dData, zData, mData, sData] = await Promise.all([
        pRes.json(),
        cRes.json(),
        dRes.json(),
        zRes.json(),
        mRes.json(),
        sRes.json(),
      ]);

      if (pData.success) setPlacements(pData.records || []);
      if (cData.success) setCohorts(cData.records || []);
      if (dData.success) setDoctoralAwards(dData.records || []);
      if (zData.success) setZeroDeclarations(zData.data || []);
      if (mData.success) {
        setMetricResults(mData.results || []);
        setIsStale(!!mData.isStale);
        setStaleReason(mData.staleReason || "");
        const goSummary = mData.parameterSummaries?.GO;
        if (goSummary) setOverallScore(goSummary.earnedWeightedMarks);
      }
      if (sData.success && sData.config?.goSettings) {
        setSalaryTarget(sData.config.goSettings.salaryTarget || 800000);
        setPhdTarget(sData.config.goSettings.phdAwardTargetPerYear || 1.0);
      }
    } catch (err: any) {
      setActionError("Failed to load GO data: " + (err.message || "Network error"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSession();
    loadData();
  }, [loadData]);

  const handleRecalculate = async () => {
    setLoading(true);
    setActionError(null);
    try {
      const res = await fetch("/api/metrics/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ academicYear: "2024-25", department: "MCA" }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Recalculation failed");
      setActionSuccess("Simulation scores recalculated successfully!");
      setTimeout(() => setActionSuccess(null), 3000);
      await loadData();
    } catch (err: any) {
      setActionError(err.message || "Failed to trigger recalculation");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setActionError(null);
    try {
      const res = await fetch("/api/settings/department", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goSettings: {
            salaryTarget: Number(salaryTarget),
            phdAwardTargetPerYear: Number(phdTarget),
            cohortYearsCount: 3,
            gphModel: "GPH_UNIQUE_OUTCOMES_V1",
          },
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed to save settings");
      setActionSuccess("Department GO benchmarks updated successfully!");
      setTimeout(() => setActionSuccess(null), 3000);
      await loadData();
    } catch (err: any) {
      setActionError(err.message || "Failed to update benchmarks");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleZeroDeclaration = async (activityType: string, isDeclared: boolean) => {
    setActionError(null);
    try {
      if (isDeclared) {
        const res = await fetch("/api/zero-declarations", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ activityType, academicYear: "2024-25" }),
        });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error || "Failed to remove zero declaration");
      } else {
        const res = await fetch("/api/zero-declarations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            activityType,
            academicYear: "2024-25",
            reason: `Explicit zero declaration for ${activityType.toLowerCase().replace(/_/g, " ")}.`,
          }),
        });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error || "Failed to record zero declaration");
      }
      setActionSuccess("Zero declaration updated.");
      setTimeout(() => setActionSuccess(null), 3000);
      await loadData();
    } catch (err: any) {
      setActionError(err.message || "Action failed");
    }
  };

  const handleCreatePlacement = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setActionError(null);
    try {
      const res = await fetch("/api/placements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...placementForm,
          ctc: Number(placementForm.ctc) || 0,
          placementYear: Number(placementForm.placementYear),
          department: "MCA",
          status: "RECORDED",
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed to create placement record");
      setIsAddPlacementOpen(false);
      setActionSuccess("Placement record added!");
      setTimeout(() => setActionSuccess(null), 3000);
      await loadData();
    } catch (err: any) {
      setActionError(err.message || "Failed to add placement");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateCohort = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setActionError(null);
    try {
      const res = await fetch("/api/graduation-outcomes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...cohortForm,
          eligibleGraduates: Number(cohortForm.eligibleGraduates),
          graduatesInStipulatedTime: Number(cohortForm.graduatesInStipulatedTime),
          examinationPassCount: Number(cohortForm.examinationPassCount),
          higherStudiesCount: Number(cohortForm.higherStudiesCount),
          phdCompletionCount: Number(cohortForm.phdCompletionCount),
          department: "MCA",
          status: "RECORDED",
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed to create cohort record");
      setIsAddCohortOpen(false);
      setActionSuccess("Graduation cohort record added!");
      setTimeout(() => setActionSuccess(null), 3000);
      await loadData();
    } catch (err: any) {
      setActionError(err.message || "Failed to add cohort");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateDoctoral = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setActionError(null);
    try {
      const res = await fetch("/api/doctoral-awards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...doctoralForm,
          awardYear: Number(doctoralForm.awardYear),
          department: "MCA",
          status: "RECORDED",
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed to create doctoral award record");
      setIsAddDoctoralOpen(false);
      setActionSuccess("Doctoral award record added!");
      setTimeout(() => setActionSuccess(null), 3000);
      await loadData();
    } catch (err: any) {
      setActionError(err.message || "Failed to add doctoral award");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRecord = async (endpoint: string, id: string) => {
    if (!confirm("Are you sure you want to remove this record?")) return;
    try {
      const res = await fetch(`${endpoint}/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete record");
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to delete record");
    }
  };

  // Helper metric score lookup
  const getMetric = (code: string) => metricResults.find((m) => m.metricCode === code);

  // Placements deduplicated stats
  const placedMap = new Map<string, { placed: boolean; hs: boolean; ctc: number }>();
  placements.forEach((p) => {
    const ref = p.studentReference?.trim() || p._id;
    if (!placedMap.has(ref)) placedMap.set(ref, { placed: false, hs: false, ctc: 0 });
    const s = placedMap.get(ref)!;
    if (p.joiningStatus !== "DECLINED" && p.ctc > 0) {
      s.placed = true;
      s.ctc = Math.max(s.ctc, p.ctc);
    }
    if (["ADMITTED", "PURSUING", "YES"].includes((p.higherStudiesStatus || "").toUpperCase())) {
      s.hs = true;
    }
  });

  let distinctPlaced = 0;
  let distinctHs = 0;
  let uniquePositive = 0;
  const salaries: number[] = [];
  placedMap.forEach((s) => {
    if (s.placed) {
      distinctPlaced++;
      if (s.ctc > 0) salaries.push(s.ctc);
    }
    if (s.hs) distinctHs++;
    if (s.placed || s.hs) uniquePositive++;
  });

  salaries.sort((a, b) => a - b);
  const medianCtc =
    salaries.length === 0
      ? 0
      : salaries.length % 2 !== 0
      ? salaries[Math.floor(salaries.length / 2)]
      : Math.round((salaries[Math.floor(salaries.length / 2) - 1] + salaries[Math.floor(salaries.length / 2)]) / 2);

  const totalEligible = cohorts.reduce((acc, c) => acc + (c.eligibleGraduates || 0), 0);
  const totalOnTime = cohorts.reduce((acc, c) => acc + (c.graduatesInStipulatedTime || 0), 0);
  const stipulatedRate = totalEligible > 0 ? ((totalOnTime / totalEligible) * 100).toFixed(1) : "0.0";

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <GraduationCap size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Graduation Outcomes (GO) Simulator</h1>
              <p className="text-xs text-slate-500">
                Departmental performance on Placement (GPH), University Examinations (GUE), Median Salary (GMS), and Ph.D. Awards (GPHD)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs bg-slate-100 text-slate-600 font-semibold px-2.5 py-1 rounded">
              Academic Year: 2024–25 (MCA)
            </span>
            <span className="text-xs bg-indigo-50 text-indigo-700 font-semibold px-2.5 py-1 rounded">
              Max GO Marks: 100
            </span>
            {isStale && (
              <span className="text-xs bg-amber-50 text-amber-700 font-semibold px-2.5 py-1 rounded border border-amber-200 flex items-center gap-1">
                <AlertCircle size={12} /> Stale Results — Recalculation Required
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            onClick={handleRecalculate}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
          >
            <TrendingUp size={14} />
            Calculate GO Scores
          </button>
        </div>
      </div>

      {actionError && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
          <AlertCircle size={16} /> {actionError}
        </div>
      )}
      {actionSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-lg flex items-center gap-2">
          <CheckCircle2 size={16} /> {actionSuccess}
        </div>
      )}

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* GPH Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>GPH: PLACEMENT & HIGHER STUDIES</span>
            <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-bold">Max 40</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {getMetric("GPH")?.result?.rawScore !== null && getMetric("GPH")?.result?.rawScore !== undefined
              ? `${getMetric("GPH")?.result?.rawScore} / 40`
              : "Pending Input"}
          </div>
          <div className="text-xs text-slate-500 flex justify-between">
            <span>Placed: {distinctPlaced}</span>
            <span>Higher Studies: {distinctHs}</span>
            <span>Unique: {uniquePositive}</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-indigo-600 h-1.5 rounded-full"
              style={{ width: `${Math.min(100, ((getMetric("GPH")?.result?.rawScore || 0) / 40) * 100)}%` }}
            />
          </div>
        </div>

        {/* GUE Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>GUE: UNIVERSITY EXAMS</span>
            <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-bold">Max 15</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {getMetric("GUE")?.result?.rawScore !== null && getMetric("GUE")?.result?.rawScore !== undefined
              ? `${getMetric("GUE")?.result?.rawScore} / 15`
              : "Pending Input"}
          </div>
          <div className="text-xs text-slate-500 flex justify-between">
            <span>On-Time Rate: {stipulatedRate}%</span>
            <span>Cohorts: {cohorts.length}</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-emerald-600 h-1.5 rounded-full"
              style={{ width: `${Math.min(100, ((getMetric("GUE")?.result?.rawScore || 0) / 15) * 100)}%` }}
            />
          </div>
        </div>

        {/* GMS Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>GMS: MEDIAN SALARY</span>
            <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-bold">Max 25</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {getMetric("GMS")?.result?.rawScore !== null && getMetric("GMS")?.result?.rawScore !== undefined
              ? `${getMetric("GMS")?.result?.rawScore} / 25`
              : "Pending Input"}
          </div>
          <div className="text-xs text-slate-500 flex justify-between">
            <span>Median: ₹{(medianCtc / 100000).toFixed(2)} LPA</span>
            <span>Target: ₹{(salaryTarget / 100000).toFixed(1)} LPA</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-blue-600 h-1.5 rounded-full"
              style={{ width: `${Math.min(100, ((getMetric("GMS")?.result?.rawScore || 0) / 25) * 100)}%` }}
            />
          </div>
        </div>

        {/* GPHD Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>GPHD: PH.D. GRADUATES</span>
            <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded font-bold">Max 20</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {getMetric("GPHD")?.result?.rawScore !== null && getMetric("GPHD")?.result?.rawScore !== undefined
              ? `${getMetric("GPHD")?.result?.rawScore} / 20`
              : "0 / 20"}
          </div>
          <div className="text-xs text-slate-500 flex justify-between">
            <span>Degrees: {doctoralAwards.length} in 3Y</span>
            <span>Target: {phdTarget}/yr</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-purple-600 h-1.5 rounded-full"
              style={{ width: `${Math.min(100, ((getMetric("GPHD")?.result?.rawScore || 0) / 20) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="border-b border-slate-200 flex gap-6 text-sm font-semibold text-slate-600">
        <button
          onClick={() => setActiveTab("overview")}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "overview" ? "border-indigo-600 text-indigo-600" : "border-transparent hover:text-slate-900"
          }`}
        >
          <TrendingUp size={16} /> Overview & Calculation Trace
        </button>
        <button
          onClick={() => setActiveTab("placements")}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "placements" ? "border-indigo-600 text-indigo-600" : "border-transparent hover:text-slate-900"
          }`}
        >
          <Briefcase size={16} /> Placements & Offers ({placements.length})
        </button>
        <button
          onClick={() => setActiveTab("cohorts")}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "cohorts" ? "border-indigo-600 text-indigo-600" : "border-transparent hover:text-slate-900"
          }`}
        >
          <GraduationCap size={16} /> Cohort Graduations ({cohorts.length})
        </button>
        <button
          onClick={() => setActiveTab("doctoral")}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "doctoral" ? "border-indigo-600 text-indigo-600" : "border-transparent hover:text-slate-900"
          }`}
        >
          <Award size={16} /> Doctoral Awards ({doctoralAwards.length})
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "settings" ? "border-indigo-600 text-indigo-600" : "border-transparent hover:text-slate-900"
          }`}
        >
          <Settings size={16} /> Benchmarks & Zero Declarations
        </button>
      </div>

      {/* Tab 1: Overview & Trace */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-900">Graduation Outcomes Calculation Trace</h2>
            <div className="space-y-4">
              {["GPH", "GUE", "GMS", "GPHD"].map((code) => {
                const metric = getMetric(code);
                return (
                  <div key={code} className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                        <span className="bg-indigo-600 text-white text-xs px-2 py-0.5 rounded">{code}</span>
                        <span>{metric?.name || code}</span>
                      </div>
                      <span className="text-sm font-bold text-indigo-700">
                        Score: {metric?.result?.rawScore ?? "—"} / {metric?.maxMarks || 0}
                      </span>
                    </div>

                    {metric?.result?.trace && (
                      <div className="text-xs text-slate-600 space-y-1 mt-2">
                        <p className="font-mono bg-white p-2 border border-slate-200 rounded text-slate-800">
                          {metric.result.trace.formula}
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                          {(metric.result.trace.steps || []).map((step: any, idx: number) => (
                            <div key={idx} className="bg-white p-2 rounded border border-slate-200">
                              <span className="font-semibold text-slate-700">{step.step}: </span>
                              <span className="text-slate-600">{step.expression}</span>
                            </div>
                          ))}
                        </div>
                        {metric.result.trace.notes && (
                          <p className="text-[11px] text-slate-500 italic mt-1">
                            Note: {metric.result.trace.notes}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Placements */}
      {activeTab === "placements" && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <Search size={16} className="text-slate-400" />
              <input
                type="text"
                placeholder="Search by student USN, employer, or batch..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setCsvTargetModule("placements");
                  setCsvModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100"
              >
                <FileSpreadsheet size={14} className="text-emerald-600" /> Import CSV
              </button>
              <button
                onClick={() => setIsAddPlacementOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
              >
                <Plus size={14} /> Add Placement Offer
              </button>
            </div>
          </div>

          {/* Placements Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 uppercase font-bold text-[10px] border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Student USN / ID</th>
                  <th className="px-4 py-3">Employer</th>
                  <th className="px-4 py-3">Batch</th>
                  <th className="px-4 py-3">Offer Type</th>
                  <th className="px-4 py-3">Annual CTC (INR)</th>
                  <th className="px-4 py-3">Joining Status</th>
                  <th className="px-4 py-3">Higher Studies</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {placements
                  .filter(
                    (p) =>
                      !searchQuery ||
                      p.studentReference.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      p.employer.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      p.batch.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((p) => (
                    <tr key={p._id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-slate-900">{p.studentReference}</td>
                      <td className="px-4 py-3">{p.employer}</td>
                      <td className="px-4 py-3">{p.batch}</td>
                      <td className="px-4 py-3">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px]">
                          {p.offerType}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono font-semibold text-slate-900">
                        {p.ctc > 0 ? `₹${p.ctc.toLocaleString("en-IN")}` : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            p.joiningStatus === "JOINED" || p.joiningStatus === "ACCEPTED"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {p.joiningStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {p.higherStudiesStatus === "ADMITTED" || p.higherStudiesStatus === "PURSUING" ? (
                          <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-semibold">
                            {p.higherStudiesStatus}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDeleteRecord("/api/placements", p._id)}
                          className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded"
                          title="Delete record"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                {placements.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                      No placement records recorded. Add an offer manually or import a batch CSV.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Cohort Graduations */}
      {activeTab === "cohorts" && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Graduating Cohorts (University Examinations)</h2>
              <p className="text-xs text-slate-500">
                Track on-time graduation for the 3 graduating cohorts contributing to GUE.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setCsvTargetModule("graduation-outcomes");
                  setCsvModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100"
              >
                <FileSpreadsheet size={14} className="text-emerald-600" /> Import Cohorts CSV
              </button>
              <button
                onClick={() => setIsAddCohortOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
              >
                <Plus size={14} /> Add Cohort Record
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 uppercase font-bold text-[10px] border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Batch</th>
                  <th className="px-4 py-3">Eligible Graduates (Ne)</th>
                  <th className="px-4 py-3">Stipulated Time (Ng)</th>
                  <th className="px-4 py-3">Pass Count</th>
                  <th className="px-4 py-3">Higher Studies</th>
                  <th className="px-4 py-3">On-Time %</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {cohorts.map((c) => {
                  const rate = c.eligibleGraduates > 0 ? ((c.graduatesInStipulatedTime / c.eligibleGraduates) * 100).toFixed(1) : "0.0";
                  return (
                    <tr key={c._id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-slate-900">{c.batch}</td>
                      <td className="px-4 py-3">{c.eligibleGraduates}</td>
                      <td className="px-4 py-3 font-semibold text-emerald-700">{c.graduatesInStipulatedTime}</td>
                      <td className="px-4 py-3">{c.examinationPassCount}</td>
                      <td className="px-4 py-3">{c.higherStudiesCount}</td>
                      <td className="px-4 py-3 font-semibold">{rate}%</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDeleteRecord("/api/graduation-outcomes", c._id)}
                          className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded"
                          title="Delete record"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {cohorts.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                      No graduation cohort records recorded. Add cohort data manually or import a batch CSV.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Doctoral Awards */}
      {activeTab === "doctoral" && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Doctoral Degree Awards (Ph.D. Completions)</h2>
              <p className="text-xs text-slate-500">
                Tracks degrees awarded (graduated scholars) within the 3-year window for GPHD.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setCsvTargetModule("doctoral-awards");
                  setCsvModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100"
              >
                <FileSpreadsheet size={14} className="text-emerald-600" /> Import Doctoral Awards CSV
              </button>
              <button
                onClick={() => setIsAddDoctoralOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
              >
                <Plus size={14} /> Add Doctoral Degree Award
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 uppercase font-bold text-[10px] border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Scholar Name</th>
                  <th className="px-4 py-3">USN / Reference</th>
                  <th className="px-4 py-3">Thesis Title</th>
                  <th className="px-4 py-3">Supervisor / Guide</th>
                  <th className="px-4 py-3">Award Date</th>
                  <th className="px-4 py-3">Calendar Year</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {doctoralAwards.map((d) => (
                  <tr key={d._id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-900">{d.scholarName}</td>
                    <td className="px-4 py-3">{d.studentReference || "—"}</td>
                    <td className="px-4 py-3 italic max-w-xs truncate">{d.thesisTitle}</td>
                    <td className="px-4 py-3">{d.supervisorName}</td>
                    <td className="px-4 py-3">{new Date(d.awardDate).toLocaleDateString()}</td>
                    <td className="px-4 py-3 font-semibold text-indigo-700">{d.awardYear}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDeleteRecord("/api/doctoral-awards", d._id)}
                        className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded"
                        title="Delete record"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
                {doctoralAwards.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                      No doctoral degree awards recorded. Standalone MCA departments without Ph.D. awards can declare zero in Settings.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 5: Settings & Zero Declarations */}
      {activeTab === "settings" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Benchmarks Form */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-900">Departmental Benchmarks (GO)</h2>
            <p className="text-xs text-slate-500">
              Configure explicit benchmark presets used by the departmental simulation engine.
            </p>
            <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Median CTC Benchmark Target (GMS, in INR)
                </label>
                <input
                  type="number"
                  value={salaryTarget}
                  onChange={(e) => setSalaryTarget(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="800000"
                />
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Default preset: ₹8,00,000 p.a. (8.0 LPA). Full 25 marks awarded when median CTC equals or exceeds this target.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Doctoral Awards Target per Year (GPHD)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={phdTarget}
                  onChange={(e) => setPhdTarget(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="1.0"
                />
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Default preset: 1.0 award per year (3 awards in 3-year window for full 20 marks).
                </p>
              </div>

              <button
                type="submit"
                disabled={savingSettings}
                className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 text-xs shadow-sm"
              >
                {savingSettings ? "Saving..." : "Save Benchmark Targets"}
              </button>
            </form>
          </div>

          {/* Zero Activity Declarations */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-900">Zero Activity Declarations</h2>
            <p className="text-xs text-slate-500">
              Record confirmed departmental zero activity for simulation completeness. A zero declaration with active records will produce a conflict discrepancy.
            </p>

            <div className="space-y-3">
              {[
                { type: "PLACEMENTS", label: "Zero Placements (GPH / GMS)" },
                { type: "HIGHER_STUDIES", label: "Zero Higher Studies (GPH)" },
                { type: "DOCTORAL_AWARDS", label: "Zero Ph.D. Awards (GPHD — Standalone MCA)" },
              ].map(({ type, label }) => {
                const isDeclared = zeroDeclarations.some((z) => z.activityType === type);
                return (
                  <div key={type} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                    <div>
                      <p className="font-semibold text-slate-800">{label}</p>
                      <p className="text-[11px] text-slate-500">
                        {isDeclared ? "Confirmed zero declared for AY 2024–25" : "Active tracking / not declared zero"}
                      </p>
                    </div>
                    <button
                      onClick={() => handleZeroDeclaration(type, isDeclared)}
                      className={`px-3 py-1.5 rounded font-semibold text-xs transition-colors ${
                        isDeclared
                          ? "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
                          : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200"
                      }`}
                    >
                      {isDeclared ? "Revoke Declaration" : "Declare Zero"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Add Placement Offer Modal */}
      {isAddPlacementOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md p-6 rounded-xl shadow-lg border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-sm text-slate-900">Add Placement Offer Record</h3>
              <button onClick={() => setIsAddPlacementOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreatePlacement} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Student USN / ID *</label>
                <input
                  required
                  type="text"
                  value={placementForm.studentReference}
                  onChange={(e) => setPlacementForm({ ...placementForm, studentReference: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="1DS22MC001"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Employer Name *</label>
                <input
                  required
                  type="text"
                  value={placementForm.employer}
                  onChange={(e) => setPlacementForm({ ...placementForm, employer: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Infosys / Oracle"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold mb-1">Batch</label>
                  <input
                    type="text"
                    value={placementForm.batch}
                    onChange={(e) => setPlacementForm({ ...placementForm, batch: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="2022-2024"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Placement Year</label>
                  <input
                    type="number"
                    value={placementForm.placementYear}
                    onChange={(e) => setPlacementForm({ ...placementForm, placementYear: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold mb-1">Annual CTC (INR)</label>
                  <input
                    type="number"
                    value={placementForm.ctc}
                    onChange={(e) => setPlacementForm({ ...placementForm, ctc: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="750000"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Joining Status</label>
                  <select
                    value={placementForm.joiningStatus}
                    onChange={(e) => setPlacementForm({ ...placementForm, joiningStatus: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="JOINED">JOINED</option>
                    <option value="ACCEPTED">ACCEPTED</option>
                    <option value="DECLINED">DECLINED</option>
                    <option value="PENDING">PENDING</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-semibold mb-1">Higher Studies Status</label>
                <select
                  value={placementForm.higherStudiesStatus}
                  onChange={(e) => setPlacementForm({ ...placementForm, higherStudiesStatus: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="NO">NO</option>
                  <option value="ADMITTED">ADMITTED</option>
                  <option value="PURSUING">PURSUING</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddPlacementOpen(false)}
                  className="px-3 py-2 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold"
                >
                  {submitting ? "Saving..." : "Save Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Cohort Modal */}
      {isAddCohortOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md p-6 rounded-xl shadow-lg border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-sm text-slate-900">Add Graduating Cohort Record</h3>
              <button onClick={() => setIsAddCohortOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreateCohort} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Academic Batch *</label>
                <input
                  required
                  type="text"
                  value={cohortForm.batch}
                  onChange={(e) => setCohortForm({ ...cohortForm, batch: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="2022-2024"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold mb-1">Eligible Graduates (Ne)</label>
                  <input
                    type="number"
                    value={cohortForm.eligibleGraduates}
                    onChange={(e) => setCohortForm({ ...cohortForm, eligibleGraduates: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Stipulated Time (Ng)</label>
                  <input
                    type="number"
                    value={cohortForm.graduatesInStipulatedTime}
                    onChange={(e) => setCohortForm({ ...cohortForm, graduatesInStipulatedTime: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold mb-1">Pass Count</label>
                  <input
                    type="number"
                    value={cohortForm.examinationPassCount}
                    onChange={(e) => setCohortForm({ ...cohortForm, examinationPassCount: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Higher Studies Count</label>
                  <input
                    type="number"
                    value={cohortForm.higherStudiesCount}
                    onChange={(e) => setCohortForm({ ...cohortForm, higherStudiesCount: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddCohortOpen(false)}
                  className="px-3 py-2 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold"
                >
                  {submitting ? "Saving..." : "Save Cohort"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Doctoral Modal */}
      {isAddDoctoralOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md p-6 rounded-xl shadow-lg border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-sm text-slate-900">Add Doctoral Degree Award Record</h3>
              <button onClick={() => setIsAddDoctoralOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreateDoctoral} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Scholar Name *</label>
                <input
                  required
                  type="text"
                  value={doctoralForm.scholarName}
                  onChange={(e) => setDoctoralForm({ ...doctoralForm, scholarName: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Dr. Rajesh Kumar"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Thesis Title *</label>
                <input
                  required
                  type="text"
                  value={doctoralForm.thesisTitle}
                  onChange={(e) => setDoctoralForm({ ...doctoralForm, thesisTitle: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="AI-Driven Security Protocol in Cloud"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Supervisor / Guide Name *</label>
                <input
                  required
                  type="text"
                  value={doctoralForm.supervisorName}
                  onChange={(e) => setDoctoralForm({ ...doctoralForm, supervisorName: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Dr. S. K. Ramesh"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold mb-1">Award Date</label>
                  <input
                    type="date"
                    value={doctoralForm.awardDate}
                    onChange={(e) => setDoctoralForm({ ...doctoralForm, awardDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Calendar Year</label>
                  <input
                    type="number"
                    value={doctoralForm.awardYear}
                    onChange={(e) => setDoctoralForm({ ...doctoralForm, awardYear: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddDoctoralOpen(false)}
                  className="px-3 py-2 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold"
                >
                  {submitting ? "Saving..." : "Save Doctoral Award"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      <CsvImportModal
        isOpen={csvModalOpen}
        onClose={() => setCsvModalOpen(false)}
        moduleName={csvTargetModule}
        moduleTitle={
          csvTargetModule === "placements"
            ? "Placement Offers"
            : csvTargetModule === "graduation-outcomes"
            ? "Graduating Cohorts"
            : "Doctoral Degree Awards"
        }
        onImportSuccess={() => {
          setCsvModalOpen(false);
          loadData();
        }}
      />
    </div>
  );
}
