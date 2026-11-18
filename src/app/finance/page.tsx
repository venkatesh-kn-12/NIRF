"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Coins,
  Search,
  Plus,
  RefreshCw,
  CheckCircle2,
  Trash2,
  Edit,
  Loader2,
  Building,
  TrendingUp,
  Landmark,
  Calculator,
  Calendar,
  X,
  AlertCircle,
} from "lucide-react";

interface FinanceRecord {
  _id: string;
  financialYear: string;
  expenditureHead: string;
  amount: number;
  currency: string;
  expenditureType: "CAPITAL" | "OPERATIONAL";
  purpose: string;
  supportingDocument?: string;
  status: "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED" | "CORRECTION_REQUESTED";
  createdBy?: { _id: string; name: string; email: string; role: string };
  createdAt: string;
}

interface FinanceFormState {
  financialYear: string;
  expenditureHead: string;
  amount: string;
  expenditureType: "CAPITAL" | "OPERATIONAL";
  purpose: string;
  supportingDocument: string;
}

const EMPTY_FORM: FinanceFormState = {
  financialYear: "2024-25",
  expenditureHead: "",
  amount: "",
  expenditureType: "CAPITAL",
  purpose: "",
  supportingDocument: "",
};

const HEAD_SUGGESTIONS = {
  CAPITAL: [
    "Library Resources (Books, E-Journals, Databases)",
    "Laboratory Equipment & Software Licenses",
    "Computing Labs, Servers & Smart Classrooms",
    "Academic Infrastructure & Workshops",
    "Other Capital Expenditure",
  ],
  OPERATIONAL: [
    "Faculty & Academic Staff Salaries",
    "Maintenance of Academic Infrastructure & Labs",
    "Seminars, Conferences & Technical Workshops",
    "Consumables, Utilities & Internet Bandwidth",
    "Other Recurring / Operational Expenditure",
  ],
};

export default function FinancePage() {
  const router = useRouter();

  const [records, setRecords] = useState<FinanceRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Filters & Search
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [page, setPage] = useState(1);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<FinanceRecord | null>(null);
  const [form, setForm] = useState<FinanceFormState>(EMPTY_FORM);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete State
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const LIMIT = 20;

  // Fetch current user
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => {
        if (!res.ok) throw new Error("Unauthorized");
        return res.json();
      })
      .then((data) => setCurrentUser(data.user))
      .catch(() => router.push("/login"));
  }, [router]);

  // Fetch finance records
  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(LIMIT));
      if (search.trim()) params.set("search", search.trim());
      if (typeFilter) params.set("expenditureType", typeFilter);
      if (yearFilter) params.set("financialYear", yearFilter);

      const res = await fetch(`/api/finance?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load records");
      const data = await res.json();
      setRecords(data.data || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, search, typeFilter, yearFilter]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Calculate summaries
  const totalCapital = records
    .filter((r) => r.expenditureType === "CAPITAL")
    .reduce((acc, r) => acc + (r.amount || 0), 0);

  const totalOperational = records
    .filter((r) => r.expenditureType === "OPERATIONAL")
    .reduce((acc, r) => acc + (r.amount || 0), 0);

  const distinctYears = Array.from(new Set(records.map((r) => r.financialYear).filter(Boolean)));

  const handleOpenAdd = () => {
    setEditingRecord(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setShowModal(true);
  };

  const handleOpenEdit = (rec: FinanceRecord) => {
    setEditingRecord(rec);
    setForm({
      financialYear: rec.financialYear,
      expenditureHead: rec.expenditureHead,
      amount: String(rec.amount),
      expenditureType: rec.expenditureType,
      purpose: rec.purpose,
      supportingDocument: rec.supportingDocument || "",
    });
    setFormError(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);

    const amountNum = parseFloat(form.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setFormError("Amount must be a positive number");
      setFormLoading(false);
      return;
    }

    if (!form.expenditureHead.trim()) {
      setFormError("Expenditure head is required");
      setFormLoading(false);
      return;
    }

    if (!form.purpose.trim()) {
      setFormError("Purpose description is required");
      setFormLoading(false);
      return;
    }

    try {
      const payload = {
        financialYear: form.financialYear.trim(),
        expenditureHead: form.expenditureHead.trim(),
        amount: amountNum,
        currency: "INR",
        expenditureType: form.expenditureType,
        purpose: form.purpose.trim(),
        supportingDocument: form.supportingDocument.trim(),
      };

      let res: Response;
      if (editingRecord) {
        res = await fetch(`/api/finance/${editingRecord._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/finance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || "Failed to save record");
      }

      setShowModal(false);
      fetchRecords();
    } catch (err: any) {
      setFormError(err.message || "An error occurred");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this expenditure record?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/finance/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to delete record");
        return;
      }
      fetchRecords();
    } catch (err) {
      alert("Error deleting record");
    } finally {
      setDeletingId(null);
    }
  };

  const canEdit = currentUser?.role === "DEPARTMENT_ADMIN" || currentUser?.role === "FACULTY_CONTRIBUTOR";

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Coins className="h-6 w-6 text-indigo-600" />
            <h1 className="text-2xl font-bold text-slate-900">Financial Resources & Utilisation (FRU)</h1>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            Audited Capital and Operational expenditures for NIRF Teaching, Learning & Resources (TLR 30 Marks).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchRecords()}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>

          {canEdit && (
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
            >
              <Plus size={16} />
              Add Expenditure
            </button>
          )}
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Capital Expenditure</span>
            <Building className="h-5 w-5 text-indigo-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              ₹ {totalCapital.toLocaleString("en-IN")}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Labs, Library, Equipment & Infrastructure</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Operational Expenditure</span>
            <TrendingUp className="h-5 w-5 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              ₹ {totalOperational.toLocaleString("en-IN")}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Salaries, Maintenance & Seminars</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Reporting Years</span>
            <Calendar className="h-5 w-5 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {distinctYears.length || 0} Years
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {distinctYears.length > 0 ? distinctYears.join(", ") : "NIRF requires 3 consecutive years"}
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">NIRF Parameter</span>
            <Calculator className="h-5 w-5 text-purple-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-indigo-600">TLR - FRU</span>
            <span className="text-xs text-slate-500">Max 30 Marks</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">FRU = 7.5 × f(BC) + 22.5 × f(BO)</p>
        </div>
      </div>

      {/* Info Banner for Internal Testing */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-start gap-3">
        <CheckCircle2 className="h-5 w-5 text-indigo-600 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-indigo-900">
          <p className="font-semibold">Internal Department Direct Calculation Active</p>
          <p className="text-indigo-700 mt-0.5">
            Expenditures entered here are immediately active and incorporated into the <strong>Metrics & Calculations (/metrics)</strong> TLR score without needing reviewer approval desk sign-off.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search head, purpose, year..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Expenditure Types</option>
            <option value="CAPITAL">Capital Expenditure</option>
            <option value="OPERATIONAL">Operational Expenditure</option>
          </select>

          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Financial Years</option>
            <option value="2024-25">2024-25</option>
            <option value="2023-24">2023-24</option>
            <option value="2022-23">2022-23</option>
            <option value="2021-22">2021-22</option>
          </select>

          {(search || typeFilter || yearFilter) && (
            <button
              onClick={() => {
                setSearch("");
                setTypeFilter("");
                setYearFilter("");
              }}
              className="text-xs text-slate-500 hover:text-slate-800 underline"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Main Records Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Financial Year</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Expenditure Head</th>
                <th className="py-3 px-4">Purpose</th>
                <th className="py-3 px-4 text-right">Amount (INR)</th>
                <th className="py-3 px-4 text-center">Status</th>
                {canEdit && <th className="py-3 px-4 text-center">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-indigo-600" />
                    <span className="mt-2 block text-sm">Loading expenditure records...</span>
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <Coins className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-medium text-slate-700">No expenditure records found</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Click &quot;Add Expenditure&quot; above to enter Capital or Operational costs for MCA.
                    </p>
                  </td>
                </tr>
              ) : (
                records.map((rec) => (
                  <tr key={rec._id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-slate-900">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800">
                        {rec.financialYear}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {rec.expenditureType === "CAPITAL" ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                          CAPITAL
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          OPERATIONAL
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-800 font-medium max-w-xs truncate" title={rec.expenditureHead}>
                      {rec.expenditureHead}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 max-w-sm truncate" title={rec.purpose}>
                      {rec.purpose}
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-slate-900 whitespace-nowrap">
                      ₹ {rec.amount.toLocaleString("en-IN")}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                        <CheckCircle2 size={12} />
                        Active
                      </span>
                    </td>
                    {canEdit && (
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(rec)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                            title="Edit Record"
                          >
                            <Edit size={15} />
                          </button>
                          <button
                            onClick={() => handleDelete(rec._id)}
                            disabled={deletingId === rec._id}
                            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete Record"
                          >
                            {deletingId === rec._id ? (
                              <Loader2 size={15} className="animate-spin text-red-600" />
                            ) : (
                              <Trash2 size={15} />
                            )}
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer / Pagination */}
        <div className="p-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing {records.length} of {total} records
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-2.5 py-1 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-50"
            >
              Previous
            </button>
            <span>Page {page}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page * LIMIT >= total}
              className="px-2.5 py-1 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900">
                {editingRecord ? "Edit Expenditure Record" : "Add Expenditure Record"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-red-700 text-sm">
                  <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Financial Year */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Financial Year *
                </label>
                <select
                  value={form.financialYear}
                  onChange={(e) => setForm({ ...form, financialYear: e.target.value })}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                >
                  <option value="2024-25">2024-25 (Latest Academic Year)</option>
                  <option value="2023-24">2023-24 (Previous Year 1)</option>
                  <option value="2022-23">2022-23 (Previous Year 2)</option>
                  <option value="2021-22">2021-22</option>
                  <option value="2020-21">2020-21</option>
                </select>
              </div>

              {/* Expenditure Type */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Expenditure Category *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${
                      form.expenditureType === "CAPITAL"
                        ? "border-purple-500 bg-purple-50 text-purple-900 font-medium"
                        : "border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="expType"
                      checked={form.expenditureType === "CAPITAL"}
                      onChange={() =>
                        setForm({
                          ...form,
                          expenditureType: "CAPITAL",
                          expenditureHead: "",
                        })
                      }
                      className="text-purple-600 focus:ring-purple-500"
                    />
                    <div>
                      <span className="text-sm block">Capital Exp.</span>
                      <span className="text-[11px] text-slate-500">Labs, Library, Equipment</span>
                    </div>
                  </label>

                  <label
                    className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${
                      form.expenditureType === "OPERATIONAL"
                        ? "border-emerald-500 bg-emerald-50 text-emerald-900 font-medium"
                        : "border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="expType"
                      checked={form.expenditureType === "OPERATIONAL"}
                      onChange={() =>
                        setForm({
                          ...form,
                          expenditureType: "OPERATIONAL",
                          expenditureHead: "",
                        })
                      }
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <span className="text-sm block">Operational Exp.</span>
                      <span className="text-[11px] text-slate-500">Salaries, Maintenance</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Expenditure Head */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Expenditure Head *
                </label>
                <input
                  type="text"
                  list="head-suggestions"
                  value={form.expenditureHead}
                  onChange={(e) => setForm({ ...form, expenditureHead: e.target.value })}
                  placeholder="e.g. Laboratory Equipment or Faculty Salaries"
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
                <datalist id="head-suggestions">
                  {HEAD_SUGGESTIONS[form.expenditureType].map((head, idx) => (
                    <option key={idx} value={head} />
                  ))}
                </datalist>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {HEAD_SUGGESTIONS[form.expenditureType].slice(0, 3).map((head, idx) => (
                    <button
                      type="button"
                      key={idx}
                      onClick={() => setForm({ ...form, expenditureHead: head })}
                      className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-0.5 rounded transition-colors"
                    >
                      + {head.split("(")[0].trim()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Amount in INR (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 font-semibold">₹</span>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    placeholder="e.g. 1500000"
                    className="w-full pl-8 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium text-slate-900"
                    required
                  />
                </div>
                {form.amount && !isNaN(parseFloat(form.amount)) && (
                  <p className="text-xs text-indigo-600 mt-1">
                    ₹ {parseFloat(form.amount).toLocaleString("en-IN")}
                  </p>
                )}
              </div>

              {/* Purpose */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Purpose / Description *
                </label>
                <textarea
                  rows={2}
                  value={form.purpose}
                  onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                  placeholder="Provide audit reference, voucher details, or procurement purpose"
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={formLoading}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
                >
                  {formLoading && <Loader2 size={16} className="animate-spin" />}
                  {editingRecord ? "Update Record" : "Save Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
