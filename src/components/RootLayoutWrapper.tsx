"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { AppShell } from "./AppShell";

const UNPROTECTED_ROUTES = ["/login", "/setup-admin"];

export function RootLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // If on login or setup-admin, render without sidebar shell
  const isUnprotected = UNPROTECTED_ROUTES.some(
    (route) => pathname === route || pathname?.startsWith(`${route}/`)
  );

  if (isUnprotected) {
    return <>{children}</>;
  }

  // All authenticated routes get the 288px Stitch sidebar layout
  return <AppShell>{children}</AppShell>;
}

