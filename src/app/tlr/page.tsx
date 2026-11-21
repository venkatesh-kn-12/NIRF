"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  BookOpen,
  GraduationCap,
  Users,
  Coins,
  ShieldCheck,
  Calculator,
  AlertCircle,
  CheckCircle2,
  Clock,
  Plus,
  RefreshCw,
  FileText,
  ChevronRight,
  Loader2,
  ExternalLink,
  Info,
  Building,
  Check,
  X,
  Trash2,
  Edit,
  TrendingUp,
} from "lucide-react";

type TLRTab =
  | "readiness"
  | "intake_strength"
  | "faculty_eligibility"
  | "financial_resources"
  | "evidence_review"
  | "results";

export default function TLRWorkspacePage() {
  const [activeTab, setActiveTab] = useState<TLRTab>("readiness");
  const [academicYear, setAcademicYear] = useState("2024-25");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Data states
  const [intakes, setIntakes] = useState<any[]>([]);
  const [doctoralStmt, setDoctoralStmt] = useState<any | null>(null);
  const [facultyFacts, setFacultyFacts] = useState<any[]>([]);
  const [registeredFaculty, setRegisteredFaculty] = useState<any[]>([]);
  const [financeRecords, setFinanceRecords] = useState<any[]>([]);
  const [calculationResults, setCalculationResults] = useState<any | null>(null);
  const [calcLoading, setCalcLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Modals
  const [showIntakeModal, setShowIntakeModal] = useState(false);
  const [showDoctoralModal, setShowDoctoralModal] = useState(false);
  const [showFactModal, setShowFactModal] = useState(false);
  const [showFinanceModal, setShowFinanceModal] = useState(false);

  // Form states
  const [intakeForm, setIntakeForm] = useState({
    programme: "MCA",
    cohortYear: "2024-2026",
    intakeYear: 2024,
    approvedIntake: 120,
    approvalAuthority: "AICTE",
    approvalOrderNumber: "",
    effectiveAcademicYear: "2024-25",
  });

  const [doctoralForm, setDoctoralForm] = useState({
    programme: "MCA",
    enrolledDoctoralCount: 0,
    isExplicitZero: true,
    zeroDeclarationReason:
      "MCA research centre active under VTU; zero primary doctoral scholars enrolled as of reporting reference date.",
    certifiedByHOD: true,
    certificationReference: "VTU/MCA/RES-2024/01",
  });

  const [factForm, setFactForm] = useState({
    facultyId: "",
    highestQualification: "M.Tech",
    phdStatus: "NOT_APPLICABLE",
    employmentType: "PERMANENT",
    isFullTime: true,
    taughtBothSemesters: true,
    isQualificationEligible: true,
    qualificationEquivalenceNotes: "MCA/M.Tech. in Computer Science per AICTE/VTU norms.",
    experienceYearsAsOfReferenceDate: 5,
    experienceBracket: "UP_TO_8",
    isEligibleForFSR: true,
    eligibilityRationale:
      "Full-time regular faculty with approved postgraduate qualification who taught in both semesters.",
  });

  const [financeForm, setFinanceForm] = useState({
    financialYear: "2023-24",
    expenditureHead: "Library Resources & Software Licenses",
    expenditureType: "CAPITAL",
    amount: "1500000",
    unit: "INR",
    purpose: "Procurement of specialized computing software and ACM/IEEE digital library subscriptions",
    isExcluded: false,
    exclusionType: "NONE",
    exclusionReason: "",
    reportingScope: "DEPARTMENT",
    matchingStudentDenominator: 120,
  });

  // Load Current User
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) setCurrentUser(data.user);
      })
      .catch((err) => console.error("Failed to load user:", err));
  }, []);

  // Load all TLR data
  const loadTLRData = useCallback(async () => {
    setLoading(true);
    setActionError(null);
    try {
      const [intakeRes, docRes, factsRes, facRes, finRes, calcRes] = await Promise.all([
        fetch(`/api/intake?academicYear=${academicYear}`),
        fetch(`/api/doctoral?academicYear=${academicYear}`),
        fetch(`/api/faculty-reporting-facts?academicYear=${academicYear}`),
        fetch(`/api/faculty?limit=100`),
        fetch(`/api/finance?academicYear=${academicYear}`),
        fetch(`/api/metrics/results?academicYear=${academicYear}`),
      ]);

      if (intakeRes.ok) {
        const d = await intakeRes.json();
        setIntakes(d.data || []);
      }
      if (docRes.ok) {
        const d = await docRes.json();
        setDoctoralStmt(d.data && d.data.length > 0 ? d.data[0] : null);
      }
      if (factsRes.ok) {
        const d = await factsRes.json();
        setFacultyFacts(d.data || []);
      }
      if (facRes.ok) {
        const d = await facRes.json();
        setRegisteredFaculty(d.data || []);
      }
      if (finRes.ok) {
        const d = await finRes.json();
        setFinanceRecords(d.data || []);
      }
      if (calcRes.ok) {
        const d = await calcRes.json();
        setCalculationResults(d);
      }
    } catch (err: any) {
      console.error("TLR data fetch error:", err);
      setActionError("Failed to load TLR records. Please refresh.");
    } finally {
      setLoading(false);
    }
  }, [academicYear]);

  useEffect(() => {
    loadTLRData();
  }, [loadTLRData]);

  // Handle Intake Submit
  const handleSaveIntake = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    try {
      const res = await fetch("/api/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(intakeForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save sanctioned intake");
      setActionSuccess("Sanctioned intake record created successfully!");
      setShowIntakeModal(false);
      loadTLRData();
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  // Handle Doctoral Submit
  const handleSaveDoctoral = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    try {
      const res = await fetch("/api/doctoral", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...doctoralForm,
          academicYear,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save doctoral enrolment statement");
      setActionSuccess("Doctoral enrolment statement updated successfully!");
      setShowDoctoralModal(false);
      loadTLRData();
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  // Handle Faculty Reporting Fact Submit
  const handleSaveFact = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    try {
      const selectedFac = registeredFaculty.find((f) => f.facultyId === factForm.facultyId);
      if (!selectedFac) throw new Error("Please select a registered faculty member");

      const res = await fetch("/api/faculty-reporting-facts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...factForm,
          faculty: selectedFac._id,
          name: selectedFac.name,
          email: selectedFac.email,
          designation: selectedFac.designation || "Assistant Professor",
          academicYear,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save faculty reporting fact");
      setActionSuccess("Faculty reporting fact saved successfully!");
      setShowFactModal(false);
      loadTLRData();
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  // Handle Finance Submit
  const handleSaveFinance = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    try {
      const numAmt = parseFloat(financeForm.amount);
      if (isNaN(numAmt) || numAmt <= 0) throw new Error("Please enter a valid amount");

      let amountInINR = numAmt;
      if (financeForm.unit === "LAKHS") amountInINR = numAmt * 100000;
      else if (financeForm.unit === "CRORES") amountInINR = numAmt * 10000000;

      const res = await fetch("/api/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          financialYear: financeForm.financialYear,
          expenditureHead: financeForm.expenditureHead,
          expenditureType: financeForm.expenditureType,
          amount: numAmt,
          currency: "INR",
          unit: financeForm.unit,
          amountInINR,
          purpose: financeForm.purpose,
          isExcluded: financeForm.isExcluded,
          exclusionType: financeForm.exclusionType,
          exclusionReason: financeForm.exclusionReason,
          reportingScope: financeForm.reportingScope,
          matchingStudentDenominator: financeForm.matchingStudentDenominator,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save expenditure record");
      setActionSuccess("Financial expenditure record created successfully!");
      setShowFinanceModal(false);
      loadTLRData();
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  // Handle Record Verification (Approve / Reject)
  const handleVerifyRecord = async (
    endpoint: string,
    id: string,
    decision: "APPROVE" | "REJECT" | "REQUEST_CORRECTION"
  ) => {
    setActionError(null);
    try {
      const res = await fetch(`${endpoint}/${id}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision,
          comment: `Verification review: ${decision} by ${currentUser?.name || "Reviewer"}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Review operation failed");
      setActionSuccess(`Record ${decision.toLowerCase()}d successfully`);
      loadTLRData();
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  // Trigger Calculation
  const handleRunCalculation = async () => {
    setCalcLoading(true);
    setActionError(null);
    try {
      const res = await fetch("/api/metrics/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ academicYear }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Calculation failed");
      setActionSuccess("NIRF Engineering 2025 metric computation completed deterministically!");
      loadTLRData();
      setActiveTab("results");
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setCalcLoading(false);
    }
  };

  const isAdmin = currentUser?.role === "DEPARTMENT_ADMIN";
  const isContributor = currentUser?.role === "FACULTY_CONTRIBUTOR" || isAdmin;
  const canCalculate = isAdmin || currentUser?.role === "FACULTY_CONTRIBUTOR";

  // Compute readiness stats (both RECORDED and APPROVED records are computable)
  const approvedIntakes = intakes.filter((i) => i.status === "APPROVED" || i.status === "RECORDED");
  const approvedFacts = facultyFacts.filter((f) => f.status === "APPROVED" || f.status === "RECORDED");
  const eligibleFaculty = approvedFacts.filter((f) => f.isEligibleForFSR);
  const approvedFinance = financeRecords.filter((f) => f.status === "APPROVED" || f.status === "RECORDED");
  const distinctFinanceYears = Array.from(new Set(approvedFinance.map((f) => f.financialYear)));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-indigo-100 text-indigo-700">
              <BookOpen size={22} />
            </span>
            <h1 className="text-2xl font-bold text-slate-900">Teaching, Learning & Resources (TLR) Workspace</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            NIRF Engineering 2025 Methodology · 100 Marks Total · MCA Departmental Scope
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            className="text-sm font-medium border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="2024-25">Academic Year 2024-25</option>
            <option value="2023-24">Academic Year 2023-24</option>
            <option value="2022-23">Academic Year 2022-23</option>
          </select>

          <button
            onClick={loadTLRData}
            disabled={loading}
            className="p-2 text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>

          {canCalculate && (
            <button
              onClick={handleRunCalculation}
              disabled={calcLoading}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors disabled:opacity-50"
            >
              {calcLoading ? <Loader2 size={16} className="animate-spin" /> : <Calculator size={16} />}
              Compute TLR Metrics
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {actionError && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm flex items-start gap-3">
          <AlertCircle className="flex-shrink-0 mt-0.5" size={18} />
          <div className="flex-1">
            <p className="font-semibold">Action Blocker</p>
            <p className="text-xs text-red-700 mt-0.5">{actionError}</p>
          </div>
          <button onClick={() => setActionError(null)} className="text-red-400 hover:text-red-600">
            <X size={16} />
          </button>
        </div>
      )}

      {actionSuccess && (
        <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="flex-shrink-0 text-emerald-600" size={18} />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-400 hover:text-emerald-600">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-2 sm:space-x-4 overflow-x-auto pb-px">
          {[
            { id: "readiness", label: "1. Overview & Readiness", icon: ShieldCheck },
            { id: "intake_strength", label: "2. Intake & Student Strength (SS)", icon: GraduationCap },
            { id: "faculty_eligibility", label: "3. Faculty Facts & Ratio (FSR/FQE)", icon: Users },
            { id: "financial_resources", label: "4. Financial Resources (FRU)", icon: Coins },
            { id: "evidence_review", label: "5. Supporting Evidence", icon: FileText },
            { id: "results", label: "6. Calculation Results & Trace", icon: Calculator },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TLRTab)}
                className={`flex items-center gap-2 py-3 px-3 border-b-2 text-sm font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* TAB 1: READINESS DASHBOARD */}
      {activeTab === "readiness" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* SS Card */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Student Strength (SS)</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700">Max: 20</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {approvedIntakes.length > 0 ? approvedIntakes.reduce((a, b) => a + b.approvedIntake, 0) : "120 (Config)"}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">Approved Sanctioned Capacity (NT)</p>
              </div>
              <div className="pt-2 border-t border-slate-100 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Intake Records:</span>
                  <span className="font-semibold text-slate-800">{approvedIntakes.length} approved</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Doctoral Statement:</span>
                  <span className="font-semibold text-slate-800">
                    {doctoralStmt ? (doctoralStmt.isExplicitZero ? "Explicit Zero ✓" : `${doctoralStmt.enrolledDoctoralCount} Enrolled`) : "Not Declared"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Score Status:</span>
                  <span className="font-semibold text-amber-600">NOT_COMPUTABLE (Norm.)</span>
                </div>
              </div>
            </div>

            {/* FSR Card */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Faculty-Student (FSR)</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-purple-50 text-purple-700">Max: 30</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {eligibleFaculty.length > 0 ? `${eligibleFaculty.length} Eligible` : "0 Eligible"}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">Full-time Regular Faculty (F)</p>
              </div>
              <div className="pt-2 border-t border-slate-100 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Approved Facts:</span>
                  <span className="font-semibold text-slate-800">{approvedFacts.length} evaluated</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Regulatory Check:</span>
                  <span className="font-semibold text-emerald-600">&gt; 1:50 Cutoff Active</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Score Status:</span>
                  <span className="font-semibold text-emerald-600">COMPUTED (Deterministic)</span>
                </div>
              </div>
            </div>

            {/* FQE Card */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Qualification (FQE)</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">Max: 20</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {approvedFacts.filter((f) => f.phdStatus === "AWARDED").length} PhDs
                </p>
                <p className="text-xs text-slate-500 mt-0.5">Faculty with Awarded Ph.D.</p>
              </div>
              <div className="pt-2 border-t border-slate-100 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Experience Baseline:</span>
                  <span className="font-semibold text-slate-800">3 Brackets Evaluated</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Formula Breakdown:</span>
                  <span className="font-semibold text-slate-800">FQ (10) + FE (10)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Score Status:</span>
                  <span className="font-semibold text-emerald-600">COMPUTED (Deterministic)</span>
                </div>
              </div>
            </div>

            {/* FRU Card */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Financial Util. (FRU)</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-700">Max: 30</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {distinctFinanceYears.length} / 3 Years
                </p>
                <p className="text-xs text-slate-500 mt-0.5">Audited Years Coverage</p>
              </div>
              <div className="pt-2 border-t border-slate-100 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Approved Entries:</span>
                  <span className="font-semibold text-slate-800">{approvedFinance.length} records</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">NIRF Exclusions:</span>
                  <span className="font-semibold text-slate-800">Applied (Hostel/Civil)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Score Status:</span>
                  <span className="font-semibold text-amber-600">NOT_COMPUTABLE (Norm.)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Compliance & Methodology Notice */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
              <Info size={16} className="text-indigo-600" />
              NIRF Engineering 2025 Deterministic Compliance Mandate
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              In accordance with official NIRF Engineering 2025 guidelines, <strong>SS</strong> (Student Strength) and{" "}
              <strong>FRU</strong> (Financial Resources Utilisation) depend on institutional normalization percentile
              functions whose numerical parameters are not published. MCA NIRF Assist guarantees mathematical honesty by
              preserving verified raw denominators and indicators without inventing uncalibrated proxies.
            </p>
          </div>
        </div>
      )}

      {/* TAB 2: INTAKE & STUDENT STRENGTH */}
      {activeTab === "intake_strength" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Sanctioned Intake & Doctoral Enrolment Statements</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Cohort-wise approved intake orders and explicit zero/doctoral scholar declarations.
              </p>
            </div>
            {isContributor && (
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDoctoralModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg"
                >
                  <Plus size={14} />
                  Doctoral Declaration (NP)
                </button>
                <button
                  onClick={() => setShowIntakeModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg"
                >
                  <Plus size={14} />
                  Add Sanctioned Intake (NT)
                </button>
              </div>
            )}
          </div>

          {/* Doctoral Status Card */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <GraduationCap size={18} className="text-indigo-600" />
                Doctoral Enrolment Statement (Academic Year: {academicYear})
              </span>
              {doctoralStmt && (
                <span
                  className={`text-xs px-2 py-0.5 rounded font-semibold ${
                    doctoralStmt.status === "APPROVED"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-amber-50 text-amber-700 border border-amber-200"
                  }`}
                >
                  {doctoralStmt.status}
                </span>
              )}
            </div>

            {doctoralStmt ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-2">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-slate-500 block">Enrolled Doctoral Count (NP)</span>
                  <span className="text-base font-bold text-slate-800">{doctoralStmt.enrolledDoctoralCount}</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-slate-500 block">Explicit Zero Declared</span>
                  <span className="text-base font-bold text-slate-800">{doctoralStmt.isExplicitZero ? "YES (Certified)" : "NO"}</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-slate-500 block">Certification Status</span>
                  <span className="text-base font-bold text-slate-800">
                    {doctoralStmt.certifiedByHOD ? "Certified by HOD ✓" : "Pending HOD"}
                  </span>
                </div>
                {doctoralStmt.zeroDeclarationReason && (
                  <div className="col-span-full text-slate-600 italic bg-amber-50/50 p-2 rounded border border-amber-100">
                    Reason: {doctoralStmt.zeroDeclarationReason}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6 text-slate-500 text-xs">
                No explicit doctoral statement recorded for {academicYear}. Click &quot;Doctoral Declaration&quot; above to declare.
              </div>
            )}
          </div>

          {/* Sanctioned Intake Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Cohort-Wise Sanctioned Capacity</span>
              <span className="text-xs text-slate-500">{intakes.length} records</span>
            </div>
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-xs">
                <tr>
                  <th className="py-2.5 px-4">Cohort Year</th>
                  <th className="py-2.5 px-4">Intake Year</th>
                  <th className="py-2.5 px-4">Authority</th>
                  <th className="py-2.5 px-4">EOA / Order #</th>
                  <th className="py-2.5 px-4 text-right">Sanctioned Seats</th>
                  <th className="py-2.5 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {intakes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                      No cohort-wise sanctioned intake orders added yet.
                    </td>
                  </tr>
                ) : (
                  intakes.map((item) => (
                    <tr key={item._id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 font-semibold text-slate-800">{item.cohortYear}</td>
                      <td className="py-2.5 px-4 text-slate-600">{item.intakeYear}</td>
                      <td className="py-2.5 px-4 text-slate-600">{item.approvalAuthority}</td>
                      <td className="py-2.5 px-4 font-mono text-xs text-slate-700">{item.approvalOrderNumber}</td>
                      <td className="py-2.5 px-4 text-right font-bold text-slate-900">{item.approvedIntake}</td>
                      <td className="py-2.5 px-4 text-center">
                        <span
                          className={`text-xs px-2 py-0.5 rounded font-semibold ${
                            item.status === "APPROVED" || item.status === "RECORDED"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: FACULTY ELIGIBILITY & EXPERIENCE */}
      {activeTab === "faculty_eligibility" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Faculty Reporting Facts (Academic Year: {academicYear})</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Evaluation of full-time status, both-semester participation, and experience brackets for NIRF FSR and FQE.
              </p>
            </div>
            {isContributor && (
              <button
                onClick={() => setShowFactModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg"
              >
                <Plus size={14} />
                Evaluate Faculty Member
              </button>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Historical Evaluation Records</span>
              <span className="text-xs text-slate-500">{facultyFacts.length} faculty evaluated</span>
            </div>
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-xs">
                <tr>
                  <th className="py-2.5 px-4">Faculty ID / Name</th>
                  <th className="py-2.5 px-4">Qualification</th>
                  <th className="py-2.5 px-4 text-center">PhD Status</th>
                  <th className="py-2.5 px-4 text-center">Taught Both Sem.</th>
                  <th className="py-2.5 px-4">Exp. Bracket</th>
                  <th className="py-2.5 px-4 text-center">FSR Eligible?</th>
                  <th className="py-2.5 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {facultyFacts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                      No faculty reporting facts evaluated for {academicYear}. Click &quot;Evaluate Faculty Member&quot; to begin.
                    </td>
                  </tr>
                ) : (
                  facultyFacts.map((fact) => (
                    <tr key={fact._id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4">
                        <span className="font-semibold text-slate-800 block">{fact.name}</span>
                        <span className="text-xs text-slate-400 font-mono">{fact.facultyId}</span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-700">{fact.highestQualification}</td>
                      <td className="py-2.5 px-4 text-center">
                        {fact.phdStatus === "AWARDED" ? (
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Ph.D. Awarded
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        {fact.taughtBothSemesters ? (
                          <span className="text-emerald-600 font-semibold text-xs">YES ✓</span>
                        ) : (
                          <span className="text-red-500 font-semibold text-xs">NO ✗</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="inline-block px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700 font-medium">
                          {fact.experienceBracket === "UP_TO_8"
                            ? "&le; 8 Yrs (F1)"
                            : fact.experienceBracket === "EIGHT_TO_15"
                            ? "8–15 Yrs (F2)"
                            : "&gt; 15 Yrs (F3)"}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        {fact.isEligibleForFSR ? (
                          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                            ELIGIBLE
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-600">
                            INELIGIBLE
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span
                          className={`text-xs px-2 py-0.5 rounded font-semibold ${
                            fact.status === "APPROVED" || fact.status === "RECORDED"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {fact.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: FINANCIAL RESOURCES (FRU) */}
      {activeTab === "financial_resources" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Financial Resources & Utilisation (FRU)</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                3-Year expenditure records with explicit unit conversions and mandatory NIRF exclusions.
              </p>
            </div>
            {isContributor && (
              <button
                onClick={() => setShowFinanceModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg"
              >
                <Plus size={14} />
                Add Expenditure Record
              </button>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Expenditure Ledger</span>
              <span className="text-xs text-slate-500">{financeRecords.length} records</span>
            </div>
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-xs">
                <tr>
                  <th className="py-2.5 px-4">Financial Year</th>
                  <th className="py-2.5 px-4">Type</th>
                  <th className="py-2.5 px-4">Head & Purpose</th>
                  <th className="py-2.5 px-4 text-right">Amount (INR)</th>
                  <th className="py-2.5 px-4 text-center">Exclusion Status</th>
                  <th className="py-2.5 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {financeRecords.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                      No expenditure records found. Click &quot;Add Expenditure Record&quot; to begin.
                    </td>
                  </tr>
                ) : (
                  financeRecords.map((item) => (
                    <tr key={item._id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 font-semibold text-slate-800">{item.financialYear}</td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`text-xs px-2 py-0.5 rounded font-semibold ${
                            item.expenditureType === "CAPITAL"
                              ? "bg-purple-50 text-purple-700 border border-purple-200"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}
                        >
                          {item.expenditureType}
                        </span>
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="font-medium text-slate-800 block">{item.expenditureHead}</span>
                        <span className="text-xs text-slate-500 truncate max-w-xs block">{item.purpose}</span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold text-slate-900">
                        ₹ {(item.amountInINR || item.amount).toLocaleString("en-IN")}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        {item.isExcluded ? (
                          <span className="px-2 py-0.5 rounded text-xs bg-red-50 text-red-700 font-semibold border border-red-200">
                            EXCLUDED ({item.exclusionType})
                          </span>
                        ) : (
                          <span className="text-xs text-emerald-600 font-semibold">Included ✓</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span
                          className={`text-xs px-2 py-0.5 rounded font-semibold ${
                            item.status === "APPROVED" || item.status === "RECORDED"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: DIRECT DATA ENTRY & EVIDENCE */}
      {activeTab === "evidence_review" && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck size={18} className="text-indigo-600" />
              Direct Simulation Mode — No Approval Gate
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              MCA NIRF Assist operates in Department Score Simulator mode. Faculty and Admin records are saved directly
              as active (<strong>RECORDED</strong>) and are available to the simulation engine immediately after field
              validation. No reviewer gate or verification queue is required. Supporting evidence documents can be optionally
              attached for record-keeping and audit purposes.
            </p>
            <div className="flex gap-3 pt-2">
              <Link
                href="/uploads"
                className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg"
              >
                Upload &amp; Extract Data <ExternalLink size={12} />
              </Link>
              <Link
                href="/metrics"
                className="flex items-center gap-1 px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg"
              >
                View Full Department Simulator <ExternalLink size={12} />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: CALCULATION RESULTS */}
      {activeTab === "results" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Deterministic Metric Calculation Snapshots</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                NIRF Engineering 2025 calculation traces with departmental simulation rules.
              </p>
            </div>
            {canCalculate && (
              <button
                onClick={handleRunCalculation}
                disabled={calcLoading}
                className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold"
              >
                {calcLoading ? <Loader2 size={14} className="animate-spin" /> : <Calculator size={14} />}
                Re-Calculate
              </button>
            )}
          </div>

          {/* Results List */}
          <div className="grid grid-cols-1 gap-4">
            {calculationResults?.data?.filter((r: any) => r.parameter === "TLR").map((item: any) => (
              <div key={item._id} className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">
                      {item.metricCode} — {item.name}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-semibold ${
                        item.status === "COMPUTED"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : item.status === "NOT_COMPUTABLE"
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-slate-500">
                    Max Marks: {item.result?.maxMarks || 20}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 font-mono text-xs text-slate-800 space-y-1">
                  <p className="font-semibold text-slate-900">Formula: {item.result?.trace?.formula}</p>
                  {item.result?.trace?.steps?.map((s: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-slate-600 border-b border-slate-200/50 py-0.5">
                      <span>• {s.step}: {s.expression}</span>
                      <span className="font-bold text-slate-900">{String(s.value)}</span>
                    </div>
                  ))}
                  {item.result?.trace?.notes && (
                    <p className="text-amber-800 pt-1 font-sans text-[11px]">{item.result.trace.notes}</p>
                  )}
                </div>

                <div className="flex justify-between items-center text-xs text-slate-500 pt-1">
                  <span>Calculated At: {new Date(item.calculatedAt).toLocaleString()}</span>
                  <span className="font-mono text-slate-400">Run ID: {item.auditReference}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: ADD SANCTIONED INTAKE */}
      {showIntakeModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">Add Approved Sanctioned Intake</h3>
              <button onClick={() => setShowIntakeModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveIntake} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Cohort Period</label>
                <input
                  type="text"
                  value={intakeForm.cohortYear}
                  onChange={(e) => setIntakeForm({ ...intakeForm, cohortYear: e.target.value })}
                  placeholder="e.g. 2024-2026"
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Intake Year</label>
                  <input
                    type="number"
                    value={intakeForm.intakeYear}
                    onChange={(e) => setIntakeForm({ ...intakeForm, intakeYear: parseInt(e.target.value, 10) })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Approved Seats</label>
                  <input
                    type="number"
                    value={intakeForm.approvedIntake}
                    onChange={(e) => setIntakeForm({ ...intakeForm, approvedIntake: parseInt(e.target.value, 10) })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Approval Authority</label>
                <select
                  value={intakeForm.approvalAuthority}
                  onChange={(e) => setIntakeForm({ ...intakeForm, approvalAuthority: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white"
                >
                  <option value="AICTE">AICTE</option>
                  <option value="VTU">VTU</option>
                  <option value="STATE_GOVT">State Government</option>
                  <option value="UNIVERSITY">University</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">AICTE EOA / Approval Order #</label>
                <input
                  type="text"
                  value={intakeForm.approvalOrderNumber}
                  onChange={(e) => setIntakeForm({ ...intakeForm, approvalOrderNumber: e.target.value })}
                  placeholder="e.g. F.No. South-West/1-436578129/2024/EOA"
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowIntakeModal(false)}
                  className="px-3 py-1.5 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold"
                >
                  Save Sanctioned Intake
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DOCTORAL ENROLMENT */}
      {showDoctoralModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">Doctoral Enrolment Statement (NP)</h3>
              <button onClick={() => setShowDoctoralModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveDoctoral} className="space-y-3 text-sm">
              <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-100 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={doctoralForm.isExplicitZero}
                    onChange={(e) =>
                      setDoctoralForm({
                        ...doctoralForm,
                        isExplicitZero: e.target.checked,
                        enrolledDoctoralCount: e.target.checked ? 0 : doctoralForm.enrolledDoctoralCount,
                      })
                    }
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-bold text-indigo-900">
                    Declare Explicit Zero (0 Doctoral Scholars)
                  </span>
                </label>
                <p className="text-[11px] text-indigo-700">
                  NIRF Rule: Missing data ≠ Zero. An evidence-backed explicit zero declaration prevents ambiguity.
                </p>
              </div>

              {!doctoralForm.isExplicitZero && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Enrolled Doctoral Count</label>
                  <input
                    type="number"
                    value={doctoralForm.enrolledDoctoralCount}
                    onChange={(e) =>
                      setDoctoralForm({ ...doctoralForm, enrolledDoctoralCount: parseInt(e.target.value, 10) })
                    }
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                    min={0}
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Zero Declaration Reason / Notes</label>
                <textarea
                  value={doctoralForm.zeroDeclarationReason}
                  onChange={(e) => setDoctoralForm({ ...doctoralForm, zeroDeclarationReason: e.target.value })}
                  rows={2}
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">HOD Certification Reference</label>
                <input
                  type="text"
                  value={doctoralForm.certificationReference}
                  onChange={(e) => setDoctoralForm({ ...doctoralForm, certificationReference: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDoctoralModal(false)}
                  className="px-3 py-1.5 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold"
                >
                  Save Doctoral Statement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EVALUATE FACULTY FACT */}
      {showFactModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">Evaluate Faculty for Reporting Year {academicYear}</h3>
              <button onClick={() => setShowFactModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveFact} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Registered Faculty *</label>
                <select
                  value={factForm.facultyId}
                  onChange={(e) => {
                    const fac = registeredFaculty.find((f) => f.facultyId === e.target.value);
                    setFactForm({
                      ...factForm,
                      facultyId: e.target.value,
                      highestQualification: fac?.highestQualification || "M.Tech",
                      phdStatus: fac?.phdStatus || "NOT_APPLICABLE",
                      experienceYearsAsOfReferenceDate: fac?.experienceYears || 5,
                      experienceBracket: (fac?.experienceYears || 5) <= 8 ? "UP_TO_8" : (fac?.experienceYears || 5) <= 15 ? "EIGHT_TO_15" : "ABOVE_15",
                    });
                  }}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white"
                  required
                >
                  <option value="">-- Choose faculty member --</option>
                  {registeredFaculty.map((f) => (
                    <option key={f.facultyId} value={f.facultyId}>
                      {f.name} ({f.facultyId}) — {f.designation}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Highest Qualification</label>
                  <input
                    type="text"
                    value={factForm.highestQualification}
                    onChange={(e) => setFactForm({ ...factForm, highestQualification: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Ph.D. Status</label>
                  <select
                    value={factForm.phdStatus}
                    onChange={(e) => setFactForm({ ...factForm, phdStatus: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white"
                  >
                    <option value="NOT_APPLICABLE">Not Applicable</option>
                    <option value="PURSUING">Pursuing</option>
                    <option value="AWARDED">Awarded</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Experience Years</label>
                  <input
                    type="number"
                    value={factForm.experienceYearsAsOfReferenceDate}
                    onChange={(e) => {
                      const exp = parseInt(e.target.value, 10);
                      setFactForm({
                        ...factForm,
                        experienceYearsAsOfReferenceDate: exp,
                        experienceBracket: exp <= 8 ? "UP_TO_8" : exp <= 15 ? "EIGHT_TO_15" : "ABOVE_15",
                      });
                    }}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                    min={0}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Experience Bracket</label>
                  <select
                    value={factForm.experienceBracket}
                    onChange={(e) => setFactForm({ ...factForm, experienceBracket: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white"
                  >
                    <option value="UP_TO_8">F1: &le; 8 Years</option>
                    <option value="EIGHT_TO_15">F2: 8–15 Years</option>
                    <option value="ABOVE_15">F3: &gt; 15 Years</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={factForm.taughtBothSemesters}
                    onChange={(e) => setFactForm({ ...factForm, taughtBothSemesters: e.target.checked })}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-medium text-slate-800">
                    Taught in both semesters of the reporting year (NIRF Mandatory Rule)
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={factForm.isEligibleForFSR}
                    onChange={(e) => setFactForm({ ...factForm, isEligibleForFSR: e.target.checked })}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-bold text-indigo-900">
                    Count as Eligible Regular Faculty in FSR Numerator
                  </span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowFactModal(false)}
                  className="px-3 py-1.5 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold"
                >
                  Save Evaluation Fact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD FINANCIAL EXPENDITURE */}
      {showFinanceModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">Add Financial Expenditure Record</h3>
              <button onClick={() => setShowFinanceModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveFinance} className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Financial Year *</label>
                  <select
                    value={financeForm.financialYear}
                    onChange={(e) => setFinanceForm({ ...financeForm, financialYear: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white"
                  >
                    <option value="2023-24">2023-24 (Previous Year 1)</option>
                    <option value="2022-23">2022-23 (Previous Year 2)</option>
                    <option value="2021-22">2021-22 (Previous Year 3)</option>
                    <option value="2024-25">2024-25 (Latest)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Expenditure Type *</label>
                  <select
                    value={financeForm.expenditureType}
                    onChange={(e) => setFinanceForm({ ...financeForm, expenditureType: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white"
                  >
                    <option value="CAPITAL">Capital Expenditure (BC)</option>
                    <option value="OPERATIONAL">Operational / Recurring (BO)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Expenditure Head *</label>
                <input
                  type="text"
                  value={financeForm.expenditureHead}
                  onChange={(e) => setFinanceForm({ ...financeForm, expenditureHead: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Amount *</label>
                  <input
                    type="number"
                    value={financeForm.amount}
                    onChange={(e) => setFinanceForm({ ...financeForm, amount: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Unit</label>
                  <select
                    value={financeForm.unit}
                    onChange={(e) => setFinanceForm({ ...financeForm, unit: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white"
                  >
                    <option value="INR">Rupees (INR)</option>
                    <option value="LAKHS">Lakhs (× 1,00,000)</option>
                    <option value="CRORES">Crores (× 1,00,00,000)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Purpose Description *</label>
                <textarea
                  value={financeForm.purpose}
                  onChange={(e) => setFinanceForm({ ...financeForm, purpose: e.target.value })}
                  rows={2}
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs"
                  required
                />
              </div>

              {/* Exclusion Box */}
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={financeForm.isExcluded}
                    onChange={(e) => setFinanceForm({ ...financeForm, isExcluded: e.target.checked })}
                    className="rounded text-amber-600 focus:ring-amber-500"
                  />
                  <span className="text-xs font-bold text-amber-900">
                    Exclude from NIRF Academic Expenditure
                  </span>
                </label>
                {financeForm.isExcluded && (
                  <div className="space-y-2 pt-1">
                    <select
                      value={financeForm.exclusionType}
                      onChange={(e) => setFinanceForm({ ...financeForm, exclusionType: e.target.value })}
                      className="w-full border border-amber-300 rounded-lg p-1.5 text-xs bg-white"
                    >
                      <option value="BUILDING_CONSTRUCTION">Building Construction (Excluded from Capital)</option>
                      <option value="HOSTEL_MAINTENANCE">Hostel Maintenance (Excluded from Operational)</option>
                      <option value="OTHER">Other Non-Academic Exclusion</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Exclusion reason"
                      value={financeForm.exclusionReason}
                      onChange={(e) => setFinanceForm({ ...financeForm, exclusionReason: e.target.value })}
                      className="w-full border border-amber-300 rounded-lg p-1.5 text-xs"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowFinanceModal(false)}
                  className="px-3 py-1.5 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold"
                >
                  Save Expenditure Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
