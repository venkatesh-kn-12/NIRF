"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  GraduationCap,
  History,
  ArrowLeft,
  Filter,
  RefreshCw,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  Download,
  Calendar,
  Search,
  User,
  Database,
} from "lucide-react";

interface AuditEntry {
  _id: string;
  action: string;
  userEmail: string;
  userRole: string;
  department: string;
  resourceType?: string;
  resourceId?: string;
  status: "SUCCESS" | "FAILURE";
  details?: Record<string, unknown>;
  ipAddress?: string;
  timestamp: string;
}

export default function AuditTrailPage() {
  const router = useRouter();

  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [actionFilter, setActionFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [recordFilter, setRecordFilter] = useState("");
  const [parameterFilter, setParameterFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (actionFilter) params.append("action", actionFilter);
      if (userFilter) params.append("user", userFilter);
      if (recordFilter) params.append("record", recordFilter);
      if (parameterFilter) params.append("parameter", parameterFilter);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const url = `/api/audit-logs?${params.toString()}`;
      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load audit logs");
      }

      setLogs(data.logs || []);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Error loading audit trail");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionFilter, parameterFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs();
  };

  const handleResetFilters = () => {
    setActionFilter("");
    setUserFilter("");
    setRecordFilter("");
    setParameterFilter("");
    setStartDate("");
    setEndDate("");
  };

  const getExportUrl = () => {
    const params = new URLSearchParams();
    params.append("export", "csv");
    if (actionFilter) params.append("action", actionFilter);
    if (userFilter) params.append("user", userFilter);
    if (recordFilter) params.append("record", recordFilter);
    if (parameterFilter) params.append("parameter", parameterFilter);
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    return `/api/audit-logs?${params.toString()}`;
  };

  const actionBadgeColor: Record<string, string> = {
    login: "bg-blue-100 text-blue-800 border-blue-200",
    logout: "bg-slate-100 text-slate-700 border-slate-200",
    "failed login": "bg-red-100 text-red-800 border-red-200",
    "admin setup": "bg-purple-100 text-purple-800 border-purple-200",
    "user creation": "bg-indigo-100 text-indigo-800 border-indigo-200",
    "role change": "bg-amber-100 text-amber-800 border-amber-200",
    "password change": "bg-teal-100 text-teal-800 border-teal-200",
    "record creation": "bg-emerald-100 text-emerald-800 border-emerald-200",
    "record update": "bg-cyan-100 text-cyan-800 border-cyan-200",
    "record deletion": "bg-rose-100 text-rose-800 border-rose-200",
    approval: "bg-green-100 text-green-800 border-green-200",
    rejection: "bg-red-100 text-red-800 border-red-200",
    "correction request": "bg-orange-100 text-orange-800 border-orange-200",
    "file upload": "bg-sky-100 text-sky-800 border-sky-200",
    "metric calculation": "bg-violet-100 text-violet-800 border-violet-200",
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <header className="h-16 bg-white border-b border-slate-200 px-6 sm:px-8 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard")}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
            title="Back to Dashboard"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-[#1D4ED8] flex items-center justify-center text-white">
              <History className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900">Institutional Audit Trail</div>
              <div className="text-[11px] text-slate-500">
                Department of Computer Applications (MCA) • Immutable Event Log
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={getExportUrl()}
            download
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1D4ED8] text-white hover:bg-blue-800 text-xs font-semibold shadow-sm transition"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </a>
          <button
            onClick={() => fetchLogs()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Comprehensive Filter Bar */}
        <form
          onSubmit={handleSearchSubmit}
          className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
              <Filter className="h-4 w-4 text-[#1D4ED8]" />
              <span>Multi-Axis Audit Filters</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs text-slate-500 hover:text-slate-800 underline"
              >
                Clear all
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition flex items-center gap-1.5"
              >
                <Search className="h-3.5 w-3.5" />
                <span>Apply Filters</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            {/* Action Filter */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Action Type
              </label>
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
              >
                <option value="">All Actions</option>
                <option value="login">login</option>
                <option value="logout">logout</option>
                <option value="failed login">failed login</option>
                <option value="admin setup">admin setup</option>
                <option value="user creation">user creation</option>
                <option value="role change">role change</option>
                <option value="password change">password change</option>
                <option value="record creation">record creation</option>
                <option value="record update">record update</option>
                <option value="record deletion">record deletion</option>
                <option value="approval">approval</option>
                <option value="rejection">rejection</option>
                <option value="correction request">correction request</option>
                <option value="file upload">file upload</option>
                <option value="metric calculation">metric calculation</option>
              </select>
            </div>

            {/* Parameter Filter */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                NIRF Parameter
              </label>
              <select
                value={parameterFilter}
                onChange={(e) => setParameterFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
              >
                <option value="">All Parameters</option>
                <option value="TLR">TLR - Teaching & Resources</option>
                <option value="RP">RP - Research & Professional Practice</option>
                <option value="GO">GO - Graduation Outcomes</option>
                <option value="OI">OI - Outreach & Inclusivity</option>
                <option value="PR">PR - Perception</option>
              </select>
            </div>

            {/* User Search */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                User / Email
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. admin@dsatm.edu.in"
                  value={userFilter}
                  onChange={(e) => setUserFilter(e.target.value)}
                  className="w-full pl-7 pr-2.5 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
                />
                <User className="h-3.5 w-3.5 text-slate-400 absolute left-2 top-2.5" />
              </div>
            </div>

            {/* Record ID Search */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Record ID
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Mongo ObjectId"
                  value={recordFilter}
                  onChange={(e) => setRecordFilter(e.target.value)}
                  className="w-full pl-7 pr-2.5 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
                />
                <Database className="h-3.5 w-3.5 text-slate-400 absolute left-2 top-2.5" />
              </div>
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                From Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full pl-7 pr-2 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
                />
                <Calendar className="h-3.5 w-3.5 text-slate-400 absolute left-2 top-2.5" />
              </div>
            </div>

            {/* End Date */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                To Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full pl-7 pr-2 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
                />
                <Calendar className="h-3.5 w-3.5 text-slate-400 absolute left-2 top-2.5" />
              </div>
            </div>
          </div>
        </form>

        {/* Status Count Summary */}
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <div>
            Showing <strong className="text-slate-900">{logs.length}</strong> immutable audit events in MCA department
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Success: {logs.filter((l) => l.status === "SUCCESS").length}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              Failure: {logs.filter((l) => l.status === "FAILURE").length}
            </span>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Audit Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-6 py-3.5">Timestamp</th>
                  <th className="px-6 py-3.5">Action</th>
                  <th className="px-6 py-3.5">Actor / User</th>
                  <th className="px-6 py-3.5">Role</th>
                  <th className="px-6 py-3.5">Resource</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Audit Details</th>
                  <th className="px-6 py-3.5">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-500">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-6 w-6 animate-spin text-[#1D4ED8]" />
                        <span>Querying immutable audit logs...</span>
                      </div>
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-400">
                      No audit records found matching the active filters.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-3.5 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                            actionBadgeColor[log.action] || "bg-slate-100 text-slate-800"
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 font-medium text-slate-900">
                        {log.userEmail || "Anonymous / System"}
                      </td>
                      <td className="px-6 py-3.5 text-slate-600 font-mono text-[11px]">
                        {log.userRole || "—"}
                      </td>
                      <td className="px-6 py-3.5 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                        {log.resourceType ? (
                          <div>
                            <span className="font-semibold text-slate-800">{log.resourceType}</span>
                            {log.resourceId && (
                              <div className="text-[10px] text-slate-400 truncate max-w-[120px]">
                                {log.resourceId}
                              </div>
                            )}
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap">
                        {log.status === "SUCCESS" ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                            SUCCESS
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-700 font-semibold">
                            <XCircle className="h-3.5 w-3.5 text-red-500" />
                            FAILURE
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3.5 max-w-xs truncate text-slate-600 font-mono text-[11px]">
                        {log.details ? JSON.stringify(log.details) : "—"}
                      </td>
                      <td className="px-6 py-3.5 text-slate-400 font-mono text-[11px]">
                        {log.ipAddress || "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}


