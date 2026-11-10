import { NextRequest, NextResponse } from "next/server";
import { extractTokenFromRequest, getSessionUser } from "@/lib/auth";
import { hasRole } from "@/lib/rbac";
import { runDeterministicMetricComputation } from "@/services/metrics/metricComputationService";

export async function POST(req: NextRequest) {
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

    // Requirement 10: Only DEPARTMENT_ADMIN can run calculations
    if (!hasRole(user.role, ["DEPARTMENT_ADMIN"])) {
      return NextResponse.json(
        {
          error: "Forbidden. Only Department Administrators can trigger official metric calculation.",
          currentRole: user.role,
        },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const academicYear = body.academicYear || "2024-25";

    const summary = await runDeterministicMetricComputation(academicYear, user, req);

    return NextResponse.json({
      success: true,
      message: "NIRF Engineering 2025 metric computation completed deterministically.",
      summary,
    });
  } catch (error: unknown) {
    console.error("POST /api/metrics/calculate error:", error);
    const message = error instanceof Error ? error.message : "Computation failed";
    return NextResponse.json(
      { error: "Metric calculation encountered an error", details: message },
      { status: 500 }
    );
  }
}
