"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  BookOpen,
  Search,
  Plus,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  FileCheck,
  ArrowLeft,
  X,
  Loader2,
  Trash2,
  Edit,
  ShieldCheck,
  Paperclip,
  Award,
  Briefcase,
} from "lucide-react";

interface FacultyRecord {
  _id: string;
  facultyId: string;
  name: string;
  email: string;
  designation: string;
  employmentType: "PERMANENT" | "CONTRACT" | "VISITING" | "ADJUNCT";
  department: string;
  highestQualification: string;
  phdStatus: "AWARDED" | "PURSUING" | "NOT_APPLICABLE";
  phdAwardYear?: number | null;
  experienceYears: number;
  joiningDate: string;
  leavingDate?: string | null;
  researchDomains?: string[];
  academicYear: string;
  status: "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED" | "CORRECTION_REQUESTED";
  reviewerComment?: string;
  evidenceReferences?: Array<{ fileName: string; fileUrl: string; fileSize: number }>;
  createdBy?: { _id: string; name: string; email: string; role: string };
  createdAt: string;
}

interface FacultyFormState {
  facultyId: string;
  name: string;
  email: string;
  designation: string;
  employmentType: "PERMANENT" | "CONTRACT" | "VISITING" | "ADJUNCT";
  highestQualification: string;
  phdStatus: "AWARDED" | "PURSUING" | "NOT_APPLICABLE";
  phdAwardYear: string;
  experienceYears: string;
  joiningDate: string;
  leavingDate: string;
  researchDomains: string;
  academicYear: string;
}

const EMPTY_FORM: FacultyFormState = {
  facultyId: "",
  name: "",
  email: "",
  designation: "",
  employmentType: "PERMANENT",
  highestQualification: "",
  phdStatus: "NOT_APPLICABLE",
  phdAwardYear: "",
  experienceYears: "",
  joiningDate: "",
  leavingDate: "",
  researchDomains: "",
  academicYear: "",
};

type FormState = FacultyFormState;

export default function FacultyPage() {
  const router = useRouter();

  const [faculty, setFaculty] = useState<FacultyRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Filters & Search
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [employmentFilter, setEmploymentFilter] = useState("");
  const [phdFilter, setPhdFilter] = useState("");
  const [page, setPage] = useState(1);

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState<FacultyRecord | null>(null);
  const [reviewingFaculty, setReviewingFaculty] = useState<FacultyRecord | null>(null);
  const [reviewDecision, setReviewDecision] = useState<"APPROVE" | "REJECT" | "REQUEST_CORRECTION">("APPROVE");
  const [reviewComment, setReviewComment] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Evidence modal state
  const [evidenceFaculty, setEvidenceFaculty] = useState<FacultyRecord | null>(null);
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [evidenceLoading, setEvidenceLoading] = useState(false);

  // Form state
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const LIMIT = 20;

  // Fetch current user
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
      .catch(() => router.push("/login"));
  }, [router]);

  const canCreate = currentUser?.role === "DEPARTMENT_ADMIN" || currentUser?.role === "FACULTY_CONTRIBUTOR";
  const canReview = currentUser?.role === "DEPARTMENT_ADMIN" || currentUser?.role === "REVIEWER";
  const canDelete = currentUser?.role === "DEPARTMENT_ADMIN";

  // Fetch faculty records
  const fetchFaculty = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (statusFilter) params.set("status", statusFilter);
      if (employmentFilter) params.set("employmentType", employmentFilter);
      if (phdFilter) params.set("phdStatus", phdFilter);
      params.set("page", String(page));
      params.set("limit", String(LIMIT));

      const res = await fetch(`/api/faculty?${params.toString()}`);
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch faculty");
      const data = await res.json();
      setFaculty(data.data || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, employmentFilter, phdFilter, page, router]);

  useEffect(() => {
    if (currentUser) fetchFaculty();
  }, [currentUser, fetchFaculty]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, employmentFilter, phdFilter]);

  function openAdd() {
    setForm(EMPTY_FORM);
    setFormError(null);
    setEditingFaculty(null);
    setShowAddModal(true);
  }

  function openEdit(f: FacultyRecord) {
    setForm({
      facultyId: f.facultyId || "",
      name: f.name || "",
      email: f.email || "",
      designation: f.designation || "",
      employmentType: f.employmentType || "PERMANENT",
      highestQualification: f.highestQualification || "",
      phdStatus: f.phdStatus || "NOT_APPLICABLE",
      phdAwardYear: f.phdAwardYear ? String(f.phdAwardYear) : "",
      experienceYears: f.experienceYears != null ? String(f.experienceYears) : "",
      joiningDate: f.joiningDate ? f.joiningDate.slice(0, 10) : "",
      leavingDate: f.leavingDate ? f.leavingDate.slice(0, 10) : "",
      researchDomains: Array.isArray(f.researchDomains) ? f.researchDomains.join(", ") : "",
      academicYear: f.academicYear || "",
    });
    setFormError(null);
    setEditingFaculty(f);
    setShowAddModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);
    try {
      const payload: Record<string, unknown> = {
        facultyId: form.facultyId,
        name: form.name,
        email: form.email,
        designation: form.designation,
        employmentType: form.employmentType,
        department: "MCA",
        highestQualification: form.highestQualification,
        phdStatus: form.phdStatus,
        experienceYears: Number(form.experienceYears),
        joiningDate: form.joiningDate,
        academicYear: form.academicYear,
      };
      if (form.phdAwardYear) payload.phdAwardYear = Number(form.phdAwardYear);
      if (form.leavingDate) payload.leavingDate = form.leavingDate;
      if (form.researchDomains) {
        payload.researchDomains = form.researchDomains
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      }

      const url = editingFaculty ? `/api/faculty/${editingFaculty._id}` : "/api/faculty";
      const method = editingFaculty ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || data.message || "Failed to save faculty record");
        return;
      }
      setShowAddModal(false);
      fetchFaculty();
    } catch (err) {
      setFormError("Network error. Please try again.");
    } finally {
      setFormLoading(false);
    }
  }

  async function handleDelete(f: FacultyRecord) {
    if (!confirm(`Delete faculty record for "${f.name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/faculty/${f._id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to delete");
        return;
      }
      fetchFaculty();
    } catch {
      alert("Network error. Please try again.");
    }
  }

  async function handleReview(e: React.FormEvent) {
    e.preventDefault();
    if (!reviewingFaculty) return;
    setFormLoading(true);
    setFormError(null);
    try {
      const res = await fetch(`/api/faculty/${reviewingFaculty._id}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision: reviewDecision, comment: reviewComment }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Failed to submit review");
        return;
      }
      setReviewingFaculty(null);
      setReviewComment("");
      setReviewDecision("APPROVE");
      fetchFaculty();
    } catch {
      setFormError("Network error.");
    } finally {
      setFormLoading(false);
    }
  }

  async function handleEvidenceUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!evidenceFaculty || !evidenceFile) return;
    setEvidenceLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", evidenceFile);
      fd.append("recordId", evidenceFaculty._id);
      fd.append("recordType", "Faculty");
      const res = await fetch("/api/upload/evidence", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Upload failed");
        return;
      }
      setEvidenceFaculty(null);
      setEvidenceFile(null);
      fetchFaculty();
    } catch {
      alert("Upload error.");
    } finally {
      setEvidenceLoading(false);
    }
  }

  // KPI Computations
  const approvedCount = faculty.filter((f) => f.status === "APPROVED").length;
  const phdCount = faculty.filter((f) => f.phdStatus === "AWARDED").length;
  const permanentCount = faculty.filter((f) => f.employmentType === "PERMANENT").length;

  const totalPages = Math.ceil(total / LIMIT) || 1;

  function statusBadge(status: string) {
    const map: Record<string, string> = {
      DRAFT: "bg-gray-100 text-gray-700",
      SUBMITTED: "bg-blue-100 text-blue-700",
      APPROVED: "bg-green-100 text-green-700",
      REJECTED: "bg-red-100 text-red-700",
      CORRECTION_REQUESTED: "bg-yellow-100 text-yellow-800",
    };
    return map[status] || "bg-gray-100 text-gray-600";
  }

  function empTypeBadge(type: string) {
    const map: Record<string, string> = {
      PERMANENT: "bg-indigo-100 text-indigo-700",
      CONTRACT: "bg-orange-100 text-orange-700",
      VISITING: "bg-purple-100 text-purple-700",
      ADJUNCT: "bg-teal-100 text-teal-700",
    };
    return map[type] || "bg-gray-100 text-gray-600";
  }

  function phdBadge(status: string) {
    const map: Record<string, string> = {
      AWARDED: "bg-green-100 text-green-700",
      PURSUING: "bg-blue-100 text-blue-700",
      NOT_APPLICABLE: "bg-gray-100 text-gray-500",
    };
    return map[status] || "bg-gray-100 text-gray-600";
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/dashboard")}
              className="flex items-center gap-1 text-gray-500 hover:text-gray-700 text-sm transition-colors"
            >
              <ArrowLeft size={16} />
              Dashboard
            </button>
            <span className="text-gray-300">/</span>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Users size={20} className="text-indigo-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Faculty Records</h1>
                <p className="text-xs text-gray-500">MCA Department — NIRF Data Management</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">
              Logged in as <span className="font-medium text-gray-700">{currentUser.name}</span>
              <span className="ml-1 text-xs text-indigo-600">({currentUser.role})</span>
            </span>
            {canCreate && (
              <button
                onClick={openAdd}
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
              >
                <Plus size={16} />
                Add Faculty
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg"><Users size={18} className="text-indigo-600" /></div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{total}</p>
                <p className="text-xs text-gray-500">Total Faculty</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg"><CheckCircle2 size={18} className="text-green-600" /></div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{approvedCount}</p>
                <p className="text-xs text-gray-500">Approved</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg"><Award size={18} className="text-purple-600" /></div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{phdCount}</p>
                <p className="text-xs text-gray-500">PhD Awarded</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg"><Briefcase size={18} className="text-blue-600" /></div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{permanentCount}</p>
                <p className="text-xs text-gray-500">Permanent</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex-1 min-w-48 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, ID, designation…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="CORRECTION_REQUESTED">Correction Requested</option>
            </select>
            <select
              value={employmentFilter}
              onChange={(e) => setEmploymentFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              <option value="">All Employment Types</option>
              <option value="PERMANENT">Permanent</option>
              <option value="CONTRACT">Contract</option>
              <option value="VISITING">Visiting</option>
              <option value="ADJUNCT">Adjunct</option>
            </select>
            <select
              value={phdFilter}
              onChange={(e) => setPhdFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              <option value="">All PhD Status</option>
              <option value="AWARDED">PhD Awarded</option>
              <option value="PURSUING">Pursuing</option>
              <option value="NOT_APPLICABLE">Not Applicable</option>
            </select>
            <button
              onClick={fetchFaculty}
              className="flex items-center gap-1 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <RefreshCw size={14} />
              Refresh
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="animate-spin text-indigo-600" size={28} />
            </div>
          ) : faculty.length === 0 ? (
            <div className="text-center py-20">
              <Users size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 text-sm">No faculty records found.</p>
              {canCreate && (
                <button onClick={openAdd} className="mt-3 text-indigo-600 text-sm hover:underline">
                  Add the first record
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 text-gray-600 font-medium">Faculty</th>
                      <th className="text-left px-4 py-3 text-gray-600 font-medium">Designation</th>
                      <th className="text-left px-4 py-3 text-gray-600 font-medium">Employment</th>
                      <th className="text-left px-4 py-3 text-gray-600 font-medium">PhD</th>
                      <th className="text-left px-4 py-3 text-gray-600 font-medium">Experience</th>
                      <th className="text-left px-4 py-3 text-gray-600 font-medium">Joining</th>
                      <th className="text-left px-4 py-3 text-gray-600 font-medium">Status</th>
                      <th className="text-right px-4 py-3 text-gray-600 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {faculty.map((f) => (
                      <tr key={f._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{f.name}</div>
                          <div className="text-xs text-gray-500">{f.facultyId} · {f.email}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{f.designation}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${empTypeBadge(f.employmentType)}`}>
                            {f.employmentType}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${phdBadge(f.phdStatus)}`}>
                            {f.phdStatus === "AWARDED" ? `PhD${f.phdAwardYear ? ` (${f.phdAwardYear})` : ""}` : f.phdStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{f.experienceYears} yrs</td>
                        <td className="px-4 py-3 text-gray-600 text-xs">
                          {f.joiningDate ? new Date(f.joiningDate).toLocaleDateString("en-IN") : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge(f.status)}`}>
                            {f.status}
                          </span>
                          {f.reviewerComment && (
                            <p className="text-xs text-gray-400 mt-0.5 truncate max-w-32" title={f.reviewerComment}>
                              {f.reviewerComment}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            {canCreate && (
                              <button
                                onClick={() => openEdit(f)}
                                title="Edit"
                                className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                              >
                                <Edit size={14} />
                              </button>
                            )}
                            {canReview && f.status === "SUBMITTED" && (
                              <button
                                onClick={() => { setReviewingFaculty(f); setReviewDecision("APPROVE"); setReviewComment(""); setFormError(null); }}
                                title="Review"
                                className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                              >
                                <ShieldCheck size={14} />
                              </button>
                            )}
                            <button
                              onClick={() => { setEvidenceFaculty(f); setEvidenceFile(null); }}
                              title="Attach Evidence"
                              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            >
                              <Paperclip size={14} />
                            </button>
                            {canDelete && (
                              <button
                                onClick={() => handleDelete(f)}
                                title="Delete"
                                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
                <p className="text-xs text-gray-500">
                  Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total} records
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-white transition-colors"
                  >
                    Previous
                  </button>
                  <span className="text-xs text-gray-600">Page {page} of {totalPages}</span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-white transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingFaculty ? "Edit Faculty Record" : "Add Faculty Record"}
              </h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{formError}</div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Faculty ID *</label>
                  <input
                    required
                    value={form.facultyId}
                    onChange={(e) => setForm((f) => ({ ...f, facultyId: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    placeholder="FAC001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    placeholder="Dr. Jane Smith"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    placeholder="faculty@institution.ac.in"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Designation *</label>
                  <input
                    required
                    value={form.designation}
                    onChange={(e) => setForm((f) => ({ ...f, designation: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    placeholder="Assistant Professor"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employment Type *</label>
                  <select
                    required
                    value={form.employmentType}
                    onChange={(e) => setForm((f) => ({ ...f, employmentType: e.target.value as any }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  >
                    <option value="PERMANENT">Permanent</option>
                    <option value="CONTRACT">Contract</option>
                    <option value="VISITING">Visiting</option>
                    <option value="ADJUNCT">Adjunct</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Highest Qualification *</label>
                  <input
                    required
                    value={form.highestQualification}
                    onChange={(e) => setForm((f) => ({ ...f, highestQualification: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    placeholder="Ph.D. Computer Science"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PhD Status *</label>
                  <select
                    required
                    value={form.phdStatus}
                    onChange={(e) => setForm((f) => ({ ...f, phdStatus: e.target.value as any }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  >
                    <option value="AWARDED">Awarded</option>
                    <option value="PURSUING">Pursuing</option>
                    <option value="NOT_APPLICABLE">Not Applicable</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PhD Award Year</label>
                  <input
                    type="number"
                    value={form.phdAwardYear}
                    onChange={(e) => setForm((f) => ({ ...f, phdAwardYear: e.target.value }))}
                    min={1970}
                    max={new Date().getFullYear()}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    placeholder={form.phdStatus === "AWARDED" ? "2018" : ""}
                    disabled={form.phdStatus !== "AWARDED"}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Experience (years) *</label>
                  <input
                    required
                    type="number"
                    value={form.experienceYears}
                    onChange={(e) => setForm((f) => ({ ...f, experienceYears: e.target.value }))}
                    min={0}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    placeholder="8"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Joining Date *</label>
                  <input
                    required
                    type="date"
                    value={form.joiningDate}
                    onChange={(e) => setForm((f) => ({ ...f, joiningDate: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Leaving Date</label>
                  <input
                    type="date"
                    value={form.leavingDate}
                    onChange={(e) => setForm((f) => ({ ...f, leavingDate: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year *</label>
                  <input
                    required
                    value={form.academicYear}
                    onChange={(e) => setForm((f) => ({ ...f, academicYear: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    placeholder="2024-25"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Research Domains</label>
                  <input
                    value={form.researchDomains}
                    onChange={(e) => setForm((f) => ({ ...f, researchDomains: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    placeholder="AI, ML, Data Science (comma-separated)"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 transition-colors"
                >
                  {formLoading && <Loader2 size={14} className="animate-spin" />}
                  {editingFaculty ? "Save Changes" : "Add Faculty"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewingFaculty && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Review Faculty Record</h2>
              <button onClick={() => setReviewingFaculty(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleReview} className="p-6 space-y-4">
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{formError}</div>
              )}
              <p className="text-sm text-gray-600">
                Reviewing: <span className="font-medium">{reviewingFaculty.name}</span>
                <span className="text-gray-400 ml-1">({reviewingFaculty.facultyId})</span>
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Decision *</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["APPROVE", "REJECT", "REQUEST_CORRECTION"] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setReviewDecision(d)}
                      className={`py-2 px-2 rounded-lg text-xs font-medium border transition-colors ${
                        reviewDecision === d
                          ? d === "APPROVE"
                            ? "bg-green-600 text-white border-green-600"
                            : d === "REJECT"
                            ? "bg-red-600 text-white border-red-600"
                            : "bg-yellow-500 text-white border-yellow-500"
                          : "border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {d === "APPROVE" ? "Approve" : d === "REJECT" ? "Reject" : "Request Correction"}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Comment {reviewDecision !== "APPROVE" ? "*" : "(optional)"}
                </label>
                <textarea
                  required={reviewDecision !== "APPROVE"}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  placeholder="Add reviewer notes or correction instructions…"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setReviewingFaculty(null)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-60"
                >
                  {formLoading && <Loader2 size={14} className="animate-spin" />}
                  Submit Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Evidence Upload Modal */}
      {evidenceFaculty && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Attach Evidence</h2>
              <button onClick={() => setEvidenceFaculty(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleEvidenceUpload} className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                Attaching to: <span className="font-medium">{evidenceFaculty.name}</span>
              </p>
              {evidenceFaculty.evidenceReferences && evidenceFaculty.evidenceReferences.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-2 font-medium">Existing Evidence:</p>
                  <ul className="space-y-1">
                    {evidenceFaculty.evidenceReferences.map((ev, i) => (
                      <li key={i} className="text-xs text-blue-600 hover:underline">
                        <a href={ev.fileUrl} target="_blank" rel="noopener noreferrer">{ev.fileName}</a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Upload File *</label>
                <input
                  required
                  type="file"
                  onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xlsx,.xls"
                />
                <p className="text-xs text-gray-400 mt-1">PDF, images, Word, or Excel files accepted.</p>
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEvidenceFaculty(null)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={evidenceLoading || !evidenceFile}
                  className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-60"
                >
                  {evidenceLoading && <Loader2 size={14} className="animate-spin" />}
                  Upload
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

