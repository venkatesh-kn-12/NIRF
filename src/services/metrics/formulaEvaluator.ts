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
              formula: "SS = f(NT, NE) * 15 + f(NP) * 5",
              steps: [
                { step: "Intake Check", expression: `Approved Intake (NT) = ${approvedIntake}`, value: approvedIntake },
                { step: "Enrollment Check", expression: `Enrolled (NE) = ${enrolledStudents}`, value: enrolledStudents },
              ],
              notes: "Requires at least 1 approved student record and sanctioned intake.",
            },
          },
        };
      }

      const f_NE_NT = Math.min(1.0, enrolledStudents / approvedIntake);
      const f_NP = phdEnrolled > 0 ? Math.min(1.0, phdEnrolled / 10) : 0;
      const rawScore = round2(f_NE_NT * 15 + f_NP * 5);
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
            formula: "SS = f(NT, NE) * 15 + f(NP) * 5",
            steps: [
              { step: "Ratio NE / NT", expression: `${enrolledStudents} / ${approvedIntake}`, value: round2(f_NE_NT) },
              { step: "UG/PG component", expression: `15 * ${round2(f_NE_NT)}`, value: round2(f_NE_NT * 15) },
              { step: "Doctoral component", expression: `5 * ${round2(f_NP)}`, value: round2(f_NP * 5) },
              { step: "Total SS Score", expression: `${round2(f_NE_NT * 15)} + ${round2(f_NP * 5)}`, value: rawScore },
            ],
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
      const { capitalExpenditurePerStudent, operationalExpenditurePerStudent, totalApproved } = inputs.financeStats;
      const maxMarks = 30;

      if (totalApproved <= 0) {
        return {
          metricCode: "FRU",
          parameter: "TLR",
          name: "Financial Resources and their Utilisation",
          status: "PENDING_INPUT",
          maxMarks,
          result: {
            rawScore: null,
            normalisedScore: null,
            weightedScore: null,
            maxMarks,
            trace: {
              formula: "FRU = 7.5 * f(BC) + 22.5 * f(BO)",
              steps: [{ step: "Finance Records", expression: "Approved records = 0", value: 0 }],
              notes: "Requires audited capital and operational expenditure records.",
            },
          },
        };
      }

      // Linear normalisation against standard computing engineering thresholds (BC target: 20,000, BO target: 60,000)
      const f_BC = Math.min(1.0, capitalExpenditurePerStudent / 20000);
      const f_BO = Math.min(1.0, operationalExpenditurePerStudent / 60000);
      const rawScore = round2(Math.min(30, 7.5 * f_BC + 22.5 * f_BO));
      const normalisedScore = round2((rawScore / maxMarks) * 100);

      return {
        metricCode: "FRU",
        parameter: "TLR",
        name: "Financial Resources and their Utilisation",
        status: "COMPUTED",
        maxMarks,
        result: {
          rawScore,
          normalisedScore,
          weightedScore: rawScore,
          maxMarks,
          trace: {
            formula: "FRU = 7.5 * f(BC) + 22.5 * f(BO)",
            steps: [
              { step: "Capital Expenditure / Student (BC)", expression: `INR ${capitalExpenditurePerStudent}`, value: round2(f_BC) },
              { step: "Capital Component (7.5 * f(BC))", expression: `7.5 * ${round2(f_BC)}`, value: round2(7.5 * f_BC) },
              { step: "Operational Expenditure / Student (BO)", expression: `INR ${operationalExpenditurePerStudent}`, value: round2(f_BO) },
              { step: "Operational Component (22.5 * f(BO))", expression: `22.5 * ${round2(f_BO)}`, value: round2(22.5 * f_BO) },
              { step: "Total FRU Score", expression: `${round2(7.5 * f_BC)} + ${round2(22.5 * f_BO)}`, value: rawScore },
            ],
          },
        },
      };
    }

    /* ────────────────────────── RP ────────────────────────── */
    case "PU": {
      const maxMarks = 35;
      // Per requirements: Awaiting Source unless third-party bibliometric feed is integrated
      return {
        metricCode: "PU",
        parameter: "RP",
        name: "Combined Metric for Publications",
        status: "AWAITING_SOURCE",
        maxMarks,
        result: {
          rawScore: null,
          normalisedScore: null,
          weightedScore: null,
          maxMarks,
          trace: {
            formula: "PU = 35 * f(P / FRQ) - 5 * f(Pret)",
            steps: [
              { step: "Approved Internal Publication Records", expression: `${inputs.publicationStats.totalApproved} internal records on file`, value: inputs.publicationStats.totalApproved },
              { step: "Third-party Source Check", expression: "Scopus / Web of Science sync", value: "NOT_CONNECTED" },
            ],
            notes: "Per NIRF mandate, publication counts must be corroborated directly from external indexed bibliometric databases (Scopus / Web of Science). Marked AWAITING_SOURCE.",
          },
        },
        notes: "Awaiting Scopus / Web of Science verified bibliometric ingestion.",
      };
    }

    case "QP": {
      const maxMarks = 40;
      // Per requirements: Always Awaiting Source unless real bibliometric source connected
      return {
        metricCode: "QP",
        parameter: "RP",
        name: "Combined Metric for Quality of Publications",
        status: "AWAITING_SOURCE",
        maxMarks,
        result: {
          rawScore: null,
          normalisedScore: null,
          weightedScore: null,
          maxMarks,
          trace: {
            formula: "QP = {20 * f(CC / FRQ) + 20 * f(TOP25P / P)} - 5 * f(Cret)",
            steps: [
              { step: "Citation Data Source", expression: "Scopus / Web of Science citation database", value: "AWAITING_FEED" },
              { step: "Top 25% Percentile Benchmark", expression: "Global journal percentile rankings", value: "AWAITING_FEED" },
            ],
            notes: "Quality of Publications requires verified citation counts and Top 25% percentile indices from indexed bibliometric providers. Marked AWAITING_SOURCE per institutional compliance rule.",
          },
        },
        notes: "Awaiting external citation index feed.",
      };
    }

    case "IPR": {
      const { patentsGranted3Y, patentsPublished3Y } = inputs.patentStats;
      const maxMarks = 15;

      const f_PG = Math.min(1.0, patentsGranted3Y / 3);
      const f_PP = Math.min(1.0, patentsPublished3Y / 6);
      const rawScore = round2(Math.min(15, 10 * f_PG + 5 * f_PP));
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
            formula: "IPR = IPG + IPP; IPG = 10 * f(PG); IPP = 5 * f(PP)",
            steps: [
              { step: "Patents Granted (3Y)", expression: `${patentsGranted3Y} granted`, value: round2(10 * f_PG) },
              { step: "Patents Published (3Y)", expression: `${patentsPublished3Y} published`, value: round2(5 * f_PP) },
              { step: "Total IPR Score", expression: `${round2(10 * f_PG)} + ${round2(5 * f_PP)}`, value: rawScore },
            ],
          },
        },
      };
    }

    case "FPPP": {
      const { researchFundingPerFaculty, consultancyPerFaculty } = inputs.projectStats;
      const maxMarks = 10;

      const f_RF = Math.min(1.0, researchFundingPerFaculty / 50000);
      const f_CF = Math.min(1.0, consultancyPerFaculty / 25000);
      const rawScore = round2(Math.min(10, 7.5 * f_RF + 2.5 * f_CF));
      const normalisedScore = round2((rawScore / maxMarks) * 100);

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
            formula: "FPPP = FPR + FPC; FPR = 7.5 * f(RF); FPC = 2.5 * f(CF)",
            steps: [
              { step: "Research Funding / Faculty", expression: `INR ${researchFundingPerFaculty}`, value: round2(7.5 * f_RF) },
              { step: "Consultancy / Faculty", expression: `INR ${consultancyPerFaculty}`, value: round2(2.5 * f_CF) },
              { step: "Total FPPP Score", expression: `${round2(7.5 * f_RF)} + ${round2(2.5 * f_CF)}`, value: rawScore },
            ],
          },
        },
      };
    }

    /* ────────────────────────── GO ────────────────────────── */
    case "GPH": {
      const { placementPercentage, higherStudiesPercentage } = inputs.placementStats;
      const maxMarks = 40;

      const combinedRatio = placementPercentage / 100 + higherStudiesPercentage / 100;
      const rawScore = round2(Math.min(40, 40 * combinedRatio));
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
            formula: "GPH = 40 * (Np / 100 + Nhs / 100)",
            steps: [
              { step: "Placed Percentage (Np)", expression: `${placementPercentage}%`, value: round2(placementPercentage / 100) },
              { step: "Higher Studies (Nhs)", expression: `${higherStudiesPercentage}%`, value: round2(higherStudiesPercentage / 100) },
              { step: "Combined Rate", expression: `${round2(placementPercentage / 100)} + ${round2(higherStudiesPercentage / 100)}`, value: round2(combinedRatio) },
              { step: "Total GPH Score", expression: `40 * ${round2(combinedRatio)} (capped at 40)`, value: rawScore },
            ],
          },
        },
      };
    }

    case "GUE": {
      const { stipulatedGraduationRate } = inputs.graduationStats;
      const maxMarks = 15;

      const rawScore = round2(15 * Math.min(stipulatedGraduationRate / 80, 1.0));
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
            formula: "GUE = 15 * min[(Ng / 80), 1]",
            steps: [
              { step: "Stipulated Graduation Rate (Ng)", expression: `${stipulatedGraduationRate}%`, value: stipulatedGraduationRate },
              { step: "Normalized Factor (Ng / 80)", expression: `min(${round2(stipulatedGraduationRate / 80)}, 1.0)`, value: round2(Math.min(stipulatedGraduationRate / 80, 1.0)) },
              { step: "Total GUE Score", expression: `15 * ${round2(Math.min(stipulatedGraduationRate / 80, 1.0))}`, value: rawScore },
            ],
          },
        },
      };
    }

    case "GMS": {
      const { medianSalary } = inputs.placementStats;
      const maxMarks = 25;

      if (medianSalary <= 0) {
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
              formula: "GMS = 25 * f(MS)",
              steps: [{ step: "Median Salary Check", expression: "Audited salary records = 0", value: 0 }],
              notes: "Requires approved placement salary records.",
            },
          },
        };
      }

      // Benchmark target for postgraduate computing graduates: INR 5,50,000 p.a.
      const f_MS = Math.min(1.0, medianSalary / 550000);
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
            formula: "GMS = 25 * f(MS)",
            steps: [
              { step: "Median Annual Salary (MS)", expression: `INR ${medianSalary}`, value: medianSalary },
              { step: "Normalized Factor", expression: `min(1.0, ${medianSalary} / 550000)`, value: round2(f_MS) },
              { step: "Total GMS Score", expression: `25 * ${round2(f_MS)}`, value: rawScore },
            ],
          },
        },
      };
    }

    case "GPHD": {
      const maxMarks = 20;
      // In standalone MCA department: 0 doctoral graduates unless certified
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
            formula: "GPHD = 20 * f(Nphd)",
            steps: [
              { step: "Average Ph.D. Awarded (3Y)", expression: "Nphd = 0 (MCA Standalone)", value: 0 },
              { step: "Total GPHD Score", expression: "20 * 0", value: 0 },
            ],
            notes: "MCA departmental scope: 0 doctoral awards recorded.",
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

