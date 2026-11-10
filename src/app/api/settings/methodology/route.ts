import { NextRequest, NextResponse } from "next/server";
import {
  NIRF_ENGINEERING_2025_VERSION,
  PARAMETERS_CONFIG,
  METRIC_DEFINITIONS,
} from "@/services/metrics/methodologyConfig";
import { extractTokenFromRequest, getSessionUser } from "@/lib/auth";

/**
 * GET /api/settings/methodology
 * Returns the active official NIRF methodology configuration,
 * parameter weights, sub-metric definitions, required inputs,
 * and calculation blockers.
 */
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

    const calculationBlockers = [
      {
        parameter: "PR",
        metricCode: "PR",
        title: "Peer Perception Survey Score",
        severity: "CRITICAL",
        description:
          "Official peer perception score is conducted directly by NIRF surveying employers and academics. In the absence of an official score, PR must remain NOT_COMPUTABLE and cannot be synthetically generated.",
      },
      {
        parameter: "RP",
        metricCode: "PU & QP",
        title: "Third-Party Bibliometric Extraction & National Normalisation",
        severity: "WARNING",
        description:
          "Publications and citations require authenticated Scopus/Web of Science registry extraction. True NIRF percentiles f(P/FRQ) and f(CC/FRQ) depend on the national applicant pool distribution published annually by NIRF.",
      },
      {
        parameter: "TLR",
        metricCode: "FRU",
        title: "Audited 3-Year Expenditure Normalisation",
        severity: "INFO",
        description:
          "FRU requires 3 consecutive years of audited operational and capital expenses per student. Normalisation benchmarks reflect national engineering cohort percentiles.",
      },
    ];

    return NextResponse.json({
      success: true,
      methodology: {
        version: NIRF_ENGINEERING_2025_VERSION,
        title: "NIRF India Rankings 2025: Engineering & Technology Methodology",
        source: "National Institutional Ranking Framework (NIRF), Ministry of Education, Government of India",
        applicableDepartment: "MCA (Evaluated under Engineering & Technology discipline)",
        parameters: Object.values(PARAMETERS_CONFIG),
        metrics: METRIC_DEFINITIONS,
        calculationBlockers,
      },
    });
  } catch (error) {
    console.error("GET /api/settings/methodology error:", error);
    return NextResponse.json(
      { error: "Failed to fetch methodology configuration" },
      { status: 500 }
    );
  }
}

