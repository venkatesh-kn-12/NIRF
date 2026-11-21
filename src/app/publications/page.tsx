"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  BookOpen,
  Search,
  Plus,
  RefreshCw,
  ExternalLink,
  Trash2,
  Edit,
  Loader2,
  FileText,
  UserCheck,
  CheckCircle2,
  Archive,
  RotateCcw,
  Download,
  X,
  AlertCircle,
  Tag,
  Building,
  FileSpreadsheet,
} from "lucide-react";
import { CsvImportModal } from "@/components/CsvImportModal";

interface AuthorItem {
  authorName: string;
  authorOrder: number;
  facultyRef?: string | null;
  facultyId?: string;
  affiliation?: string;
  isCorresponding?: boolean;
}

interface IndexingItem {
  sourceName: "SCOPUS" | "WEB_OF_SCIENCE" | "UGC_CARE" | "OTHER" | "UNKNOWN";
  recordId?: string;
  url?: string;
  provenance: "SELF_REPORTED" | "DOCUMENT_SUPPORTED" | "EXTERNAL_SOURCE";
}

interface PublicationRecord {
  _id: string;
  title: string;
  publicationType: "JOURNAL" | "CONFERENCE" | "BOOK_CHAPTER" | "OTHER" | "UNKNOWN";
  journalOrConference: string;
  publisher?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  issnOrIsbn?: string;
  pubStatus: "PUBLISHED" | "ACCEPTED_IN_PRESS" | "UNDER_REVIEW" | "PREPRINT";
  publicationYear: number;
  doi?: string;
  url?: string;
  status: "DRAFT" | "RECORDED" | "ARCHIVED" | "APPROVED";
  authors: string[];
  authorsList?: AuthorItem[];
  indexing: string;
  indexingList?: IndexingItem[];
  quartiles?: Array<{ quartile: string; source?: string; year?: number }>;
  internalFaculty?: string[];
  claimedBy?: { _id: string; name: string; email: string } | string;
  claimedAt?: string;
  citationCount?: number;
  retractionStatus?: boolean;
  createdBy?: { _id: string; name: string; email: string; role: string } | string;
  createdAt: string;
}

interface FormState {
  title: string;
  publicationType: string;
  journalOrConference: string;
  publisher: string;
  issnOrIsbn: string;
  volume: string;
  issue: string;
  pages: string;
  pubStatus: string;
  publicationYear: number;
  doi: string;
  url: string;
  indexing: string;
  status: "RECORDED" | "DRAFT";
  authorsInput: string;
  primaryQuartile: string;
}

const EMPTY_FORM: FormState = {
  title: "",
  publicationType: "JOURNAL",
  journalOrConference: "",
  publisher: "",
  issnOrIsbn: "",
  volume: "",
  issue: "",
  pages: "",
  pubStatus: "PUBLISHED",
  publicationYear: new Date().getFullYear(),
  doi: "",
  url: "",
  indexing: "SCOPUS",
  status: "RECORDED",
  authorsInput: "",
  primaryQuartile: "UNKNOWN",
};

export default function PublicationsPage() {
  const [records, setRecords] = useState<PublicationRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [indexingFilter, setIndexingFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<PublicationRecord | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Claim state
  const [claimingId, setClaimingId] = useState<string | null>(null);

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
      if (indexingFilter) params.set("indexing", indexingFilter);
      if (yearFilter) params.set("publicationYear", yearFilter);
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/publications?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setRecords(data.data || []);
        setTotal(data.pagination?.total || 0);
      }
    } catch (err) {
      console.error("Failed to fetch publications", err);
    } finally {
      setLoading(false);
    }
  }, [page, search, indexingFilter, yearFilter, statusFilter]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const openCreateModal = () => {
    setEditingRecord(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setShowModal(true);
  };

  const openEditModal = (rec: PublicationRecord) => {
    setEditingRecord(rec);
    const authorsStr = rec.authorsList?.length
      ? rec.authorsList.map((a) => a.authorName).join(", ")
      : (rec.authors || []).join(", ");

    setForm({
      title: rec.title || "",
      publicationType: rec.publicationType || "JOURNAL",
      journalOrConference: rec.journalOrConference || "",
      publisher: rec.publisher || "",
      issnOrIsbn: rec.issnOrIsbn || "",
      volume: rec.volume || "",
      issue: rec.issue || "",
      pages: rec.pages || "",
      pubStatus: rec.pubStatus || "PUBLISHED",
      publicationYear: rec.publicationYear || new Date().getFullYear(),
      doi: rec.doi || "",
      url: rec.url || "",
      indexing: rec.indexing || "SCOPUS",
      status: rec.status === "DRAFT" ? "DRAFT" : "RECORDED",
      authorsInput: authorsStr,
      primaryQuartile: rec.quartiles?.[0]?.quartile || "UNKNOWN",
    });
    setFormError(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormLoading(true);

    try {
      const parsedAuthors = form.authorsInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const authorsList = parsedAuthors.map((name, idx) => ({
        authorName: name,
        authorOrder: idx + 1,
        affiliation: "DSATM MCA",
      }));

      const payload: Record<string, any> = {
        title: form.title.trim(),
        publicationType: form.publicationType,
        journalOrConference: form.journalOrConference.trim(),
        publisher: form.publisher.trim() || undefined,
        issnOrIsbn: form.issnOrIsbn.trim() || undefined,
        volume: form.volume.trim() || undefined,
        issue: form.issue.trim() || undefined,
        pages: form.pages.trim() || undefined,
        pubStatus: form.pubStatus,
        publicationYear: Number(form.publicationYear),
        doi: form.doi.trim() || undefined,
        url: form.url.trim() || undefined,
        indexing: form.indexing,
        indexingList: [
          {
            sourceName: form.indexing,
            provenance: "DOCUMENT_SUPPORTED",
            referenceYear: Number(form.publicationYear),
          },
        ],
        quartiles: form.primaryQuartile !== "UNKNOWN"
          ? [{ quartile: form.primaryQuartile, year: Number(form.publicationYear) }]
          : [],
        status: form.status,
        authors: parsedAuthors.length > 0 ? parsedAuthors : ["MCA Contributor"],
        authorsList: authorsList.length > 0 ? authorsList : [{ authorName: "MCA Contributor", authorOrder: 1 }],
      };

      let res;
      if (editingRecord) {
        res = await fetch(`/api/publications/${editingRecord._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/publications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save publication");
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
    if (!confirm("Are you sure you want to archive this publication record?")) return;
    try {
      const res = await fetch(`/api/publications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "archive" }),
      });
      const data = await res.json();
      if (!res.ok) alert(data.error || "Failed to archive");
      else fetchRecords();
    } catch (err) {
      alert("Failed to archive publication");
    }
  };

  const handleRestore = async (id: string) => {
    try {
      const res = await fetch(`/api/publications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore" }),
      });
      const data = await res.json();
      if (!res.ok) alert(data.error || "Failed to restore");
      else fetchRecords();
    } catch (err) {
      alert("Failed to restore publication");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Permanent deletion is restricted to Administrators. Are you sure?")) return;
    try {
      const res = await fetch(`/api/publications/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) alert(data.error || "Failed to delete");
      else fetchRecords();
    } catch (err) {
      alert("Failed to delete publication");
    }
  };

  const handleClaim = async (id: string) => {
    setClaimingId(id);
    try {
      const res = await fetch(`/api/publications/${id}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) alert(data.error || "Failed to claim publication");
      else {
        alert("Authorship successfully claimed and linked to your profile!");
        fetchRecords();
      }
    } catch (err) {
      alert("Error claiming authorship");
    } finally {
      setClaimingId(null);
    }
  };

  const exportCSV = () => {
    if (records.length === 0) {
      alert("No records to export.");
      return;
    }
    const headers = [
      "Title",
      "Type",
      "Journal / Conference",
      "Year",
      "Authors",
      "Indexing",
      "Quartile",
      "DOI",
      "Status",
    ];
    const rows = records.map((r) => [
      `"${(r.title || "").replace(/"/g, '""')}"`,
      r.publicationType,
      `"${(r.journalOrConference || "").replace(/"/g, '""')}"`,
      r.publicationYear,
      `"${((r.authors || []).join(", ")).replace(/"/g, '""')}"`,
      r.indexing,
      r.quartiles?.[0]?.quartile || "N/A",
      r.doi || "",
      r.status,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `mca_nirf_publications_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Summary counts
  const scopusCount = records.filter(
    (r) =>
      r.indexing === "SCOPUS" ||
      r.indexingList?.some((il) => il.sourceName === "SCOPUS")
  ).length;

  const wosCount = records.filter(
    (r) =>
      r.indexing === "WEB_OF_SCIENCE" ||
      r.indexingList?.some((il) => il.sourceName === "WEB_OF_SCIENCE")
  ).length;

  const q1q2Count = records.filter(
    (r) =>
      r.quartiles?.[0]?.quartile === "Q1" ||
      r.quartiles?.[0]?.quartile === "Q2"
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
            <BookOpen className="text-indigo-600" size={26} />
            Research Publications Repository
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Department of MCA • Dayananda Sagar Academy of Technology & Management • NIRF Research & Professional Practice (RP)
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
              Add Publication
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Records
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{total}</div>
          <div className="text-xs text-slate-500 mt-1">Departmental publications</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Scopus Indexed
          </div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{scopusCount}</div>
          <div className="text-xs text-slate-500 mt-1">Eligible for PU metric calculation</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Web of Science
          </div>
          <div className="text-2xl font-bold text-blue-600 mt-1">{wosCount}</div>
          <div className="text-xs text-slate-500 mt-1">Cross-verified citations</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            High Impact (Q1/Q2)
          </div>
          <div className="text-2xl font-bold text-purple-600 mt-1">{q1q2Count}</div>
          <div className="text-xs text-slate-500 mt-1">Top-quartile journal papers</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search by title, author, venue, or DOI..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <select
          value={indexingFilter}
          onChange={(e) => {
            setIndexingFilter(e.target.value);
            setPage(1);
          }}
          className="text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Indexing</option>
          <option value="SCOPUS">Scopus</option>
          <option value="WEB_OF_SCIENCE">Web of Science</option>
          <option value="UGC_CARE">UGC-CARE</option>
          <option value="OTHER">Other</option>
        </select>
        <select
          value={yearFilter}
          onChange={(e) => {
            setYearFilter(e.target.value);
            setPage(1);
          }}
          className="text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Years</option>
          <option value="2025">2025</option>
          <option value="2024">2024</option>
          <option value="2023">2023</option>
          <option value="2022">2022</option>
          <option value="2021">2021</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Statuses</option>
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

      {/* Publications Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="animate-spin mb-2" size={32} />
            <p className="text-sm">Loading publications...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <BookOpen className="mx-auto mb-2 text-slate-400" size={36} />
            <p className="font-semibold text-slate-700">No publications found</p>
            <p className="text-xs text-slate-500 mt-1">
              Add verified departmental research papers to compute NIRF PU metrics.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Publication Details</th>
                  <th className="px-4 py-3">Authors & Affiliation</th>
                  <th className="px-4 py-3">Indexing & Quality</th>
                  <th className="px-4 py-3">Year / Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {records.map((rec) => {
                  const hasClaim = !!rec.claimedBy;
                  const isArchived = rec.status === "ARCHIVED";

                  return (
                    <tr
                      key={rec._id}
                      className={`hover:bg-slate-50 transition-colors ${
                        isArchived ? "bg-slate-50/60 opacity-75" : ""
                      }`}
                    >
                      <td className="px-4 py-3 max-w-md">
                        <div className="font-medium text-slate-900 line-clamp-2">
                          {rec.title}
                        </div>
                        <div className="text-xs text-slate-500 mt-1 line-clamp-1">
                          <span className="font-semibold text-slate-700">
                            {rec.journalOrConference}
                          </span>
                          {rec.publisher ? ` • ${rec.publisher}` : ""}
                        </div>
                        {rec.doi && (
                          <div className="mt-1">
                            <a
                              href={
                                rec.doi.startsWith("http")
                                  ? rec.doi
                                  : `https://doi.org/${rec.doi}`
                              }
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-indigo-600 hover:underline inline-flex items-center gap-1"
                            >
                              DOI: {rec.doi}
                              <ExternalLink size={10} />
                            </a>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <div className="text-xs text-slate-800 line-clamp-2">
                          {(rec.authors || []).join(", ")}
                        </div>
                        {hasClaim && (
                          <div className="mt-1 flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md w-fit">
                            <UserCheck size={12} />
                            <span>Claimed</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium w-fit ${
                              rec.indexing === "SCOPUS"
                                ? "bg-emerald-100 text-emerald-800"
                                : rec.indexing === "WEB_OF_SCIENCE"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-slate-100 text-slate-800"
                            }`}
                          >
                            {rec.indexing}
                          </span>
                          {rec.quartiles?.[0]?.quartile &&
                            rec.quartiles[0].quartile !== "UNKNOWN" && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-purple-50 text-purple-700 w-fit">
                                {rec.quartiles[0].quartile}
                              </span>
                            )}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-600">
                        {rec.publicationYear}
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
                          {isContributorOrAdmin && !hasClaim && (
                            <button
                              onClick={() => handleClaim(rec._id)}
                              disabled={claimingId === rec._id}
                              className="px-2 py-1 text-xs text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded transition-colors inline-flex items-center gap-1"
                              title="Claim authorship"
                            >
                              <UserCheck size={12} />
                              Claim
                            </button>
                          )}
                          {isContributorOrAdmin && !isArchived && (
                            <button
                              onClick={() => openEditModal(rec)}
                              className="p-1 text-slate-500 hover:text-indigo-600 transition-colors"
                              title="Edit publication"
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
                <BookOpen className="text-indigo-600" size={20} />
                {editingRecord ? "Edit Research Publication" : "Add Research Publication"}
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
                  Paper Title *
                </label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Deep Learning Approaches in Anomaly Detection for Cloud Services"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Publication Type *
                  </label>
                  <select
                    value={form.publicationType}
                    onChange={(e) => setForm({ ...form, publicationType: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="JOURNAL">Journal</option>
                    <option value="CONFERENCE">Conference Proceeding</option>
                    <option value="BOOK_CHAPTER">Book Chapter</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Publication Status *
                  </label>
                  <select
                    value={form.pubStatus}
                    onChange={(e) => setForm({ ...form, pubStatus: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="PUBLISHED">Published</option>
                    <option value="ACCEPTED_IN_PRESS">Accepted in Press</option>
                    <option value="UNDER_REVIEW">Under Review</option>
                    <option value="PREPRINT">Preprint</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Journal / Conference Name *
                </label>
                <input
                  type="text"
                  required
                  value={form.journalOrConference}
                  onChange={(e) => setForm({ ...form, journalOrConference: e.target.value })}
                  placeholder="e.g. IEEE Transactions on Knowledge and Data Engineering"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Authors (Comma-separated) *
                </label>
                <input
                  type="text"
                  required
                  value={form.authorsInput}
                  onChange={(e) => setForm({ ...form, authorsInput: e.target.value })}
                  placeholder="e.g. Dr. A. Kumar, Prof. B. Sharma, C. Patil"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  List authors in publication sequence. Contributor accounts can claim authorship afterward.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Publication Year *
                  </label>
                  <input
                    type="number"
                    required
                    min={1990}
                    max={2030}
                    value={form.publicationYear}
                    onChange={(e) => setForm({ ...form, publicationYear: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Primary Indexing *
                  </label>
                  <select
                    value={form.indexing}
                    onChange={(e) => setForm({ ...form, indexing: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="SCOPUS">Scopus</option>
                    <option value="WEB_OF_SCIENCE">Web of Science</option>
                    <option value="UGC_CARE">UGC-CARE</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Quartile (If Journal)
                  </label>
                  <select
                    value={form.primaryQuartile}
                    onChange={(e) => setForm({ ...form, primaryQuartile: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="UNKNOWN">Not Specified / Unknown</option>
                    <option value="Q1">Q1</option>
                    <option value="Q2">Q2</option>
                    <option value="Q3">Q3</option>
                    <option value="Q4">Q4</option>
                    <option value="NOT_APPLICABLE">Not Applicable</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    DOI (Digital Object Identifier)
                  </label>
                  <input
                    type="text"
                    value={form.doi}
                    onChange={(e) => setForm({ ...form, doi: e.target.value })}
                    placeholder="10.1109/TKDE.2023.1234567"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Article URL
                  </label>
                  <input
                    type="url"
                    value={form.url}
                    onChange={(e) => setForm({ ...form, url: e.target.value })}
                    placeholder="https://ieeexplore.ieee.org/document/..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Publisher
                  </label>
                  <input
                    type="text"
                    value={form.publisher}
                    onChange={(e) => setForm({ ...form, publisher: e.target.value })}
                    placeholder="e.g. IEEE, Springer, Elsevier"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ISSN / ISBN
                  </label>
                  <input
                    type="text"
                    value={form.issnOrIsbn}
                    onChange={(e) => setForm({ ...form, issnOrIsbn: e.target.value })}
                    placeholder="e.g. 1041-4347"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Volume / Issue / Pages
                  </label>
                  <input
                    type="text"
                    value={form.pages}
                    onChange={(e) => setForm({ ...form, pages: e.target.value })}
                    placeholder="e.g. Vol 35, Iss 4, pp. 100-112"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
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
                    {editingRecord ? "Update Record" : "Save Record"}
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
        moduleName="publications"
        moduleTitle="Publications"
        onImportSuccess={fetchRecords}
      />
    </div>
  );
}
