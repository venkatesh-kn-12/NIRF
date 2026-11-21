"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Award,
  Search,
  Plus,
  RefreshCw,
  Trash2,
  Edit,
  Loader2,
  CheckCircle2,
  Archive,
  RotateCcw,
  Download,
  X,
  AlertCircle,
  Calendar,
  Building,
  ExternalLink,
  FileSpreadsheet,
} from "lucide-react";
import { CsvImportModal } from "@/components/CsvImportModal";

interface InventorItem {
  name: string;
  order: number;
  facultyRef?: string | null;
  facultyId?: string;
  affiliation?: string;
}

interface PatentRecord {
  _id: string;
  title: string;
  jurisdiction: "INDIA" | "USPTO" | "EPO" | "WIPO" | "UK" | "AUSTRALIA" | "OTHER";
  patentOffice: string;
  applicationNumber: string;
  normalizedApplicationNumber?: string;
  publicationNumber?: string;
  grantNumber?: string;
  applicant: string;
  applicants?: string[];
  inventors: string[];
  inventorsList?: InventorItem[];
  institutionAssociation: boolean;
  filingDate: string;
  publicationDate?: string | null;
  grantDate?: string | null;
  legalStatus: "FILED" | "PUBLISHED" | "UNDER_EXAMINATION" | "GRANTED" | "REFUSED" | "WITHDRAWN" | "ABANDONED" | "EXPIRED" | "UNKNOWN";
  patentStatus: string;
  status: "DRAFT" | "RECORDED" | "ARCHIVED" | "APPROVED";
  sourceUrl?: string;
  createdBy?: { _id: string; name: string; email: string; role: string } | string;
  createdAt: string;
}

interface PatentFormState {
  title: string;
  applicationNumber: string;
  jurisdiction: "INDIA" | "USPTO" | "EPO" | "WIPO" | "OTHER";
  patentOffice: string;
  publicationNumber: string;
  grantNumber: string;
  applicant: string;
  inventorsInput: string;
  filingDate: string;
  publicationDate: string;
  grantDate: string;
  legalStatus: "FILED" | "PUBLISHED" | "UNDER_EXAMINATION" | "GRANTED" | "REFUSED";
  institutionAssociation: boolean;
  status: "RECORDED" | "DRAFT";
  sourceUrl: string;
}

const EMPTY_FORM: PatentFormState = {
  title: "",
  applicationNumber: "",
  jurisdiction: "INDIA",
  patentOffice: "Indian Patent Office (IPO)",
  publicationNumber: "",
  grantNumber: "",
  applicant: "Dayananda Sagar Academy of Technology and Management",
  inventorsInput: "",
  filingDate: new Date().toISOString().slice(0, 10),
  publicationDate: "",
  grantDate: "",
  legalStatus: "FILED",
  institutionAssociation: true,
  status: "RECORDED",
  sourceUrl: "",
};

export default function PatentsPage() {
  const [records, setRecords] = useState<PatentRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [jurisdictionFilter, setJurisdictionFilter] = useState("");
  const [legalStatusFilter, setLegalStatusFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<PatentRecord | null>(null);
  const [form, setForm] = useState<PatentFormState>(EMPTY_FORM);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const LIMIT = 20;

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.user) {
          setCurrentUser(data.user);
        }
      })
      .catch(() => {});
  }, []);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(LIMIT),
      });
      if (search.trim()) params.set("search", search.trim());
      if (jurisdictionFilter) params.set("jurisdiction", jurisdictionFilter);
      if (legalStatusFilter) params.set("legalStatus", legalStatusFilter);
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/patents?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setRecords(data.data || []);
        setTotal(data.pagination?.total || 0);
      }
    } catch (err) {
      console.error("Failed to fetch patents", err);
    } finally {
      setLoading(false);
    }
  }, [page, search, jurisdictionFilter, legalStatusFilter, statusFilter]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const openCreateModal = () => {
    setEditingRecord(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setShowModal(true);
  };

  const openEditModal = (rec: PatentRecord) => {
    setEditingRecord(rec);
    const inventorsStr = rec.inventorsList?.length
      ? rec.inventorsList.map((i) => i.name).join(", ")
      : (rec.inventors || []).join(", ");

    setForm({
      title: rec.title || "",
      applicationNumber: rec.applicationNumber || "",
      jurisdiction: (rec.jurisdiction as any) || "INDIA",
      patentOffice: rec.patentOffice || "Indian Patent Office (IPO)",
      publicationNumber: rec.publicationNumber || "",
      grantNumber: rec.grantNumber || "",
      applicant: rec.applicant || "Dayananda Sagar Academy of Technology and Management",
      inventorsInput: inventorsStr,
      filingDate: rec.filingDate ? new Date(rec.filingDate).toISOString().slice(0, 10) : "",
      publicationDate: rec.publicationDate ? new Date(rec.publicationDate).toISOString().slice(0, 10) : "",
      grantDate: rec.grantDate ? new Date(rec.grantDate).toISOString().slice(0, 10) : "",
      legalStatus: (rec.legalStatus as any) || (rec.patentStatus as any) || "FILED",
      institutionAssociation: rec.institutionAssociation ?? true,
      status: rec.status === "DRAFT" ? "DRAFT" : "RECORDED",
      sourceUrl: rec.sourceUrl || "",
    });
    setFormError(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormLoading(true);

    try {
      const parsedInventors = form.inventorsInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const inventorsList = parsedInventors.map((name, idx) => ({
        name,
        order: idx + 1,
        affiliation: "DSATM MCA",
      }));

      const payload: Record<string, any> = {
        title: form.title.trim(),
        applicationNumber: form.applicationNumber.trim(),
        jurisdiction: form.jurisdiction,
        patentOffice: form.patentOffice.trim(),
        publicationNumber: form.publicationNumber.trim() || undefined,
        grantNumber: form.grantNumber.trim() || undefined,
        applicant: form.applicant.trim(),
        applicants: [form.applicant.trim()],
        inventors: parsedInventors.length > 0 ? parsedInventors : ["MCA Inventor"],
        inventorsList: inventorsList.length > 0 ? inventorsList : [{ name: "MCA Inventor", order: 1 }],
        filingDate: new Date(form.filingDate),
        publicationDate: form.publicationDate ? new Date(form.publicationDate) : null,
        grantDate: form.grantDate ? new Date(form.grantDate) : null,
        legalStatus: form.legalStatus,
        patentStatus: form.legalStatus,
        institutionAssociation: form.institutionAssociation,
        status: form.status,
        sourceUrl: form.sourceUrl.trim() || undefined,
      };

      let res;
      if (editingRecord) {
        res = await fetch(`/api/patents/${editingRecord._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/patents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save patent");
      }

      setShowModal(false);
      fetchRecords();
    } catch (err: any) {
      setFormError(err.message || "An unexpected error occurred");
    } finally {
      setFormLoading(false);
    }
  };

  const handleArchive = async (id: string) => {
    if (!confirm("Are you sure you want to archive this patent record?")) return;
    try {
      const res = await fetch(`/api/patents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "archive" }),
      });
      const data = await res.json();
      if (!res.ok) alert(data.error || "Failed to archive");
      else fetchRecords();
    } catch (err) {
      alert("Failed to archive patent");
    }
  };

  const handleRestore = async (id: string) => {
    try {
      const res = await fetch(`/api/patents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore" }),
      });
      const data = await res.json();
      if (!res.ok) alert(data.error || "Failed to restore");
      else fetchRecords();
    } catch (err) {
      alert("Failed to restore patent");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Permanent deletion is restricted to Administrators. Are you sure?")) return;
    try {
      const res = await fetch(`/api/patents/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) alert(data.error || "Failed to delete");
      else fetchRecords();
    } catch (err) {
      alert("Failed to delete patent");
    }
  };

  const exportCSV = () => {
    if (records.length === 0) {
      alert("No records to export.");
      return;
    }
    const headers = [
      "Title",
      "Application Number",
      "Jurisdiction",
      "Applicant",
      "Inventors",
      "Filing Date",
      "Publication Date",
      "Grant Date",
      "Legal Status",
      "Status",
    ];
    const rows = records.map((r) => [
      `"${(r.title || "").replace(/"/g, '""')}"`,
      r.applicationNumber,
      r.jurisdiction,
      `"${(r.applicant || "").replace(/"/g, '""')}"`,
      `"${((r.inventors || []).join(", ")).replace(/"/g, '""')}"`,
      r.filingDate ? new Date(r.filingDate).toISOString().slice(0, 10) : "",
      r.publicationDate ? new Date(r.publicationDate).toISOString().slice(0, 10) : "",
      r.grantDate ? new Date(r.grantDate).toISOString().slice(0, 10) : "",
      r.legalStatus || r.patentStatus,
      r.status,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `mca_nirf_patents_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // KPI Calculations
  const grantedCount = records.filter(
    (r) => r.legalStatus === "GRANTED" || r.patentStatus === "GRANTED" || !!r.grantDate
  ).length;

  const publishedCount = records.filter(
    (r) =>
      r.legalStatus === "PUBLISHED" ||
      r.patentStatus === "PUBLISHED" ||
      !!r.publicationDate
  ).length;

  const filedCount = records.filter(
    (r) => r.legalStatus === "FILED" || r.patentStatus === "FILED"
  ).length;

  const institutionalCount = records.filter(
    (r) => r.institutionAssociation !== false
  ).length;

  const isContributorOrAdmin =
    currentUser?.role === "DEPARTMENT_ADMIN" ||
    currentUser?.role === "FACULTY_CONTRIBUTOR";

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Award className="text-indigo-600" size={26} />
            Patents & IPR Repository
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Department of MCA • Dayananda Sagar Academy of Technology & Management • NIRF IPR Metric (15 Marks)
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-sm transition-colors"
          >
            <Download size={16} />
            Export CSV
          </button>
          {isContributorOrAdmin && (
            <button
              onClick={() => setShowCsvModal(true)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-sm transition-colors"
            >
              <FileSpreadsheet size={16} className="text-emerald-600" />
              Import CSV
            </button>
          )}
          {isContributorOrAdmin && (
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm transition-colors"
            >
              <Plus size={16} />
              Add Patent
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Patent Filings
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{total}</div>
          <div className="text-xs text-slate-500 mt-1">All recorded departmental IPR</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Patents Granted (PG)
          </div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{grantedCount}</div>
          <div className="text-xs text-slate-500 mt-1">Carries 10 marks weightage in NIRF IPR</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Patents Published (PP)
          </div>
          <div className="text-2xl font-bold text-blue-600 mt-1">{publishedCount}</div>
          <div className="text-xs text-slate-500 mt-1">Carries 5 marks weightage in NIRF IPR</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Institutional Ownership
          </div>
          <div className="text-2xl font-bold text-purple-600 mt-1">{institutionalCount}</div>
          <div className="text-xs text-slate-500 mt-1">DSATM assigned / associated</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search by title, application number, inventor, or applicant..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <select
          value={jurisdictionFilter}
          onChange={(e) => {
            setJurisdictionFilter(e.target.value);
            setPage(1);
          }}
          className="text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Jurisdictions</option>
          <option value="INDIA">India (IPO)</option>
          <option value="USPTO">United States (USPTO)</option>
          <option value="EPO">European Union (EPO)</option>
          <option value="WIPO">International (WIPO)</option>
          <option value="OTHER">Other</option>
        </select>
        <select
          value={legalStatusFilter}
          onChange={(e) => {
            setLegalStatusFilter(e.target.value);
            setPage(1);
          }}
          className="text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Legal Statuses</option>
          <option value="GRANTED">Granted (PG)</option>
          <option value="PUBLISHED">Published (PP)</option>
          <option value="FILED">Filed</option>
          <option value="UNDER_EXAMINATION">Under Examination</option>
          <option value="REFUSED">Refused</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Records</option>
          <option value="RECORDED">Recorded</option>
          <option value="DRAFT">Draft</option>
          <option value="ARCHIVED">Archived</option>
        </select>
        <button
          onClick={fetchRecords}
          className="p-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
          title="Refresh table"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Patents Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="animate-spin mb-2" size={32} />
            <p className="text-sm">Loading patents...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <Award className="mx-auto mb-2 text-slate-400" size={36} />
            <p className="font-semibold text-slate-700">No patents found</p>
            <p className="text-xs text-slate-500 mt-1">
              Add verified departmental patent applications or grants to compute NIRF IPR score.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Invention Title & Application #</th>
                  <th className="px-4 py-3">Inventors & Applicant</th>
                  <th className="px-4 py-3">Jurisdiction & Office</th>
                  <th className="px-4 py-3">Key Dates</th>
                  <th className="px-4 py-3">Legal Status</th>
                  <th className="px-4 py-3">Record Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {records.map((rec) => {
                  const isArchived = rec.status === "ARCHIVED";
                  const legal = rec.legalStatus || rec.patentStatus || "FILED";

                  return (
                    <tr
                      key={rec._id}
                      className={`hover:bg-slate-50 transition-colors ${
                        isArchived ? "bg-slate-50/60 opacity-75" : ""
                      }`}
                    >
                      <td className="px-4 py-3 max-w-sm">
                        <div className="font-medium text-slate-900 line-clamp-2">
                          {rec.title}
                        </div>
                        <div className="text-xs font-mono text-indigo-600 mt-1">
                          App #: {rec.applicationNumber}
                        </div>
                        {rec.grantNumber && (
                          <div className="text-[11px] font-mono text-emerald-700">
                            Grant #: {rec.grantNumber}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <div className="text-xs text-slate-800 line-clamp-2">
                          {(rec.inventors || []).join(", ")}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                          Applicant: {rec.applicant}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                          {rec.jurisdiction}
                        </span>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {rec.patentOffice}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-600">
                        <div>
                          <span className="font-medium text-slate-700">Filed:</span>{" "}
                          {rec.filingDate ? new Date(rec.filingDate).toLocaleDateString() : "—"}
                        </div>
                        {rec.grantDate && (
                          <div className="text-emerald-700">
                            <span className="font-medium">Granted:</span>{" "}
                            {new Date(rec.grantDate).toLocaleDateString()}
                          </div>
                        )}
                        {rec.publicationDate && !rec.grantDate && (
                          <div className="text-blue-700">
                            <span className="font-medium">Pub:</span>{" "}
                            {new Date(rec.publicationDate).toLocaleDateString()}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                            legal === "GRANTED"
                              ? "bg-emerald-100 text-emerald-800"
                              : legal === "PUBLISHED"
                              ? "bg-blue-100 text-blue-800"
                              : legal === "UNDER_EXAMINATION"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-slate-100 text-slate-800"
                          }`}
                        >
                          {legal}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            rec.status === "RECORDED" || rec.status === "APPROVED"
                              ? "bg-emerald-100 text-emerald-800"
                              : rec.status === "DRAFT"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          {rec.status === "APPROVED" ? "RECORDED" : rec.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          {isContributorOrAdmin && !isArchived && (
                            <button
                              onClick={() => openEditModal(rec)}
                              className="p-1 text-slate-500 hover:text-indigo-600 transition-colors"
                              title="Edit patent"
                            >
                              <Edit size={16} />
                            </button>
                          )}
                          {isContributorOrAdmin && !isArchived && (
                            <button
                              onClick={() => handleArchive(rec._id)}
                              className="p-1 text-slate-500 hover:text-amber-600 transition-colors"
                              title="Archive record"
                            >
                              <Archive size={16} />
                            </button>
                          )}
                          {currentUser?.role === "DEPARTMENT_ADMIN" && isArchived && (
                            <button
                              onClick={() => handleRestore(rec._id)}
                              className="p-1 text-slate-500 hover:text-emerald-600 transition-colors"
                              title="Restore to active"
                            >
                              <RotateCcw size={16} />
                            </button>
                          )}
                          {currentUser?.role === "DEPARTMENT_ADMIN" && (
                            <button
                              onClick={() => handleDelete(rec._id)}
                              className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                              title="Permanent delete"
                            >
                              <Trash2 size={16} />
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
        )}

        {/* Pagination */}
        {total > LIMIT && (
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <div>
              Showing {(page - 1) * LIMIT + 1} to{" "}
              {Math.min(page * LIMIT, total)} of {total} records
            </div>
            <div className="flex gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1 bg-white border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                disabled={page * LIMIT >= total}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 bg-white border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 space-y-4 my-8">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Award className="text-indigo-600" size={20} />
                {editingRecord ? "Edit Patent / IPR Record" : "Add Patent / IPR Record"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle size={16} className="flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Patent Title *
                </label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. System and Method for Automated Deep Learning-Based Intrusion Detection"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Application Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.applicationNumber}
                    onChange={(e) => setForm({ ...form, applicationNumber: e.target.value })}
                    placeholder="e.g. 202341012345"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jurisdiction *
                  </label>
                  <select
                    value={form.jurisdiction}
                    onChange={(e) => setForm({ ...form, jurisdiction: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="INDIA">India (IPO)</option>
                    <option value="USPTO">United States (USPTO)</option>
                    <option value="EPO">European Union (EPO)</option>
                    <option value="WIPO">International (WIPO)</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Patent Office
                  </label>
                  <input
                    type="text"
                    value={form.patentOffice}
                    onChange={(e) => setForm({ ...form, patentOffice: e.target.value })}
                    placeholder="Indian Patent Office (IPO)"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Legal Status *
                  </label>
                  <select
                    value={form.legalStatus}
                    onChange={(e) => setForm({ ...form, legalStatus: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-medium"
                  >
                    <option value="FILED">FILED</option>
                    <option value="PUBLISHED">PUBLISHED (Eligible for PP)</option>
                    <option value="UNDER_EXAMINATION">UNDER EXAMINATION</option>
                    <option value="GRANTED">GRANTED (Eligible for PG)</option>
                    <option value="REFUSED">REFUSED</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Inventors (Comma-separated) *
                </label>
                <input
                  type="text"
                  required
                  value={form.inventorsInput}
                  onChange={(e) => setForm({ ...form, inventorsInput: e.target.value })}
                  placeholder="e.g. Dr. K. Ramesh, Prof. S. Venkataraman, M. Ananya"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Applicant / Assignee *
                </label>
                <input
                  type="text"
                  required
                  value={form.applicant}
                  onChange={(e) => setForm({ ...form, applicant: e.target.value })}
                  placeholder="Dayananda Sagar Academy of Technology and Management"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Filing Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={form.filingDate}
                    onChange={(e) => setForm({ ...form, filingDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Publication Date
                  </label>
                  <input
                    type="date"
                    value={form.publicationDate}
                    onChange={(e) => setForm({ ...form, publicationDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Grant Date
                  </label>
                  <input
                    type="date"
                    value={form.grantDate}
                    onChange={(e) => setForm({ ...form, grantDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Publication / Journal Number
                  </label>
                  <input
                    type="text"
                    value={form.publicationNumber}
                    onChange={(e) => setForm({ ...form, publicationNumber: e.target.value })}
                    placeholder="e.g. 15/2024"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Grant Number / Patent Number
                  </label>
                  <input
                    type="text"
                    value={form.grantNumber}
                    onChange={(e) => setForm({ ...form, grantNumber: e.target.value })}
                    placeholder="e.g. IN452109"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="institutionAssociation"
                  checked={form.institutionAssociation}
                  onChange={(e) => setForm({ ...form, institutionAssociation: e.target.checked })}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="institutionAssociation" className="text-xs text-slate-700">
                  Associated with Dayananda Sagar Academy of Technology & Management (DSATM)
                </label>
              </div>

              <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Record Status:</span>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                    className="text-xs border border-slate-300 rounded px-2 py-1 bg-white font-medium text-slate-800"
                  >
                    <option value="RECORDED">RECORDED (Eligible for NIRF)</option>
                    <option value="DRAFT">DRAFT (Work in Progress)</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                  >
                    {formLoading && <Loader2 size={16} className="animate-spin" />}
                    {editingRecord ? "Update Patent" : "Save Patent"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* CSV Import Modal */}
      <CsvImportModal
        isOpen={showCsvModal}
        onClose={() => setShowCsvModal(false)}
        moduleName="patents"
        moduleTitle="Patents"
        onImportSuccess={fetchRecords}
      />
    </div>
  );
}
