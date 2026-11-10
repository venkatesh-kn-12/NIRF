"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "./Sidebar";

interface SafeUser {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
}

interface AppShellProps {
  children: React.ReactNode;
}

/**
 * AppShell wraps all authenticated pages.
 * It fetches the current user, verification case count, and renders
 * the 288px sidebar + main content area.
 *
 * Usage: wrap any authenticated page with <AppShell>{content}</AppShell>
 */
export function AppShell({ children }: AppShellProps) {
  const router = useRouter();
  const [user, setUser] = useState<SafeUser | null>(null);
  const [verificationCount, setVerificationCount] = useState(0);

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (!res.ok) {
        router.push("/login");
        return;
      }
      const data = await res.json();
      setUser(data.user);
    } catch {
      router.push("/login");
    }
  }, [router]);

  const fetchVerificationCount = useCallback(async () => {
    try {
      const res = await fetch("/api/verification-cases/stats");
      if (res.ok) {
        const data = await res.json();
        setVerificationCount(
          (data.stats?.OPEN ?? 0) + (data.stats?.IN_REVIEW ?? 0)
        );
      }
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    fetchUser();
    fetchVerificationCount();
  }, [fetchUser, fetchVerificationCount]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar
        verificationCount={verificationCount}
        userName={user?.name}
        userRole={user?.role}
        onLogout={handleLogout}
      />
      {/* Main content — offset by sidebar width */}
      <main className="lg:pl-72 min-h-screen transition-all duration-200">
        {children}
      </main>
    </div>
  );
}

