import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { MetricResult } from "@/models/MetricResult";
import { extractTokenFromRequest, getSessionUser } from "@/lib/auth";
import { hasRole } from "@/lib/rbac";
import { PARAMETERS_CONFIG } from "@/services/metrics/methodologyConfig";

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

    await connectDB();

    const { searchParams } = new URL(req.url);
    const academicYear = searchParams.get("academicYear") || "2024-25";
    const parameter = searchParams.get("parameter");
    const status = searchParams.get("status");

    const query: Record<string, any> = {
      department: "MCA",
      academicYear,
    };

    if (parameter && parameter !== "ALL") {
      query.parameter = parameter;
    }
    if (status && status !== "ALL") {
      query.status = status;
    }

    const results = await MetricResult.find(query)
      .sort({ parameter: 1, metricCode: 1 })
      .populate("calculatedBy", "name email role")
      .lean();

    // Separate overall indicator from sub-metrics
    const overallResult = await MetricResult.findOne({
      department: "MCA",
      academicYear,
      metricCode: "OVERALL",
    })
      .populate("calculatedBy", "name email role")
      .lean();

    const subMetrics = results.filter((r) => r.metricCode !== "OVERALL");

    // Group scores by parameter
    const parameterSummaries: Record<string, any> = {};
    for (const [key, config] of Object.entries(PARAMETERS_CONFIG)) {
      const items = subMetrics.filter((m) => m.parameter === key);
      let rawScoreSum = 0;
      let computableCount = 0;

      for (const item of items) {
        if (item.status === "COMPUTED" && item.result.rawScore !== null) {
          rawScoreSum += item.result.rawScore;
          computableCount++;
        }
      }

      rawScoreSum = Math.round(rawScoreSum * 100) / 100;
      const weightedScore = Math.round(rawScoreSum * config.weight * 100) / 100;

      parameterSummaries[key] = {
        parameter: key,
        name: config.name,
        weight: config.weight,
        maxMarks: config.maxMarks,
        rawScore: rawScoreSum,
        weightedScore,
        metricsCount: items.length,
        computedCount: computableCount,
      };
    }

    const counts = {
      total: subMetrics.length,
      computed: subMetrics.filter((m) => m.status === "COMPUTED").length,
      notComputable: subMetrics.filter((m) => m.status === "NOT_COMPUTABLE").length,
      awaitingSource: subMetrics.filter((m) => m.status === "AWAITING_SOURCE").length,
      pendingInput: subMetrics.filter((m) => m.status === "PENDING_INPUT").length,
    };

    return NextResponse.json({
      department: "MCA",
      academicYear,
      methodologyVersion: "NIRF_ENGINEERING_2025",
      isLabel: "MCA Departmental Indicative NIRF-aligned Metrics",
      lastCalculated: overallResult?.calculatedAt || null,
      calculatedBy: overallResult?.calculatedBy || null,
      overallIndicativeScore: overallResult?.result?.rawScore ?? null,
      overallResult,
      counts,
      parameterSummaries,
      results: subMetrics,
    });
  } catch (error: unknown) {
    console.error("GET /api/metrics/results error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve metric results" },
      { status: 500 }
    );
  }
}

