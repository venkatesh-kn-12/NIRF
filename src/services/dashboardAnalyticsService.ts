import { connectDB } from "@/lib/db";
import { Student } from "@/models/Student";
import { Faculty } from "@/models/Faculty";
import { FinanceRecord } from "@/models/FinanceRecord";
import { Publication } from "@/models/Publication";
import { Patent } from "@/models/Patent";
import { ProjectConsultancy } from "@/models/ProjectConsultancy";
import { GraduationOutcome } from "@/models/GraduationOutcome";
import { PlacementRecord } from "@/models/PlacementRecord";
import { OutreachRecord } from "@/models/OutreachRecord";
import { PerceptionRecord } from "@/models/PerceptionRecord";
import { VerificationCase } from "@/models/VerificationCase";
import { AuditLog } from "@/models/AuditLog";
import { MetricResult } from "@/models/MetricResult";
import { PARAMETERS_CONFIG } from "@/services/metrics/methodologyConfig";

export interface DashboardSummaryData {
  department: "MCA";
  academicYear: string;
  completeness: {
    totalRecords: number;
    approvedRecords: number;
    pendingRecords: number;
    reviewNeededRecords: number;
    completenessPercentage: number;
  };
  parameterReadiness: Record<
    string,
    {
      name: string;
      weight: number;
      totalRecords: number;
      approvedRecords: number;
      readinessPercentage: number;
      status: "HIGH" | "MEDIUM" | "LOW";
    }
  >;
  metricsSummary: {
    totalMetrics: number;
    computed: number;
    awaitingSource: number;
    pendingInput: number;
    notComputable: number;
    indicativeOverallScore: number | null;
  };
  recentActivity: Array<{
    id: string;
    action: string;
    userEmail: string;
    userRole: string;
    resourceType?: string;
    timestamp: string;
    status: string;
    details?: any;
  }>;
  recordCountsByType: Record<string, { total: number; approved: number; draft: number; needsReview: number }>;
}

export async function getDashboardSummary(academicYear: string = "2024-25"): Promise<DashboardSummaryData> {
  await connectDB();
  const deptFilter = { department: "MCA" };

  // Fetch record sets across all 10 NIRF collections
  const [
    students,
    faculty,
    finance,
    publications,
    patents,
    projects,
    gradOutcomes,
    placements,
    outreach,
    perceptions,
    verificationCases,
    metricResults,
    recentAuditLogs,
  ] = await Promise.all([
    Student.find(deptFilter).select("status evidenceReferences createdAt").lean(),
    Faculty.find(deptFilter).select("status evidenceReferences createdAt").lean(),
    FinanceRecord.find(deptFilter).select("status evidenceReferences createdAt").lean(),
    Publication.find(deptFilter).select("status evidenceReferences createdAt").lean(),
    Patent.find(deptFilter).select("status evidenceReferences createdAt").lean(),
    ProjectConsultancy.find(deptFilter).select("status evidenceReferences createdAt").lean(),
    GraduationOutcome.find(deptFilter).select("status evidenceReferences createdAt").lean(),
    PlacementRecord.find(deptFilter).select("status evidenceReferences createdAt").lean(),
    OutreachRecord.find(deptFilter).select("status evidenceReferences createdAt").lean(),
    PerceptionRecord.find(deptFilter).select("status evidenceReferences createdAt").lean(),
    VerificationCase.find({ department: "MCA", status: { $in: ["OPEN", "IN_REVIEW", "ESCALATED"] } }).lean(),
    MetricResult.find({ department: "MCA", academicYear }).lean(),
    AuditLog.find({ department: "MCA" }).sort({ timestamp: -1 }).limit(10).lean(),
  ]);

  // Aggregate by model type
  const collectionsMap: Record<string, any[]> = {
    Student: students,
    Faculty: faculty,
    FinanceRecord: finance,
    Publication: publications,
    Patent: patents,
    ProjectConsultancy: projects,
    GraduationOutcome: gradOutcomes,
    PlacementRecord: placements,
    OutreachRecord: outreach,
    PerceptionRecord: perceptions,
  };

  let totalRecords = 0;
  let approvedRecords = 0;
  let pendingRecords = 0;
  let reviewNeededRecords = 0;

  const recordCountsByType: Record<string, { total: number; approved: number; draft: number; needsReview: number }> = {};

  for (const [modelName, records] of Object.entries(collectionsMap)) {
    let approved = 0;
    let draft = 0;
    let needsReview = 0;

    for (const r of records) {
      if (r.status === "APPROVED") approved++;
      else if (r.status === "CORRECTION_REQUESTED") needsReview++;
      else draft++;
    }

    totalRecords += records.length;
    approvedRecords += approved;
    reviewNeededRecords += needsReview;
    pendingRecords += draft;

    recordCountsByType[modelName] = {
      total: records.length,
      approved,
      draft,
      needsReview,
    };
  }

  // Include open verification cases in review needed tally
  reviewNeededRecords += verificationCases.length;

  const completenessPercentage =
    totalRecords > 0 ? Math.round((approvedRecords / totalRecords) * 1000) / 10 : 0;

  // Parameter-wise readiness
  // TLR models: Student, Faculty, FinanceRecord
  // RP models: Publication, Patent, ProjectConsultancy
  // GO models: GraduationOutcome, PlacementRecord
  // OI models: OutreachRecord
  // PR models: PerceptionRecord
  const paramModelMapping: Record<string, string[]> = {
    TLR: ["Student", "Faculty", "FinanceRecord"],
    RP: ["Publication", "Patent", "ProjectConsultancy"],
    GO: ["GraduationOutcome", "PlacementRecord"],
    OI: ["OutreachRecord"],
    PR: ["PerceptionRecord"],
  };

  const parameterReadiness: Record<string, any> = {};
  for (const [paramKey, pConfig] of Object.entries(PARAMETERS_CONFIG)) {
    const models = paramModelMapping[paramKey] || [];
    let pTotal = 0;
    let pApproved = 0;

    for (const m of models) {
      const counts = recordCountsByType[m];
      if (counts) {
        pTotal += counts.total;
        pApproved += counts.approved;
      }
    }

    const pReadiness = pTotal > 0 ? Math.round((pApproved / pTotal) * 1000) / 10 : 0;
    let status: "HIGH" | "MEDIUM" | "LOW" = "LOW";
    if (pReadiness >= 75) status = "HIGH";
    else if (pReadiness >= 40) status = "MEDIUM";

    parameterReadiness[paramKey] = {
      name: pConfig.name,
      weight: pConfig.weight,
      totalRecords: pTotal,
      approvedRecords: pApproved,
      readinessPercentage: pReadiness,
      status,
    };
  }

  // Metrics summary
  const subMetrics = metricResults.filter((m) => m.metricCode !== "OVERALL");
  const overallMetric = metricResults.find((m) => m.metricCode === "OVERALL");

  const metricsSummary = {
    totalMetrics: subMetrics.length || 17,
    computed: subMetrics.filter((m) => m.status === "COMPUTED").length,
    awaitingSource: subMetrics.filter((m) => m.status === "AWAITING_SOURCE").length,
    pendingInput: subMetrics.filter((m) => m.status === "PENDING_INPUT").length,
    notComputable: subMetrics.filter((m) => m.status === "NOT_COMPUTABLE").length,
    indicativeOverallScore: overallMetric?.result?.rawScore ?? null,
  };

  // Recent activity formatting
  const recentActivity = recentAuditLogs.map((log: any) => ({
    id: log._id.toString(),
    action: log.action,
    userEmail: log.userEmail,
    userRole: log.userRole,
    resourceType: log.resourceType,
    timestamp: log.timestamp ? new Date(log.timestamp).toISOString() : new Date().toISOString(),
    status: log.status,
    details: log.details,
  }));

  return {
    department: "MCA",
    academicYear,
    completeness: {
      totalRecords,
      approvedRecords,
      pendingRecords,
      reviewNeededRecords,
      completenessPercentage,
    },
    parameterReadiness,
    metricsSummary,
    recentActivity,
    recordCountsByType,
  };
}

