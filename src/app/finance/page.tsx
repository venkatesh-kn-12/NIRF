"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Coins,
  Search,
  Plus,
  RefreshCw,
  Trash2,
  Edit,
  Loader2,
  Building,
  TrendingUp,
  Calculator,
  Calendar,
  X,
  AlertCircle,
  Archive,
  RotateCcw,
  Download,
  AlertTriangle,
  Info,
  FileSpreadsheet,
} from "lucide-react";
import { CsvImportModal } from "@/components/CsvImportModal";

interface FinanceRecord {
  _id: string;
  financialYear: string;
  expenditureHead: string;
  granularity?: "TRANSACTION" | "ANNUAL_AGGREGATE";
  amount: number;
  currency: string;
  unit?: "INR" | "LAKHS" | "CRORES";
  amountInINR: number;
  expenditureType: "CAPITAL" | "OPERATIONAL";
  purpose: string;
  supportingDocument?: string;
  isExcluded?: boolean;
  exclusionType?: "NONE" | "BUILDING_CONSTRUCTION" | "HOSTEL_MAINTENANCE" | "OTHER";
  exclusionReason?: string;
  status: "DRAFT" | "RECORDED" | "ARCHIVED" | "APPROVED";
  createdBy?: { _id: string; name: string; email: string; role: string };
  createdAt: string;
}

interface FinanceFormState {
  financialYear: string;
  expenditureHead: string;
  granularity: "ANNUAL_AGGREGATE" | "TRANSACTION";
  amount: string;
  unit: "INR" | "LAKHS" | "CRORES";
  expenditureType: "CAPITAL" | "OPERATIONAL";
  purpose: string;
  isExcluded: boolean;
  exclusionType: "NONE" | "BUILDING_CONSTRUCTION" | "HOSTEL_MAINTENANCE" | "OTHER";
  exclusionReason: string;
  status: "RECORDED" | "DRAFT";
  supportingDocument: string;
}

const EMPTY_FORM: FinanceFormState = {
  financialYear: "2024-25",
  expenditureHead: "",
  granularity: "ANNUAL_AGGREGATE",
  amount: "",
  unit: "INR",
  expenditureType: "CAPITAL",
  purpose: "",
  isExcluded: false,
  exclusionType: "NONE",
  exclusionReason: "",
  status: "RECORDED",
  supportingDocument: "",
};

const HEAD_SUGGESTIONS = {
  CAPITAL: [
    "Library Resources (Books, E-Journals, Databases)",
    "Laboratory Equipment & Software Licenses",
    "Computing Labs, Servers & Smart Classrooms",
    "Academic Infrastructure & Workshops",
    "Building Construction (Excluded from NIRF TLR)",
    "Other Capital Expenditure",
  ],
  OPERATIONAL: [
    "Faculty & Academic Staff Salaries",
    "Maintenance of Academic Infrastructure & Labs",
    "Seminars, Conferences & Technical Workshops",
    "Consumables, Utilities & Internet Bandwidth",
    "Hostel Maintenance (Excluded from NIRF TLR)",
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
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<FinanceRecord | null>(null);
  const [form, setForm] = useState<FinanceFormState>(EMPTY_FORM);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete State
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const LIMIT = 20;

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => {
        if (!res.ok) throw new Error("Unauthorized");
        return res.json();
      })
      .then((data) => setCurrentUser(data.user))
      .catch(() => router.push("/login"));
  }, [router]);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(LIMIT));
      if (search.trim()) params.set("search", search.trim());
      if (typeFilter) params.set("expenditureType", typeFilter);
      if (yearFilter) params.set("financialYear", yearFilter);
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/finance?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load records");
      const data = await res.json();
      setRecords(data.data || []);
      setTotal(data.pagination?.total || data.total || 0);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, search, typeFilter, yearFilter, statusFilter]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Summaries
  const eligibleCapital = records
    .filter((r) => r.expenditureType === "CAPITAL" && !r.isExcluded)
    .reduce((acc, r) => acc + (r.amountInINR || r.amount || 0), 0);

  const eligibleOperational = records
    .filter((r) => r.expenditureType === "OPERATIONAL" && !r.isExcluded)
    .reduce((acc, r) => acc + (r.amountInINR || r.amount || 0), 0);

  const excludedTotal = records
    .filter((r) => r.isExcluded)
    .reduce((acc, r) => acc + (r.amountInINR || r.amount || 0), 0);

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
      granularity: rec.granularity || "ANNUAL_AGGREGATE",
      amount: String(rec.amount),
      unit: rec.unit || "INR",
      expenditureType: rec.expenditureType,
      purpose: rec.purpose,
      isExcluded: rec.isExcluded ?? false,
      exclusionType: rec.exclusionType || "NONE",
      exclusionReason: rec.exclusionReason || "",
      status: rec.status === "DRAFT" ? "DRAFT" : "RECORDED",
      supportingDocument: rec.supportingDocument || "",
    });
    setFormError(null);
    setShowModal(true);
  };

  const calculateAmountINR = (amtStr: string, unit: "INR" | "LAKHS" | "CRORES") => {
    const parsed = parseFloat(amtStr);
    if (isNaN(parsed)) return 0;
    if (unit === "LAKHS") return parsed * 100000;
    if (unit === "CRORES") return parsed * 10000000;
    return parsed;
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

    const calculatedINR = calculateAmountINR(form.amount, form.unit);
    const autoExcluded = form.exclusionType !== "NONE";

    try {
      const payload = {
        financialYear: form.financialYear.trim(),
        expenditureHead: form.expenditureHead.trim(),
        granularity: form.granularity,
        amount: amountNum,
        unit: form.unit,
        amountInINR: calculatedINR,
        currency: "INR",
        expenditureType: form.expenditureType,
        purpose: form.purpose.trim(),
        isExcluded: autoExcluded,
        exclusionType: form.exclusionType,
        exclusionReason: form.exclusionReason.trim() || undefined,
        status: form.status,
        supportingDocument: form.supportingDocument.trim() || undefined,
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

  const handleArchive = async (id: string) => {
    if (!confirm("Are you sure you want to archive this expenditure record?")) return;
    try {
      const res = await fetch(`/api/finance/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "archive" }),
      });
      const data = await res.json();
      if (!res.ok) alert(data.error || "Failed to archive record");
      else fetchRecords();
    } catch (err) {
      alert("Error archiving record");
    }
  };

  const handleRestore = async (id: string) => {
    try {
      const res = await fetch(`/api/finance/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore" }),
      });
      const data = await res.json();
      if (!res.ok) alert(data.error || "Failed to restore record");
      else fetchRecords();
    } catch (err) {
      alert("Error restoring record");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Permanent deletion is restricted to Administrators. Are you sure?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/finance/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
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

  const exportCSV = () => {
    if (records.length === 0) {
      alert("No records to export.");
      return;
    }
    const headers = [
      "Financial Year",
      "Type",
      "Expenditure Head",
      "Granularity",
      "Amount",
      "Unit",
      "Amount in INR",
      "Excluded?",
      "Exclusion Type",
      "Purpose",
      "Status",
    ];
    const rows = records.map((r) => [
      r.financialYear,
      r.expenditureType,
      `"${(r.expenditureHead || "").replace(/"/g, '""')}"`,
      r.granularity || "ANNUAL_AGGREGATE",
      r.amount,
      r.unit || "INR",
      r.amountInINR || r.amount,
      r.isExcluded ? "YES" : "NO",
      r.exclusionType || "NONE",
      `"${(r.purpose || "").replace(/"/g, '""')}"`,
      r.status,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `mca_nirf_finance_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const canEdit =
    currentUser?.role === "DEPARTMENT_ADMIN" ||
    currentUser?.role === "FACULTY_CONTRIBUTOR";

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Coins className="h-6 w-6 text-indigo-600" />
            <h1 className="text-2xl font-bold text-slate-900">
              Financial Resources & Utilisation (FRU)
            </h1>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            Audited Capital and Operational expenditures for NIRF Teaching, Learning & Resources (TLR 30 Marks).
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Download size={16} />
            Export CSV
          </button>
          {canEdit && (
            <button
              onClick={() => setShowCsvModal(true)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
            >
              <FileSpreadsheet size={16} className="text-emerald-600" />
              Import CSV
            </button>
          )}
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Eligible Capital Exp.
            </span>
            <Building className="h-5 w-5 text-indigo-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            ₹ {eligibleCapital.toLocaleString("en-IN")}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Labs, Library, Equipment (Building construction excluded)
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Eligible Operational Exp.
            </span>
            <TrendingUp className="h-5 w-5 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            ₹ {eligibleOperational.toLocaleString("en-IN")}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Salaries, Maintenance & Seminars (Hostel excluded)
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Excluded Expenditures
            </span>
            <AlertTriangle className="h-5 w-5 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-700">
            ₹ {excludedTotal.toLocaleString("en-IN")}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Per NIRF Engineering 2025 guidelines
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Reporting Years
            </span>
            <Calendar className="h-5 w-5 text-purple-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-indigo-600">
            {distinctYears.length} / 3 Years
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {distinctYears.length >= 3
              ? `Complete 3-year set (${distinctYears.slice(0, 3).join(", ")})`
              : `Requires 3 consecutive years; ${distinctYears.join(", ") || "none yet"}`}
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-start gap-3">
        <Info className="h-5 w-5 text-indigo-600 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-indigo-900">
          <p className="font-semibold">Deterministic TLR Calculation Rule</p>
          <p className="text-indigo-700 mt-0.5">
            Annual aggregate records prevent double counting with individual voucher transactions. Building construction and hostel maintenance costs are automatically flagged and excluded from eligible FRU per NIRF specifications.
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
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search head, purpose, year..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Expenditure Types</option>
            <option value="CAPITAL">Capital Expenditure</option>
            <option value="OPERATIONAL">Operational Expenditure</option>
          </select>

          <select
            value={yearFilter}
            onChange={(e) => {
              setYearFilter(e.target.value);
              setPage(1);
            }}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Financial Years</option>
            <option value="2024-25">2024-25</option>
            <option value="2023-24">2023-24</option>
            <option value="2022-23">2022-23</option>
            <option value="2021-22">2021-22</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Records</option>
            <option value="RECORDED">Recorded</option>
            <option value="DRAFT">Draft</option>
            <option value="ARCHIVED">Archived</option>
          </select>

          {(search || typeFilter || yearFilter || statusFilter) && (
            <button
              onClick={() => {
                setSearch("");
                setTypeFilter("");
                setYearFilter("");
                setStatusFilter("");
                setPage(1);
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
                <th className="py-3 px-4">Type & Granularity</th>
                <th className="py-3 px-4">Expenditure Head</th>
                <th className="py-3 px-4">Purpose</th>
                <th className="py-3 px-4 text-right">Amount (INR)</th>
                <th className="py-3 px-4 text-center">Eligibility</th>
                <th className="py-3 px-4 text-center">Status</th>
                {canEdit && <th className="py-3 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-indigo-600" />
                    <span className="mt-2 block text-sm">Loading expenditure records...</span>
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <Coins className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-medium text-slate-700">No expenditure records found</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Click &quot;Add Expenditure&quot; above to enter audited Capital or Operational costs.
                    </p>
                  </td>
                </tr>
              ) : (
                records.map((rec) => {
                  const isArchived = rec.status === "ARCHIVED";
                  const amtINR = rec.amountInINR || rec.amount || 0;

                  return (
                    <tr
                      key={rec._id}
                      className={`hover:bg-slate-50 transition-colors ${
                        isArchived ? "bg-slate-50/60 opacity-75" : ""
                      }`}
                    >
                      <td className="py-3.5 px-4 font-medium text-slate-900 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800">
                          {rec.financialYear}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          {rec.expenditureType === "CAPITAL" ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 w-fit">
                              CAPITAL
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 w-fit">
                              OPERATIONAL
                            </span>
                          )}
                          <span className="text-[11px] text-slate-500">
                            {rec.granularity === "TRANSACTION" ? "Transaction" : "Annual Aggregate"}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-800 font-medium max-w-xs truncate" title={rec.expenditureHead}>
                        {rec.expenditureHead}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 max-w-sm truncate" title={rec.purpose}>
                        {rec.purpose}
                      </td>
                      <td className="py-3.5 px-4 text-right font-semibold text-slate-900 whitespace-nowrap">
                        <div>₹ {amtINR.toLocaleString("en-IN")}</div>
                        {rec.unit && rec.unit !== "INR" && (
                          <div className="text-[11px] text-slate-500 font-normal">
                            {rec.amount} {rec.unit}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {rec.isExcluded ? (
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200"
                            title={rec.exclusionReason || rec.exclusionType}
                          >
                            Excluded
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                            Eligible
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
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
                      {canEdit && (
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            {!isArchived && (
                              <button
                                onClick={() => handleOpenEdit(rec)}
                                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                title="Edit Record"
                              >
                                <Edit size={15} />
                              </button>
                            )}
                            {!isArchived && (
                              <button
                                onClick={() => handleArchive(rec._id)}
                                className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                                title="Archive Record"
                              >
                                <Archive size={15} />
                              </button>
                            )}
                            {currentUser?.role === "DEPARTMENT_ADMIN" && isArchived && (
                              <button
                                onClick={() => handleRestore(rec._id)}
                                className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                                title="Restore to Recorded"
                              >
                                <RotateCcw size={15} />
                              </button>
                            )}
                            {currentUser?.role === "DEPARTMENT_ADMIN" && (
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
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-xl border border-slate-200 overflow-hidden my-8">
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Coins className="text-indigo-600" size={20} />
                {editingRecord ? "Edit Expenditure Record" : "Add Expenditure Record"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-sm">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-red-700 text-xs">
                  <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Financial Year */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Financial Year *
                  </label>
                  <select
                    value={form.financialYear}
                    onChange={(e) => setForm({ ...form, financialYear: e.target.value })}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    required
                  >
                    <option value="2024-25">2024-25</option>
                    <option value="2023-24">2023-24</option>
                    <option value="2022-23">2022-23</option>
                    <option value="2021-22">2021-22</option>
                    <option value="2020-21">2020-21</option>
                  </select>
                </div>

                {/* Granularity */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Record Granularity *
                  </label>
                  <select
                    value={form.granularity}
                    onChange={(e) => setForm({ ...form, granularity: e.target.value as any })}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="ANNUAL_AGGREGATE">Annual Audited Aggregate</option>
                    <option value="TRANSACTION">Individual Transaction / Voucher</option>
                  </select>
                </div>
              </div>

              {/* Expenditure Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">
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

              {/* Amount and Unit */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Amount *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    placeholder="e.g. 1500000"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium text-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Unit *
                  </label>
                  <select
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value as any })}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="LAKHS">Lakhs (₹ × 10⁵)</option>
                    <option value="CRORES">Crores (₹ × 10⁷)</option>
                  </select>
                </div>
              </div>

              {form.amount && !isNaN(parseFloat(form.amount)) && (
                <div className="p-2 bg-slate-50 border border-slate-200 rounded text-xs text-indigo-700 font-medium">
                  Equivalent: ₹ {calculateAmountINR(form.amount, form.unit).toLocaleString("en-IN")}
                </div>
              )}

              {/* Exclusion handling */}
              <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-lg space-y-2">
                <label className="block text-xs font-semibold text-amber-900">
                  NIRF Exclusion Rules
                </label>
                <select
                  value={form.exclusionType}
                  onChange={(e) => {
                    const newType = e.target.value as any;
                    setForm({
                      ...form,
                      exclusionType: newType,
                      isExcluded: newType !== "NONE",
                    });
                  }}
                  className="w-full text-xs border border-amber-300 rounded px-2.5 py-1.5 bg-white text-slate-800"
                >
                  <option value="NONE">Eligible (Included in NIRF calculations)</option>
                  <option value="BUILDING_CONSTRUCTION">
                    Building Construction / Land (Excluded by NIRF Rule)
                  </option>
                  <option value="HOSTEL_MAINTENANCE">
                    Hostel Maintenance & Services (Excluded by NIRF Rule)
                  </option>
                  <option value="OTHER">Other Disallowed Expenditure</option>
                </select>

                {form.exclusionType !== "NONE" && (
                  <input
                    type="text"
                    value={form.exclusionReason}
                    onChange={(e) => setForm({ ...form, exclusionReason: e.target.value })}
                    placeholder="Provide specific exclusion rationale for audit"
                    className="w-full text-xs border border-amber-300 rounded px-2.5 py-1.5 bg-white"
                  />
                )}
              </div>

              {/* Purpose */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Purpose / Description *
                </label>
                <textarea
                  rows={2}
                  value={form.purpose}
                  onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                  placeholder="Provide audit ledger reference, voucher details, or procurement purpose"
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Record Status:</span>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                    className="text-xs border border-slate-300 rounded px-2 py-1 bg-white font-medium text-slate-800"
                  >
                    <option value="RECORDED">RECORDED (Active)</option>
                    <option value="DRAFT">DRAFT (WIP)</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
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
              </div>
            </form>
          </div>
        </div>
      )}
      {/* CSV Import Modal */}
      <CsvImportModal
        isOpen={showCsvModal}
        onClose={() => setShowCsvModal(false)}
        moduleName="finance"
        moduleTitle="Financial Resources"
        onImportSuccess={fetchRecords}
      />
    </div>
  );
}
