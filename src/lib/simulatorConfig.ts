/**
 * MCA Department Score Simulator — Configuration & Scoring Rules
 * Version: 1.0.0-MCA-SIM
 *
 * DISCLAIMER:
 * Departmental simulation — not an official NIRF score or rank.
 *
 * This configuration clearly distinguishes between:
 * 1. PUBLISHED_NIRF_FORMULA: Exact closed-form formulas published in official NIRF Engineering 2025.
 * 2. DEPARTMENTAL_SIMULATION_RULE: Documented departmental assumptions where official NIRF
 *    uses uncalibrated national percentile/rank-dependent curves f().
 */

export interface SimulatorBenchmarkTargets {
  // TLR - Student Strength
  phdTargetCount: number; // Departmental doctoral enrolment target (Default: 5)

  // TLR - Faculty-Student Ratio
  targetFSRRatio: number; // 1:15 standard ratio (Default: 15)

  // TLR - Financial Resources & Utilisation (FRU)
  targetCapitalPerStudentINR: number; // Default: ₹25,000 per student (Labs, Library, Computing)
  targetOperationalPerStudentINR: number; // Default: ₹75,000 per student (Salaries, Maintenance)

  // RP - Research Publications & Citations
  targetAnnualPubPerFaculty: number; // Default: 1.0 indexed paper / faculty / year (3.0 over 3Y)
  targetCitationsPerFaculty: number; // Default: 5.0 citations / faculty over 3Y

  // RP - IPR / Patents
  targetPatentsGranted3Y: number; // Default: 2 granted patents over 3Y window
  targetPatentsPublished3Y: number; // Default: 5 published patent applications over 3Y window

  // RP - Sponsored Projects & Consultancy (FPPP)
  targetResearchFundingINR: number; // Default: ₹10,00,000 (10 Lakhs)
  targetConsultancyINR: number; // Default: ₹2,00,000 (2 Lakhs)

  // PR - Peer Perception
  defaultPerceptionScore: number; // Default: 50.0 (out of 100) or user-entered
  includePerceptionInTotal: boolean; // Default: false for pure internal departmental metrics
}

export const DEFAULT_SIMULATOR_TARGETS: SimulatorBenchmarkTargets = {
  phdTargetCount: 5,
  targetFSRRatio: 15,
  targetCapitalPerStudentINR: 25000,
  targetOperationalPerStudentINR: 75000,
  targetAnnualPubPerFaculty: 1.0,
  targetCitationsPerFaculty: 5.0,
  targetPatentsGranted3Y: 2,
  targetPatentsPublished3Y: 5,
  targetResearchFundingINR: 1000000,
  targetConsultancyINR: 200000,
  defaultPerceptionScore: 50,
  includePerceptionInTotal: false,
};

export type FormulaRuleType =
  | "PUBLISHED_NIRF_FORMULA"
  | "DEPARTMENTAL_SIMULATION_RULE";

export interface MetricRuleDefinition {
  metricCode: string;
  parameter: "TLR" | "RP" | "GO" | "OI" | "PR";
  name: string;
  maxMarks: number;
  ruleType: FormulaRuleType;
  formulaDescription: string;
  benchmarkRationale: string;
}

export const METRIC_RULE_DEFINITIONS: Record<string, MetricRuleDefinition> = {
  SS: {
    metricCode: "SS",
    parameter: "TLR",
    name: "Student Strength (SS)",
    maxMarks: 20,
    ruleType: "DEPARTMENTAL_SIMULATION_RULE",
    formulaDescription:
      "SS = 15 × min(1.0, NE / NT) + 5 × min(1.0, NP / NP_target)",
    benchmarkRationale:
      "Official NIRF uses uncalibrated f(NT, NE)*15 + f(NP)*5. Simulator scales 15 pts linearly to sanctioned intake fulfillment and 5 pts against departmental doctoral target (NP_target = 5).",
  },
  FSR: {
    metricCode: "FSR",
    parameter: "TLR",
    name: "Faculty-Student Ratio (FSR)",
    maxMarks: 30,
    ruleType: "PUBLISHED_NIRF_FORMULA",
    formulaDescription:
      "FSR = 30 × [15 × (F / N)]. If F/N < 1:50, FSR = 0.",
    benchmarkRationale:
      "Published NIRF Engineering 2025 formula. Full marks at 1:15 ratio or better (F >= N/15).",
  },
  FQE: {
    metricCode: "FQE",
    parameter: "TLR",
    name: "Faculty Qualification & Experience (FQE)",
    maxMarks: 20,
    ruleType: "PUBLISHED_NIRF_FORMULA",
    formulaDescription:
      "FQE = FQ (max 10) + FE (max 10). FQ = 10 × (F_phd / (N/15)). FE = 3×E1 + 3×E2 + 4×E3.",
    benchmarkRationale:
      "Published NIRF Engineering 2025 formula. FQ rewards PhD proportion; FE rewards experience distribution.",
  },
  FRU: {
    metricCode: "FRU",
    parameter: "TLR",
    name: "Financial Resources & Utilisation (FRU)",
    maxMarks: 30,
    ruleType: "DEPARTMENTAL_SIMULATION_RULE",
    formulaDescription:
      "FRU = 7.5 × min(1.0, BC / BC_target) + 22.5 × min(1.0, BO / BO_target)",
    benchmarkRationale:
      "Official NIRF uses uncalibrated f(BC) and f(BO). Simulator benchmarks against departmental targets: BC_target = ₹25,000/student (computing, library) and BO_target = ₹75,000/student (salaries, maintenance). Excludes building construction and hostel maintenance.",
  },
  PU: {
    metricCode: "PU",
    parameter: "RP",
    name: "Research Publications (PU)",
    maxMarks: 35,
    ruleType: "DEPARTMENTAL_SIMULATION_RULE",
    formulaDescription:
      "PU = 35 × min(1.0, (P_indexed / (F × 3 × AnnualPubTarget)))",
    benchmarkRationale:
      "Official NIRF uses national percentile curve f(P/FRQ). Simulator benchmarks against faculty research output: 1.0 indexed paper/faculty/year over the 3-year window.",
  },
  QP: {
    metricCode: "QP",
    parameter: "RP",
    name: "Quality of Publications (QP)",
    maxMarks: 40,
    ruleType: "DEPARTMENTAL_SIMULATION_RULE",
    formulaDescription:
      "QP = 20 × min(1.0, Citations / (F × CitationsTarget)) + 20 × (Q1Q2_Count / max(1, P))",
    benchmarkRationale:
      "Official NIRF uses third-party WoS/Scopus percentiles. Simulator benchmarks 20 pts on faculty citations target (5 per faculty) and 20 pts on top-quartile (Q1/Q2) journal ratio.",
  },
  IPR: {
    metricCode: "IPR",
    parameter: "RP",
    name: "Patents & IPR (IPR)",
    maxMarks: 15,
    ruleType: "DEPARTMENTAL_SIMULATION_RULE",
    formulaDescription:
      "IPR = 10 × min(1.0, PG / PG_target) + 5 × min(1.0, PP / PP_target)",
    benchmarkRationale:
      "Official NIRF uses uncalibrated f(PG)*10 + f(PP)*5. Simulator benchmarks against departmental 3-year targets: PG_target = 2 grants, PP_target = 5 publications.",
  },
  FPPP: {
    metricCode: "FPPP",
    parameter: "RP",
    name: "Projects & Professional Practice (FPPP)",
    maxMarks: 15,
    ruleType: "DEPARTMENTAL_SIMULATION_RULE",
    formulaDescription:
      "FPPP = 10 × min(1.0, RF / RF_target) + 5 × min(1.0, CF / CF_target)",
    benchmarkRationale:
      "Simulator benchmarks against external funding targets: RF_target = ₹10 Lakhs research grants, CF_target = ₹2 Lakhs consultancy receipts.",
  },
  GPH: {
    metricCode: "GPH",
    parameter: "GO",
    name: "Placement & Higher Studies (GPH)",
    maxMarks: 40,
    ruleType: "PUBLISHED_NIRF_FORMULA",
    formulaDescription: "GPH = 40 × [(Placed + HigherStudies) / EligibleGraduates]",
    benchmarkRationale:
      "Published NIRF Engineering 2025 formula. Directly proportional to placement & higher studies rate.",
  },
  GUE: {
    metricCode: "GUE",
    parameter: "GO",
    name: "University Examinations (GUE)",
    maxMarks: 15,
    ruleType: "PUBLISHED_NIRF_FORMULA",
    formulaDescription: "GUE = 15 × min(1.0, GraduatedInStipulatedTime / (0.80 × EligibleGraduates))",
    benchmarkRationale:
      "Published NIRF Engineering 2025 formula. 15 points awarded if graduation rate >= 80%.",
  },
  GMS: {
    metricCode: "GMS",
    parameter: "GO",
    name: "Median Salary (GMS)",
    maxMarks: 25,
    ruleType: "DEPARTMENTAL_SIMULATION_RULE",
    formulaDescription: "GMS = 25 × min(1.0, MedianSalary / 800000)",
    benchmarkRationale:
      "Simulator benchmarks MCA median placement salary against ₹8.0 LPA benchmark target.",
  },
  RD: {
    metricCode: "RD",
    parameter: "OI",
    name: "Region Diversity (RD)",
    maxMarks: 30,
    ruleType: "PUBLISHED_NIRF_FORMULA",
    formulaDescription: "RD = 25 × (OtherStates / Total) + 5 × (International / Total)",
    benchmarkRationale: "Published NIRF Engineering 2025 formula.",
  },
  WD: {
    metricCode: "WD",
    parameter: "OI",
    name: "Women Diversity (WD)",
    maxMarks: 30,
    ruleType: "PUBLISHED_NIRF_FORMULA",
    formulaDescription: "WD = 15 × (WomenStudents / TotalStudents) + 15 × (WomenFaculty / TotalFaculty)",
    benchmarkRationale: "Published NIRF Engineering 2025 formula.",
  },
  ESCS: {
    metricCode: "ESCS",
    parameter: "OI",
    name: "Economically & Socially Challenged Students (ESCS)",
    maxMarks: 20,
    ruleType: "PUBLISHED_NIRF_FORMULA",
    formulaDescription: "ESCS = 20 × (FeeReimbursementStudents / TotalStudents)",
    benchmarkRationale: "Published NIRF Engineering 2025 formula.",
  },
  PCS: {
    metricCode: "PCS",
    parameter: "OI",
    name: "Physically Challenged Students Facilities (PCS)",
    maxMarks: 20,
    ruleType: "PUBLISHED_NIRF_FORMULA",
    formulaDescription: "PCS = 20 points for verified barrier-free accessible campus infrastructure.",
    benchmarkRationale: "Published NIRF Engineering 2025 formula.",
  },
  PR: {
    metricCode: "PR",
    parameter: "PR",
    name: "Peer Perception (PR)",
    maxMarks: 100,
    ruleType: "DEPARTMENTAL_SIMULATION_RULE",
    formulaDescription: "PR = User-entered survey estimate or excluded from departmental total.",
    benchmarkRationale:
      "NIRF national perception survey is conducted institution-wide. Kept optional/custom in departmental simulation.",
  },
};

export const SIMULATOR_DISCLAIMER =
  "Departmental simulation — not an official NIRF score or rank.";
