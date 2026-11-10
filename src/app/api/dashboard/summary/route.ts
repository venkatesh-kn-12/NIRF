import { NextRequest, NextResponse } from "next/server";
import { extractTokenFromRequest, getSessionUser } from "@/lib/auth";
import { hasRole } from "@/lib/rbac";
import { getDashboardSummary } from "@/services/dashboardAnalyticsService";

export async function GET(req: NextRequest) {
  try {
    const token = extractTokenFromRequest(req);
    if (!token) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const authData = await getSessionUser(token);
    if (!authData) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const { user } = authData;
    if (!hasRole(user.role, ["DEPARTMENT_ADMIN", "REVIEWER", "FACULTY_CONTRIBUTOR", "VIEWER"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const academicYear = searchParams.get("academicYear") || "2024-25";

    const summary = await getDashboardSummary(academicYear);

    return NextResponse.json(summary);
  } catch (error: unknown) {
    console.error("GET /api/dashboard/summary error:", error);
    return NextResponse.json(
      { error: "Failed to load dashboard summary" },
      { status: 500 }
    );
  }
}

