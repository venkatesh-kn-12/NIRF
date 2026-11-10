import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { MetricResult } from "@/models/MetricResult";
import { extractTokenFromRequest, getSessionUser } from "@/lib/auth";
import { hasRole } from "@/lib/rbac";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    await connectDB();

    const { id } = await params;
    const metric = await MetricResult.findById(id)
      .populate("calculatedBy", "name email role")
      .lean();

    if (!metric) {
      return NextResponse.json({ error: "Metric result not found" }, { status: 404 });
    }

    return NextResponse.json({ metric });
  } catch (error: unknown) {
    console.error("GET /api/metrics/results/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve metric detail" },
      { status: 500 }
    );
  }
}

