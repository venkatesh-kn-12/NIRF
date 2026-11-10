"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  GraduationCap,
  Users,
  Search,
  Filter,
  Plus,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  FileCheck,
  ChevronRight,
  ArrowLeft,
  X,
  Loader2,
  Trash2,
  Edit,
  ShieldCheck,
  Paperclip,
} from "lucide-react";

interface StudentRecord {
  _id: string;
  studentId: string;
  prn: string;
  name: string;
  email: string;
  programme: string;
  batch: string;
  admissionYear: number;
  gender: "MALE" | "FEMALE" | "OTHER";
  dateOfBirth: string;
  domicileState: string;
  domicileType: "HOME_STATE" | "OTHER_STATE" | "INTERNATIONAL";
  category: string;
  currentStatus: "ACTIVE" | "GRADUATED" | "DISCONTINUED";
  currentSemester: number;
  expectedGraduationYear: number;
  actualGraduationYear?: number | null;
  higherStudiesStatus: string;
  department: string;
  academicYear: string;
  status: "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED" | "CORRECTION_REQUESTED";
  reviewerComment?: string;
  evidenceReferences?: Array<{ fileName: string; fileUrl: string; fileSize: number }>;
  createdBy?: { _id: string; name: string; email: string; role: string };
  createdAt: string;
}

export default function StudentsPage() {
  const router = useRouter();

  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Filters & Search
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [domicileFilter, setDomicileFilter] = useState("");
  const [batchFilter, setBatchFilter] = useState("");
  const [page, setPage] = useState(1);

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentRecord | null>(null);
  const [reviewingStudent, setReviewingStudent] = useState<StudentRecord | null>(null);
  const [reviewDecision, setReviewDecision] = useState<"APPROVE" | "REJECT" | "REQUEST_CORRECTION">("APPROVE");
  const [reviewComment, setReviewComment] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Evidence modal state
  const [evidenceStudent, setEvidenceStudent] = useState<StudentRecord | null>(null);
  const [evidenceFileName, setEvidenceFileName] = useState("");
  const [evidenceFileUrl, setEvidenceFileUrl] = useState("");

  // Form fields
  const [formData, setFormData] = useState({
    studentId: "",
    prn: "",
    name: "",
    email: "",
    batch: "2023-2025",
    admissionYear: 2023,
    gender: "MALE" as "MALE" | "FEMALE" | "OTHER",
    dateOfBirth: "2001-05-15",
    domicileState: "Karnataka",
    domicileType: "HOME_STATE" as "HOME_STATE" | "OTHER_STATE" | "INTERNATIONAL",
    category: "OPEN",
    currentStatus: "ACTIVE" as "ACTIVE" | "GRADUATED" | "DISCONTINUED",
    currentSemester: 3,
    expectedGraduationYear: 2025,
    higherStudiesStatus: "NOT_PURSUING",
    academicYear: "2023-24",
  });

  // Load current user
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
      } catch (err) {
        console.error("User auth error:", err);
      }
    }
    loadUser();
  }, [router]);

  // Fetch students
  const fetchStudents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (statusFilter) params.set("status", statusFilter);
      if (domicileFilter) params.set("domicileType", domicileFilter);
      if (batchFilter) params.set("batch", batchFilter);
      params.set("page", page.toString());
      params.set("limit", "20");

      const res = await fetch(`/api/students?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setStudents(data.data || []);
        setTotal(data.total || 0);
      }
    } catch (err) {
      console.error("Fetch students error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [search, statusFilter, domicileFilter, batchFilter, page]);

  // KPI calculations
  const totalEnrolled = total;
  const activeCount = students.filter((s) => s.currentStatus === "ACTIVE").length;
  const approvedCount = students.filter((s) => s.status === "APPROVED").length;

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);

    try {
      const method = editingStudent ? "PUT" : "POST";
      const url = editingStudent ? `/api/students/${editingStudent._id}` : "/api/students";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save student record");
      }

      setShowAddModal(false);
      setEditingStudent(null);
      fetchStudents();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setFormError(err.message);
      } else {
        setFormError("Failed to save record");
      }
    } finally {
      setFormLoading(false);
    }
  };

  const handleReview = async () => {
    if (!reviewingStudent) return;
    setFormLoading(true);
    try {
      const res = await fetch(`/api/students/${reviewingStudent._id}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision: reviewDecision, comment: reviewComment }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Review submission failed");
      }
      setReviewingStudent(null);
      setReviewComment("");
      fetchStudents();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error processing review");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this student record?")) return;
    try {
      const res = await fetch(`/api/students/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Delete failed");
      }
      fetchStudents();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error deleting record");
    }
  };

  const handleAttachEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evidenceStudent) return;
    setFormLoading(true);
    try {
      const res = await fetch("/api/upload/evidence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordId: evidenceStudent._id,
          fileName: evidenceFileName,
          fileUrl: evidenceFileUrl,
          fileSize: 1048576,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to attach evidence");
      }
      setEvidenceStudent(null);
      setEvidenceFileName("");
      setEvidenceFileUrl("");
      fetchStudents();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error uploading evidence");
    } finally {
      setFormLoading(false);
    }
  };

  const openEditModal = (student: StudentRecord) => {
    setEditingStudent(student);
    setFormData({
      studentId: student.studentId,
      prn: student.prn,
      name: student.name,
      email: student.email,
      batch: student.batch,
      admissionYear: student.admissionYear,
      gender: student.gender,
      dateOfBirth: student.dateOfBirth.slice(0, 10),
      domicileState: student.domicileState,
      domicileType: student.domicileType,
      category: student.category,
      currentStatus: student.currentStatus,
      currentSemester: student.currentSemester,
      expectedGraduationYear: student.expectedGraduationYear,
      higherStudiesStatus: student.higherStudiesStatus,
      academicYear: student.academicYear,
    });
    setShowAddModal(true);
  };

  const statusBadge: Record<string, { label: string; className: string }> = {
    APPROVED: { label: "Approved", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
    SUBMITTED: { label: "Submitted", className: "bg-blue-100 text-blue-800 border-blue-200" },
    DRAFT: { label: "Draft", className: "bg-slate-100 text-slate-700 border-slate-200" },
    REJECTED: { label: "Rejected", className: "bg-red-100 text-red-800 border-red-200" },
    CORRECTION_REQUESTED: { label: "Needs Correction", className: "bg-amber-100 text-amber-800 border-amber-200" },
  };

  const userRole = currentUser?.role;
  const canCreateOrEdit = userRole === "DEPARTMENT_ADMIN" || userRole === "FACULTY_CONTRIBUTOR";
  const canReview = userRole === "DEPARTMENT_ADMIN" || userRole === "REVIEWER";
  const canDelete = userRole === "DEPARTMENT_ADMIN";

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Top Header */}
      <header className="h-16 bg-white border-b border-slate-200 px-6 sm:px-8 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard")}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
            title="Dashboard"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-[#1D4ED8] flex items-center justify-center text-white">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900">Student Repository</div>
              <div className="text-[11px] text-slate-500">Department of Computer Applications (MCA)</div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {canCreateOrEdit && (
            <button
              onClick={() => {
                setEditingStudent(null);
                setShowAddModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1D4ED8] text-white hover:bg-blue-800 text-xs font-semibold shadow-sm transition"
            >
              <Plus className="h-4 w-4" />
              <span>Add Student</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Breadcrumb & Title */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-1 text-xs text-slate-500 mb-1">
              <span>Department Data</span>
              <ChevronRight className="h-3 w-3" />
              <span className="text-[#1D4ED8] font-semibold">Student Enrolment (OI 1.1 &amp; 1.2)</span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Student Data</h1>
            <p className="text-xs text-slate-600 mt-1 max-w-2xl">
              Student enrolment, demographic diversity (Home State / Other State / International), category distributions, and graduation outcomes for NIRF compliance.
            </p>
          </div>
        </div>

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between text-xs text-slate-500 uppercase font-semibold">
              <span>Total Enrolled</span>
              <Users className="h-4 w-4 text-[#1D4ED8]" />
            </div>
            <div className="mt-3 text-3xl font-extrabold text-slate-900">{totalEnrolled}</div>
            <div className="mt-1 text-[11px] text-slate-500">Sanctioned AICTE MCA Intake Compliant</div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between text-xs text-slate-500 uppercase font-semibold">
              <span>Active On-Roll</span>
              <FileCheck className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="mt-3 text-3xl font-extrabold text-slate-900">{activeCount}</div>
            <div className="mt-1 text-[11px] text-slate-500">Currently enrolled across active semesters</div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between text-xs text-slate-500 uppercase font-semibold">
              <span>Verified &amp; Approved</span>
              <ShieldCheck className="h-4 w-4 text-blue-600" />
            </div>
            <div className="mt-3 text-3xl font-extrabold text-slate-900">{approvedCount}</div>
            <div className="mt-1 text-[11px] text-slate-500">Eligible for deterministic metric computation (Rule 7)</div>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search student by name, student ID, PRN or email..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Filter className="h-4 w-4 text-slate-400" />
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
            >
              <option value="">All Statuses</option>
              <option value="APPROVED">Approved</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="DRAFT">Draft</option>
              <option value="REJECTED">Rejected</option>
              <option value="CORRECTION_REQUESTED">Correction Requested</option>
            </select>

            {/* Domicile Filter */}
            <select
              value={domicileFilter}
              onChange={(e) => setDomicileFilter(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
            >
              <option value="">All Domiciles</option>
              <option value="HOME_STATE">Home State</option>
              <option value="OTHER_STATE">Other State</option>
              <option value="INTERNATIONAL">International</option>
            </select>

            <button
              onClick={() => fetchStudents()}
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
              title="Refresh"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-5 py-3.5">Student ID &amp; PRN</th>
                  <th className="px-5 py-3.5">Student Name</th>
                  <th className="px-5 py-3.5">Batch / Sem</th>
                  <th className="px-5 py-3.5">Domicile</th>
                  <th className="px-5 py-3.5">Category &amp; Gender</th>
                  <th className="px-5 py-3.5">Evidence</th>
                  <th className="px-5 py-3.5">Verification</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-500">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-6 w-6 animate-spin text-[#1D4ED8]" />
                        <span>Loading student records...</span>
                      </div>
                    </td>
                  </tr>
                ) : students.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-400">
                      No student records found. Click &quot;Add Student&quot; to enter authorised records.
                    </td>
                  </tr>
                ) : (
                  students.map((student) => (
                    <tr key={student._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-slate-900 font-mono">{student.studentId}</div>
                        <div className="text-[11px] text-slate-500 font-mono">PRN: {student.prn}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-slate-800">{student.name}</div>
                        <div className="text-[11px] text-slate-500">{student.email}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-medium text-slate-800">{student.batch}</div>
                        <div className="text-[11px] text-slate-500">Sem {student.currentSemester}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-medium text-slate-800">{student.domicileState}</div>
                        <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700">
                          {student.domicileType}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-medium text-slate-800">{student.category}</span>
                        <div className="text-[11px] text-slate-500">{student.gender}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <button
                          onClick={() => setEvidenceStudent(student)}
                          className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline"
                        >
                          <Paperclip className="h-3 w-3" />
                          <span>{student.evidenceReferences?.length || 0} files</span>
                        </button>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            statusBadge[student.status]?.className || "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {statusBadge[student.status]?.label || student.status}
                        </span>
                        {student.reviewerComment && (
                          <div className="text-[10px] text-slate-500 italic mt-0.5 max-w-xs truncate" title={student.reviewerComment}>
                            {student.reviewerComment}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          {/* Review Action */}
                          {canReview && (
                            <button
                              onClick={() => {
                                setReviewingStudent(student);
                                setReviewComment(student.reviewerComment || "");
                              }}
                              className="px-2 py-1 rounded border border-blue-200 text-blue-700 hover:bg-blue-50 text-[11px] font-semibold"
                            >
                              Verify
                            </button>
                          )}

                          {/* Edit Action */}
                          {canCreateOrEdit && (
                            <button
                              onClick={() => openEditModal(student)}
                              className="p-1 rounded text-slate-600 hover:bg-slate-100"
                              title="Edit Record"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                          )}

                          {/* Delete Action */}
                          {canDelete && (
                            <button
                              onClick={() => handleDelete(student._id)}
                              className="p-1 rounded text-red-600 hover:bg-red-50"
                              title="Delete Record"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Add / Edit Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingStudent ? "Edit Student Record" : "Add Student Record"}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveStudent} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold uppercase text-slate-700 mb-1">
                    Student ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.studentId}
                    onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                    placeholder="e.g. 1DT23MC001"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#1D4ED8]"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold uppercase text-slate-700 mb-1">
                    PRN <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.prn}
                    onChange={(e) => setFormData({ ...formData, prn: e.target.value })}
                    placeholder="e.g. PRN-2023-0104"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#1D4ED8]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold uppercase text-slate-700 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Aakash Verma"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#1D4ED8]"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold uppercase text-slate-700 mb-1">
                    Institutional Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="e.g. aakash.v@college.edu"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#1D4ED8]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold uppercase text-slate-700 mb-1">Batch</label>
                  <input
                    type="text"
                    value={formData.batch}
                    onChange={(e) => setFormData({ ...formData, batch: e.target.value })}
                    placeholder="e.g. 2023-2025"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#1D4ED8]"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold uppercase text-slate-700 mb-1">Admission Year</label>
                  <input
                    type="number"
                    value={formData.admissionYear}
                    onChange={(e) => setFormData({ ...formData, admissionYear: parseInt(e.target.value, 10) })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#1D4ED8]"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold uppercase text-slate-700 mb-1">Gender</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#1D4ED8] bg-white"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold uppercase text-slate-700 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#1D4ED8]"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold uppercase text-slate-700 mb-1">Domicile State</label>
                  <input
                    type="text"
                    value={formData.domicileState}
                    onChange={(e) => setFormData({ ...formData, domicileState: e.target.value })}
                    placeholder="e.g. Karnataka"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#1D4ED8]"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold uppercase text-slate-700 mb-1">Domicile Type</label>
                  <select
                    value={formData.domicileType}
                    onChange={(e) => setFormData({ ...formData, domicileType: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#1D4ED8] bg-white"
                  >
                    <option value="HOME_STATE">Home State</option>
                    <option value="OTHER_STATE">Other State</option>
                    <option value="INTERNATIONAL">International</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold uppercase text-slate-700 mb-1">Category</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="e.g. OPEN, OBC, SC, ST"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#1D4ED8]"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold uppercase text-slate-700 mb-1">Current Semester</label>
                  <input
                    type="number"
                    min={1}
                    max={6}
                    value={formData.currentSemester}
                    onChange={(e) => setFormData({ ...formData, currentSemester: parseInt(e.target.value, 10) })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#1D4ED8]"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold uppercase text-slate-700 mb-1">Expected Grad Year</label>
                  <input
                    type="number"
                    value={formData.expectedGraduationYear}
                    onChange={(e) => setFormData({ ...formData, expectedGraduationYear: parseInt(e.target.value, 10) })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#1D4ED8]"
                    required
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-2 rounded-lg bg-[#1D4ED8] text-white font-semibold hover:bg-blue-800 flex items-center gap-1.5 disabled:opacity-50"
                >
                  {formLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>{editingStudent ? "Update Student" : "Create Student Record"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Verification Modal */}
      {reviewingStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">Verify Student Record</h3>
              <button onClick={() => setReviewingStudent(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4 p-3 bg-slate-50 rounded-lg text-xs space-y-1">
              <div><strong>Student:</strong> {reviewingStudent.name} ({reviewingStudent.studentId})</div>
              <div><strong>Batch:</strong> {reviewingStudent.batch} | PRN: {reviewingStudent.prn}</div>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold uppercase text-slate-700 mb-1">Decision</label>
                <select
                  value={reviewDecision}
                  onChange={(e) => setReviewDecision(e.target.value as any)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#1D4ED8] bg-white font-medium"
                >
                  <option value="APPROVE">Approve Record</option>
                  <option value="REJECT">Reject Record</option>
                  <option value="REQUEST_CORRECTION">Request Correction</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold uppercase text-slate-700 mb-1">Reviewer Note / Justification</label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Provide audit reference or correction details..."
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#1D4ED8]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReviewingStudent(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReview}
                  disabled={formLoading}
                  className="px-4 py-2 rounded-lg bg-[#1D4ED8] text-white font-semibold hover:bg-blue-800 disabled:opacity-50"
                >
                  Submit Decision
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Attach Evidence Modal */}
      {evidenceStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">Evidence Attachments</h3>
              <button onClick={() => setEvidenceStudent(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4">
              <div className="text-xs font-semibold text-slate-700 mb-2">Attached Documents:</div>
              {evidenceStudent.evidenceReferences && evidenceStudent.evidenceReferences.length > 0 ? (
                <ul className="space-y-1 text-xs">
                  {evidenceStudent.evidenceReferences.map((e, idx) => (
                    <li key={idx} className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-200">
                      <span className="font-medium truncate max-w-xs">{e.fileName}</span>
                      <a href={e.fileUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-[11px]">
                        Open
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-400 italic">No evidence documents attached yet.</p>
              )}
            </div>

            {canCreateOrEdit && (
              <form onSubmit={handleAttachEvidence} className="space-y-3 pt-3 border-t border-slate-100 text-xs">
                <div className="font-semibold text-slate-800 text-[11px] uppercase">Attach New Evidence:</div>
                <div>
                  <label className="block text-slate-600 mb-1">Document Title</label>
                  <input
                    type="text"
                    value={evidenceFileName}
                    onChange={(e) => setEvidenceFileName(e.target.value)}
                    placeholder="e.g. Admission_Verification_Dossier.pdf"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#1D4ED8]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">Document URL</label>
                  <input
                    type="url"
                    value={evidenceFileUrl}
                    onChange={(e) => setEvidenceFileUrl(e.target.value)}
                    placeholder="https://dsatm.edu.in/evidence/student/..."
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#1D4ED8]"
                    required
                  />
                </div>
                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEvidenceStudent(null)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="px-3 py-1.5 rounded-lg bg-[#1D4ED8] text-white font-semibold hover:bg-blue-800 disabled:opacity-50"
                  >
                    Attach Document
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

