"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  BarChart3,
  ArrowLeft,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Download,
  Filter,
  Layers,
  FileText,
  Users,
  GraduationCap,
  Building2,
  RefreshCw,
  Loader2,
  AlertCircle,
  ChevronRight,
} from "lucide-react";

interface ParameterCompleteness {
  parameter: string;
  name: string;
  weight: number;
  total: number;
  approved: number;
  draft: number;
  needsReview: number;
  percentage: number;
}

interface DataQualityGap {
  id: string;
  category: string;
  description: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  affectedModel: string;
  count: number;
  recommendation: string;
}

interface AnalyticsData {
  department: string;
  academicYear: string;
  compareYear: string;
  parameterCompleteness: Record<string, ParameterCompleteness>;
  verificationFunnel: {
    totalRecords: number;
    draft: number;
    underReviewOrFlagged: number;
    approved: number;
    rejectedOrCorrection: number;
  };
  recordStatusDistribution: {
    APPROVED: number;
    DRAFT: number;
    SUBMITTED: number;
    CORRECTION_REQUESTED: number;
    REJECTED: number;
  };
  dataQualityGaps: DataQualityGap[];
  placementGraduationSummary: {
    totalGraduatesEligible: number;
    graduatesInStipulatedTime: number;
    stipulatedRate: number;
    placedCount: number;
    placementRate: number;
    higherStudiesCount: number;
    higherStudiesRate: number;
    medianSalary: number;
  };
  multiYearComparison: Array<{
    academicYear: string;
    studentsEnrolled: number;
    facultyCount: number;
    fsrRatio: string;
    publicationsCount: number;
    placementRate: number;
    medianSalary: number;
  }>;
}

export default function AnalyticsPage() {
  const router = useRouter();

  const [academicYear, setAcademicYear] = useState("2024-25");
  const [compareYear, setCompareYear] = useState("2023-24");
  const [activeTab, setActiveTab] = useState<"OVERVIEW" | "TLR" | "RP" | "GO" | "OI" | "PR" | "TRENDS" | "GAPS">("OVERVIEW");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics/trends?academicYear=${academicYear}&compareYear=${compareYear}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Failed to fetch analytics:", err);
    } finally {
      setLoading(false);
    }
  }, [academicYear, compareYear]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <header className="h-16 bg-white border-b border-slate-200 px-6 sm:px-8 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard")}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="h-9 w-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Department Analytics &amp; Readiness</span>
              <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold border border-indigo-200">
                NIRF Alignment
              </span>
            </div>
            <div className="text-[11px] text-slate-500 font-medium">
              Multi-Year Trends · Verification Funnel · Quality Gaps
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
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

          <button
            onClick={() => router.push("/reports")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition shadow-sm"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Generate Report</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center overflow-x-auto gap-1.5 p-1 rounded-xl bg-white border border-slate-200 shadow-sm">
          {[
            { id: "OVERVIEW", label: "Overview" },
            { id: "TLR", label: "TLR (Teaching)" },
            { id: "RP", label: "RP (Research)" },
            { id: "GO", label: "GO (Outcomes)" },
            { id: "OI", label: "OI (Inclusivity)" },
            { id: "PR", label: "PR (Perception)" },
            { id: "TRENDS", label: "Multi-Year Trends" },
            { id: "GAPS", label: `Quality Gaps (${data?.dataQualityGaps?.length ?? 0})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                activeTab === tab.id
                  ? "bg-[#1D4ED8] text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 text-[#1D4ED8] animate-spin" />
            <p className="text-sm font-medium text-slate-600">Aggregating departmental analytics...</p>
          </div>
        ) : (
          <>
            {/* KPI Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Total Approved Records
                </span>
                <span className="text-2xl font-bold text-slate-900 mt-1 block">
                  {data?.recordStatusDistribution?.APPROVED ?? 0}
                </span>
                <span className="text-xs text-emerald-600 font-semibold mt-1 block flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Eligible for calculation
                </span>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Verification Funnel
                </span>
                <span className="text-2xl font-bold text-slate-900 mt-1 block">
                  {data?.verificationFunnel?.underReviewOrFlagged ?? 0}
                </span>
                <span className="text-xs text-amber-600 font-semibold mt-1 block flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  Flagged or under review
                </span>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Placement Rate (3Y Cohort)
                </span>
                <span className="text-2xl font-bold text-indigo-600 mt-1 block">
                  {data?.placementGraduationSummary?.placementRate ?? 0}%
                </span>
                <span className="text-xs text-slate-500 mt-1 block">
                  Median CTC: INR {(data?.placementGraduationSummary?.medianSalary ?? 0).toLocaleString()}
                </span>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Critical Quality Gaps
                </span>
                <span className="text-2xl font-bold text-rose-600 mt-1 block">
                  {data?.dataQualityGaps?.filter((g) => g.severity === "HIGH").length ?? 0}
                </span>
                <span className="text-xs text-rose-600 font-semibold mt-1 block flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  High severity documentation flags
                </span>
              </div>
            </div>

            {/* Tab: Overview */}
            {(activeTab === "OVERVIEW" || ["TLR", "RP", "GO", "OI", "PR"].includes(activeTab)) && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Parameter-wise Completeness Table */}
                <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Parameter Readiness &amp; Completeness</h3>
                      <p className="text-xs text-slate-500">Approved records versus total submissions across NIRF pillars</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-blue-50 text-[#1D4ED8] text-xs font-semibold">
                      AY {academicYear}
                    </span>
                  </div>

                  <div className="space-y-4">
                    {Object.values(data?.parameterCompleteness || {})
                      .filter((p) => activeTab === "OVERVIEW" || p.parameter === activeTab)
                      .map((p) => (
                        <div key={p.parameter} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                          <div className="flex items-center justify-between text-xs font-semibold">
                            <span className="text-slate-800 flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded bg-[#1D4ED8] text-white font-mono text-[10px]">
                                {p.parameter}
                              </span>
                              <span>{p.name} (Weight: {p.weight * 100}%)</span>
                            </span>
                            <span className="text-slate-900 font-bold">{p.percentage}%</span>
                          </div>

                          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-2 rounded-full ${
                                p.percentage >= 75 ? "bg-emerald-500" : p.percentage >= 40 ? "bg-amber-500" : "bg-blue-500"
                              }`}
                              style={{ width: `${p.percentage}%` }}
                            />
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                            <span>Total records: {p.total}</span>
                            <span>Approved: {p.approved} · Draft: {p.draft} · Gaps: {p.needsReview}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Verification Funnel & Status Distribution */}
                <div className="lg:col-span-4 space-y-6">
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
                    <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
                      Record Verification Funnel
                    </h3>
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                        <span className="text-slate-600 font-medium">1. Total Ingested:</span>
                        <span className="font-bold text-slate-800">{data?.verificationFunnel?.totalRecords}</span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                        <span className="text-slate-600 font-medium">2. Draft Records:</span>
                        <span className="font-bold text-slate-600">{data?.verificationFunnel?.draft}</span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-amber-50 text-amber-900">
                        <span className="font-medium">3. Flagged / Under Review:</span>
                        <span className="font-bold">{data?.verificationFunnel?.underReviewOrFlagged}</span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50 text-emerald-900">
                        <span className="font-medium">4. Verified &amp; Approved:</span>
                        <span className="font-bold">{data?.verificationFunnel?.approved}</span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-rose-50 text-rose-900">
                        <span className="font-medium">5. Rejected / Correction Req:</span>
                        <span className="font-bold">{data?.verificationFunnel?.rejectedOrCorrection}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
                    <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
                      Graduation &amp; Placement Summary
                    </h3>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Graduation in Stipulated Time:</span>
                        <span className="font-bold text-slate-800">{data?.placementGraduationSummary?.stipulatedRate}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Placement Rate:</span>
                        <span className="font-bold text-slate-800">{data?.placementGraduationSummary?.placementRate}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Higher Studies:</span>
                        <span className="font-bold text-slate-800">{data?.placementGraduationSummary?.higherStudiesRate}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Median Salary:</span>
                        <span className="font-bold text-slate-800">INR {(data?.placementGraduationSummary?.medianSalary ?? 0).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Multi-Year Trends */}
            {activeTab === "TRENDS" && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Multi-Year Department Performance Trends</h3>
                    <p className="text-xs text-slate-500">Historical cohort metrics and progression indicators</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 font-semibold uppercase text-[10px] border-b border-slate-200">
                        <th className="py-3 px-4">Academic Year</th>
                        <th className="py-3 px-4 text-center">Enrolled Students</th>
                        <th className="py-3 px-4 text-center">Faculty Cadre</th>
                        <th className="py-3 px-4 text-center">FSR Ratio</th>
                        <th className="py-3 px-4 text-center">Publications</th>
                        <th className="py-3 px-4 text-center">Placement Rate</th>
                        <th className="py-3 px-4 text-right">Median Salary</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data?.multiYearComparison?.map((row) => (
                        <tr key={row.academicYear} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-bold text-slate-800">{row.academicYear}</td>
                          <td className="py-3 px-4 text-center">{row.studentsEnrolled}</td>
                          <td className="py-3 px-4 text-center">{row.facultyCount}</td>
                          <td className="py-3 px-4 text-center font-mono font-semibold">{row.fsrRatio}</td>
                          <td className="py-3 px-4 text-center">{row.publicationsCount}</td>
                          <td className="py-3 px-4 text-center font-semibold text-emerald-600">{row.placementRate}%</td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">
                            INR {row.medianSalary.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tab: Quality Gaps */}
            {activeTab === "GAPS" && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Data-Quality &amp; Compliance Gaps</h3>
                    <p className="text-xs text-slate-500">Documentation bottlenecks requiring remediation before DCS finalization</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-semibold">
                    {data?.dataQualityGaps?.length ?? 0} Identified Gaps
                  </span>
                </div>

                <div className="space-y-3">
                  {data?.dataQualityGaps?.map((gap) => (
                    <div
                      key={gap.id}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex items-start gap-3 hover:border-slate-300 transition"
                    >
                      <div
                        className={`p-2 rounded-lg mt-0.5 ${
                          gap.severity === "HIGH"
                            ? "bg-rose-100 text-rose-700"
                            : gap.severity === "MEDIUM"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        <AlertTriangle className="h-4 w-4" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-slate-900">{gap.category}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                            {gap.affectedModel}
                          </span>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              gap.severity === "HIGH"
                                ? "bg-rose-100 text-rose-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {gap.severity}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700">{gap.description}</p>
                        <p className="text-[11px] text-slate-500 italic">
                          <strong>Action Plan:</strong> {gap.recommendation}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

