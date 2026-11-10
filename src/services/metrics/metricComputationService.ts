import { connectDB } from "@/lib/db";
import { MetricResult, IMetricResult, MetricCalculationStatus } from "@/models/MetricResult";
import { MethodologyVersion } from "@/models/MethodologyVersion";
import {
  METRIC_DEFINITIONS,
  PARAMETERS_CONFIG,
  NIRF_ENGINEERING_2025_VERSION,
} from "./methodologyConfig";
import { resolveApprovedMetricInputs, ResolvedMetricInputs } from "./inputResolver";
import { evaluateMetric, EvaluatedMetricOutput } from "./formulaEvaluator";
import { IUser } from "@/models/User";
import { logAuditEvent } from "@/lib/audit";
import { getClientIp, getClientUserAgent } from "@/lib/auth";

export interface ComputationSummary {
  academicYear: string;
  department: "MCA";
  methodologyVersion: string;
  calculatedAt: string;
  auditReference: string;
  counts: {
    totalMetrics: number;
    computed: number;
    notComputable: number;
    awaitingSource: number;
    pendingInput: number;
  };
  overallIndicativeScore: number | null;
  parameterScores: Record<
    string,
    {
      name: string;
      weight: number;
      rawScore: number | null;
      weightedScore: number | null;
      maxMarks: number;
      status: MetricCalculationStatus;
      subMetrics: EvaluatedMetricOutput[];
    }
  >;
  results: IMetricResult[];
}

/**
 * Ensures the official NIRF Engineering 2025 methodology is seeded and active in DB.
 */
export async function ensureMethodologyVersionExists(): Promise<void> {
  const existing = await MethodologyVersion.findOne({
    version: NIRF_ENGINEERING_2025_VERSION,
  });

  if (!existing) {
    await MethodologyVersion.create({
      version: NIRF_ENGINEERING_2025_VERSION,
      category: "ENGINEERING",
      effectiveFrom: new Date("2024-04-01"),
      parameters: Object.values(PARAMETERS_CONFIG).map((p) => ({
        parameter: p.parameter,
        name: p.name,
        weight: p.weight,
        maxMarks: p.maxMarks,
      })),
      metricDefinitions: METRIC_DEFINITIONS,
      formulas: {
        TLR: "SS(20) + FSR(30) + FQE(20) + FRU(30)",
        RP: "PU(35) + QP(40) + IPR(15) + FPPP(10)",
        GO: "GPH(40) + GUE(15) + GMS(25) + GPHD(20)",
        OI: "RD(30) + WD(30) + ESCS(20) + PCS(20)",
        PR: "PR(100)",
        OVERALL: "(TLR * 0.30) + (RP * 0.30) + (GO * 0.20) + (OI * 0.10) + (PR * 0.10)",
      },
      normalisationRules: {
        SS: "min(15, 15*(NE/NT)) + min(5, 5*(NP/target))",
        FSR: "F/N < 1:50 ? 0 : min(30, 30*(15*(F/N)))",
        FQE: "FQ(10) + FE(10)",
        FRU: "7.5*f(BC) + 22.5*f(BO)",
        GPH: "40*(Np/100 + Nhs/100)",
        GUE: "15*min(Ng/80, 1)",
        GMS: "25*f(MS)",
        RD: "25*fracOtherStates + 5*fracOtherCountries",
        WD: "15*min(1, NWS/50) + 15*min(1, NWF/20)",
      },
      weights: {
        TLR: 0.30,
        RP: 0.30,
        GO: 0.20,
        OI: 0.10,
        PR: 0.10,
      },
      status: "ACTIVE",
    });
  }
}

/**
 * Executes deterministic metric computation pipeline across all NIRF parameters for MCA.
 * Strictly adheres to Zero Estimation Mandate and approved record constraint.
 */
export async function runDeterministicMetricComputation(
  academicYear: string,
  user: IUser,
  req?: Request
): Promise<ComputationSummary> {
  await connectDB();
  await ensureMethodologyVersionExists();

  const auditReference = `COMP-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

  // 1. Resolve approved inputs
  const inputs: ResolvedMetricInputs = await resolveApprovedMetricInputs(academicYear);

  // 2. Evaluate all sub-metrics deterministically
  const evaluatedSubMetrics: EvaluatedMetricOutput[] = [];
  for (const def of METRIC_DEFINITIONS) {
    const evaluated = evaluateMetric(def.metricCode, inputs);
    evaluatedSubMetrics.push(evaluated);
  }

  // 3. Aggregate parameter scores
  const parameterScores: Record<string, any> = {};
  let totalComputedWeightedSum = 0;
  let totalWeightSum = 0;

  for (const [paramKey, pConfig] of Object.entries(PARAMETERS_CONFIG)) {
    const subMetrics = evaluatedSubMetrics.filter((m) => m.parameter === paramKey);

    let paramRawScore = 0;
    let hasUncomputable = false;
    let hasAwaitingSource = false;
    let hasPendingInput = false;

    for (const sm of subMetrics) {
      if (sm.status === "COMPUTED" && sm.result.rawScore !== null) {
        paramRawScore += sm.result.rawScore;
      } else if (sm.status === "AWAITING_SOURCE") {
        hasAwaitingSource = true;
      } else if (sm.status === "NOT_COMPUTABLE") {
        hasUncomputable = true;
      } else if (sm.status === "PENDING_INPUT") {
        hasPendingInput = true;
      }
    }

    paramRawScore = Math.round(paramRawScore * 100) / 100;
    const weightedScore = Math.round(paramRawScore * pConfig.weight * 100) / 100;

    let paramStatus: MetricCalculationStatus = "COMPUTED";
    if (hasPendingInput && paramRawScore === 0) {
      paramStatus = "PENDING_INPUT";
    } else if (hasAwaitingSource) {
      paramStatus = "AWAITING_SOURCE";
    } else if (hasUncomputable && paramRawScore === 0) {
      paramStatus = "NOT_COMPUTABLE";
    }

    parameterScores[paramKey] = {
      name: pConfig.name,
      weight: pConfig.weight,
      rawScore: paramRawScore,
      weightedScore,
      maxMarks: pConfig.maxMarks,
      status: paramStatus,
      subMetrics,
    };

    totalComputedWeightedSum += weightedScore;
    totalWeightSum += pConfig.weight;
  }

  const overallIndicativeScore = Math.round(totalComputedWeightedSum * 100) / 100;

  // 4. Counts breakdown
  const counts = {
    totalMetrics: evaluatedSubMetrics.length,
    computed: evaluatedSubMetrics.filter((m) => m.status === "COMPUTED").length,
    notComputable: evaluatedSubMetrics.filter((m) => m.status === "NOT_COMPUTABLE").length,
    awaitingSource: evaluatedSubMetrics.filter((m) => m.status === "AWAITING_SOURCE").length,
    pendingInput: evaluatedSubMetrics.filter((m) => m.status === "PENDING_INPUT").length,
  };

  // 5. Clean prior computation results for this academic year and save new snapshot
  await MetricResult.deleteMany({
    department: "MCA",
    academicYear,
    methodologyVersion: NIRF_ENGINEERING_2025_VERSION,
  });

  const savedResults: IMetricResult[] = [];

  // Persist individual sub-metric results
  for (const sm of evaluatedSubMetrics) {
    const doc = await MetricResult.create({
      department: "MCA",
      academicYear,
      reportingPeriod: "ANNUAL",
      methodologyVersion: NIRF_ENGINEERING_2025_VERSION,
      parameter: sm.parameter,
      metricCode: sm.metricCode,
      name: sm.name,
      inputValueSnapshot: inputs.rawSnapshot,
      result: sm.result,
      status: sm.status,
      calculatedBy: user._id,
      calculatedAt: new Date(),
      formulaVersion: "2025.1",
      auditReference,
      notes: sm.notes || "",
    });
    savedResults.push(doc);
  }

  const isOverallComputed = counts.awaitingSource === 0 && counts.notComputable === 0 && counts.pendingInput === 0;
  const overallStatus = isOverallComputed ? "COMPUTED" : "AWAITING_SOURCE";

  // Persist overall aggregate indicator
  const overallDoc = await MetricResult.create({
    department: "MCA",
    academicYear,
    reportingPeriod: "ANNUAL",
    methodologyVersion: NIRF_ENGINEERING_2025_VERSION,
    parameter: "OVERALL",
    metricCode: "OVERALL",
    name: "Overall Indicative MCA NIRF Score",
    inputValueSnapshot: inputs.rawSnapshot,
    result: {
      rawScore: isOverallComputed ? overallIndicativeScore : null,
      normalisedScore: isOverallComputed ? overallIndicativeScore : null,
      weightedScore: isOverallComputed ? overallIndicativeScore : null,
      maxMarks: 100,
      trace: {
        formula: "Total = (TLR * 0.30) + (RP * 0.30) + (GO * 0.20) + (OI * 0.10) + (PR * 0.10)",
        steps: Object.entries(parameterScores).map(([key, data]) => ({
          step: `${key} Component`,
          expression: `${data.rawScore} * ${data.weight}`,
          value: data.weightedScore,
        })),
        notes: isOverallComputed
          ? "Complete NIRF Engineering 2025 metric score."
          : `Partial indicative calculation: ${counts.awaitingSource} awaiting external sources, ${counts.notComputable} non-computable. Final score null under Zero Estimation Policy.`,
      },
    },
    status: overallStatus,
    calculatedBy: user._id,
    calculatedAt: new Date(),
    formulaVersion: "2025.1",
    auditReference,
    notes: isOverallComputed
      ? "MCA Departmental Score — strictly aligned with NIRF Engineering 2025 formulas."
      : "Overall score cannot be estimated while sub-metrics remain uncomputed or awaiting external source.",
  });
  savedResults.push(overallDoc);

  // 6. Write AuditLog entry
  const ipAddress = req ? getClientIp(req) : "127.0.0.1";
  const userAgent = req ? getClientUserAgent(req) : "Server Engine";

  await logAuditEvent({
    action: "metric calculation",
    userId: user._id,
    userEmail: user.email,
    userRole: user.role,
    department: "MCA",
    resourceType: "MetricResult",
    resourceId: overallDoc._id.toString(),
    details: {
      academicYear,
      methodologyVersion: NIRF_ENGINEERING_2025_VERSION,
      auditReference,
      overallIndicativeScore,
      counts,
      approvedRecordsSampled: inputs.rawSnapshot.counts,
    },
    status: "SUCCESS",
    ipAddress,
    userAgent,
  });

  return {
    academicYear,
    department: "MCA",
    methodologyVersion: NIRF_ENGINEERING_2025_VERSION,
    calculatedAt: new Date().toISOString(),
    auditReference,
    counts,
    overallIndicativeScore,
    parameterScores,
    results: savedResults,
  };
}

