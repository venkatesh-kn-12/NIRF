"use client";

import React from "react";
import { Sidebar } from "./Sidebar";

interface SidebarLayoutProps {
  children: React.ReactNode;
  verificationCount?: number;
  userName?: string;
  userRole?: string;
  onLogout?: () => void;
}

/**
 * SidebarLayout is a pure layout wrapper.
 * It renders the 288px sidebar + main content offset.
 * Pass user props from the page's own auth state.
 */
export function SidebarLayout({
  children,
  verificationCount = 0,
  userName,
  userRole,
  onLogout,
}: SidebarLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar
        verificationCount={verificationCount}
        userName={userName}
        userRole={userRole}
        onLogout={onLogout}
      />
      {/* Main content offset by desktop sidebar width (w-72 = 288px) */}
      <main className="lg:pl-72 min-h-screen">
        {children}
      </main>
    </div>
  );
}

