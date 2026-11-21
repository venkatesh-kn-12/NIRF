import { ResolvedMetricInputs } from "./inputResolver";
import { IMetricResultData, MetricCalculationStatus } from "@/models/MetricResult";

export interface EvaluatedMetricOutput {
  metricCode: string;
  parameter: "TLR" | "RP" | "GO" | "OI" | "PR";
  name: string;
  status: MetricCalculationStatus;
  maxMarks: number;
  result: IMetricResultData;
  notes?: string;
}

function round2(num: number): number {
  return Math.round(num * 100) / 100;
}

export function evaluateMetric(
  metricCode: string,
  inputs: ResolvedMetricInputs
): EvaluatedMetricOutput {
  switch (metricCode) {
    /* ────────────────────────── TLR ────────────────────────── */
    case "SS": {
      const { enrolledStudents, approvedIntake, phdEnrolled } = inputs.studentStats;
      const maxMarks = 20;

      if (approvedIntake <= 0 || enrolledStudents <= 0) {
        return {
          metricCode: "SS",
          parameter: "TLR",
          name: "Student Strength including Doctoral Students",
          status: "PENDING_INPUT",
          maxMarks,
          result: {
            rawScore: null,
            normalisedScore: null,
            weightedScore: null,
            maxMarks,
            trace: {
              formula: "SS = 15 × min(1.0, NE / NT) + 5 × min(1.0, NP / 5)",
              steps: [
                { step: "Approved Intake Check (NT)", expression: `Intake = ${approvedIntake}`, value: approvedIntake },
                { step: "Enrolled Students Check (NE)", expression: `Enrolled = ${enrolledStudents}`, value: enrolledStudents },
              ],
              notes: "Requires at least 1 recorded student enrolment record and sanctioned intake.",
              blockers: ["MISSING_INPUT: Enrolled students and approved intake required"],
            },
          },
          notes: "Requires recorded student enrollment records.",
        };
      }

      // Departmental Simulation Rule:
      // Scaled linearly to sanctioned intake fulfillment (15 pts) and doctoral research target (5 pts)
      const intakeScore = round2(15 * Math.min(1.0, enrolledStudents / approvedIntake));
      const phdTarget = 5;
      const phdScore = round2(5 * Math.min(1.0, phdEnrolled / phdTarget));
      const rawScore = round2(Math.min(20, intakeScore + phdScore));
      const normalisedScore = round2((rawScore / maxMarks) * 100);

      return {
        metricCode: "SS",
        parameter: "TLR",
        name: "Student Strength including Doctoral Students",
        status: "COMPUTED",
        maxMarks,
        result: {
          rawScore,
          normalisedScore,
          weightedScore: rawScore,
          maxMarks,
          trace: {
            formula: "SS = 15 × min(1.0, NE / NT) + 5 × min(1.0, NP / NP_target)",
            steps: [
              { step: "Approved Intake (NT)", expression: `Sanctioned Capacity = ${approvedIntake}`, value: approvedIntake },
              { step: "Enrolled PG Students (NE)", expression: `Enrolled Count = ${enrolledStudents}`, value: enrolledStudents },
              { step: "Intake Component (max 15)", expression: `15 × min(1.0, ${enrolledStudents} / ${approvedIntake})`, value: intakeScore },
              { step: "Doctoral Scholars (NP / target 5)", expression: `5 × min(1.0, ${phdEnrolled} / 5)`, value: phdScore },
              { step: "Total Simulated SS", expression: `${intakeScore} + ${phdScore}`, value: rawScore },
            ],
            notes: "DEPARTMENTAL_SIMULATION_RULE: Scaled linearly to sanctioned intake fulfillment (15 pts) and doctoral research target (5 pts).",
          },
        },
      };
    }

    case "FSR": {
      const { regularFacultyCount } = inputs.facultyStats;
      // N = NT (enrolled UG/PG) + NP (doctoral students enrolled) per NIRF methodology
      const { enrolledStudents, phdEnrolled } = inputs.studentStats;
      const N = enrolledStudents + phdEnrolled;
      const maxMarks = 30;

      if (N <= 0 || regularFacultyCount <= 0) {
        return {
          metricCode: "FSR",
          parameter: "TLR",
          name: "Faculty-Student Ratio with Emphasis on Permanent Faculty",
          status: "PENDING_INPUT",
          maxMarks,
          result: {
            rawScore: null,
            normalisedScore: null,
            weightedScore: null,
            maxMarks,
            trace: {
              formula: "FSR = 30 × [15 × (F / N)]; N = NT + NP",
              steps: [
                { step: "Regular Faculty (F)", expression: `Count = ${regularFacultyCount}`, value: regularFacultyCount },
                { step: "Total Students N = NT + NP", expression: `${enrolledStudents} + ${phdEnrolled}`, value: N },
              ],
              notes: "Requires approved full-time regular faculty and enrolled students.",
            },
          },
        };
      }

      const ratio = regularFacultyCount / N;
      // NIRF Engineering Rule: For F/N < 1:50 (0.02), FSR will be set to zero
      let rawScore = 0;
      let notes = "";
      if (ratio < 0.02) {
        rawScore = 0;
        notes = "FSR set to zero: Faculty-Student Ratio is below minimum regulatory threshold 1:50.";
      } else {
        rawScore = round2(Math.min(30, 30 * (15 * ratio)));
      }
      const normalisedScore = round2((rawScore / maxMarks) * 100);

      return {
        metricCode: "FSR",
        parameter: "TLR",
        name: "Faculty-Student Ratio with Emphasis on Permanent Faculty",
        status: "COMPUTED",
        maxMarks,
        result: {
          rawScore,
          normalisedScore,
          weightedScore: rawScore,
          maxMarks,
          trace: {
            formula: "FSR = 30 × [15 × (F / N)]; N = NT + NP",
            steps: [
              { step: "Total Students N = NT + NP", expression: `${enrolledStudents} + ${phdEnrolled} = ${N}`, value: N },
              { step: "Ratio F / N", expression: `${regularFacultyCount} / ${N}`, value: round2(ratio) },
              { step: "Multiplier 15 × (F/N)", expression: `15 × ${round2(ratio)}`, value: round2(15 * ratio) },
              { step: "Computed FSR", expression: `30 × ${round2(15 * ratio)} (capped at 30)`, value: rawScore },
            ],
            notes,
          },
        },
      };
    }

    case "FQE": {
      const { regularFacultyCount, phdFacultyCount, expUpTo8, exp8To15, expAbove15 } = inputs.facultyStats;
      const { enrolledStudents } = inputs.studentStats;
      const maxMarks = 20;

      if (regularFacultyCount <= 0) {
        return {
          metricCode: "FQE",
          parameter: "TLR",
          name: "Faculty with PhD (or Equivalent) and Experience",
          status: "PENDING_INPUT",
          maxMarks,
          result: {
            rawScore: null,
            normalisedScore: null,
            weightedScore: null,
            maxMarks,
            trace: {
              formula: "FQE = FQ + FE",
              steps: [{ step: "Faculty Count", expression: `F = ${regularFacultyCount}`, value: regularFacultyCount }],
              notes: "Requires approved regular faculty records.",
            },
          },
        };
      }

      // FQ: Faculty Qualification
      const requiredFaculty = Math.max(regularFacultyCount, Math.ceil(enrolledStudents / 15));
      const FRA = round2((phdFacultyCount / requiredFaculty) * 100);
      const FQ = FRA >= 95 ? 10 : round2(10 * (FRA / 95));

      // FE: Faculty Experience distribution (rationale: 1:1:1 optimal)
      const F1 = expUpTo8 / regularFacultyCount;
      const F2 = exp8To15 / regularFacultyCount;
      const F3 = expAbove15 / regularFacultyCount;
      const FE = round2(
        3 * Math.min(3 * F1, 1.0) +
        3 * Math.min(3 * F2, 1.0) +
        4 * Math.min(3 * F3, 1.0)
      );

      const rawScore = round2(Math.min(20, FQ + FE));
      const normalisedScore = round2((rawScore / maxMarks) * 100);

      return {
        metricCode: "FQE",
        parameter: "TLR",
        name: "Faculty with PhD (or Equivalent) and Experience",
        status: "COMPUTED",
        maxMarks,
        result: {
          rawScore,
          normalisedScore,
          weightedScore: rawScore,
          maxMarks,
          trace: {
            formula: "FQE = FQ + FE",
            steps: [
              { step: "PhD Faculty Ratio (FRA)", expression: `(${phdFacultyCount} / ${requiredFaculty}) * 100`, value: `${FRA}%` },
              { step: "FQ Component", expression: FRA >= 95 ? "10 (FRA >= 95%)" : `10 * (${FRA} / 95)`, value: FQ },
              { step: "Experience F1, F2, F3", expression: `Exp <=8: ${expUpTo8}, 8-15: ${exp8To15}, >15: ${expAbove15}`, value: FE },
              { step: "Total FQE Score", expression: `${FQ} + ${FE}`, value: rawScore },
            ],
          },
        },
      };
    }

    case "FRU": {
      const {
        capitalExpenditurePerStudent,
        operationalExpenditurePerStudent,
        totalApproved,
        reportingYearsCount,
        reportingYears,
        excludedExpensesTotal,
      } = inputs.financeStats;
      const maxMarks = 30;

      if (totalApproved <= 0 || (capitalExpenditurePerStudent <= 0 && operationalExpenditurePerStudent <= 0)) {
        return {
          metricCode: "FRU",
          parameter: "TLR",
          name: "Financial Resources and their Utilisation (FRU)",
          status: "PENDING_INPUT",
          maxMarks,
          result: {
            rawScore: null,
            normalisedScore: null,
            weightedScore: null,
            maxMarks,
            trace: {
              formula: "FRU = 7.5 × min(1.0, BC / 25000) + 22.5 × min(1.0, BO / 75000)",
              steps: [{ step: "Finance Records Check", expression: `Expenditure records = ${totalApproved}`, value: totalApproved }],
              notes: "Requires recorded capital or operational expenditure data.",
              blockers: ["MISSING_INPUT: Audited expenditure records required"],
            },
          },
          notes: "Requires recorded expenditure records.",
        };
      }

      // Departmental Simulation Rule:
      // BC_target = ₹25,000 / student (Computing labs, software, digital library)
      // BO_target = ₹75,000 / student (Salaries, workshops, campus maintenance)
      const targetBC = 25000;
      const targetBO = 75000;
      const bcScore = round2(7.5 * Math.min(1.0, capitalExpenditurePerStudent / targetBC));
      const boScore = round2(22.5 * Math.min(1.0, operationalExpenditurePerStudent / targetBO));
      const rawScore = round2(Math.min(30, bcScore + boScore));
      const normalisedScore = round2((rawScore / maxMarks) * 100);

      const isPartialYears = reportingYearsCount < 3;
      const coverageNote = isPartialYears
        ? `Partial reporting window: ${reportingYearsCount}/3 years on record (${reportingYears.join(", ")}).`
        : `Complete 3-year reporting window (${reportingYears.join(", ")}).`;

      return {
        metricCode: "FRU",
        parameter: "TLR",
        name: "Financial Resources and their Utilisation (FRU)",
        status: "COMPUTED",
        maxMarks,
        result: {
          rawScore,
          normalisedScore,
          weightedScore: rawScore,
          maxMarks,
          trace: {
            formula: "FRU = 7.5 × min(1.0, BC / 25000) + 22.5 × min(1.0, BO / 75000)",
            steps: [
              { step: "Capital Exp / Student (BC)", expression: `INR ${capitalExpenditurePerStudent} (Target: ₹25,000)`, value: bcScore },
              { step: "Operational Exp / Student (BO)", expression: `INR ${operationalExpenditurePerStudent} (Target: ₹75,000)`, value: boScore },
              { step: "Excluded Statutory Items", expression: `INR ${excludedExpensesTotal} (Building/Hostel excluded)`, value: excludedExpensesTotal },
              { step: "Total Simulated FRU", expression: `${bcScore} + ${boScore} (max 30)`, value: rawScore },
            ],
            notes: `DEPARTMENTAL_SIMULATION_RULE: Benchmarked against MCA postgraduate standard operating targets. ${coverageNote}`,
          },
        },
        notes: isPartialYears ? coverageNote : undefined,
      };
    }

    /* ────────────────────────── RP ────────────────────────── */
    case "PU": {
      const maxMarks = 35;
      const {
        totalApproved,
        inWindowPublicationsCount,
        isZeroDeclared: pubZeroDeclared,
        reportingWindowDescription,
        configuredPubTargetPerFaculty = 1.0,
      } = inputs.publicationStats;
      const { regularFacultyCount } = inputs.facultyStats;
      const F = regularFacultyCount;

      // Guard: faculty denominator required
      if (F <= 0) {
        return {
          metricCode: "PU",
          parameter: "RP",
          name: "Combined Metric for Publications (PU)",
          status: "PENDING_INPUT",
          maxMarks,
          result: {
            rawScore: null,
            normalisedScore: null,
            weightedScore: null,
            maxMarks,
            trace: {
              formula: `PU = 35 × min(1.0, P / (F × 3 × ${configuredPubTargetPerFaculty}))`,
              steps: [{ step: "Faculty Denominator Check", expression: "Regular faculty = 0", value: 0 }],
              notes: "Faculty count required to compute PU.",
              blockers: ["MISSING_INPUT: Regular faculty records required"],
            },
          },
        };
      }

      // Use in-window publications if available, fall back to total
      const pubCount = inWindowPublicationsCount !== undefined ? inWindowPublicationsCount : totalApproved;

      if (pubCount <= 0) {
        if (pubZeroDeclared) {
          // Explicit zero declaration
          return {
            metricCode: "PU",
            parameter: "RP",
            name: "Combined Metric for Publications (PU)",
            status: "COMPUTED",
            maxMarks,
            result: {
              rawScore: 0,
              normalisedScore: 0,
              weightedScore: 0,
              maxMarks,
              trace: {
                formula: `PU = 35 × min(1.0, P / (F × 3 × ${configuredPubTargetPerFaculty}))`,
                steps: [{ step: "Zero Activity Declaration", expression: "No publications declared by department admin", value: 0 }],
                notes: `Zero publications declared for window: ${reportingWindowDescription || "3-year window"}.`,
              },
            },
          };
        }
        return {
          metricCode: "PU",
          parameter: "RP",
          name: "Combined Metric for Publications (PU)",
          status: "PENDING_INPUT",
          maxMarks,
          result: {
            rawScore: null,
            normalisedScore: null,
            weightedScore: null,
            maxMarks,
            trace: {
              formula: `PU = 35 × min(1.0, P / (F × 3 × ${configuredPubTargetPerFaculty}))`,
              steps: [{ step: "Publications Check", expression: "In-window recorded publications = 0", value: 0 }],
              notes: "Requires recorded faculty research publication records within the 3-year window.",
              blockers: ["MISSING_INPUT: Recorded publications required or zero activity declaration needed"],
            },
          },
          notes: "Requires recorded publication records.",
        };
      }

      const targetP = F * 3 * configuredPubTargetPerFaculty; // pub/faculty/year over 3 years
      const ratio = pubCount / targetP;
      const rawScore = round2(Math.min(35, 35 * ratio));
      const normalisedScore = round2((rawScore / maxMarks) * 100);

      return {
        metricCode: "PU",
        parameter: "RP",
        name: "Combined Metric for Publications (PU)",
        status: "COMPUTED",
        maxMarks,
        result: {
          rawScore,
          normalisedScore,
          weightedScore: rawScore,
          maxMarks,
          trace: {
            formula: `PU = 35 × min(1.0, P / (F × 3 × ${configuredPubTargetPerFaculty}))`,
            steps: [
              { step: "In-Window Publications (P)", expression: `Count = ${pubCount}  ${reportingWindowDescription ? `[${reportingWindowDescription}]` : ""}`, value: pubCount },
              { step: "Faculty Base (F)", expression: `Regular faculty = ${F}`, value: F },
              { step: "3-Year Target P", expression: `${F} × 3 × ${configuredPubTargetPerFaculty} = ${targetP}`, value: targetP },
              { step: "Total Simulated PU", expression: `35 × min(1.0, ${pubCount} / ${targetP})`, value: rawScore },
            ],
            notes: `DEPARTMENTAL_SIMULATION_RULE: Benchmarked against ${configuredPubTargetPerFaculty} indexed publication per faculty per year over 3 years.`,
          },
        },
      };
    }

    case "QP": {
      const maxMarks = 40;
      const {
        totalApproved,
        inWindowPublicationsCount,
        actualCitationsTotal,
        hasCitationData,
        citationCoveragePercent,
        distinctQ1Q2Count,
        hasQuartileData,
        quartileCoveragePercent,
        isZeroDeclared: pubZeroDeclared,
        reportingWindowDescription,
        configuredCitationTargetWindow = 5.0,
        configuredQpModel = "QP_CITATIONS_AND_QUARTILE_V1",
      } = inputs.publicationStats;
      const { regularFacultyCount } = inputs.facultyStats;
      const F = Math.max(1, regularFacultyCount);

      const pubCount = inWindowPublicationsCount !== undefined ? inWindowPublicationsCount : totalApproved;

      if (pubCount <= 0) {
        return {
          metricCode: "QP",
          parameter: "RP",
          name: "Quality of Publications (QP)",
          status: pubZeroDeclared ? "COMPUTED" : "PENDING_INPUT",
          maxMarks,
          result: {
            rawScore: pubZeroDeclared ? 0 : null,
            normalisedScore: pubZeroDeclared ? 0 : null,
            weightedScore: pubZeroDeclared ? 0 : null,
            maxMarks,
            trace: {
              formula: `QP = 20 × min(1.0, C / (F × ${configuredCitationTargetWindow})) + 20 × (Q1Q2 / P)   [${configuredQpModel}]`,
              steps: [{ step: "Publications Check", expression: pubZeroDeclared ? "Zero declared" : "In-window publications = 0", value: 0 }],
              notes: pubZeroDeclared
                ? "Zero publications declared — QP = 0."
                : "Requires recorded research publications to compute quality and citation metrics.",
              blockers: pubZeroDeclared ? [] : ["MISSING_INPUT: Recorded publications required"],
            },
          },
        };
      }

      // ── Citation Term (max 20) ──
      // C = sum of actual user-supplied cumulative citations to date on publications published within the 3-year window.
      // Target: configuredCitationTargetWindow cumulative citations per faculty over the 3-year window (default 5.0).
      let citationScore = 0;
      let citationTermNote = "";
      const citationTarget = F * configuredCitationTargetWindow; // cumulative citations target across window
      if (hasCitationData && actualCitationsTotal !== undefined) {
        citationScore = round2(20 * Math.min(1.0, actualCitationsTotal / citationTarget));
        citationTermNote = `Citations supplied for ${citationCoveragePercent ?? "?"}% of in-window publications.`;
      } else {
        citationTermNote = "No citation data supplied — citation term omitted (not estimated).";
      }

      // ── Quality Term (max 20): Q1/Q2 share ──
      // Distinct Q1/Q2 papers counted once each; divided by in-window pub count
      let qualityScore = 0;
      let qualityTermNote = "";
      if (hasQuartileData && distinctQ1Q2Count !== undefined) {
        qualityScore = round2(20 * Math.min(1.0, (distinctQ1Q2Count ?? 0) / pubCount));
        qualityTermNote = `Quartile data supplied for ${quartileCoveragePercent ?? "?"}% of in-window publications.`;
      } else {
        qualityTermNote = "No quartile data supplied — quality term omitted (not estimated).";
      }

      const rawScore = round2(Math.min(40, citationScore + qualityScore));
      const normalisedScore = round2((rawScore / maxMarks) * 100);
      const hasPartialData = (!hasCitationData || !hasQuartileData || citationCoveragePercent < 100 || quartileCoveragePercent < 100) && rawScore > 0;

      return {
        metricCode: "QP",
        parameter: "RP",
        name: "Quality of Publications (QP)",
        status: "COMPUTED",
        maxMarks,
        result: {
          rawScore,
          normalisedScore,
          weightedScore: rawScore,
          maxMarks,
          trace: {
            formula: `QP = 20 × min(1.0, C / (F × ${configuredCitationTargetWindow})) + 20 × (Q1Q2 / P)   [${configuredQpModel}]`,
            steps: [
              { step: "In-Window Publications (P)", expression: `${pubCount} ${reportingWindowDescription ? `[${reportingWindowDescription}]` : ""}`, value: pubCount },
              { step: "Faculty Base (F)", expression: `Regular faculty = ${F}`, value: F },
              { step: "Actual Citations (C) [3-Year Window Cumulative]", expression: hasCitationData ? `${actualCitationsTotal} (target ${citationTarget}: ${configuredCitationTargetWindow}/faculty over window)` : "No citation data", value: hasCitationData ? (actualCitationsTotal ?? 0) : "N/A" },
              { step: "Citation Term (max 20)", expression: hasCitationData ? `20 × min(1.0, ${actualCitationsTotal} / ${citationTarget})` : "Omitted — no data", value: citationScore },
              { step: "Distinct Q1/Q2 Papers", expression: hasQuartileData ? `${distinctQ1Q2Count} of ${pubCount}` : "No quartile data", value: hasQuartileData ? (distinctQ1Q2Count ?? 0) : "N/A" },
              { step: "Quality Term (max 20)", expression: hasQuartileData ? `20 × (${distinctQ1Q2Count} / ${pubCount})` : "Omitted — no data", value: qualityScore },
              { step: "Total Simulated QP", expression: `${citationScore} + ${qualityScore}`, value: rawScore },
            ],
            notes: `DEPARTMENTAL_SIMULATION_RULE: Model ${configuredQpModel}. Citation target: ${configuredCitationTargetWindow} cumulative citations per regular faculty over the 3-year observation window (~${(configuredCitationTargetWindow / 3).toFixed(2)}/yr). ${citationTermNote} ${qualityTermNote}${hasPartialData ? " Partial score based on available data." : ""}`,
          },
        },
        notes: hasPartialData ? `Partial QP: citation coverage ${citationCoveragePercent}%, quartile coverage ${quartileCoveragePercent}%. Missing entries not assumed zero/Q3/Q4.` : undefined,
      };
    }

    case "IPR": {
      const {
        patentsGranted3Y,
        patentsPublished3Y,
        isZeroGrantedDeclared,
        isZeroPublishedDeclared,
        reportingWindowDescription,
        configuredPatentsPublishedTarget = 6,
        configuredPatentsGrantedTarget = 3,
      } = inputs.patentStats;
      const maxMarks = 15;

      const totalPatents = (patentsGranted3Y ?? 0) + (patentsPublished3Y ?? 0);

      // Both zero — check declaration
      if (totalPatents === 0) {
        const isFullZero = (isZeroGrantedDeclared ?? false) && (isZeroPublishedDeclared ?? false);
        const isPartialZero = (isZeroGrantedDeclared ?? false) || (isZeroPublishedDeclared ?? false);
        if (isFullZero || isPartialZero) {
          return {
            metricCode: "IPR",
            parameter: "RP",
            name: "IPR and Patents: Published and Granted",
            status: "COMPUTED",
            maxMarks,
            result: {
              rawScore: 0,
              normalisedScore: 0,
              weightedScore: 0,
              maxMarks,
              trace: {
                formula: `IPR = IPG + IPP; IPG = 10 × f(PG/${configuredPatentsGrantedTarget}); IPP = 5 × f(PP/${configuredPatentsPublishedTarget})`,
                steps: [{ step: "Zero Activity Declaration", expression: "No patent activity declared", value: 0 }],
                notes: `Zero patent activity declared for window: ${reportingWindowDescription || "3-year window"}.`,
              },
            },
          };
        }
        return {
          metricCode: "IPR",
          parameter: "RP",
          name: "IPR and Patents: Published and Granted",
          status: "PENDING_INPUT",
          maxMarks,
          result: {
            rawScore: null,
            normalisedScore: null,
            weightedScore: null,
            maxMarks,
            trace: {
              formula: `IPR = IPG + IPP; IPG = 10 × f(PG/${configuredPatentsGrantedTarget}); IPP = 5 × f(PP/${configuredPatentsPublishedTarget})`,
              steps: [{ step: "Patent Records Check", expression: "In-window patents = 0", value: 0 }],
              notes: "No in-window patent records found. Enter patent records or declare zero activity.",
              blockers: ["MISSING_INPUT: Patent records required or zero activity declaration needed"],
            },
          },
        };
      }

      const pg = patentsGranted3Y ?? 0;
      const pp = patentsPublished3Y ?? 0;
      const f_PG = Math.min(1.0, pg / configuredPatentsGrantedTarget);  // Target: configuredPatentsGrantedTarget (default 3)
      const f_PP = Math.min(1.0, pp / configuredPatentsPublishedTarget); // Target: configuredPatentsPublishedTarget (default 6)
      const ipgScore = round2(10 * f_PG);
      const ippScore = round2(5 * f_PP);
      const rawScore = round2(Math.min(15, ipgScore + ippScore));
      const normalisedScore = round2((rawScore / maxMarks) * 100);

      return {
        metricCode: "IPR",
        parameter: "RP",
        name: "IPR and Patents: Published and Granted",
        status: "COMPUTED",
        maxMarks,
        result: {
          rawScore,
          normalisedScore,
          weightedScore: rawScore,
          maxMarks,
          trace: {
            formula: `IPR = IPG + IPP; IPG = 10 × min(1, PG/${configuredPatentsGrantedTarget}); IPP = 5 × min(1, PP/${configuredPatentsPublishedTarget})`,
            steps: [
              { step: `Patents Granted (${reportingWindowDescription || "3Y"})`, expression: `${pg} granted (target ${configuredPatentsGrantedTarget})`, value: ipgScore },
              { step: `Patents Published (${reportingWindowDescription || "3Y"})`, expression: `${pp} published (target ${configuredPatentsPublishedTarget}) [filed-only excluded]`, value: ippScore },
              { step: "Total IPR Score", expression: `${ipgScore} + ${ippScore}`, value: rawScore },
            ],
            notes: `DEPARTMENTAL_SIMULATION_RULE: Evaluates independent publication events (target ${configuredPatentsPublishedTarget}) and grant events (target ${configuredPatentsGrantedTarget}). Filed-only patents strictly excluded. Deduplicated by jurisdiction and application number.`,
          },
        },
      };
    }

    case "FPPP": {
      const {
        researchFundingTotal,
        consultancyTotal,
        researchFundingAnnualPerFaculty,
        consultancyAnnualPerFaculty,
        isZeroResearchDeclared,
        isZeroConsultancyDeclared,
        facultyDenominator,
        facultyDenominatorMissing,
        reportingWindowDescription,
        legacyUnassignedCount,
        configuredResearchTargetPerFacultyYear = 50000,
        configuredConsultancyTargetPerFacultyYear = 25000,
      } = inputs.projectStats;
      const maxMarks = 10;

      // Use old field names as fallback for backward compat
      const rfAnnualPerFaculty = researchFundingAnnualPerFaculty ?? (inputs.projectStats as any).researchFundingPerFaculty ?? 0;
      const cfAnnualPerFaculty = consultancyAnnualPerFaculty ?? (inputs.projectStats as any).consultancyPerFaculty ?? 0;

      // Guard: faculty denominator required
      if (facultyDenominatorMissing) {
        return {
          metricCode: "FPPP",
          parameter: "RP",
          name: "Footprint of Projects and Professional Practice",
          status: "PENDING_INPUT",
          maxMarks,
          result: {
            rawScore: null,
            normalisedScore: null,
            weightedScore: null,
            maxMarks,
            trace: {
              formula: `FPPP = 7.5 × f(RF/F/N/${configuredResearchTargetPerFacultyYear}) + 2.5 × f(CF/F/N/${configuredConsultancyTargetPerFacultyYear})`,
              steps: [{ step: "Faculty Check", expression: "Regular faculty count = 0", value: 0 }],
              notes: "Faculty count required to compute per-faculty FPPP.",
              blockers: ["MISSING_INPUT: Regular faculty records required"],
            },
          },
        };
      }

      const totalFunding = (researchFundingTotal ?? 0) + (consultancyTotal ?? 0);

      // Both zero — check declaration
      if (totalFunding === 0) {
        const isFullZero = (isZeroResearchDeclared ?? false) && (isZeroConsultancyDeclared ?? false);
        const isPartialZero = (isZeroResearchDeclared ?? false) || (isZeroConsultancyDeclared ?? false);
        if (isFullZero || isPartialZero) {
          return {
            metricCode: "FPPP",
            parameter: "RP",
            name: "Footprint of Projects and Professional Practice",
            status: "COMPUTED",
            maxMarks,
            result: {
              rawScore: 0,
              normalisedScore: 0,
              weightedScore: 0,
              maxMarks,
              trace: {
                formula: `FPPP = 7.5 × f(RF/F/N/${configuredResearchTargetPerFacultyYear}) + 2.5 × f(CF/F/N/${configuredConsultancyTargetPerFacultyYear})`,
                steps: [{ step: "Zero Activity Declaration", expression: "No research/consultancy income declared", value: 0 }],
                notes: `Zero research/consultancy receipts declared for window: ${reportingWindowDescription || "3-year window"}.`,
              },
            },
          };
        }
        return {
          metricCode: "FPPP",
          parameter: "RP",
          name: "Footprint of Projects and Professional Practice",
          status: "PENDING_INPUT",
          maxMarks,
          result: {
            rawScore: null,
            normalisedScore: null,
            weightedScore: null,
            maxMarks,
            trace: {
              formula: `FPPP = 7.5 × f(RF/F/N/${configuredResearchTargetPerFacultyYear}) + 2.5 × f(CF/F/N/${configuredConsultancyTargetPerFacultyYear})`,
              steps: [{ step: "Project Records Check", expression: "No in-window receipts found", value: 0 }],
              notes: "No receipt-confirmed project funding found. Enter project receipts or declare zero activity. Sanctioned-only amounts are not counted.",
              blockers: ["MISSING_INPUT: Project receipt records required or zero activity declaration needed"],
            },
          },
        };
      }

      // Configured Targets (per faculty per year)
      const f_RF = Math.min(1.0, rfAnnualPerFaculty / configuredResearchTargetPerFacultyYear);
      const f_CF = Math.min(1.0, cfAnnualPerFaculty / configuredConsultancyTargetPerFacultyYear);
      const fprScore = round2(7.5 * f_RF);
      const fpcScore = round2(2.5 * f_CF);
      const rawScore = round2(Math.min(10, fprScore + fpcScore));
      const normalisedScore = round2((rawScore / maxMarks) * 100);

      const legacyNote = (legacyUnassignedCount ?? 0) > 0
        ? ` Note: ${legacyUnassignedCount} legacy project(s) have no receipt date and are included conservatively.`
        : "";

      return {
        metricCode: "FPPP",
        parameter: "RP",
        name: "Footprint of Projects and Professional Practice",
        status: "COMPUTED",
        maxMarks,
        result: {
          rawScore,
          normalisedScore,
          weightedScore: rawScore,
          maxMarks,
          trace: {
            formula: `FPPP = FPR + FPC; FPR = 7.5 × min(1, RF/F/3/${configuredResearchTargetPerFacultyYear}); FPC = 2.5 × min(1, CF/F/3/${configuredConsultancyTargetPerFacultyYear}); N = 3 years`,
            steps: [
              { step: "Research Funding Received (3Y)", expression: `INR ${researchFundingTotal?.toLocaleString() ?? 0}`, value: researchFundingTotal ?? 0 },
              { step: "Research Funding / Faculty / Year", expression: `INR ${rfAnnualPerFaculty} (target ₹${configuredResearchTargetPerFacultyYear.toLocaleString()})`, value: fprScore },
              { step: "Consultancy Income Received (3Y)", expression: `INR ${consultancyTotal?.toLocaleString() ?? 0}`, value: consultancyTotal ?? 0 },
              { step: "Consultancy / Faculty / Year", expression: `INR ${cfAnnualPerFaculty} (target ₹${configuredConsultancyTargetPerFacultyYear.toLocaleString()})`, value: fpcScore },
              { step: "Faculty Denominator (F)", expression: `${facultyDenominator} regular faculty`, value: facultyDenominator },
              { step: "Total FPPP Score", expression: `${fprScore} + ${fpcScore} (max 10)`, value: rawScore },
            ],
            notes: `DEPARTMENTAL_SIMULATION_RULE: Annual per-faculty benchmarks applied (RF: ₹50K/faculty/year, CF: ₹25K/faculty/year). Only receipt-confirmed amounts counted — sanctioned-only excluded.${legacyNote}`,
          },
        },
      };
    }

    /* ────────────────────────── GO ────────────────────────── */
    case "GPH": {
      const {
        placementPercentage,
        higherStudiesPercentage,
        placedCount,
        higherStudiesCount,
        uniquePositiveOutcomesCount,
        eligibleGraduates,
        isZeroPlacementsDeclared,
        isZeroHigherStudiesDeclared,
        hasZeroPlacementsConflict,
        hasZeroHigherStudiesConflict,
      } = inputs.placementStats;
      const maxMarks = 40;

      // Conflict Check
      if (hasZeroPlacementsConflict || hasZeroHigherStudiesConflict) {
        return {
          metricCode: "GPH",
          parameter: "GO",
          name: "Combined Metric for Placement and Higher Studies",
          status: "NOT_COMPUTABLE",
          maxMarks,
          result: {
            rawScore: null,
            normalisedScore: null,
            weightedScore: null,
            maxMarks,
            trace: {
              formula: "GPH = 40 × min(1.0, (Np + Nhs - overlap) / Ng)",
              steps: [
                {
                  step: "Declaration Conflict",
                  expression: "Active placement/higher-study records exist despite zero activity declaration",
                  value: 0,
                },
              ],
              notes: "A zero declaration is active but positive outcome records exist. Remove zero declaration or archive conflicting records.",
              blockers: [
                "CONFLICT_DISCREPANCY: Active records conflict with zero activity declaration for placements/higher studies",
              ],
            },
          },
        };
      }

      // Zero Declaration Check
      if (isZeroPlacementsDeclared && isZeroHigherStudiesDeclared) {
        return {
          metricCode: "GPH",
          parameter: "GO",
          name: "Combined Metric for Placement and Higher Studies",
          status: "COMPUTED",
          maxMarks,
          result: {
            rawScore: 0,
            normalisedScore: 0,
            weightedScore: 0,
            maxMarks,
            trace: {
              formula: "GPH = 40 × min(1.0, (Np + Nhs - overlap) / Ng)",
              steps: [
                { step: "Zero Declaration", expression: "Confirmed zero placements & higher studies declared", value: 0 },
                { step: "Total GPH Score", expression: "40 * 0", value: 0 },
              ],
              notes: "DEPARTMENTAL_SIMULATION_RULE: Confirmed zero placements and higher studies by departmental zero declaration.",
            },
          },
        };
      }

      // Pending input check
      if (eligibleGraduates <= 0 && uniquePositiveOutcomesCount <= 0) {
        return {
          metricCode: "GPH",
          parameter: "GO",
          name: "Combined Metric for Placement and Higher Studies",
          status: "PENDING_INPUT",
          maxMarks,
          result: {
            rawScore: null,
            normalisedScore: null,
            weightedScore: null,
            maxMarks,
            trace: {
              formula: "GPH = 40 × min(1.0, (Np + Nhs - overlap) / Ng)",
              steps: [
                { step: "Eligible Graduates (Ng)", expression: "Eligible graduates = 0", value: 0 },
                { step: "Positive Outcomes Check", expression: "Distinct placed or higher studies = 0", value: 0 },
              ],
              notes: "Requires recorded graduation cohort records or placement records.",
              blockers: ["MISSING_INPUT: No graduation cohort or placement records recorded"],
            },
          },
        };
      }

      const denominator = eligibleGraduates > 0 ? eligibleGraduates : Math.max(1, uniquePositiveOutcomesCount);
      const overlap = Math.max(0, (placedCount + higherStudiesCount) - uniquePositiveOutcomesCount);
      const outcomeRatio = round2(uniquePositiveOutcomesCount / denominator);
      const cappedRatio = Math.min(1.0, outcomeRatio);
      const rawScore = round2(Math.min(40, 40 * cappedRatio));
      const normalisedScore = round2((rawScore / maxMarks) * 100);

      return {
        metricCode: "GPH",
        parameter: "GO",
        name: "Combined Metric for Placement and Higher Studies",
        status: "COMPUTED",
        maxMarks,
        result: {
          rawScore,
          normalisedScore,
          weightedScore: rawScore,
          maxMarks,
          trace: {
            formula: "GPH = 40 × min(1.0, (Np + Nhs - overlap) / Ng)",
            steps: [
              { step: "Distinct Placed Students (Np)", expression: `${placedCount}`, value: placedCount },
              { step: "Distinct Higher Studies (Nhs)", expression: `${higherStudiesCount}`, value: higherStudiesCount },
              { step: "Dual Offer/Admission Overlap", expression: `${overlap} (deduplicated so each student is counted once)`, value: overlap },
              { step: "Unique Positive Outcomes", expression: `${uniquePositiveOutcomesCount} distinct students`, value: uniquePositiveOutcomesCount },
              { step: "Eligible Graduates Denominator (Ng)", expression: `${denominator}`, value: denominator },
              { step: "Positive Outcome Ratio", expression: `min(1.0, ${uniquePositiveOutcomesCount} / ${denominator}) = ${cappedRatio}`, value: cappedRatio },
              { step: "Total GPH Score", expression: `40 × ${cappedRatio}`, value: rawScore },
            ],
            notes: "DEPARTMENTAL_SIMULATION_RULE: GPH evaluated using unique positive outcomes avoiding double counting (students with multiple offers or job + higher studies counted once in numerator).",
          },
        },
      };
    }

    case "GUE": {
      const { stipulatedGraduationRate, eligibleGraduates, graduatesInStipulatedTime } = inputs.graduationStats;
      const maxMarks = 15;

      if (eligibleGraduates <= 0) {
        return {
          metricCode: "GUE",
          parameter: "GO",
          name: "Metric for University Examinations",
          status: "PENDING_INPUT",
          maxMarks,
          result: {
            rawScore: null,
            normalisedScore: null,
            weightedScore: null,
            maxMarks,
            trace: {
              formula: "GUE = 15 × min(1.0, Ng / 80)",
              steps: [
                { step: "Graduation Cohort Records", expression: "No graduation cohort records recorded", value: 0 },
              ],
              notes: "Requires recorded graduation cohort outcome records.",
              blockers: ["MISSING_INPUT: No graduation outcome cohort records available"],
            },
          },
        };
      }

      const factor = round2(Math.min(1.0, stipulatedGraduationRate / 80));
      const rawScore = round2(15 * factor);
      const normalisedScore = round2((rawScore / maxMarks) * 100);

      return {
        metricCode: "GUE",
        parameter: "GO",
        name: "Metric for University Examinations",
        status: "COMPUTED",
        maxMarks,
        result: {
          rawScore,
          normalisedScore,
          weightedScore: rawScore,
          maxMarks,
          trace: {
            formula: "GUE = 15 × min(1.0, Ng / 80)",
            steps: [
              { step: "Eligible Graduates across 3 Cohorts", expression: `${eligibleGraduates}`, value: eligibleGraduates },
              { step: "Graduates within Stipulated Time", expression: `${graduatesInStipulatedTime}`, value: graduatesInStipulatedTime },
              { step: "On-time Graduation Rate (Ng)", expression: `${stipulatedGraduationRate}%`, value: stipulatedGraduationRate },
              { step: "Normalized Factor (Ng / 80)", expression: `min(1.0, ${stipulatedGraduationRate} / 80) = ${factor}`, value: factor },
              { step: "Total GUE Score", expression: `15 × ${factor}`, value: rawScore },
            ],
            notes: "DEPARTMENTAL_SIMULATION_RULE: Mean on-time graduation rate over 3 graduating cohorts. Benchmark: 80% on-time graduation yields full 15 marks.",
          },
        },
      };
    }

    case "GMS": {
      const {
        medianSalary,
        qualifyingSalariesCount,
        configuredSalaryTarget,
        isZeroPlacementsDeclared,
        hasZeroPlacementsConflict,
      } = inputs.placementStats;
      const maxMarks = 25;
      const salaryBenchmark = configuredSalaryTarget > 0 ? configuredSalaryTarget : 800000;

      if (hasZeroPlacementsConflict) {
        return {
          metricCode: "GMS",
          parameter: "GO",
          name: "Median Salary of Graduated Students",
          status: "NOT_COMPUTABLE",
          maxMarks,
          result: {
            rawScore: null,
            normalisedScore: null,
            weightedScore: null,
            maxMarks,
            trace: {
              formula: "GMS = 25 × min(1.0, MS / Benchmark)",
              steps: [
                { step: "Conflict Check", expression: "Active placement salary records exist despite zero declaration", value: 0 },
              ],
              notes: "Zero declaration conflicts with active placement salary records.",
              blockers: ["CONFLICT_DISCREPANCY: Active placement records conflict with zero declaration"],
            },
          },
        };
      }

      if (isZeroPlacementsDeclared) {
        return {
          metricCode: "GMS",
          parameter: "GO",
          name: "Median Salary of Graduated Students",
          status: "COMPUTED",
          maxMarks,
          result: {
            rawScore: 0,
            normalisedScore: 0,
            weightedScore: 0,
            maxMarks,
            trace: {
              formula: "GMS = 25 × min(1.0, MS / Benchmark)",
              steps: [
                { step: "Zero Declaration", expression: "Confirmed zero placement salary declared", value: 0 },
                { step: "Total GMS Score", expression: "25 * 0", value: 0 },
              ],
              notes: "DEPARTMENTAL_SIMULATION_RULE: Confirmed zero placement salary by departmental zero declaration.",
            },
          },
        };
      }

      if (qualifyingSalariesCount <= 0 || medianSalary <= 0) {
        return {
          metricCode: "GMS",
          parameter: "GO",
          name: "Median Salary of Graduated Students",
          status: "PENDING_INPUT",
          maxMarks,
          result: {
            rawScore: null,
            normalisedScore: null,
            weightedScore: null,
            maxMarks,
            trace: {
              formula: "GMS = 25 × min(1.0, MS / Benchmark)",
              steps: [
                { step: "Qualifying Salaries Check", expression: "Audited placement salary records = 0", value: 0 },
              ],
              notes: "Requires recorded placement salary records or explicit zero declaration.",
              blockers: ["MISSING_INPUT: No placement salary records recorded"],
            },
          },
        };
      }

      const f_MS = Math.min(1.0, medianSalary / salaryBenchmark);
      const rawScore = round2(Math.min(25, 25 * f_MS));
      const normalisedScore = round2((rawScore / maxMarks) * 100);

      return {
        metricCode: "GMS",
        parameter: "GO",
        name: "Median Salary of Graduated Students",
        status: "COMPUTED",
        maxMarks,
        result: {
          rawScore,
          normalisedScore,
          weightedScore: rawScore,
          maxMarks,
          trace: {
            formula: "GMS = 25 × min(1.0, MS / Benchmark)",
            steps: [
              { step: "Placed Students with Salary", expression: `${qualifyingSalariesCount} qualifying offers`, value: qualifyingSalariesCount },
              { step: "True Median Annual Salary (MS)", expression: `₹${medianSalary.toLocaleString("en-IN")}`, value: medianSalary },
              { step: "Department Benchmark Target", expression: `₹${salaryBenchmark.toLocaleString("en-IN")}`, value: salaryBenchmark },
              { step: "Normalized Factor", expression: `min(1.0, ${medianSalary} / ${salaryBenchmark}) = ${round2(f_MS)}`, value: round2(f_MS) },
              { step: "Total GMS Score", expression: `25 × ${round2(f_MS)}`, value: rawScore },
            ],
            notes: `DEPARTMENTAL_SIMULATION_RULE: True median of annual CTC for placed students compared against departmental preset benchmark (₹${(salaryBenchmark / 100000).toFixed(1)} LPA).`,
          },
        },
      };
    }

    case "GPHD": {
      const {
        totalAwardsInWindow,
        avgAwardsPerYear,
        isZeroDoctoralDeclared,
        hasZeroDoctoralConflict,
        configuredPhdTargetPerYear,
      } = inputs.doctoralAwardStats;
      const maxMarks = 20;
      const targetPerYear = configuredPhdTargetPerYear > 0 ? configuredPhdTargetPerYear : 1.0;

      if (hasZeroDoctoralConflict) {
        return {
          metricCode: "GPHD",
          parameter: "GO",
          name: "Metric for Number of Ph.D. Students Graduated",
          status: "NOT_COMPUTABLE",
          maxMarks,
          result: {
            rawScore: null,
            normalisedScore: null,
            weightedScore: null,
            maxMarks,
            trace: {
              formula: "GPHD = 20 × min(1.0, avgAwards / Target)",
              steps: [
                { step: "Conflict Check", expression: "Active doctoral award records exist despite zero declaration", value: 0 },
              ],
              notes: "Zero declaration conflicts with active doctoral award records in the window.",
              blockers: ["CONFLICT_DISCREPANCY: Active doctoral award records conflict with zero declaration"],
            },
          },
        };
      }

      if (isZeroDoctoralDeclared) {
        return {
          metricCode: "GPHD",
          parameter: "GO",
          name: "Metric for Number of Ph.D. Students Graduated",
          status: "COMPUTED",
          maxMarks,
          result: {
            rawScore: 0,
            normalisedScore: 0,
            weightedScore: 0,
            maxMarks,
            trace: {
              formula: "GPHD = 20 × min(1.0, avgAwards / Target)",
              steps: [
                { step: "Zero Declaration", expression: "Confirmed zero doctoral graduates declared", value: 0 },
                { step: "Total GPHD Score", expression: "20 * 0", value: 0 },
              ],
              notes: "DEPARTMENTAL_SIMULATION_RULE: Confirmed zero doctoral graduates by departmental zero declaration (standard for MCA standalone).",
            },
          },
        };
      }

      const factor = Math.min(1.0, avgAwardsPerYear / targetPerYear);
      const rawScore = round2(20 * factor);
      const normalisedScore = round2((rawScore / maxMarks) * 100);

      return {
        metricCode: "GPHD",
        parameter: "GO",
        name: "Metric for Number of Ph.D. Students Graduated",
        status: "COMPUTED",
        maxMarks,
        result: {
          rawScore,
          normalisedScore,
          weightedScore: rawScore,
          maxMarks,
          trace: {
            formula: "GPHD = 20 × min(1.0, avgAwards / Target)",
            steps: [
              { step: "Doctoral Degrees Awarded (3Y Window)", expression: `${totalAwardsInWindow} doctoral awards`, value: totalAwardsInWindow },
              { step: "Average Ph.D. Awarded per Year", expression: `${avgAwardsPerYear}/year`, value: avgAwardsPerYear },
              { step: "Target Awards per Year", expression: `${targetPerYear}/year`, value: targetPerYear },
              { step: "Normalized Factor", expression: `min(1.0, ${avgAwardsPerYear} / ${targetPerYear}) = ${round2(factor)}`, value: round2(factor) },
              { step: "Total GPHD Score", expression: `20 × ${round2(factor)}`, value: rawScore },
            ],
            notes: `DEPARTMENTAL_SIMULATION_RULE: Evaluates doctoral degree completions (awards) within the 3-year window against annual benchmark target (${targetPerYear}/year). Standalone MCA departments without doctoral awards can record zero declarations.`,
          },
        },
      };
    }

    /* ────────────────────────── OI ────────────────────────── */
    case "RD": {
      const { totalStudents, otherStatesCount, internationalCount } = inputs.diversityStats;
      const maxMarks = 30;

      if (totalStudents <= 0) {
        return {
          metricCode: "RD",
          parameter: "OI",
          name: "Percentage of Students from Other States and Countries",
          status: "PENDING_INPUT",
          maxMarks,
          result: {
            rawScore: null,
            normalisedScore: null,
            weightedScore: null,
            maxMarks,
            trace: {
              formula: "RD = 25 * (Other States / Total) + 5 * (International / Total)",
              steps: [{ step: "Student Records Check", expression: "Approved students = 0", value: 0 }],
              notes: "Requires approved student enrollment records.",
            },
          },
        };
      }

      const fracOtherStates = otherStatesCount / totalStudents;
      const fracInternational = internationalCount / totalStudents;
      const rawScore = round2(Math.min(30, 25 * fracOtherStates + 5 * fracInternational));
      const normalisedScore = round2((rawScore / maxMarks) * 100);

      return {
        metricCode: "RD",
        parameter: "OI",
        name: "Percentage of Students from Other States and Countries",
        status: "COMPUTED",
        maxMarks,
        result: {
          rawScore,
          normalisedScore,
          weightedScore: rawScore,
          maxMarks,
          trace: {
            formula: "RD = 25 * (Other States / Total) + 5 * (International / Total)",
            steps: [
              { step: "Other States Fraction", expression: `${otherStatesCount} / ${totalStudents}`, value: round2(fracOtherStates) },
              { step: "International Fraction", expression: `${internationalCount} / ${totalStudents}`, value: round2(fracInternational) },
              { step: "Total RD Score", expression: `25 * ${round2(fracOtherStates)} + 5 * ${round2(fracInternational)}`, value: rawScore },
            ],
          },
        },
      };
    }

    case "WD": {
      const { womenStudentsPercentage } = inputs.diversityStats;
      const { womenFacultyCount, regularFacultyCount } = inputs.facultyStats;
      const maxMarks = 30;

      const womenFacultyPercentage =
        regularFacultyCount > 0
          ? round2((womenFacultyCount / regularFacultyCount) * 100)
          : 0;

      const f_NWS = Math.min(1.0, womenStudentsPercentage / 50);
      const f_NWF = Math.min(1.0, womenFacultyPercentage / 20);
      const rawScore = round2(Math.min(30, 15 * f_NWS + 15 * f_NWF));
      const normalisedScore = round2((rawScore / maxMarks) * 100);

      return {
        metricCode: "WD",
        parameter: "OI",
        name: "Percentage of Women (Women Diversity)",
        status: "COMPUTED",
        maxMarks,
        result: {
          rawScore,
          normalisedScore,
          weightedScore: rawScore,
          maxMarks,
          trace: {
            formula: "WD = 15 * min(1, NWS / 50) + 15 * min(1, NWF / 20)",
            steps: [
              { step: "Women Students (NWS)", expression: `${womenStudentsPercentage}% (Target 50%)`, value: round2(15 * f_NWS) },
              { step: "Women Faculty (NWF)", expression: `${womenFacultyPercentage}% (Target 20%)`, value: round2(15 * f_NWF) },
              { step: "Total WD Score", expression: `${round2(15 * f_NWS)} + ${round2(15 * f_NWF)}`, value: rawScore },
            ],
          },
        },
      };
    }

    case "ESCS": {
      const { feeReimbursementPercentage } = inputs.diversityStats;
      const maxMarks = 20;

      // Expectation target: 20% economically backward students receiving tuition reimbursement
      const f_Nesc = Math.min(1.0, feeReimbursementPercentage / 20);
      const rawScore = round2(Math.min(20, 20 * f_Nesc));
      const normalisedScore = round2((rawScore / maxMarks) * 100);

      return {
        metricCode: "ESCS",
        parameter: "OI",
        name: "Economically and Socially Challenged Students",
        status: "COMPUTED",
        maxMarks,
        result: {
          rawScore,
          normalisedScore,
          weightedScore: rawScore,
          maxMarks,
          trace: {
            formula: "ESCS = 20 * f(Nesc)",
            steps: [
              { step: "Tuition Reimbursement Ratio (Nesc)", expression: `${feeReimbursementPercentage}%`, value: round2(f_Nesc) },
              { step: "Total ESCS Score", expression: `20 * ${round2(f_Nesc)}`, value: rawScore },
            ],
          },
        },
      };
    }

    case "PCS": {
      const { physicallyChallengedFacilityScore, physicallyChallengedFacilitiesVerified } = inputs.diversityStats;
      const maxMarks = 20;

      // NIRF mandate: 20 marks for full verified facilities; proportional if partial; 0 if not verified
      const rawScore = physicallyChallengedFacilitiesVerified
        ? Math.min(20, physicallyChallengedFacilityScore)
        : 0;
      const normalisedScore = round2((rawScore / maxMarks) * 100);

      return {
        metricCode: "PCS",
        parameter: "OI",
        name: "Facilities for Physically Challenged Students",
        status: "COMPUTED",
        maxMarks,
        result: {
          rawScore,
          normalisedScore,
          weightedScore: rawScore,
          maxMarks,
          trace: {
            formula: "PCS = 20 if full facilities provided; otherwise in proportion to facilities",
            steps: [
              { step: "Accessibility Audit", expression: physicallyChallengedFacilitiesVerified ? "Audit Verified" : "Default Campus Baseline", value: rawScore },
              { step: "Total PCS Score", expression: `${rawScore} / 20`, value: rawScore },
            ],
          },
        },
      };
    }

    /* ────────────────────────── PR ────────────────────────── */
    case "PR": {
      const { hasOfficialScore, officialScore } = inputs.perceptionStats;
      const maxMarks = 100;

      if (!hasOfficialScore || officialScore === null) {
        return {
          metricCode: "PR",
          parameter: "PR",
          name: "Peer Perception: Employers & Academic Peer",
          status: "NOT_COMPUTABLE",
          maxMarks,
          result: {
            rawScore: null,
            normalisedScore: null,
            weightedScore: null,
            maxMarks,
            trace: {
              formula: "PR = official peer perception score only; if unavailable, PR = NOT_COMPUTABLE",
              steps: [
                { step: "Official Survey Status", expression: "NIRF Survey Ingestion", value: "NOT_AVAILABLE" },
              ],
              notes: "Per NIRF mandate: PR requires official perception score. Imputation or heuristic prediction is strictly prohibited. Marked NOT_COMPUTABLE.",
            },
          },
          notes: "Official employer and academic peer perception survey score not available.",
        };
      }

      const rawScore = round2(Math.min(100, officialScore));
      return {
        metricCode: "PR",
        parameter: "PR",
        name: "Peer Perception: Employers & Academic Peer",
        status: "COMPUTED",
        maxMarks,
        result: {
          rawScore,
          normalisedScore: rawScore,
          weightedScore: rawScore,
          maxMarks,
          trace: {
            formula: "PR = official perception score",
            steps: [
              { step: "Official Ingested Score", expression: `NIRF Survey = ${officialScore}`, value: rawScore },
            ],
          },
        },
      };
    }

    default:
      throw new Error(`Unknown metric code: ${metricCode}`);
  }
}

