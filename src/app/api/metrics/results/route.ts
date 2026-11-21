import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { MetricResult } from "@/models/MetricResult";
import { DepartmentConfig } from "@/models/DepartmentConfig";
import { Publication } from "@/models/Publication";
import { Patent } from "@/models/Patent";
import { ProjectConsultancy } from "@/models/ProjectConsultancy";
import { FinanceRecord } from "@/models/FinanceRecord";
import { Faculty } from "@/models/Faculty";
import { Student } from "@/models/Student";
import { GraduationOutcome } from "@/models/GraduationOutcome";
import { PlacementRecord } from "@/models/PlacementRecord";
import { DoctoralAward } from "@/models/DoctoralAward";
import { ZeroActivityDeclaration } from "@/models/ZeroActivityDeclaration";
import { SanctionedIntake } from "@/models/SanctionedIntake";
import { OutreachRecord } from "@/models/OutreachRecord";
import { PerceptionRecord } from "@/models/PerceptionRecord";
import { getRPReportingWindow, getGOReportingWindow, getScoreYearConfig } from "@/lib/reportingWindow";
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
    const policy = (searchParams.get("policy") as any) || "COMPLETED_BASELINE";
    const parameter = searchParams.get("parameter");
    const status = searchParams.get("status");

    const showHistory = searchParams.get("history") === "true";
    const rpReportingWindow = getRPReportingWindow(academicYear);
    const goReportingWindow = getGOReportingWindow(academicYear);
    const scoreYearConfig = getScoreYearConfig(2026, policy, academicYear);

    // If history requested, return historical snapshot runs
    if (showHistory) {
      const historicalRuns = await MetricResult.find({
        department: "MCA",
        academicYear,
        metricCode: "OVERALL",
      })
        .sort({ calculatedAt: -1 })
        .populate("calculatedBy", "name email role")
        .limit(20)
        .lean();

      return NextResponse.json({
        success: true,
        department: "MCA",
        academicYear,
        historicalRuns,
      });
    }

    const query: Record<string, any> = {
      department: "MCA",
      academicYear,
      isLatest: { $ne: false },
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
      isLatest: { $ne: false },
    })
      .populate("calculatedBy", "name email role")
      .lean();

    const subMetrics = results.filter((r) => r.metricCode !== "OVERALL");

    // Stale result detection:
    // Compare overallResult.calculatedAt against latest updatedAt of contributing collections
    let isStale = false;
    let staleReason: string | undefined;

    if (overallResult?.calculatedAt) {
      const calcTime = new Date(overallResult.calculatedAt).getTime();
      const [
        latestConfig,
        latestPub,
        latestPatent,
        latestPrj,
        latestFinance,
        latestFaculty,
        latestStudent,
        latestGradOutcome,
        latestPlacement,
        latestDoctoralAward,
        latestDecl,
        latestIntake,
        latestOutreach,
        latestPerception,
      ] = await Promise.all([
        DepartmentConfig.findOne({ department: "MCA" }).sort({ updatedAt: -1 }).select("updatedAt").lean(),
        Publication.findOne({ department: "MCA" }).sort({ updatedAt: -1 }).select("updatedAt").lean(),
        Patent.findOne({ department: "MCA" }).sort({ updatedAt: -1 }).select("updatedAt").lean(),
        ProjectConsultancy.findOne({ department: "MCA" }).sort({ updatedAt: -1 }).select("updatedAt").lean(),
        FinanceRecord.findOne({ department: "MCA" }).sort({ updatedAt: -1 }).select("updatedAt").lean(),
        Faculty.findOne({ department: "MCA" }).sort({ updatedAt: -1 }).select("updatedAt").lean(),
        Student.findOne({ department: "MCA" }).sort({ updatedAt: -1 }).select("updatedAt").lean(),
        GraduationOutcome.findOne({ department: "MCA" }).sort({ updatedAt: -1 }).select("updatedAt").lean(),
        PlacementRecord.findOne({ department: "MCA" }).sort({ updatedAt: -1 }).select("updatedAt").lean(),
        DoctoralAward.findOne({ department: "MCA" }).sort({ updatedAt: -1 }).select("updatedAt").lean(),
        ZeroActivityDeclaration.findOne({ department: "MCA", academicYear }).sort({ updatedAt: -1 }).select("updatedAt").lean(),
        SanctionedIntake.findOne({ department: "MCA" }).sort({ updatedAt: -1 }).select("updatedAt").lean(),
        OutreachRecord.findOne({ department: "MCA" }).sort({ updatedAt: -1 }).select("updatedAt").lean(),
        PerceptionRecord.findOne({ department: "MCA" }).sort({ updatedAt: -1 }).select("updatedAt").lean(),
      ]);

      const sources = [
        { name: "Department Configuration", time: latestConfig?.updatedAt ? new Date(latestConfig.updatedAt).getTime() : 0 },
        { name: "Sanctioned Intake", time: latestIntake?.updatedAt ? new Date(latestIntake.updatedAt).getTime() : 0 },
        { name: "Publications", time: latestPub?.updatedAt ? new Date(latestPub.updatedAt).getTime() : 0 },
        { name: "Patents", time: latestPatent?.updatedAt ? new Date(latestPatent.updatedAt).getTime() : 0 },
        { name: "Projects & Consultancy", time: latestPrj?.updatedAt ? new Date(latestPrj.updatedAt).getTime() : 0 },
        { name: "Finance Records", time: latestFinance?.updatedAt ? new Date(latestFinance.updatedAt).getTime() : 0 },
        { name: "Faculty Records", time: latestFaculty?.updatedAt ? new Date(latestFaculty.updatedAt).getTime() : 0 },
        { name: "Student Records", time: latestStudent?.updatedAt ? new Date(latestStudent.updatedAt).getTime() : 0 },
        { name: "Outreach & Inclusivity Records", time: latestOutreach?.updatedAt ? new Date(latestOutreach.updatedAt).getTime() : 0 },
        { name: "Perception Survey Records", time: latestPerception?.updatedAt ? new Date(latestPerception.updatedAt).getTime() : 0 },
        { name: "Graduation Outcomes", time: latestGradOutcome?.updatedAt ? new Date(latestGradOutcome.updatedAt).getTime() : 0 },
        { name: "Placement Records", time: latestPlacement?.updatedAt ? new Date(latestPlacement.updatedAt).getTime() : 0 },
        { name: "Doctoral Awards", time: latestDoctoralAward?.updatedAt ? new Date(latestDoctoralAward.updatedAt).getTime() : 0 },
        { name: "Zero Activity Declarations", time: latestDecl?.updatedAt ? new Date(latestDecl.updatedAt).getTime() : 0 },
      ];

      for (const s of sources) {
        if (s.time > calcTime) {
          isStale = true;
          staleReason = `${s.name} updated after last calculation run (${new Date(s.time).toLocaleDateString()}). Recalculation required.`;
          break;
        }
      }
    }

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
      isStale,
      staleReason,
      rpReportingWindow,
      goReportingWindow,
      scoreYearConfig,
      partialWeightedSubtotal: overallResult?.result?.partialWeightedSubtotal ?? null,
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

