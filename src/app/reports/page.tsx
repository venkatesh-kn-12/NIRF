"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Download,
  Printer,
  Calendar,
  ArrowLeft,
  ShieldCheck,
  AlertTriangle,
  Info,
  CheckCircle2,
  FileSpreadsheet,
  File,
  Loader2,
  Table,
  Layers,
  History,
  FileQuestion,
} from "lucide-react";
import { ReportType, GeneratedReportData } from "@/services/reportService";

export default function ReportsPage() {
  const router = useRouter();

  const [reportType, setReportType] = useState<ReportType>("dept_summary");
  const [academicYear, setAcademicYear] = useState("2024-25");
  const [reportData, setReportData] = useState<GeneratedReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/generate?reportType=${reportType}&academicYear=${academicYear}`);
      if (res.ok) {
        const json = await res.json();
        setReportData(json);
      }
    } catch (err) {
      console.error("Failed to load report:", err);
    } finally {
      setLoading(false);
    }
  }, [reportType, academicYear]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleExport = (format: "csv" | "xlsx" | "pdf") => {
    setExporting(format);
    const url = `/api/reports/export?reportType=${reportType}&academicYear=${academicYear}&format=${format}`;
    window.open(url, "_blank");
    setTimeout(() => setExporting(null), 1200);
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
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Reports &amp; Regulatory Exports</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                Audit Verified
              </span>
            </div>
            <div className="text-[11px] text-slate-500 font-medium">
              Department of Computer Applications · DCS Format Exports
            </div>
          </div>
        </div>

        {/* Export Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport("csv")}
            disabled={exporting !== null}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition shadow-sm disabled:opacity-50"
            title="Download CSV"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
            <span>CSV</span>
          </button>

          <button
            onClick={() => handleExport("xlsx")}
            disabled={exporting !== null}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition shadow-sm disabled:opacity-50"
            title="Download Excel Spreadsheet"
          >
            <Download className="h-3.5 w-3.5 text-blue-600" />
            <span>Excel (.xlsx)</span>
          </button>

          <button
            onClick={() => handleExport("pdf")}
            disabled={exporting !== null}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#1D4ED8] text-white text-xs font-semibold hover:bg-blue-800 transition shadow-sm disabled:opacity-50"
            title="Print or Save PDF"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print / PDF</span>
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Configuration Panel */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Report Builder Console</h2>
              <p className="text-xs text-slate-500">Configure scope, dossier type, and academic cycle</p>
            </div>

            {/* Select Report Type */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                Report Type
              </label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value as ReportType)}
                className="w-full p-2.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#1D4ED8] cursor-pointer"
              >
                <option value="dept_summary">Departmental NIRF Data Summary</option>
                <option value="param_wise">Parameter-wise Evaluation (TLR, RP, GO, OI, PR)</option>
                <option value="fac_stud">Faculty &amp; Student Demographics</option>
                <option value="research">Research Output (Publications, IPR, Grants)</option>
                <option value="placement">Placement &amp; Graduation Outcomes</option>
                <option value="verification">Verification &amp; Approval Status</option>
                <option value="audit">Full Cryptographic Audit Dossier</option>
              </select>
            </div>

            {/* Select Academic Year */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                Academic Year
              </label>
              <select
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#1D4ED8] cursor-pointer"
              >
                <option value="2024-25">AY 2024–25 (Active Cycle)</option>
                <option value="2023-24">AY 2023–24 (Archived Cycle)</option>
              </select>
            </div>

            {/* Metadata Tags */}
            <div className="pt-2 border-t border-slate-100 space-y-2 text-xs text-slate-600">
              <div className="flex justify-between">
                <span className="text-slate-400">Department:</span>
                <span className="font-semibold text-slate-800">MCA</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Methodology:</span>
                <span className="font-semibold text-slate-800">NIRF Engineering 2025</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Security:</span>
                <span className="font-semibold text-emerald-600">SHA-256 Audit Anchored</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100 text-[11px] text-blue-900 leading-relaxed">
              <strong>Audit Defensibility:</strong> Every exported report compiles approved evidence document references and chronological reviewer approval history.
            </div>
          </div>

          {/* Right Live Document Preview Panel */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
            {loading ? (
              <div className="py-24 flex flex-col items-center justify-center gap-3">
                <Loader2 className="h-8 w-8 text-[#1D4ED8] animate-spin" />
                <p className="text-sm font-medium text-slate-600">Compiling official dossier preview...</p>
              </div>
            ) : reportData ? (
              <>
                {/* Document Header */}
                <div className="border-b-2 border-[#1D4ED8] pb-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold text-[#1D4ED8] uppercase tracking-wider block">
                      MCA NIRF Assist · Official Departmental Dossier
                    </span>
                    <h1 className="text-lg font-bold text-slate-900 mt-1">{reportData.title}</h1>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Department of Computer Applications · AY {reportData.academicYear} · {reportData.methodologyVersion}
                    </div>
                  </div>
                  <div className="text-right text-[11px] text-slate-400 font-mono">
                    <div>Generated: {new Date(reportData.generatedAt).toLocaleString()}</div>
                    <div className="text-emerald-600 font-semibold mt-0.5">✓ Zero Estimation Mandate</div>
                  </div>
                </div>

                {/* Mandatory Regulatory Statement Banner */}
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                    <span>MANDATORY REGULATORY COMPLIANCE STATEMENT:</span>
                  </div>
                  <p className="text-xs leading-relaxed">{reportData.disclaimer.statement}</p>

                  {/* Computable vs Non-Computable Metrics Breakdown */}
                  <div className="pt-2 border-t border-amber-200/60 grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                    <div>
                      <span className="font-bold text-emerald-800 block mb-1">
                        Computed Indicative Metrics ({reportData.disclaimer.computedMetrics.length}):
                      </span>
                      <ul className="list-disc list-inside space-y-0.5 text-slate-700 max-h-36 overflow-y-auto">
                        {reportData.disclaimer.computedMetrics.map((cm, i) => (
                          <li key={i}>{cm}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <span className="font-bold text-rose-800 block mb-1">
                        Awaiting Source / Non-Computable ({reportData.disclaimer.nonComputableMetrics.length}):
                      </span>
                      <ul className="space-y-1 text-slate-700">
                        {reportData.disclaimer.nonComputableMetrics.map((ncm, i) => (
                          <li key={i} className="text-[10px]">
                            <strong>{ncm.code} ({ncm.name}):</strong> {ncm.reason}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Render All Tables */}
                <div className="space-y-6">
                  {reportData.tables.map((t, idx) => (
                    <div key={idx} className="space-y-2">
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider pb-1 border-b border-slate-200">
                        {t.title}
                      </h3>
                      <div className="overflow-x-auto border border-slate-200 rounded-xl">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-50 text-slate-600 font-semibold text-[10px] uppercase border-b border-slate-200">
                              {t.columns.map((c, i) => (
                                <th key={i} className="py-2.5 px-3">
                                  {c}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {t.rows.length === 0 ? (
                              <tr>
                                <td colSpan={t.columns.length} className="py-6 text-center text-slate-400">
                                  No records available in this section.
                                </td>
                              </tr>
                            ) : (
                              t.rows.map((row, rIdx) => (
                                <tr key={rIdx} className="hover:bg-slate-50/70">
                                  {row.map((cell, cIdx) => (
                                    <td key={cIdx} className="py-2 px-3 text-slate-800">
                                      {String(cell)}
                                    </td>
                                  ))}
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Evidence Index Section */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center justify-between">
                    <span>Evidence Dossier Index ({reportData.evidenceIndex.length} Documents)</span>
                  </h3>
                  <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-200 p-2 space-y-1 text-xs">
                    {reportData.evidenceIndex.length === 0 ? (
                      <span className="text-slate-400 italic p-2 block">No evidence documents linked yet.</span>
                    ) : (
                      reportData.evidenceIndex.slice(0, 15).map((ev, i) => (
                        <div key={i} className="flex justify-between py-1 px-2 rounded bg-slate-50 text-[11px]">
                          <span className="text-slate-700 font-medium truncate max-w-xs">{ev.fileName}</span>
                          <span className="text-slate-400 font-mono">
                            {ev.recordType} · {ev.uploadedAt}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Verification & Sign-off Block */}
                <div className="pt-6 border-t border-slate-200 grid grid-cols-2 gap-8 text-xs text-slate-600">
                  <div>
                    <div className="font-semibold text-slate-800">Compiled &amp; Verified By:</div>
                    <div className="text-[11px] text-slate-500">Reviewer / Department NIRF Coordinator</div>
                    <div className="mt-8 border-b border-dashed border-slate-300 w-48" />
                    <div className="text-[10px] text-slate-400 mt-1">Official Signature &amp; Date</div>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <div className="font-semibold text-slate-800">Approved &amp; Certified By:</div>
                    <div className="text-[11px] text-slate-500">Head of Department (HOD) - MCA</div>
                    <div className="mt-8 border-b border-dashed border-slate-300 w-48" />
                    <div className="text-[10px] text-slate-400 mt-1">Institutional Seal &amp; Signature</div>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}

