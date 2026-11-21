"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Briefcase,
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
  FileSpreadsheet,
  IndianRupee,
  Info,
} from "lucide-react";
import { CsvImportModal } from "@/components/CsvImportModal";

interface ProjectReceipt {
  _id?: string;
  financialYear: string;
  receiptDate?: string;
  amount: number;
  referenceNumber?: string;
  mcaAllocationPercentage: number;
  notes?: string;
}

interface ProjectRecord {
  _id: string;
  title: string;
  type: "SPONSORED_PROJECT" | "CONSULTANCY";
  fundingAgencyOrClient: string;
  projectNumber?: string;
  sanctionedAmount?: number;
  receivedAmount: number;
  startDate: string;
  endDate?: string | null;
  principalInvestigator: string;
  coInvestigators: string[];
  scope: "DEPARTMENT" | "INSTITUTION";
  notes?: string;
  receipts: ProjectReceipt[];
  legacyReceiptYear?: string | null;
  status: "DRAFT" | "RECORDED" | "ARCHIVED";
  department: string;
  createdAt: string;
  createdBy?: { _id: string; name: string; email: string } | string;
}

interface FormState {
  title: string;
  type: "SPONSORED_PROJECT" | "CONSULTANCY";
  fundingAgencyOrClient: string;
  projectNumber: string;
  sanctionedAmount: string;
  receivedAmount: string;
  startDate: string;
  endDate: string;
  principalInvestigator: string;
  coInvestigatorsInput: string;
  scope: "DEPARTMENT" | "INSTITUTION";
  notes: string;
  status: "RECORDED" | "DRAFT";
  // receipt inline
  receiptFinancialYear: string;
  receiptDate: string;
  receiptAmount: string;
  receiptAllocationPct: string;
  receiptRef: string;
  receiptNotes: string;
}

const EMPTY_FORM: FormState = {
  title: "",
  type: "SPONSORED_PROJECT",
  fundingAgencyOrClient: "",
  projectNumber: "",
  sanctionedAmount: "",
  receivedAmount: "",
  startDate: "",
  endDate: "",
  principalInvestigator: "",
  coInvestigatorsInput: "",
  scope: "DEPARTMENT",
  notes: "",
  status: "RECORDED",
  receiptFinancialYear: "",
  receiptDate: "",
  receiptAmount: "",
  receiptAllocationPct: "100",
  receiptRef: "",
  receiptNotes: "",
};

function formatINR(amount?: number): string {
  if (!amount && amount !== 0) return "—";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    RECORDED: "bg-green-100 text-green-800",
    DRAFT: "bg-yellow-100 text-yellow-800",
    ARCHIVED: "bg-gray-100 text-gray-600",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[status] ?? "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  );
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "SPONSORED_PROJECT" | "CONSULTANCY">("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "RECORDED" | "ARCHIVED">("RECORDED");
  const [showModal, setShowModal] = useState(false);
  const [editProject, setEditProject] = useState<ProjectRecord | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [userRole, setUserRole] = useState<string>("");

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: "200" });
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (typeFilter !== "ALL") params.set("type", typeFilter);
      const res = await fetch(`/api/projects?${params}`);
      if (!res.ok) throw new Error((await res.json()).error || "Failed to load projects");
      const data = await res.json();
      setProjects(data.data ?? data.records ?? data.projects ?? []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [typeFilter, statusFilter]);

  useEffect(() => {
    fetchProjects();
    fetch("/api/auth/me").then(r => r.json()).then(d => setUserRole(d.user?.role ?? ""));
  }, [fetchProjects]);

  const canEdit = ["DEPARTMENT_ADMIN", "FACULTY_CONTRIBUTOR"].includes(userRole);
  const canAdmin = userRole === "DEPARTMENT_ADMIN";

  const filtered = projects.filter(p => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.title.toLowerCase().includes(q) ||
      p.fundingAgencyOrClient.toLowerCase().includes(q) ||
      p.principalInvestigator.toLowerCase().includes(q) ||
      (p.projectNumber || "").toLowerCase().includes(q)
    );
  });

  // KPI summary
  const recorded = projects.filter(p => p.status === "RECORDED");
  const totalReceived = recorded.reduce((s, p) => {
    const receiptTotal = p.receipts.reduce((rs, r) => rs + (r.amount * (r.mcaAllocationPercentage / 100)), 0);
    return s + (receiptTotal || p.receivedAmount || 0);
  }, 0);
  const sponsoredCount = recorded.filter(p => p.type === "SPONSORED_PROJECT").length;
  const consultancyCount = recorded.filter(p => p.type === "CONSULTANCY").length;

  function openAdd() {
    setEditProject(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setShowModal(true);
  }

  function openEdit(p: ProjectRecord) {
    setEditProject(p);
    setFormError(null);
    setForm({
      title: p.title,
      type: p.type,
      fundingAgencyOrClient: p.fundingAgencyOrClient,
      projectNumber: p.projectNumber ?? "",
      sanctionedAmount: p.sanctionedAmount ? String(p.sanctionedAmount) : "",
      receivedAmount: p.receivedAmount ? String(p.receivedAmount) : "",
      startDate: p.startDate ? p.startDate.substring(0, 10) : "",
      endDate: p.endDate ? p.endDate.substring(0, 10) : "",
      principalInvestigator: p.principalInvestigator,
      coInvestigatorsInput: (p.coInvestigators || []).join(", "),
      scope: p.scope ?? "DEPARTMENT",
      notes: p.notes ?? "",
      status: (p.status === "DRAFT" ? "DRAFT" : "RECORDED") as "RECORDED" | "DRAFT",
      receiptFinancialYear: "",
      receiptDate: "",
      receiptAmount: "",
      receiptAllocationPct: "100",
      receiptRef: "",
      receiptNotes: "",
    });
    setShowModal(true);
  }

  async function handleSave() {
    setFormError(null);
    if (!form.title.trim()) return setFormError("Project title is required.");
    if (!form.fundingAgencyOrClient.trim()) return setFormError("Funding agency / client is required.");
    if (!form.principalInvestigator.trim()) return setFormError("Principal Investigator name is required.");
    if (!form.startDate) return setFormError("Start date is required.");

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        title: form.title.trim(),
        type: form.type,
        fundingAgencyOrClient: form.fundingAgencyOrClient.trim(),
        projectNumber: form.projectNumber.trim() || undefined,
        sanctionedAmount: form.sanctionedAmount ? Number(form.sanctionedAmount) : undefined,
        receivedAmount: form.receivedAmount ? Number(form.receivedAmount) : 0,
        startDate: form.startDate,
        endDate: form.endDate || undefined,
        principalInvestigator: form.principalInvestigator.trim(),
        coInvestigators: form.coInvestigatorsInput ? form.coInvestigatorsInput.split(",").map(s => s.trim()).filter(Boolean) : [],
        scope: form.scope,
        notes: form.notes.trim() || undefined,
        status: form.status,
        department: "MCA",
        receipts: editProject?.receipts ?? [],
      };

      // Build a receipt if the user filled the receipt fields
      if (form.receiptAmount && form.receiptFinancialYear) {
        const receipt: ProjectReceipt = {
          financialYear: form.receiptFinancialYear,
          amount: Number(form.receiptAmount),
          mcaAllocationPercentage: Number(form.receiptAllocationPct) || 100,
          referenceNumber: form.receiptRef || undefined,
          notes: form.receiptNotes || undefined,
        };
        if (form.receiptDate) receipt.receiptDate = form.receiptDate;
        (payload.receipts as ProjectReceipt[]).push(receipt);
      }

      const url = editProject ? `/api/projects/${editProject._id}` : "/api/projects";
      const method = editProject ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setShowModal(false);
      fetchProjects();
    } catch (e: any) {
      setFormError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive(id: string, archived: boolean) {
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: archived ? "restore" : "archive" }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Action failed");
      fetchProjects();
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Permanently delete this project record? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error || "Delete failed");
      fetchProjects();
    } catch (e: any) {
      alert(e.message);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Briefcase className="text-indigo-600" size={24} />
            <div>
              <h1 className="text-xl font-bold text-gray-900">Projects &amp; Consultancy</h1>
              <p className="text-xs text-gray-500">FPPP: Footprint of Projects and Professional Practice — RP component</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canEdit && (
              <button
                onClick={() => setShowCsvModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <FileSpreadsheet size={15} /> Import CSV
              </button>
            )}
            {canEdit && (
              <button
                onClick={openAdd}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700"
              >
                <Plus size={16} /> Add Project
              </button>
            )}
            <button onClick={fetchProjects} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
              <RefreshCw size={16} />
            </button>
          </div>
        </div>

        {/* KPI summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          {[
            { label: "Recorded Projects", value: recorded.length, color: "text-indigo-600" },
            { label: "Sponsored Grants", value: sponsoredCount, color: "text-blue-600" },
            { label: "Consultancy", value: consultancyCount, color: "text-purple-600" },
            { label: "Total Received (MCA)", value: formatINR(totalReceived), color: "text-green-600" },
          ].map(k => (
            <div key={k.label} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className={`text-lg font-bold ${k.color}`}>{k.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{k.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="mx-6 mt-3 px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2 text-xs text-amber-800">
        <Info size={14} className="mt-0.5 flex-shrink-0" />
        <span>
          <strong>Departmental simulation only.</strong> Only receipt-confirmed amounts are counted in FPPP. Sanctioned-only amounts are recorded for reference but excluded from score calculation.
        </span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 px-6 mt-4">
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 flex-1 min-w-48 max-w-80">
          <Search size={15} className="text-gray-400" />
          <input
            className="text-sm bg-transparent outline-none w-full"
            placeholder="Search title, agency, PI…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <select
          className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value as typeof typeFilter)}
        >
          <option value="ALL">All Types</option>
          <option value="SPONSORED_PROJECT">Sponsored Projects</option>
          <option value="CONSULTANCY">Consultancy</option>
        </select>
        <select
          className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
        >
          <option value="RECORDED">Active Records</option>
          <option value="ALL">All (incl. Archived)</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </div>

      {/* Table */}
      <div className="px-6 mt-4 pb-10">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2 mb-4">
            <AlertCircle size={16} /> {error}
          </div>
        )}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <Loader2 size={24} className="animate-spin mr-2" /> Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Briefcase size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No projects found</p>
            <p className="text-sm mt-1">Add a sponsored project or consultancy assignment to begin.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-3 text-left">Title / PI</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Agency / Client</th>
                  <th className="px-4 py-3 text-right">Received (MCA)</th>
                  <th className="px-4 py-3 text-left">Period</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  {canEdit && <th className="px-4 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(p => {
                  const receiptTotal = p.receipts.reduce((s, r) => s + r.amount * (r.mcaAllocationPercentage / 100), 0);
                  const effectiveReceived = receiptTotal || p.receivedAmount || 0;
                  return (
                    <tr key={p._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900 max-w-xs truncate">{p.title}</div>
                        <div className="text-xs text-gray-500">PI: {p.principalInvestigator}</div>
                        {p.projectNumber && <div className="text-xs text-gray-400"># {p.projectNumber}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.type === "SPONSORED_PROJECT" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"}`}>
                          {p.type === "SPONSORED_PROJECT" ? "Sponsored" : "Consultancy"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700 max-w-xs truncate">{p.fundingAgencyOrClient}</td>
                      <td className="px-4 py-3 text-right font-mono text-gray-900">
                        {formatINR(effectiveReceived)}
                        {p.receipts.length > 0 && (
                          <div className="text-xs text-gray-400">{p.receipts.length} receipt{p.receipts.length !== 1 ? "s" : ""}</div>
                        )}
                        {receiptTotal === 0 && p.receivedAmount > 0 && (
                          <div className="text-xs text-amber-600">Legacy amount</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        <div>{p.startDate?.substring(0, 10)}</div>
                        {p.endDate && <div>→ {p.endDate.substring(0, 10)}</div>}
                      </td>
                      <td className="px-4 py-3"><StatusPill status={p.status} /></td>
                      {canEdit && (
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEdit(p)}
                              className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                              title="Edit"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              onClick={() => handleArchive(p._id, p.status === "ARCHIVED")}
                              className="p-1.5 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded"
                              title={p.status === "ARCHIVED" ? "Restore" : "Archive"}
                            >
                              {p.status === "ARCHIVED" ? <RotateCcw size={14} /> : <Archive size={14} />}
                            </button>
                            {canAdmin && (
                              <button
                                onClick={() => handleDelete(p._id)}
                                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                                title="Delete"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {editProject ? "Edit Project / Consultancy" : "Add Project / Consultancy"}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1 text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg flex items-center gap-2 text-sm">
                  <AlertCircle size={15} /> {formError}
                </div>
              )}

              {/* Type & Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Type *</label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    value={form.type}
                    onChange={e => setForm(f => ({ ...f, type: e.target.value as "SPONSORED_PROJECT" | "CONSULTANCY" }))}
                  >
                    <option value="SPONSORED_PROJECT">Sponsored Research Project</option>
                    <option value="CONSULTANCY">Consultancy Assignment</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Record Status</label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value as "RECORDED" | "DRAFT" }))}
                  >
                    <option value="RECORDED">Recorded</option>
                    <option value="DRAFT">Draft</option>
                  </select>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Project / Assignment Title *</label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="Enter full project title"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                />
              </div>

              {/* Agency */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {form.type === "SPONSORED_PROJECT" ? "Funding Agency *" : "Client Organization *"}
                  </label>
                  <input
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    placeholder={form.type === "SPONSORED_PROJECT" ? "e.g. DST, DRDO, AICTE…" : "Client name"}
                    value={form.fundingAgencyOrClient}
                    onChange={e => setForm(f => ({ ...f, fundingAgencyOrClient: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Project / Reference Number</label>
                  <input
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="Sanction or ref number"
                    value={form.projectNumber}
                    onChange={e => setForm(f => ({ ...f, projectNumber: e.target.value }))}
                  />
                </div>
              </div>

              {/* PI */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Principal Investigator *</label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="Name of PI (MCA department faculty)"
                  value={form.principalInvestigator}
                  onChange={e => setForm(f => ({ ...f, principalInvestigator: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Co-Investigators (comma-separated)</label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="Dr. A, Prof. B, …"
                  value={form.coInvestigatorsInput}
                  onChange={e => setForm(f => ({ ...f, coInvestigatorsInput: e.target.value }))}
                />
              </div>

              {/* Amounts */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Sanctioned Amount (INR)</label>
                  <input
                    type="number"
                    min={0}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="Total sanctioned"
                    value={form.sanctionedAmount}
                    onChange={e => setForm(f => ({ ...f, sanctionedAmount: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Legacy Received Amount (INR)</label>
                  <input
                    type="number"
                    min={0}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="Aggregate received (use receipts for window-aware scoring)"
                    value={form.receivedAmount}
                    onChange={e => setForm(f => ({ ...f, receivedAmount: e.target.value }))}
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Start Date *</label>
                  <input
                    type="date"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    value={form.startDate}
                    onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    value={form.endDate}
                    onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                  />
                </div>
              </div>

              {/* Scope */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">MCA Department Scope</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={form.scope}
                  onChange={e => setForm(f => ({ ...f, scope: e.target.value as "DEPARTMENT" | "INSTITUTION" }))}
                >
                  <option value="DEPARTMENT">Department-level (MCA only)</option>
                  <option value="INSTITUTION">Institution-level (shared — use allocation % in receipts)</option>
                </select>
              </div>

              {/* Receipt (inline add one) */}
              <div className="border border-dashed border-indigo-200 rounded-lg p-4 bg-indigo-50/40">
                <p className="text-xs font-semibold text-indigo-700 mb-3 flex items-center gap-1.5">
                  <IndianRupee size={13} /> Add Receipt (window-aware FPPP scoring)
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Financial Year *</label>
                    <input
                      className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm bg-white"
                      placeholder="e.g. 2023-24"
                      value={form.receiptFinancialYear}
                      onChange={e => setForm(f => ({ ...f, receiptFinancialYear: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Receipt Date</label>
                    <input
                      type="date"
                      className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm bg-white"
                      value={form.receiptDate}
                      onChange={e => setForm(f => ({ ...f, receiptDate: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Amount (INR) *</label>
                    <input
                      type="number"
                      min={0}
                      className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm bg-white"
                      placeholder="Amount received"
                      value={form.receiptAmount}
                      onChange={e => setForm(f => ({ ...f, receiptAmount: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">MCA Allocation %</label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm bg-white"
                      value={form.receiptAllocationPct}
                      onChange={e => setForm(f => ({ ...f, receiptAllocationPct: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Reference / Voucher No.</label>
                    <input
                      className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm bg-white"
                      placeholder="Optional"
                      value={form.receiptRef}
                      onChange={e => setForm(f => ({ ...f, receiptRef: e.target.value }))}
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2">Leave Amount/FY blank to skip receipt. Additional receipts can be added by editing the record after saving.</p>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
                  placeholder="Optional remarks"
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-60"
              >
                {saving ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                {saving ? "Saving…" : editProject ? "Update Record" : "Save Record"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {showCsvModal && (
        <CsvImportModal
          isOpen={showCsvModal}
          moduleName="projects"
          moduleTitle="Projects & Consultancy"
          onClose={() => setShowCsvModal(false)}
          onImportSuccess={() => { setShowCsvModal(false); fetchProjects(); }}
        />
      )}
    </div>
  );
}
