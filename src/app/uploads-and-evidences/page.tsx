"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Edit2,
  Check,
  X,
  Plus,
  Loader2,
  Download,
  Hash,
  Info,
  ChevronRight,
  ArrowLeft,
  FileCheck,
  Eye,
} from "lucide-react";

interface ExtractedField {
  _id?: string;
  fieldName: string;
  extractedValue: any;
  confidence: number;
  sourceReference: string;
  reasoningSummary: string;
  reviewStatus: "PENDING" | "ACCEPTED" | "REJECTED" | "CORRECTED";
  correctedValue?: any;
}

interface ExtractionJob {
  _id: string;
  evidenceId: any;
  relatedRecordType: string;
  targetRecordId?: string;
  status: "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED" | "NEEDS_REVIEW";
  extractedFields: ExtractedField[];
  confidenceScores: Record<string, number>;
  sourceReferences: string[];
  errors: string[];
  academicYear: string;
  department: string;
  createdAt: string;
}

interface EvidenceDoc {
  _id: string;
  originalFileName: string;
  storedFileName: string;
  mimeType: string;
  fileSize: number;
  checksum: string;
  relatedRecordType: string;
  createdAt: string;
}

const DOCUMENT_TAXONOMY = [
  { type: "Faculty", label: "Faculty List & Service Registers (TLR 1.2)", schema: "FSR / FQE / Designations" },
  { type: "Student", label: "Student Intake & Enrolment Register (SS / TLR)", schema: "Intake / PRN / Domicile / Demographics" },
  { type: "FinanceRecord", label: "Financial Audited Balance Statements (FRU)", schema: "Capital & Operational Expenditures" },
  { type: "Publication", label: "Scopus / WoS Publication Extracts (RP 2.1)", schema: "Citations / DOI / Journal Indexing" },
  { type: "Patent", label: "Patent Filings & Grants (IPR / RP 2.2)", schema: "Filing / Publication / Grant Dates" },
  { type: "ProjectConsultancy", label: "Sponsored Research & Consultancy (FPPP)", schema: "Sanctioned / Received Grants" },
  { type: "GraduationOutcome", label: "Graduation Outcomes (GPH / GUE)", schema: "Stipulated Completion / Pass Rate" },
  { type: "PlacementRecord", label: "Placement & Higher Studies Records (GPHE)", schema: "CTC / Employers / Higher Studies" },
  { type: "OutreachRecord", label: "Regional & Gender Diversity Outreach (OI)", schema: "State Diversity / Economically Backward" },
  { type: "PerceptionRecord", label: "Perception Score Records (PR)", schema: "Academic Peer & Employer Survey Scores" },
];

export default function UploadsAndEvidencesPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // Ingestion form state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedRecordType, setSelectedRecordType] = useState<string>("Faculty");
  const [academicYear, setAcademicYear] = useState<string>("2024-25");
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Active Job State
  const [activeJob, setActiveJob] = useState<ExtractionJob | null>(null);
  const [aiConfigured, setAiConfigured] = useState<boolean>(false);
  const [aiProvider, setAiProvider] = useState<string | null>(null);

  // Manual Editing Field Modal / Drawer
  const [editingFieldIndex, setEditingFieldIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [updatingField, setUpdatingField] = useState<boolean>(false);

  // Commit / Draft creation state
  const [committing, setCommitting] = useState<boolean>(false);
  const [commitSuccess, setCommitSuccess] = useState<string | null>(null);
  const [commitError, setCommitError] = useState<string | null>(null);

  // Evidences History
  const [evidencesList, setEvidencesList] = useState<EvidenceDoc[]>([]);
  const [loadingEvidences, setLoadingEvidences] = useState<boolean>(false);

  // Load current user
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data || !data.user) {
          router.push("/login");
        } else {
          setCurrentUser(data.user);
        }
      })
      .catch(() => router.push("/login"))
      .finally(() => setLoadingUser(false));
  }, [router]);

  // Load AI config & previous extraction jobs
  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch("/api/extraction-jobs");
      if (res.ok) {
        const data = await res.json();
        setAiConfigured(data.aiConfigured);
        setAiProvider(data.aiProvider);
        if (data.jobs && data.jobs.length > 0 && !activeJob) {
          setActiveJob(data.jobs[0]);
        }
      }
    } catch (err) {
      console.error("Failed to fetch extraction jobs:", err);
    }
  }, [activeJob]);

  // Load recent evidences list
  const fetchEvidences = useCallback(async () => {
    setLoadingEvidences(true);
    try {
      const res = await fetch("/api/evidences?limit=10");
      if (res.ok) {
        const data = await res.json();
        setEvidencesList(data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch evidences:", err);
    } finally {
      setLoadingEvidences(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchJobs();
      fetchEvidences();
    }
  }, [currentUser, fetchJobs, fetchEvidences]);

  // Handle file select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setSelectedFile(f);
      setUploadError(null);
      setCommitSuccess(null);
    }
  };

  // Upload file & trigger extraction job
  const handleUploadAndExtract = async () => {
    if (!selectedFile) {
      setUploadError("Please select a valid document to upload.");
      return;
    }

    setUploading(true);
    setUploadError(null);
    setCommitSuccess(null);
    setCommitError(null);

    try {
      // 1. Upload evidence file
      const fd = new FormData();
      fd.append("file", selectedFile);
      fd.append("relatedRecordType", selectedRecordType);
      fd.append("academicYear", academicYear);

      const uploadRes = await fetch("/api/evidences", {
        method: "POST",
        body: fd,
      });

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) {
        throw new Error(uploadData.error || "File upload failed");
      }

      const evidence = uploadData.evidence;

      // 2. Trigger Extraction Job
      const jobRes = await fetch("/api/extraction-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          evidenceId: evidence._id,
          relatedRecordType: selectedRecordType,
        }),
      });

      const jobData = await jobRes.json();
      if (!jobRes.ok) {
        throw new Error(jobData.error || "Failed to trigger extraction");
      }

      setActiveJob(jobData.job);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      fetchEvidences();
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Upload processing failed");
    } finally {
      setUploading(false);
    }
  };

  // Field Review: Accept, Reject, or Correct
  const handleReviewField = async (
    fieldIndex: number,
    decision: "ACCEPTED" | "REJECTED" | "CORRECTED",
    correctedVal?: any
  ) => {
    if (!activeJob) return;
    setUpdatingField(true);

    try {
      const res = await fetch(`/api/extraction-jobs/${activeJob._id}/review-field`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fieldIndexOrName: fieldIndex,
          decision,
          correctedValue: correctedVal,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update field status");
      }

      setActiveJob(data.job);
      setEditingFieldIndex(null);
      setEditValue("");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error updating field");
    } finally {
      setUpdatingField(false);
    }
  };

  // Accept all high confidence fields (>=80%)
  const handleAcceptHighConfidence = async () => {
    if (!activeJob) return;
    for (let i = 0; i < activeJob.extractedFields.length; i++) {
      const f = activeJob.extractedFields[i];
      if (f.confidence >= 80 && f.reviewStatus === "PENDING") {
        await handleReviewField(i, "ACCEPTED");
      }
    }
  };

  // Commit verified fields to create a DRAFT record
  const handleCommitDraft = async () => {
    if (!activeJob) return;
    setCommitting(true);
    setCommitError(null);
    setCommitSuccess(null);

    try {
      const res = await fetch(`/api/extraction-jobs/${activeJob._id}/commit`, {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to commit record");
      }

      setCommitSuccess(data.message || "Draft record created successfully!");
      setActiveJob(data.job);
    } catch (err: unknown) {
      setCommitError(err instanceof Error ? err.message : "Failed to create draft record");
    } finally {
      setCommitting(false);
    }
  };

  if (loadingUser || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 text-[#1D4ED8] animate-spin" />
      </div>
    );
  }

  const selectedTaxonomy = DOCUMENT_TAXONOMY.find((t) => t.type === selectedRecordType);

  // Field stats
  const totalFields = activeJob?.extractedFields.length || 0;
  const verifiedCount =
    activeJob?.extractedFields.filter((f) => f.reviewStatus === "ACCEPTED" || f.reviewStatus === "CORRECTED")
      .length || 0;
  const needsAttentionCount =
    activeJob?.extractedFields.filter((f) => f.confidence < 80 && f.reviewStatus === "PENDING").length || 0;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 px-6 sm:px-8 py-4 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/dashboard")}
              className="flex items-center gap-1 text-slate-500 hover:text-slate-800 text-xs font-semibold transition"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Dashboard</span>
            </button>
            <span className="text-slate-300">/</span>
            <div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span>Upload &amp; Extract Data</span>
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-[#1D4ED8] border border-blue-200">
                  AI Evidence Ingestion
                </span>
              </h1>
              <p className="text-xs text-slate-500">
                Department of Computer Applications (MCA) — Regulatory NIRF Pipeline
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* AI Engine Status Indicator */}
            {aiConfigured ? (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-medium">
                <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                <span>AI Pipeline Active ({aiProvider})</span>
              </span>
            ) : (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-medium">
                <Info className="h-3.5 w-3.5 text-amber-600" />
                <span>AI Key Not Set — Manual Entry Enabled</span>
              </span>
            )}

            <span className="text-xs text-slate-600 font-medium hidden md:inline">
              {currentUser.name}{" "}
              <span className="text-slate-400">({currentUser.role})</span>
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Banner if AI Key is not configured */}
        {!aiConfigured && (
          <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs flex items-start gap-3 shadow-sm">
            <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <div className="font-bold">AI Extraction Engine Status</div>
              <p className="text-amber-800 leading-relaxed">
                The LLM extraction API key (<code className="font-mono bg-amber-100 px-1 py-0.5 rounded">GEMINI_API_KEY</code> /{" "}
                <code className="font-mono bg-amber-100 px-1 py-0.5 rounded">LLM_API_KEY</code>) is currently not configured in the environment.
                Document storage, SHA-256 integrity verification, and manual field tagging are fully enabled.
                To enable autonomous multi-modal document parsing, add your API key to <code className="font-mono bg-amber-100 px-1 py-0.5 rounded">.env.local</code>.
              </p>
            </div>
          </div>
        )}

        {/* Dual Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN: Document Ingestion (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-blue-50 text-[#1D4ED8] flex items-center justify-center">
                    <Upload className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Document Ingestion</h2>
                    <p className="text-[11px] text-slate-500">Secure storage &amp; format validation</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  Step 1
                </span>
              </div>

              {/* Drag & Drop Zone */}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  id="evidenceFileInput"
                  onChange={handleFileChange}
                  accept=".pdf,.docx,.xlsx,.csv,.png,.jpg,.jpeg"
                  className="hidden"
                />

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 hover:border-[#1D4ED8] rounded-xl p-6 text-center cursor-pointer bg-slate-50/50 hover:bg-blue-50/20 transition group"
                >
                  <div className="h-12 w-12 rounded-full bg-blue-50 text-[#1D4ED8] flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                    <Upload className="h-6 w-6" />
                  </div>
                  <p className="text-xs font-semibold text-slate-800">
                    Click to browse or drag departmental evidence document
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Allowed: PDF, DOCX, XLSX, CSV, PNG, JPG (Max 50 MB)
                  </p>

                  <div className="flex flex-wrap items-center justify-center gap-1.5 mt-3">
                    {["PDF", "DOCX", "XLSX", "CSV", "PNG", "JPG"].map((ext) => (
                      <span
                        key={ext}
                        className="px-2 py-0.5 rounded bg-white text-[10px] font-semibold text-slate-600 border border-slate-200 shadow-2xs"
                      >
                        {ext}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Staged File Indicator */}
                {selectedFile && (
                  <div className="mt-3 p-3 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText className="h-5 w-5 text-[#1D4ED8] shrink-0" />
                      <div className="truncate">
                        <div className="font-bold text-slate-900 truncate">{selectedFile.name}</div>
                        <div className="text-[11px] text-slate-500">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • Staged for Ingestion
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className="text-slate-400 hover:text-red-600 p-1"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Document Metadata Form */}
              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Document Taxonomy / Target Entity
                  </label>
                  <select
                    value={selectedRecordType}
                    onChange={(e) => setSelectedRecordType(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#1D4ED8] text-xs font-medium"
                  >
                    {DOCUMENT_TAXONOMY.map((item) => (
                      <option key={item.type} value={item.type}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold uppercase tracking-wider text-slate-700 mb-1">
                      Academic Year
                    </label>
                    <input
                      type="text"
                      value={academicYear}
                      onChange={(e) => setAcademicYear(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#1D4ED8] text-xs"
                      placeholder="2024-25"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold uppercase tracking-wider text-slate-700 mb-1">
                      Department Target
                    </label>
                    <div className="w-full px-3 py-2 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs">
                      MCA
                    </div>
                  </div>
                </div>

                {/* Target Metric Schema Pill */}
                {selectedTaxonomy && (
                  <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-100 flex items-start gap-2">
                    <ShieldCheck className="h-4 w-4 text-[#1D4ED8] shrink-0 mt-0.5" />
                    <div className="text-[11px] space-y-0.5">
                      <div className="font-bold text-slate-900">NIRF Target Schema</div>
                      <div className="text-slate-600 leading-snug">{selectedTaxonomy.schema}</div>
                    </div>
                  </div>
                )}
              </div>

              {uploadError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                  <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Upload & Extract Button */}
              <button
                onClick={handleUploadAndExtract}
                disabled={!selectedFile || uploading}
                className="w-full py-2.5 px-4 rounded-xl bg-[#1D4ED8] hover:bg-blue-800 text-white font-semibold text-xs shadow-md disabled:opacity-50 flex items-center justify-center gap-2 transition"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Processing &amp; Extracting...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Upload &amp; Extract Document</span>
                  </>
                )}
              </button>
            </div>

            {/* Protocol Notice */}
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm text-xs space-y-2">
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>Regulatory Security Protocol</span>
              </div>
              <ul className="text-slate-500 space-y-1 text-[11px] list-disc list-inside">
                <li>Uploaded files are isolated outside the public folder.</li>
                <li>Cryptographic SHA-256 checksums are calculated upon receipt.</li>
                <li>AI extractions never create approved records directly.</li>
                <li>All accepted values enter the system as <strong>DRAFT</strong> records.</li>
              </ul>
            </div>

            {/* Recent Evidences Library */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Recent Evidence Storage
                </h3>
                <button
                  onClick={fetchEvidences}
                  className="text-slate-400 hover:text-slate-600 p-1"
                  title="Refresh"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              </div>

              {loadingEvidences ? (
                <div className="py-4 text-center">
                  <Loader2 className="h-5 w-5 text-slate-400 animate-spin mx-auto" />
                </div>
              ) : evidencesList.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No evidence documents stored yet.</p>
              ) : (
                <div className="space-y-2 text-xs">
                  {evidencesList.slice(0, 5).map((ev) => (
                    <div
                      key={ev._id}
                      className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between"
                    >
                      <div className="truncate pr-2">
                        <div className="font-semibold text-slate-800 truncate">{ev.originalFileName}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          SHA: {ev.checksum.slice(0, 16)}...
                        </div>
                      </div>
                      <a
                        href={`/api/evidences/${ev._id}/download`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#1D4ED8] hover:underline flex items-center gap-1 text-[11px] font-semibold shrink-0"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Download</span>
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: AI Extraction Preview & Verification Studio (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
              {/* Studio Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                    <span>AI Extraction Preview &amp; Verification Studio</span>
                  </h2>
                  <p className="text-xs text-slate-500">
                    Review and confirm fields before creating canonical draft records
                  </p>
                </div>

                {activeJob && (
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold self-start sm:self-auto ${
                      activeJob.status === "COMPLETED"
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : activeJob.status === "NEEDS_REVIEW"
                        ? "bg-amber-50 text-amber-800 border border-amber-200"
                        : activeJob.status === "FAILED"
                        ? "bg-red-50 text-red-800 border border-red-200"
                        : "bg-blue-50 text-blue-800 border border-blue-200"
                    }`}
                  >
                    <Clock className="h-3.5 w-3.5" />
                    <span>Status: {activeJob.status.replace("_", " ")}</span>
                  </span>
                )}
              </div>

              {commitSuccess && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                  <div className="font-semibold">{commitSuccess}</div>
                </div>
              )}

              {commitError && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-center gap-3">
                  <XCircle className="h-5 w-5 text-red-600 shrink-0" />
                  <div className="font-semibold">{commitError}</div>
                </div>
              )}

              {/* Extraction Studio Body */}
              {!activeJob ? (
                <div className="py-16 text-center text-slate-400 space-y-2">
                  <FileText className="h-10 w-10 text-slate-300 mx-auto" />
                  <p className="text-sm font-medium text-slate-600">No active extraction job selected</p>
                  <p className="text-xs">
                    Upload an evidence document from the left panel to begin parsing and field verification.
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Summary / Progress Bar */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800">
                        {verifiedCount} of {totalFields} fields verified
                      </span>
                      {needsAttentionCount > 0 ? (
                        <span className="text-amber-700 font-semibold flex items-center gap-1">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                          {needsAttentionCount} require attention
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          All high confidence
                        </span>
                      )}
                    </div>

                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-[#1D4ED8] h-full transition-all duration-300"
                        style={{
                          width: `${totalFields > 0 ? (verifiedCount / totalFields) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Extraction Review Table */}
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="px-4 py-3">Field Name</th>
                          <th className="px-4 py-3">Extracted / Entered Value</th>
                          <th className="px-4 py-3 text-center">Confidence</th>
                          <th className="px-4 py-3">Source Anchor</th>
                          <th className="px-4 py-3 text-right">Verification Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {activeJob.extractedFields.map((field, idx) => {
                          const isLowConfidence = field.confidence < 80;
                          return (
                            <tr
                              key={idx}
                              className={`hover:bg-slate-50/80 transition-colors ${
                                field.reviewStatus === "REJECTED"
                                  ? "opacity-50 bg-slate-50"
                                  : field.reviewStatus === "ACCEPTED"
                                  ? "bg-emerald-50/30"
                                  : field.reviewStatus === "CORRECTED"
                                  ? "bg-blue-50/30"
                                  : isLowConfidence
                                  ? "bg-amber-50/30"
                                  : ""
                              }`}
                            >
                              <td className="px-4 py-3.5 font-semibold text-slate-900">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`w-2 h-2 rounded-full shrink-0 ${
                                      field.reviewStatus === "ACCEPTED"
                                        ? "bg-emerald-500"
                                        : field.reviewStatus === "CORRECTED"
                                        ? "bg-blue-500"
                                        : field.reviewStatus === "REJECTED"
                                        ? "bg-red-500"
                                        : isLowConfidence
                                        ? "bg-amber-500"
                                        : "bg-slate-300"
                                    }`}
                                  />
                                  <span>{field.fieldName}</span>
                                </div>
                              </td>

                              <td className="px-4 py-3.5">
                                {field.reviewStatus === "CORRECTED" ? (
                                  <div>
                                    <span className="font-bold text-blue-700">
                                      {String(field.correctedValue)}
                                    </span>
                                    <span className="text-[10px] text-slate-400 block line-through">
                                      {field.extractedValue !== null ? String(field.extractedValue) : "—"}
                                    </span>
                                  </div>
                                ) : field.extractedValue !== null ? (
                                  <span className="font-medium text-slate-800">
                                    {String(field.extractedValue)}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 italic">— (Missing / Manual)</span>
                                )}
                              </td>

                              <td className="px-4 py-3.5 text-center">
                                <div className="inline-flex flex-col items-center">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      field.confidence >= 80
                                        ? "bg-emerald-100 text-emerald-800"
                                        : field.confidence > 0
                                        ? "bg-amber-100 text-amber-800"
                                        : "bg-slate-100 text-slate-600"
                                    }`}
                                  >
                                    {field.confidence}%
                                  </span>
                                  <div className="w-12 bg-slate-200 h-1 rounded-full mt-1 overflow-hidden">
                                    <div
                                      className={`h-full ${
                                        field.confidence >= 80
                                          ? "bg-emerald-500"
                                          : field.confidence > 0
                                          ? "bg-amber-500"
                                          : "bg-slate-300"
                                      }`}
                                      style={{ width: `${field.confidence}%` }}
                                    />
                                  </div>
                                </div>
                              </td>

                              <td className="px-4 py-3.5 text-slate-500 text-[11px] truncate max-w-36">
                                {field.sourceReference || "Document"}
                              </td>

                              <td className="px-4 py-3.5 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {field.reviewStatus !== "ACCEPTED" && (
                                    <button
                                      onClick={() => handleReviewField(idx, "ACCEPTED")}
                                      title="Accept Field"
                                      disabled={updatingField}
                                      className="px-2 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-[11px] font-bold transition flex items-center gap-1 border border-emerald-200"
                                    >
                                      <Check className="h-3 w-3" />
                                      <span>Accept</span>
                                    </button>
                                  )}

                                  <button
                                    onClick={() => {
                                      setEditingFieldIndex(idx);
                                      setEditValue(
                                        field.correctedValue !== undefined && field.correctedValue !== null
                                          ? String(field.correctedValue)
                                          : field.extractedValue !== null
                                          ? String(field.extractedValue)
                                          : ""
                                      );
                                    }}
                                    title="Edit / Correct Value"
                                    disabled={updatingField}
                                    className="px-2 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 text-[11px] font-bold transition flex items-center gap-1"
                                  >
                                    <Edit2 className="h-3 w-3" />
                                    <span>Edit</span>
                                  </button>

                                  {field.reviewStatus !== "REJECTED" && (
                                    <button
                                      onClick={() => handleReviewField(idx, "REJECTED")}
                                      title="Reject Field"
                                      disabled={updatingField}
                                      className="px-2 py-1 rounded bg-red-50 text-red-700 hover:bg-red-100 text-[11px] font-bold transition flex items-center gap-1 border border-red-200"
                                    >
                                      <X className="h-3 w-3" />
                                      <span>Reject</span>
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Batch Actions & Commit */}
                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
                    <button
                      onClick={handleAcceptHighConfidence}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition"
                    >
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Accept All High-Confidence (≥80%)</span>
                    </button>

                    <button
                      onClick={handleCommitDraft}
                      disabled={committing || verifiedCount === 0}
                      className="w-full sm:w-auto px-5 py-2 rounded-xl bg-[#1D4ED8] hover:bg-blue-800 text-white font-semibold text-xs shadow-md disabled:opacity-50 flex items-center justify-center gap-2 transition"
                    >
                      {committing ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Creating Canonical Draft Record...</span>
                        </>
                      ) : (
                        <>
                          <FileCheck className="h-4 w-4" />
                          <span>Commit to Draft Record</span>
                          <ChevronRight className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Manual Edit / Correct Field Modal */}
      {editingFieldIndex !== null && activeJob && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                Manual Field Value Entry / Correction
              </h3>
              <button
                onClick={() => setEditingFieldIndex(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-500 font-medium mb-1">Field Name</label>
                <div className="p-2 rounded bg-slate-100 font-bold text-slate-800">
                  {activeJob.extractedFields[editingFieldIndex].fieldName}
                </div>
              </div>

              <div>
                <label className="block text-slate-500 font-medium mb-1">
                  Original Document Value
                </label>
                <div className="p-2 rounded bg-slate-50 text-slate-700 font-mono text-[11px]">
                  {activeJob.extractedFields[editingFieldIndex].extractedValue !== null
                    ? String(activeJob.extractedFields[editingFieldIndex].extractedValue)
                    : "— None —"}
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Verified / Corrected Value *
                </label>
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  placeholder="Enter verified value..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
                  autoFocus
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 text-xs">
              <button
                onClick={() => setEditingFieldIndex(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  handleReviewField(editingFieldIndex, "CORRECTED", editValue)
                }
                disabled={updatingField || !editValue.trim()}
                className="px-4 py-1.5 rounded-lg bg-[#1D4ED8] hover:bg-blue-800 text-white font-semibold disabled:opacity-50 flex items-center gap-1.5"
              >
                {updatingField && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>Save Correction</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

