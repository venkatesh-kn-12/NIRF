"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  ShieldCheck,
  Calculator,
  BarChart3,
  FileText,
  History,
  Settings,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  LogOut,
  Building2,
  Menu,
  X,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number | null;
}

interface SidebarProps {
  verificationCount?: number;
  userName?: string;
  userRole?: string;
  onLogout?: () => void;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Department Dashboard", href: "/dashboard", icon: <LayoutDashboard size={18} /> },
  { label: "Student Data Repository", href: "/students", icon: <GraduationCap size={18} /> },
  { label: "Faculty Data Repository", href: "/faculty", icon: <Users size={18} /> },
  { label: "Upload & Extract Data", href: "/uploads", icon: <FileText size={18} /> },
  { label: "Verification Queue", href: "/verification", icon: <ShieldCheck size={18} /> },
  { label: "Metrics & Calculations", href: "/metrics", icon: <Calculator size={18} /> },
  { label: "Analytics & Trends", href: "/analytics", icon: <BarChart3 size={18} /> },
  { label: "Reports & DCS Export", href: "/reports", icon: <FileText size={18} /> },
  { label: "Audit Trail", href: "/audit", icon: <History size={18} /> },
  { label: "Settings", href: "/settings", icon: <Settings size={18} /> },
];

function getCurrentCycleProgress(): { label: string; daysLeft: number; percent: number } {
  // NIRF 2026 submission window: Jan–Feb 2026
  const now = new Date();
  const cycleStart = new Date("2025-11-01");
  const cycleEnd = new Date("2026-02-28");
  const total = cycleEnd.getTime() - cycleStart.getTime();
  const elapsed = Math.max(0, now.getTime() - cycleStart.getTime());
  const percent = Math.min(100, Math.round((elapsed / total) * 100));
  const daysLeft = Math.max(0, Math.ceil((cycleEnd.getTime() - now.getTime()) / 86400000));
  return { label: "NIRF 2026", daysLeft, percent };
}

export function Sidebar({ verificationCount = 0, userName, userRole, onLogout }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const cycle = getCurrentCycleProgress();

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/";
    return pathname.startsWith(href);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-200 min-h-[64px]">
        <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center">
          <Building2 size={20} className="text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">DSATM / MCA</p>
            <p className="text-xs text-slate-500 truncate">NIRF Assist Portal</p>
          </div>
        )}
        {/* Collapse toggle — desktop only */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="hidden lg:flex ml-auto flex-shrink-0 p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          const badge = item.href === "/verification" && verificationCount > 0 ? verificationCount : null;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group ${
                active
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
              title={collapsed ? item.label : undefined}
            >
              <span className={`flex-shrink-0 ${active ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600"}`}>
                {item.icon}
              </span>
              {!collapsed && (
                <>
                  <span className="flex-1 truncate">{item.label}</span>
                  {badge !== null && (
                    <span className="ml-auto flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-red-100 text-red-700 text-xs font-semibold flex items-center justify-center">
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                </>
              )}
              {collapsed && badge !== null && (
                <span className="absolute left-8 top-0 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {badge > 9 ? "9+" : badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* NIRF Cycle Progress Card */}
      {!collapsed && (
        <div className="mx-3 mb-3 p-3 rounded-lg bg-indigo-50 border border-indigo-100">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-indigo-700">{cycle.label} Cycle</span>
            <span className="text-xs text-indigo-500">{cycle.daysLeft}d left</span>
          </div>
          <div className="h-1.5 rounded-full bg-indigo-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all"
              style={{ width: `${cycle.percent}%` }}
            />
          </div>
          <p className="text-[11px] text-indigo-500 mt-1">{cycle.percent}% of prep window elapsed</p>
        </div>
      )}

      {/* User / Logout Footer */}
      <div className="border-t border-slate-200 px-3 py-3">
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
              <span className="text-xs font-semibold text-indigo-700">
                {userName ? userName.charAt(0).toUpperCase() : "U"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{userName || "User"}</p>
              <p className="text-xs text-slate-500 truncate capitalize">
                {userRole?.replace(/_/g, " ").toLowerCase() || "—"}
              </p>
            </div>
            {onLogout && (
              <button
                onClick={onLogout}
                className="flex-shrink-0 p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                title="Logout"
              >
                <LogOut size={15} />
              </button>
            )}
          </div>
        ) : (
          onLogout && (
            <button
              onClick={onLogout}
              className="w-full flex items-center justify-center p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
              title="Logout"
            >
              <LogOut size={15} />
            </button>
          )
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow-md border border-slate-200 text-slate-600"
        onClick={() => setMobileOpen((o) => !o)}
        aria-label="Toggle sidebar"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/30"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`lg:hidden fixed top-0 left-0 z-40 h-full w-72 bg-white border-r border-slate-200 shadow-xl transition-transform duration-200 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col fixed top-0 left-0 h-full bg-white border-r border-slate-200 shadow-sm transition-all duration-200 z-30 ${
          collapsed ? "w-16" : "w-72"
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}

