"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  GraduationCap,
  Users,
  Shield,
  Clock,
  Search,
  UserPlus,
  CheckCircle2,
  Lock,
  ChevronRight,
  Download,
  AlertCircle,
  Building,
  Bell,
  Sliders,
  Database,
  ArrowLeft,
  RefreshCw,
  Edit2,
  UserCheck,
  UserX,
  X,
  Save,
  Info,
} from "lucide-react";

interface SafeUser {
  id: string;
  name: string;
  email: string;
  role: "DEPARTMENT_ADMIN" | "FACULTY_CONTRIBUTOR" | "REVIEWER" | "VIEWER";
  department: string;
  employeeId?: string;
  studentId?: string;
  status: "ACTIVE" | "INVITED" | "DISABLED";
  createdAt: string;
}

interface UserCounts {
  total: number;
  active: number;
  invited: number;
  disabled: number;
}

interface DepartmentSettings {
  institutionName: string;
  department: string;
  programmeName: string;
  homeState: string;
  selectedAcademicYear: string;
  reportingPeriod: string;
  cycleStartDate: string;
  cycleEndDate: string;
  referenceDate: string;
  sanctionedIntake: number;
  notifications: {
    inAppAlerts: boolean;
    highDiscrepancyAlerts: boolean;
    calculationAlerts: boolean;
    emailAlerts: boolean;
    smsAlerts: boolean;
  };
}

interface IntegrationItem {
  id: string;
  name: string;
  category: string;
  status: string;
  provider: string;
  latency: string;
  details: string;
  configured: boolean;
}

interface MethodologyData {
  version: string;
  title: string;
  source: string;
  applicableDepartment: string;
  parameters: Array<{
    parameter: string;
    name: string;
    weight: number;
    maxMarks: number;
    subMetricCodes: string[];
  }>;
  metrics: Array<{
    metricCode: string;
    parameter: string;
    name: string;
    formula: string;
    normalisationRule: string;
    maxMarks: number;
    requiredInputs: string[];
    minimumDataRequirements: string;
    isBibliometricOrThirdParty?: boolean;
  }>;
  calculationBlockers: Array<{
    parameter: string;
    metricCode: string;
    title: string;
    severity: string;
    description: string;
  }>;
}

const ROLE_LABELS: Record<string, string> = {
  DEPARTMENT_ADMIN: "Department Admin",
  FACULTY_CONTRIBUTOR: "Faculty Contributor",
  REVIEWER: "Reviewer",
  VIEWER: "Viewer",
};

const ROLE_BADGES: Record<string, string> = {
  DEPARTMENT_ADMIN: "bg-blue-100 text-blue-800 border-blue-200",
  REVIEWER: "bg-amber-100 text-amber-800 border-amber-200",
  FACULTY_CONTRIBUTOR: "bg-indigo-50 text-indigo-700 border-indigo-200",
  VIEWER: "bg-slate-100 text-slate-700 border-slate-200",
};

export default function SettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("users");

  // Global feedback banners
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Users State
  const [users, setUsers] = useState<SafeUser[]>([]);
  const [counts, setCounts] = useState<UserCounts>({ total: 0, active: 0, invited: 0, disabled: 0 });
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // User Modals State
  const [showAddModal, setShowAddModal] = useState(false);
  const [addUserError, setAddUserError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editUserError, setEditUserError] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ open: false, title: "", message: "", onConfirm: () => {} });

  // Add User Form State
  const [addUserForm, setAddUserForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "FACULTY_CONTRIBUTOR" as SafeUser["role"],
    idType: "employeeId" as "employeeId" | "studentId",
    idValue: "",
    status: "ACTIVE" as SafeUser["status"],
  });
  const [submittingAdd, setSubmittingAdd] = useState(false);

  // Edit User Form State
  const [editingUser, setEditingUser] = useState<SafeUser | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    role: "FACULTY_CONTRIBUTOR" as SafeUser["role"],
    status: "ACTIVE" as SafeUser["status"],
    employeeId: "",
    studentId: "",
  });
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Methodology State
  const [methodology, setMethodology] = useState<MethodologyData | null>(null);
  const [loadingMethodology, setLoadingMethodology] = useState(false);

  // Department Settings State
  const [departmentSettings, setDepartmentSettings] = useState<DepartmentSettings | null>(null);
  const [deptForm, setDeptForm] = useState<DepartmentSettings | null>(null);
  const [loadingDept, setLoadingDept] = useState(false);
  const [savingDept, setSavingDept] = useState(false);

  // Integrations State
  const [integrations, setIntegrations] = useState<IntegrationItem[]>([]);
  const [loadingIntegrations, setLoadingIntegrations] = useState(false);
  const [testingHeartbeat, setTestingHeartbeat] = useState(false);

  // Auto-dismiss banners
  useEffect(() => {
    if (successBanner) {
      const timer = setTimeout(() => setSuccessBanner(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successBanner]);

  useEffect(() => {
    if (errorBanner) {
      const timer = setTimeout(() => setErrorBanner(null), 8000);
      return () => clearTimeout(timer);
    }
  }, [errorBanner]);

  // Fetch Users
  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const params = new URLSearchParams({
        search: searchQuery,
        role: roleFilter,
        status: statusFilter,
        page: page.toString(),
        limit: "10",
      });
      const res = await fetch(`/api/users?${params.toString()}`);
      if (!res.ok) {
        if (res.status === 401) {
          router.push("/auth/signin");
          return;
        }
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to load users");
      }
      const data = await res.json();
      setUsers(data.users || []);
      setCounts(data.counts || { total: 0, active: 0, invited: 0, disabled: 0 });
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (err: any) {
      setErrorBanner(err.message || "Network error loading users roster");
    } finally {
      setLoadingUsers(false);
    }
  }, [searchQuery, roleFilter, statusFilter, page, router]);

  // Fetch Methodology
  const fetchMethodology = useCallback(async () => {
    setLoadingMethodology(true);
    try {
      const res = await fetch("/api/settings/methodology");
      if (!res.ok) {
        if (res.status === 401) router.push("/auth/signin");
        throw new Error("Failed to load methodology");
      }
      const data = await res.json();
      setMethodology(data.methodology);
    } catch (err: any) {
      setErrorBanner(err.message || "Failed to fetch methodology definitions");
    } finally {
      setLoadingMethodology(false);
    }
  }, [router]);

  // Fetch Department Settings
  const fetchDepartmentSettings = useCallback(async () => {
    setLoadingDept(true);
    try {
      const res = await fetch("/api/settings/department");
      if (!res.ok) {
        if (res.status === 401) router.push("/auth/signin");
        throw new Error("Failed to load department settings");
      }
      const data = await res.json();
      setDepartmentSettings(data.config);
      setDeptForm(JSON.parse(JSON.stringify(data.config)));
    } catch (err: any) {
      setErrorBanner(err.message || "Failed to load department configuration");
    } finally {
      setLoadingDept(false);
    }
  }, [router]);

  // Fetch Integrations
  const fetchIntegrations = useCallback(async (isHeartbeat = false) => {
    if (isHeartbeat) setTestingHeartbeat(true);
    else setLoadingIntegrations(true);

    try {
      const res = await fetch("/api/settings/integrations");
      if (!res.ok) {
        if (res.status === 401) router.push("/auth/signin");
        throw new Error("Failed to load integrations");
      }
      const data = await res.json();
      setIntegrations(data.integrations || []);
      if (isHeartbeat) {
        setSuccessBanner("Connection heartbeat confirmed: Local MongoDB and system modules responding.");
      }
    } catch (err: any) {
      setErrorBanner(err.message || "Failed to check integration status");
    } finally {
      setLoadingIntegrations(false);
      setTestingHeartbeat(false);
    }
  }, [router]);

  // Load active tab data
  useEffect(() => {
    if (activeTab === "users") {
      fetchUsers();
    } else if (activeTab === "methodology") {
      fetchMethodology();
    } else if (activeTab === "departments" || activeTab === "notifications") {
      fetchDepartmentSettings();
    } else if (activeTab === "integrations") {
      fetchIntegrations();
    }
  }, [activeTab, fetchUsers, fetchMethodology, fetchDepartmentSettings, fetchIntegrations]);

  // Export CSV handler
  const handleExportCsv = () => {
    const params = new URLSearchParams({
      search: searchQuery,
      role: roleFilter,
      status: statusFilter,
    });
    window.location.href = `/api/users/export?${params.toString()}`;
  };

  // Add User Submit
  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddUserError(null);

    if (!addUserForm.name.trim() || !addUserForm.email.trim() || !addUserForm.password) {
      setAddUserError("Name, email, and password are required.");
      return;
    }
    if (!addUserForm.idValue.trim()) {
      setAddUserError("Identifier (Employee ID or Student ID) is required.");
      return;
    }

    setSubmittingAdd(true);
    try {
      const payload: Record<string, any> = {
        name: addUserForm.name.trim(),
        email: addUserForm.email.trim(),
        password: addUserForm.password,
        role: addUserForm.role,
        status: addUserForm.status,
      };
      if (addUserForm.idType === "employeeId") {
        payload.employeeId = addUserForm.idValue.trim();
      } else {
        payload.studentId = addUserForm.idValue.trim();
      }

      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        const errorMsg = data.error || (data.details && Array.isArray(data.details) ? data.details.join(", ") : "Failed to create user");
        setAddUserError(errorMsg);
        return;
      }

      setSuccessBanner(`User ${data.user.name} (${data.user.email}) created successfully.`);
      setShowAddModal(false);
      setAddUserError(null);
      setAddUserForm({
        name: "",
        email: "",
        password: "",
        role: "FACULTY_CONTRIBUTOR",
        idType: "employeeId",
        idValue: "",
        status: "ACTIVE",
      });
      fetchUsers();
    } catch (err: any) {
      setAddUserError(err.message || "Error adding user");
    } finally {
      setSubmittingAdd(false);
    }
  };

  // Edit User Submit
  const handleEditUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditUserError(null);

    setSubmittingEdit(true);
    try {
      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name.trim(),
          role: editForm.role,
          status: editForm.status,
          employeeId: editForm.employeeId.trim(),
          studentId: editForm.studentId.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        const errorMsg = data.error || "Failed to update user";
        setEditUserError(errorMsg);
        return;
      }

      setSuccessBanner(`User ${data.user.name} updated successfully.`);
      setShowEditModal(false);
      setEditUserError(null);
      setEditingUser(null);
      fetchUsers();
    } catch (err: any) {
      setEditUserError(err.message || "Error updating user");
    } finally {
      setSubmittingEdit(false);
    }
  };

  // Toggle user active/disabled
  const handleToggleUserStatus = (user: SafeUser) => {
    const newStatus = user.status === "ACTIVE" ? "DISABLED" : "ACTIVE";
    const actionWord = newStatus === "ACTIVE" ? "activate" : "disable";

    setShowConfirmModal({
      open: true,
      title: `${newStatus === "ACTIVE" ? "Activate" : "Disable"} Account`,
      message:
        newStatus === "DISABLED"
          ? `Are you sure you want to disable ${user.name}? They will immediately lose access and all active sessions will be terminated.`
          : `Activate ${user.name}'s account so they can sign in to the portal?`,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/users/${user.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: newStatus }),
          });
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || `Failed to ${actionWord} account`);
          }
          setSuccessBanner(`Account ${user.name} is now ${newStatus}.`);
          fetchUsers();
        } catch (err: any) {
          setErrorBanner(err.message || `Failed to ${actionWord} account`);
        } finally {
          setShowConfirmModal({ open: false, title: "", message: "", onConfirm: () => {} });
        }
      },
    });
  };

  // Save Department / Notification Settings
  const handleSaveDepartmentSettings = async () => {
    if (!deptForm) return;

    setSavingDept(true);
    try {
      const res = await fetch("/api/settings/department", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(deptForm),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update department settings");
      }

      setDepartmentSettings(data.config);
      setDeptForm(JSON.parse(JSON.stringify(data.config)));
      setSuccessBanner("Department and reporting configuration persisted successfully.");
    } catch (err: any) {
      setErrorBanner(err.message || "Failed to save settings");
    } finally {
      setSavingDept(false);
    }
  };

  const isDeptDirty =
    JSON.stringify(departmentSettings) !== JSON.stringify(deptForm);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Top Header */}
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
            <div className="h-9 w-9 rounded-lg bg-[#1D4ED8] flex items-center justify-center text-white shadow-sm">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 tracking-tight">MCA NIRF Assist</div>
              <div className="text-[11px] text-slate-500">
                Department of Computer Applications • Settings &amp; Access Controls
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200">
            <Shield className="w-3.5 h-3.5 text-blue-600" />
            Role-Based Access Control Active
          </span>
          <button
            onClick={() => router.push("/dashboard")}
            className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition"
          >
            Dashboard
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Alerts / Feedback Banners */}
        {successBanner && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between shadow-sm animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
              <span>{successBanner}</span>
            </div>
            <button onClick={() => setSuccessBanner(null)} className="text-emerald-700 hover:text-emerald-900">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {errorBanner && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between shadow-sm animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
              <span className="font-medium">{errorBanner}</span>
            </div>
            <button onClick={() => setErrorBanner(null)} className="text-rose-700 hover:text-rose-900">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Breadcrumb & Top Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="hover:text-[#1D4ED8] cursor-pointer" onClick={() => router.push("/dashboard")}>
              System
            </span>
            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            <span className="font-semibold text-slate-900">Settings</span>
            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-[#1D4ED8] font-semibold capitalize">
              {activeTab === "users"
                ? "User Management"
                : activeTab === "methodology"
                ? "Methodology Rules"
                : activeTab === "departments"
                ? "Department Configuration"
                : activeTab === "integrations"
                ? "System Integrations"
                : "Notification Preferences"}
            </span>
          </div>

          {activeTab === "users" && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportCsv}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition"
                title="Download user list as CSV"
              >
                <Download className="h-3.5 w-3.5 text-slate-500" />
                <span>Export Roster</span>
              </button>
            </div>
          )}
        </div>

        {/* Header Banner */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Institutional Settings</h1>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-[#1D4ED8] text-xs font-bold border border-blue-200">
                  NIRF Engineering 2025
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-3xl">
                Manage authorized personnel, inspect official NIRF ranking parameters, verify institution-level reporting quotas, and inspect backend integrations.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start md:self-auto">
              <span className="text-xs text-slate-400">Department:</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold">
                <Building className="h-3.5 w-3.5" />
                <span>MCA</span>
              </span>
            </div>
          </div>
        </div>

        {/* Layout: Sub-Nav Rail + Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Vertical Sub-Navigation */}
          <aside className="lg:col-span-3 flex flex-col gap-1.5 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="px-2 py-1 mb-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Configuration Suite
              </span>
            </div>

            <button
              onClick={() => setActiveTab("users")}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                activeTab === "users" ? "bg-[#1D4ED8] text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Users className="h-4 w-4" />
                <span>Users</span>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  activeTab === "users" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                {counts.total}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("methodology")}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                activeTab === "methodology" ? "bg-[#1D4ED8] text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Sliders className="h-4 w-4" />
                <span>Methodology</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                Engg 2025
              </span>
            </button>

            <button
              onClick={() => setActiveTab("departments")}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                activeTab === "departments" ? "bg-[#1D4ED8] text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Building className="h-4 w-4" />
                <span>Department &amp; Reporting</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab("integrations")}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                activeTab === "integrations" ? "bg-[#1D4ED8] text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Database className="h-4 w-4" />
                <span>Integrations &amp; APIs</span>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </button>

            <button
              onClick={() => setActiveTab("notifications")}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                activeTab === "notifications" ? "bg-[#1D4ED8] text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Bell className="h-4 w-4" />
                <span>Notifications &amp; Alerts</span>
              </div>
            </button>

            {/* Diagnostic Box */}
            <div className="mt-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[11px] uppercase tracking-wider text-slate-500">
                  System Diagnostics
                </span>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              </div>
              <p className="text-[11px] text-slate-600 leading-snug">
                Backend connected to local MongoDB engine. Audit trail active.
              </p>
              <button
                onClick={() => fetchIntegrations(true)}
                disabled={testingHeartbeat}
                className="flex items-center gap-1 text-[11px] font-semibold text-[#1D4ED8] hover:underline pt-1"
              >
                <RefreshCw className={`h-3 w-3 ${testingHeartbeat ? "animate-spin" : ""}`} />
                <span>{testingHeartbeat ? "Pinging..." : "Test connection heartbeat"}</span>
              </button>
            </div>
          </aside>

          {/* Right Main Content Workspace */}
          <section className="lg:col-span-9 space-y-6">
            {/* TAB 1: USERS */}
            {activeTab === "users" && (
              <>
                {/* KPI Stats Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="text-[11px] font-semibold uppercase tracking-wider">Total Users</span>
                      <Users className="h-4 w-4 text-[#1D4ED8]" />
                    </div>
                    <div className="my-2">
                      <span className="text-2xl font-black text-slate-900">{counts.total}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
                      MongoDB registered accounts
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="text-[11px] font-semibold uppercase tracking-wider">Active Accounts</span>
                      <UserCheck className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div className="my-2">
                      <span className="text-2xl font-black text-emerald-600">{counts.active}</span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Authorized for system access
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="text-[11px] font-semibold uppercase tracking-wider">Pending Invites</span>
                      <Clock className="h-4 w-4 text-amber-600" />
                    </div>
                    <div className="my-2">
                      <span className="text-2xl font-black text-amber-600">{counts.invited}</span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Invited accounts awaiting initial login
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="text-[11px] font-semibold uppercase tracking-wider">Disabled Accounts</span>
                      <UserX className="h-4 w-4 text-rose-500" />
                    </div>
                    <div className="my-2">
                      <span className="text-2xl font-black text-rose-600">{counts.disabled}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
                      Revoked login privileges
                    </div>
                  </div>
                </div>

                {/* Filter and Action Bar */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                  <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="relative flex-1 min-w-[240px]">
                      <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setPage(1);
                        }}
                        placeholder="Search by name, institutional email, or ID..."
                        className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
                      />
                    </div>

                    <select
                      value={roleFilter}
                      onChange={(e) => {
                        setRoleFilter(e.target.value);
                        setPage(1);
                      }}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
                    >
                      <option value="ALL">All Roles</option>
                      <option value="DEPARTMENT_ADMIN">Department Admin</option>
                      <option value="FACULTY_CONTRIBUTOR">Faculty Contributor</option>
                      <option value="REVIEWER">Reviewer</option>
                      <option value="VIEWER">Viewer</option>
                    </select>

                    <select
                      value={statusFilter}
                      onChange={(e) => {
                        setStatusFilter(e.target.value);
                        setPage(1);
                      }}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
                    >
                      <option value="ALL">All Statuses</option>
                      <option value="ACTIVE">Active</option>
                      <option value="INVITED">Invited</option>
                      <option value="DISABLED">Disabled</option>
                    </select>
                  </div>

                  <button
                    onClick={() => {
                      setAddUserError(null);
                      setShowAddModal(true);
                    }}
                    className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[#1D4ED8] hover:bg-blue-800 text-white text-xs font-semibold shadow-sm transition"
                  >
                    <UserPlus className="h-4 w-4" />
                    <span>Add User</span>
                  </button>
                </div>

                {/* Users Table */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                        <tr>
                          <th className="py-3 px-6 font-semibold">User / Profile</th>
                          <th className="py-3 px-6 font-semibold">Institutional Email</th>
                          <th className="py-3 px-6 font-semibold">Assigned Role</th>
                          <th className="py-3 px-6 font-semibold">Identifier</th>
                          <th className="py-3 px-6 font-semibold">Status</th>
                          <th className="py-3 px-6 font-semibold">Created</th>
                          <th className="py-3 px-6 text-right font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {loadingUsers ? (
                          <tr>
                            <td colSpan={7} className="py-12 text-center text-slate-500">
                              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-slate-400" />
                              <span>Loading user roster from database...</span>
                            </td>
                          </tr>
                        ) : users.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-12 text-center text-slate-500">
                              <Users className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                              <p className="font-semibold text-slate-700">No users found</p>
                              <p className="text-[11px] text-slate-400 mt-1">
                                No records match the search query or filters.
                              </p>
                            </td>
                          </tr>
                        ) : (
                          users.map((user) => (
                            <tr key={user.id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="py-3.5 px-6">
                                <div className="flex items-center gap-3">
                                  <div className="h-8 w-8 rounded-full bg-blue-50 text-[#1D4ED8] flex items-center justify-center font-bold text-xs">
                                    {user.name.split(" ").pop()?.charAt(0) || "U"}
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="font-semibold text-slate-900">{user.name}</span>
                                    <span className="text-[11px] text-slate-400">{user.department}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3.5 px-6 font-mono text-slate-600">{user.email}</td>
                              <td className="py-3.5 px-6">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                    ROLE_BADGES[user.role] || "bg-slate-100 text-slate-700"
                                  }`}
                                >
                                  {ROLE_LABELS[user.role] || user.role}
                                </span>
                              </td>
                              <td className="py-3.5 px-6 font-mono text-slate-500">
                                {user.employeeId ? (
                                  <span title="Employee ID">{user.employeeId}</span>
                                ) : user.studentId ? (
                                  <span title="Student ID">{user.studentId}</span>
                                ) : (
                                  <span className="text-slate-400 italic">Unassigned</span>
                                )}
                              </td>
                              <td className="py-3.5 px-6">
                                {user.status === "ACTIVE" ? (
                                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    Active
                                  </span>
                                ) : user.status === "INVITED" ? (
                                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-200">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                    Invited
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-medium">
                                    Disabled
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 px-6 text-slate-500 text-[11px]">
                                {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}
                              </td>
                              <td className="py-3.5 px-6 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => {
                                      setEditingUser(user);
                                      setEditForm({
                                        name: user.name,
                                        role: user.role,
                                        status: user.status,
                                        employeeId: user.employeeId || "",
                                        studentId: user.studentId || "",
                                      });
                                      setShowEditModal(true);
                                    }}
                                    className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition"
                                    title="Edit user details"
                                  >
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleToggleUserStatus(user)}
                                    className={`p-1.5 rounded hover:bg-slate-100 transition ${
                                      user.status === "ACTIVE"
                                        ? "text-rose-500 hover:text-rose-700"
                                        : "text-emerald-600 hover:text-emerald-800"
                                    }`}
                                    title={user.status === "ACTIVE" ? "Disable account" : "Activate account"}
                                  >
                                    {user.status === "ACTIVE" ? (
                                      <UserX className="h-3.5 w-3.5" />
                                    ) : (
                                      <UserCheck className="h-3.5 w-3.5" />
                                    )}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="px-6 py-3 border-t border-slate-200 flex items-center justify-between bg-slate-50/50">
                      <span className="text-xs text-slate-500">
                        Page {page} of {totalPages}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          disabled={page === 1}
                          className="px-2.5 py-1 rounded border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-white disabled:opacity-50"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                          disabled={page === totalPages}
                          className="px-2.5 py-1 rounded border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-white disabled:opacity-50"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* TAB 2: METHODOLOGY */}
            {activeTab === "methodology" && (
              <div className="space-y-6">
                {loadingMethodology ? (
                  <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-slate-400" />
                    <span className="text-xs text-slate-500">Loading methodology configuration...</span>
                  </div>
                ) : methodology ? (
                  <>
                    {/* Methodology Summary Banner */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h2 className="text-lg font-bold text-slate-900">{methodology.title}</h2>
                            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-blue-100 text-blue-800">
                              {methodology.version}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">{methodology.source}</p>
                          <p className="text-xs font-semibold text-blue-700 mt-0.5">
                            Applicable Unit: {methodology.applicableDepartment}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-xs font-medium self-start">
                          <Lock className="h-3.5 w-3.5" />
                          <span>Official Formulas (Read-Only)</span>
                        </div>
                      </div>

                      {/* Parameter Weights Cards */}
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
                        {methodology.parameters.map((p) => (
                          <div key={p.parameter} className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                            <div className="text-[11px] font-bold text-blue-700 uppercase">{p.parameter}</div>
                            <div className="text-xs font-semibold text-slate-800 truncate" title={p.name}>
                              {p.name}
                            </div>
                            <div className="mt-2 flex items-baseline justify-between">
                              <span className="text-base font-black text-slate-900">
                                {Math.round(p.weight * 100)}%
                              </span>
                              <span className="text-[10px] text-slate-400">Max {p.maxMarks}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Calculation Blockers Notice */}
                    {methodology.calculationBlockers && methodology.calculationBlockers.length > 0 && (
                      <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5 space-y-3">
                        <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wide">
                          <AlertCircle className="h-4 w-4 text-amber-600" />
                          <span>NIRF Normalisation Rules &amp; Calculation Invariants</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                          {methodology.calculationBlockers.map((b, idx) => (
                            <div key={idx} className="bg-white/90 p-3.5 rounded-xl border border-amber-200/60">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-bold text-slate-900 text-[11px]">{b.title}</span>
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800">
                                  {b.severity}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-600 leading-relaxed">{b.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Sub-metrics Table */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                          Complete Sub-Metric Specifications
                        </h3>
                        <span className="text-xs text-slate-400">
                          {methodology.metrics.length} sub-metrics configured
                        </span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                            <tr>
                              <th className="py-3 px-5 font-semibold">Param</th>
                              <th className="py-3 px-5 font-semibold">Metric</th>
                              <th className="py-3 px-5 font-semibold">Official Formula</th>
                              <th className="py-3 px-5 font-semibold">Max</th>
                              <th className="py-3 px-5 font-semibold">Required Evidence Inputs</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {methodology.metrics.map((m) => (
                              <tr key={m.metricCode} className="hover:bg-slate-50/70">
                                <td className="py-3 px-5 font-bold text-blue-700">{m.parameter}</td>
                                <td className="py-3 px-5">
                                  <div className="font-semibold text-slate-900">{m.metricCode}</div>
                                  <div className="text-[11px] text-slate-500 max-w-xs">{m.name}</div>
                                </td>
                                <td className="py-3 px-5 font-mono text-[11px] text-slate-800 max-w-md">
                                  <div className="bg-slate-50 px-2 py-1 rounded border border-slate-200">
                                    {m.formula}
                                  </div>
                                  <div className="text-[10px] text-slate-400 mt-0.5">{m.normalisationRule}</div>
                                </td>
                                <td className="py-3 px-5 font-bold text-slate-900">{m.maxMarks}</td>
                                <td className="py-3 px-5 text-slate-600 text-[11px]">
                                  <div className="flex flex-wrap gap-1">
                                    {m.requiredInputs.map((inp) => (
                                      <span
                                        key={inp}
                                        className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-mono"
                                      >
                                        {inp}
                                      </span>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                ) : null}
              </div>
            )}

            {/* TAB 3: DEPARTMENT & REPORTING SETTINGS */}
            {activeTab === "departments" && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Department &amp; Reporting Parameters</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Institutional constants, reporting cycle parameters, and approved intake for metric computations.
                    </p>
                  </div>
                  {isDeptDirty && (
                    <span className="px-2 py-1 rounded text-[11px] font-semibold bg-amber-100 text-amber-800">
                      Unsaved changes
                    </span>
                  )}
                </div>

                {loadingDept ? (
                  <div className="py-12 text-center text-slate-500">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-slate-400" />
                    <span className="text-xs">Loading department parameters...</span>
                  </div>
                ) : deptForm ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Institution Name
                        </label>
                        <input
                          type="text"
                          value={deptForm.institutionName}
                          onChange={(e) => setDeptForm({ ...deptForm, institutionName: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Department Code
                        </label>
                        <input
                          type="text"
                          value={deptForm.department}
                          disabled
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-100 text-xs text-slate-500 cursor-not-allowed"
                        />
                        <span className="text-[10px] text-slate-400">Fixed institutional scope</span>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Programme Name
                        </label>
                        <input
                          type="text"
                          value={deptForm.programmeName}
                          onChange={(e) => setDeptForm({ ...deptForm, programmeName: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Home State (Region Diversity Benchmark)
                        </label>
                        <input
                          type="text"
                          value={deptForm.homeState}
                          onChange={(e) => setDeptForm({ ...deptForm, homeState: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Selected Academic Year
                        </label>
                        <input
                          type="text"
                          value={deptForm.selectedAcademicYear}
                          onChange={(e) => setDeptForm({ ...deptForm, selectedAcademicYear: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Reporting Period
                        </label>
                        <select
                          value={deptForm.reportingPeriod}
                          onChange={(e) => setDeptForm({ ...deptForm, reportingPeriod: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
                        >
                          <option value="ANNUAL">ANNUAL</option>
                          <option value="3_YEAR_COHORT">3_YEAR_COHORT</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Sanctioned Annual Intake (Approved Seats)
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={deptForm.sanctionedIntake}
                          onChange={(e) =>
                            setDeptForm({ ...deptForm, sanctionedIntake: parseInt(e.target.value, 10) || 1 })
                          }
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Reference Cutoff Date
                        </label>
                        <input
                          type="date"
                          value={deptForm.referenceDate}
                          onChange={(e) => setDeptForm({ ...deptForm, referenceDate: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Cycle Start Date
                        </label>
                        <input
                          type="date"
                          value={deptForm.cycleStartDate}
                          onChange={(e) => setDeptForm({ ...deptForm, cycleStartDate: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Cycle End Date
                        </label>
                        <input
                          type="date"
                          value={deptForm.cycleEndDate}
                          onChange={(e) => setDeptForm({ ...deptForm, cycleEndDate: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                      <button
                        type="button"
                        onClick={() => setDeptForm(JSON.parse(JSON.stringify(departmentSettings)))}
                        disabled={!isDeptDirty || savingDept}
                        className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveDepartmentSettings}
                        disabled={!isDeptDirty || savingDept}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1D4ED8] hover:bg-blue-800 text-white text-xs font-semibold shadow-sm transition disabled:opacity-50"
                      >
                        <Save className="h-4 w-4" />
                        <span>{savingDept ? "Saving..." : "Save Changes"}</span>
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            {/* TAB 4: INTEGRATIONS */}
            {activeTab === "integrations" && (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Backend System Integrations</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Real-time status of local persistence, machine learning extraction engines, and external registries.
                    </p>
                  </div>
                  <button
                    onClick={() => fetchIntegrations(true)}
                    disabled={testingHeartbeat}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${testingHeartbeat ? "animate-spin" : ""}`} />
                    <span>{testingHeartbeat ? "Pinging..." : "Refresh Status"}</span>
                  </button>
                </div>

                {loadingIntegrations ? (
                  <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-slate-400" />
                    <span className="text-xs text-slate-500">Inspecting server integration health...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {integrations.map((item) => (
                      <div
                        key={item.id}
                        className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              {item.category}
                            </span>
                            <h3 className="text-sm font-bold text-slate-900 mt-0.5">{item.name}</h3>
                          </div>
                          {item.status === "HEALTHY" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Healthy
                            </span>
                          ) : item.status === "FALLBACK" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                              Active Fallback
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-semibold border border-slate-200">
                              Not Configured
                            </span>
                          )}
                        </div>

                        <div className="text-xs space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <div className="flex justify-between text-slate-600">
                            <span className="text-slate-400">Provider / Engine:</span>
                            <span className="font-semibold">{item.provider}</span>
                          </div>
                          <div className="flex justify-between text-slate-600">
                            <span className="text-slate-400">Response Latency:</span>
                            <span className="font-mono text-[11px]">{item.latency}</span>
                          </div>
                        </div>

                        <p className="text-[11px] text-slate-500 leading-snug">{item.details}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 5: NOTIFICATIONS */}
            {activeTab === "notifications" && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Notification &amp; Alert Preferences</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Configure workflow notifications for verified metric changes and audit events.
                    </p>
                  </div>
                  {isDeptDirty && (
                    <span className="px-2 py-1 rounded text-[11px] font-semibold bg-amber-100 text-amber-800">
                      Unsaved changes
                    </span>
                  )}
                </div>

                {loadingDept ? (
                  <div className="py-12 text-center text-slate-500">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-slate-400" />
                    <span className="text-xs">Loading preferences...</span>
                  </div>
                ) : deptForm ? (
                  <div className="space-y-6">
                    {/* In-App Alerts */}
                    <div className="space-y-4">
                      <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        In-App Alerts (Supported)
                      </h3>

                      <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={deptForm.notifications.inAppAlerts}
                          onChange={(e) =>
                            setDeptForm({
                              ...deptForm,
                              notifications: {
                                ...deptForm.notifications,
                                inAppAlerts: e.target.checked,
                              },
                            })
                          }
                          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#1D4ED8] focus:ring-[#1D4ED8]"
                        />
                        <div>
                          <div className="text-xs font-semibold text-slate-900">
                            Verification Workflow Alerts
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Receive notifications when new evidence is assigned or needs reviewer approval.
                          </div>
                        </div>
                      </label>

                      <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={deptForm.notifications.highDiscrepancyAlerts}
                          onChange={(e) =>
                            setDeptForm({
                              ...deptForm,
                              notifications: {
                                ...deptForm.notifications,
                                highDiscrepancyAlerts: e.target.checked,
                              },
                            })
                          }
                          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#1D4ED8] focus:ring-[#1D4ED8]"
                        />
                        <div>
                          <div className="text-xs font-semibold text-slate-900">
                            High Discrepancy Alerts
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Notify administrators if extracted document values differ significantly from claimed numbers.
                          </div>
                        </div>
                      </label>

                      <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={deptForm.notifications.calculationAlerts}
                          onChange={(e) =>
                            setDeptForm({
                              ...deptForm,
                              notifications: {
                                ...deptForm.notifications,
                                calculationAlerts: e.target.checked,
                              },
                            })
                          }
                          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#1D4ED8] focus:ring-[#1D4ED8]"
                        />
                        <div>
                          <div className="text-xs font-semibold text-slate-900">
                            Metric Calculation Completion
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Notify when a NIRF 2025 calculation run completes and publishes new sub-metric scores.
                          </div>
                        </div>
                      </label>
                    </div>

                    {/* Outbound Alerts */}
                    <div className="space-y-4 pt-4 border-t border-slate-200">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                          Outbound Transports (Unavailable in current deployment)
                        </h3>
                        <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                          SMTP / SMS disabled
                        </span>
                      </div>

                      <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 opacity-60 flex items-start gap-3">
                        <input type="checkbox" disabled checked={false} className="mt-0.5 h-4 w-4" />
                        <div>
                          <div className="text-xs font-semibold text-slate-700">Email Notifications (SMTP)</div>
                          <div className="text-[11px] text-slate-500">
                            Outbound transactional mailer is not configured. Email dispatches are disabled.
                          </div>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 opacity-60 flex items-start gap-3">
                        <input type="checkbox" disabled checked={false} className="mt-0.5 h-4 w-4" />
                        <div>
                          <div className="text-xs font-semibold text-slate-700">SMS Critical Broadcasts</div>
                          <div className="text-[11px] text-slate-500">
                            Telephony gateway is not configured for this installation.
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                      <button
                        type="button"
                        onClick={() => setDeptForm(JSON.parse(JSON.stringify(departmentSettings)))}
                        disabled={!isDeptDirty || savingDept}
                        className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                      >
                        Reset
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveDepartmentSettings}
                        disabled={!isDeptDirty || savingDept}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1D4ED8] hover:bg-blue-800 text-white text-xs font-semibold shadow-sm transition disabled:opacity-50"
                      >
                        <Save className="h-4 w-4" />
                        <span>{savingDept ? "Saving..." : "Save Preferences"}</span>
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* ADD USER MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-[#1D4ED8]" />
                <h3 className="text-sm font-bold text-slate-900">Add Authorized User</h3>
              </div>
              <button
                onClick={() => {
                  setAddUserError(null);
                  setShowAddModal(false);
                }}
                className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {addUserError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2 shadow-sm animate-in fade-in">
                <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 font-medium leading-relaxed">{addUserError}</div>
              </div>
            )}

            <form onSubmit={handleAddUserSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Ramesh Gupta"
                  value={addUserForm.name}
                  onChange={(e) => setAddUserForm({ ...addUserForm, name: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Institutional Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@institution.edu"
                  value={addUserForm.email}
                  onChange={(e) => setAddUserForm({ ...addUserForm, email: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Initial Password <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  placeholder="Min 8 chars, 1 upper, 1 lower, 1 num, 1 special"
                  value={addUserForm.password}
                  onChange={(e) => setAddUserForm({ ...addUserForm, password: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
                />
                
                {/* Real-time Password Complexity Helper */}
                <div className="mt-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] space-y-1">
                  <span className="font-semibold text-slate-600 block mb-0.5">Password Requirements:</span>
                  <div className={`flex items-center gap-1.5 ${addUserForm.password.length >= 8 ? 'text-emerald-700 font-semibold' : 'text-slate-400'}`}>
                    <span>{addUserForm.password.length >= 8 ? '✓' : '•'}</span>
                    <span>At least 8 characters</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${/[A-Z]/.test(addUserForm.password) ? 'text-emerald-700 font-semibold' : 'text-slate-400'}`}>
                    <span>{/[A-Z]/.test(addUserForm.password) ? '✓' : '•'}</span>
                    <span>At least one uppercase letter (A-Z)</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${/[a-z]/.test(addUserForm.password) ? 'text-emerald-700 font-semibold' : 'text-slate-400'}`}>
                    <span>{/[a-z]/.test(addUserForm.password) ? '✓' : '•'}</span>
                    <span>At least one lowercase letter (a-z)</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${/[0-9]/.test(addUserForm.password) ? 'text-emerald-700 font-semibold' : 'text-slate-400'}`}>
                    <span>{/[0-9]/.test(addUserForm.password) ? '✓' : '•'}</span>
                    <span>At least one number (0-9)</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(addUserForm.password) ? 'text-emerald-700 font-semibold' : 'text-slate-400'}`}>
                    <span>{/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(addUserForm.password) ? '✓' : '•'}</span>
                    <span>At least one special symbol (!@#$%^&*...)</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Assigned Role <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={addUserForm.role}
                    onChange={(e) =>
                      setAddUserForm({ ...addUserForm, role: e.target.value as SafeUser["role"] })
                    }
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
                  >
                    <option value="DEPARTMENT_ADMIN">Department Admin</option>
                    <option value="FACULTY_CONTRIBUTOR">Faculty Contributor</option>
                    <option value="REVIEWER">Reviewer</option>
                    <option value="VIEWER">Viewer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Initial Status
                  </label>
                  <select
                    value={addUserForm.status}
                    onChange={(e) =>
                      setAddUserForm({ ...addUserForm, status: e.target.value as SafeUser["status"] })
                    }
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INVITED">Invited</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Institutional Identifier <span className="text-rose-500">*</span>
                </label>
                <div className="flex gap-2">
                  <select
                    value={addUserForm.idType}
                    onChange={(e) =>
                      setAddUserForm({
                        ...addUserForm,
                        idType: e.target.value as "employeeId" | "studentId",
                      })
                    }
                    className="w-36 px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-800"
                  >
                    <option value="employeeId">Employee ID</option>
                    <option value="studentId">Student ID</option>
                  </select>
                  <input
                    type="text"
                    required
                    placeholder="e.g. EMP-MCA-012"
                    value={addUserForm.idValue}
                    onChange={(e) => setAddUserForm({ ...addUserForm, idValue: e.target.value })}
                    className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setAddUserError(null);
                    setShowAddModal(false);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAdd}
                  className="px-4 py-1.5 rounded-lg bg-[#1D4ED8] hover:bg-blue-800 text-white text-xs font-semibold shadow-sm transition disabled:opacity-50"
                >
                  {submittingAdd ? "Creating..." : "Add User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Edit2 className="h-4 w-4 text-[#1D4ED8]" />
                <h3 className="text-sm font-bold text-slate-900">Edit User Profile</h3>
              </div>
              <button
                onClick={() => {
                  setEditUserError(null);
                  setShowEditModal(false);
                }}
                className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {editUserError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2 shadow-sm animate-in fade-in">
                <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 font-medium leading-relaxed">{editUserError}</div>
              </div>
            )}

            <form onSubmit={handleEditUserSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Institutional Email (Immutable)
                </label>
                <input
                  type="email"
                  disabled
                  value={editingUser.email}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-100 text-xs text-slate-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Role</label>
                  <select
                    value={editForm.role}
                    onChange={(e) =>
                      setEditForm({ ...editForm, role: e.target.value as SafeUser["role"] })
                    }
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
                  >
                    <option value="DEPARTMENT_ADMIN">Department Admin</option>
                    <option value="FACULTY_CONTRIBUTOR">Faculty Contributor</option>
                    <option value="REVIEWER">Reviewer</option>
                    <option value="VIEWER">Viewer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) =>
                      setEditForm({ ...editForm, status: e.target.value as SafeUser["status"] })
                    }
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INVITED">Invited</option>
                    <option value="DISABLED">Disabled</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Employee ID</label>
                  <input
                    type="text"
                    value={editForm.employeeId}
                    onChange={(e) => setEditForm({ ...editForm, employeeId: e.target.value })}
                    placeholder="EMP-..."
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Student ID</label>
                  <input
                    type="text"
                    value={editForm.studentId}
                    onChange={(e) => setEditForm({ ...editForm, studentId: e.target.value })}
                    placeholder="STU-..."
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
                  />
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-800 flex items-start gap-2">
                <Info className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <span>
                  Modifying a user&apos;s role or status will immediately invalidate their active authentication sessions.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="px-4 py-1.5 rounded-lg bg-[#1D4ED8] hover:bg-blue-800 text-white text-xs font-semibold shadow-sm transition disabled:opacity-50"
                >
                  {submittingEdit ? "Updating..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL */}
      {showConfirmModal.open && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <span>{showConfirmModal.title}</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">{showConfirmModal.message}</p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() =>
                  setShowConfirmModal({ open: false, title: "", message: "", onConfirm: () => {} })
                }
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={showConfirmModal.onConfirm}
                className="px-4 py-1.5 rounded-lg bg-[#1D4ED8] hover:bg-blue-800 text-white text-xs font-semibold shadow-sm transition"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
