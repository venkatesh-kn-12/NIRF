import assert from "node:assert/strict";
import { evaluateMetric } from "../src/services/metrics/formulaEvaluator";
import { ResolvedMetricInputs } from "../src/services/metrics/inputResolver";

function buildMockInputs(overrides: Partial<ResolvedMetricInputs> = {}): ResolvedMetricInputs {
  return {
    academicYear: "2024-25",
    department: "MCA",
    rawSnapshot: {},
    studentStats: {
      totalApproved: 120,
      approvedIntake: 120,
      enrolledStudents: 120,
      phdEnrolled: 0,
      isExplicitZeroDeclared: true,
      intakeSource: "DEPARTMENT_CONFIG_FALLBACK",
      pendingStudentsCount: 0,
      blockers: [],
    },
    facultyStats: {
      totalApproved: 8,
      regularFacultyCount: 8, // 8 / 120 = 1:15 optimal!
      totalFacultyCount: 8,
      phdFacultyCount: 8, // 100% PhD
      expUpTo8: 3,
      exp8To15: 3,
      expAbove15: 2,
      womenFacultyCount: 2, // 25% women faculty
      ineligibleFacultyCount: 0,
      pendingFacultyCount: 0,
      blockers: [],
    },
    financeStats: {
      totalApproved: 2,
      capitalExpenditureTotal: 2400000,
      operationalExpenditureTotal: 7200000,
      capitalExpenditurePerStudent: 20000, // 20000 / 20000 = 1.0
      operationalExpenditurePerStudent: 60000, // 60000 / 60000 = 1.0
      reportingYearsCount: 3,
      reportingYears: ["2021-22", "2022-23", "2023-24"],
      excludedExpensesTotal: 0,
      pendingFinanceCount: 0,
      blockers: [],
    },
    publicationStats: {
      totalApproved: 10,
      inWindowPublicationsCount: 10,
      verifiedPublicationsCount: 10,
      hasThirdPartySource: false,
      actualCitationsTotal: 60,      // 6 per pub → above 5/faculty target for F=8: 60 vs 40
      hasCitationData: true,
      citationCoveragePercent: 100,
      distinctQ1Q2Count: 5,           // 50% Q1/Q2
      hasQuartileData: true,
      quartileCoveragePercent: 100,
      isZeroDeclared: false,
      conflictWithZeroDeclaration: false,
      reportingWindowDescription: "3-Year Window (2021–2024)",
    },
    patentStats: {
      totalApproved: 4,
      patentsGranted3Y: 3,
      patentsPublished3Y: 6,
      isZeroGrantedDeclared: false,
      isZeroPublishedDeclared: false,
      conflictWithZeroDeclaration: false,
      reportingWindowDescription: "3-Year Window (2021–2024)",
    },
    projectStats: {
      totalApproved: 3,
      researchFundingTotal: 1200000,   // 400000/yr × 3; annualPerFaculty = 400000/3/8 = 16667
      consultancyTotal: 600000,
      researchFundingAnnualPerFaculty: 50000, // 400000 / 3yr / 8faculty = 16667; set to 50000 to hit target
      consultancyAnnualPerFaculty: 25000,     // set to 25000 to hit target
      legacyUnassignedCount: 0,
      isZeroResearchDeclared: false,
      isZeroConsultancyDeclared: false,
      conflictWithZeroDeclaration: false,
      reportingWindowDescription: "3-Year Window (2021–2024)",
      facultyDenominator: 8,
      facultyDenominatorMissing: false,
    },
    graduationStats: {
      totalApproved: 1,
      eligibleGraduates: 60,
      graduatesInStipulatedTime: 55,
      stipulatedGraduationRate: 91.7, // > 80%
      cohortsCovered: ["2022-2024"],
    },
    placementStats: {
      totalApproved: 1,
      placedCount: 50,
      higherStudiesCount: 5,
      uniquePositiveOutcomesCount: 53,
      eligibleGraduates: 60,
      placementPercentage: 83.3,
      higherStudiesPercentage: 8.3,
      positiveOutcomeRate: 88.3,
      medianSalary: 550000,
      qualifyingSalariesCount: 50,
      isZeroPlacementsDeclared: false,
      isZeroHigherStudiesDeclared: false,
      hasZeroPlacementsConflict: false,
      hasZeroHigherStudiesConflict: false,
      configuredSalaryTarget: 800000,
      configuredGphModel: "GPH_UNIQUE_OUTCOMES_V1",
    },
    doctoralAwardStats: {
      totalApproved: 0,
      totalAwardsInWindow: 0,
      avgAwardsPerYear: 0,
      isZeroDoctoralDeclared: true,
      hasZeroDoctoralConflict: false,
      configuredPhdTargetPerYear: 1.0,
    },
    diversityStats: {
      totalStudents: 120,
      homeStateCount: 96,
      otherStatesCount: 24, // 20% other state
      internationalCount: 0,
      unknownDomicileCount: 0,
      womenStudentsCount: 60, // 50% women students
      menStudentsCount: 60,
      unknownGenderStudentsCount: 0,
      womenStudentsPercentage: 50.0,
      economicallyChallengedCount: 24,
      feeReimbursementPercentage: 20.0,
      fullTuitionSupportedStudentsCount: 24,
      hasFacilityChecklist: true,
      availableFacilitiesCount: 5,
      applicableFacilitiesCount: 5,
      physicallyChallengedFacilitiesVerified: true,
      physicallyChallengedFacilityScore: 20,
    },
    perceptionStats: {
      hasOfficialScore: false,
      officialScore: null,
      hasSurveyResponses: false,
      surveyResponseCount: 0,
      surveyMeanRating: 0,
    },
    ...overrides,
  };
}

console.log("==================================================================");
console.log("STARTING DETERMINISTIC FORMULA ENGINE UNIT TESTS");
console.log("==================================================================");

// 1. TLR: SS (Student Strength)
console.log("\n[TEST] TLR - SS (Student Strength)");
{
  // Default inputs: approvedIntake=120, enrolledStudents=120, phdEnrolled=0
  // intakeScore = 15 × min(1.0, 120/120) = 15
  // phdScore    = 5  × min(1.0, 0/5)    = 0
  // rawScore = 15
  const inputs = buildMockInputs();
  const ss = evaluateMetric("SS", inputs);
  assert.equal(ss.status, "COMPUTED", "SS must be COMPUTED when intake and enrollment data is present (DEPARTMENTAL_SIMULATION_RULE)");
  assert.equal(ss.result.maxMarks, 20);
  assert.equal(ss.result.rawScore, 15, "SS = 15 (full intake) + 0 (no doctoral scholars)");
  assert.ok(ss.result.trace.notes?.includes("DEPARTMENTAL_SIMULATION_RULE"));

  // Edge Case: PhD scholars present → adds doctoral component
  const phdInputs = buildMockInputs({
    studentStats: { totalApproved: 120, approvedIntake: 120, enrolledStudents: 120, phdEnrolled: 5, isExplicitZeroDeclared: false, intakeSource: "DEPARTMENT_CONFIG_FALLBACK" as const, pendingStudentsCount: 0, blockers: [] },
  });
  const ssFull = evaluateMetric("SS", phdInputs);
  assert.equal(ssFull.status, "COMPUTED");
  assert.equal(ssFull.result.rawScore, 20, "SS = 15 + 5 when intake=100% and PhD>=5");

  // Edge Case: 0 enrolled students → PENDING_INPUT
  const zeroInputs = buildMockInputs({
    studentStats: { totalApproved: 0, approvedIntake: 120, enrolledStudents: 0, phdEnrolled: 0, isExplicitZeroDeclared: false, intakeSource: "DEPARTMENT_CONFIG_FALLBACK" as const, pendingStudentsCount: 0, blockers: [] },
  });
  const ssZero = evaluateMetric("SS", zeroInputs);
  assert.equal(ssZero.status, "PENDING_INPUT");
  console.log("✓ SS computes via DEPARTMENTAL_SIMULATION_RULE (intake + doctoral components), and marks PENDING_INPUT on 0 enrolled");
}

// 2. TLR: FSR (Faculty-Student Ratio)
console.log("\n[TEST] TLR - FSR (Faculty-Student Ratio)");
{
  // Optimal 1:15 ratio — N = NT + NP = 120 + 0 = 120, F = 8 → F/N = 1/15
  const optimalInputs = buildMockInputs();
  const fsrOptimal = evaluateMetric("FSR", optimalInputs);
  assert.equal(fsrOptimal.status, "COMPUTED");
  assert.equal(fsrOptimal.result.rawScore, 30); // 30 * [15 * (8/120)] = 30 * 1 = 30
  assert.equal(fsrOptimal.result.maxMarks, 30);

  // Critical Regulation: Ratio < 1:50 MUST be 0!
  const poorInputs = buildMockInputs({
    facultyStats: {
      totalApproved: 2,
      regularFacultyCount: 2, // 2 / 120 = 1:60 (< 1:50)
      totalFacultyCount: 2,
      phdFacultyCount: 2,
      expUpTo8: 1,
      exp8To15: 1,
      expAbove15: 0,
      womenFacultyCount: 0,
      ineligibleFacultyCount: 0,
      pendingFacultyCount: 0,
      blockers: [],
    },
  });
  const fsrPoor = evaluateMetric("FSR", poorInputs);
  assert.equal(fsrPoor.status, "COMPUTED");
  assert.equal(fsrPoor.result.rawScore, 0, "FSR must be 0 when F/N < 1:50");
  assert.ok(fsrPoor.result.trace.notes?.includes("below minimum regulatory threshold 1:50"));
  console.log("✓ FSR computes 30/30 for 1:15 ratio (N = NT+NP), and enforces FSR = 0 when F/N < 1:50");
}

// 3. TLR: FQE (Faculty Qualification & Experience)
console.log("\n[TEST] TLR - FQE (Faculty Qualification & Experience)");
{
  const inputs = buildMockInputs();
  const fqe = evaluateMetric("FQE", inputs);
  assert.equal(fqe.status, "COMPUTED");
  assert.equal(fqe.result.maxMarks, 20);
  // FQ = 10 (since 100% PhD >= 95%), FE ~ 10 for balanced distribution
  assert.ok((fqe.result.rawScore as number) >= 19.0);
  console.log("✓ FQE evaluates FQ and FE with 10pt ceiling and 1:1:1 experience distribution");
}

// 4. TLR: FRU (Financial Resources Utilization)
console.log("\n[TEST] TLR - FRU (Financial Resources)");
{
  // Default inputs: capitalExpenditurePerStudent=20000, operationalExpenditurePerStudent=60000
  // bcScore = 7.5 × min(1.0, 20000/25000) = 7.5 × 0.8 = 6
  // boScore = 22.5 × min(1.0, 60000/75000) = 22.5 × 0.8 = 18
  // rawScore = 24
  const inputs = buildMockInputs();
  const fru = evaluateMetric("FRU", inputs);
  assert.equal(fru.status, "COMPUTED", "FRU must be COMPUTED when expenditure data is present (DEPARTMENTAL_SIMULATION_RULE)");
  assert.equal(fru.result.maxMarks, 30);
  assert.equal(fru.result.rawScore, 24, "FRU = 6 (capital: 80% of target) + 18 (operational: 80% of target) = 24");
  assert.ok(fru.result.trace.notes?.includes("DEPARTMENTAL_SIMULATION_RULE"));

  // Full funding → 30/30
  const fullFundingInputs = buildMockInputs({
    financeStats: {
      totalApproved: 3,
      capitalExpenditureTotal: 3000000,
      operationalExpenditureTotal: 9000000,
      capitalExpenditurePerStudent: 25000, // exactly at target
      operationalExpenditurePerStudent: 75000, // exactly at target
      reportingYearsCount: 3,
      reportingYears: ["2021-22", "2022-23", "2023-24"],
      excludedExpensesTotal: 0,
      pendingFinanceCount: 0,
      blockers: [],
    },
  });
  const fruFull = evaluateMetric("FRU", fullFundingInputs);
  assert.equal(fruFull.status, "COMPUTED");
  assert.equal(fruFull.result.rawScore, 30, "FRU = 30 when both BC and BO exactly meet targets");

  // Incomplete reporting years — still COMPUTED but with note
  const incompleteYearsInputs = buildMockInputs({
    financeStats: {
      totalApproved: 1,
      capitalExpenditureTotal: 1000000,
      operationalExpenditureTotal: 3000000,
      capitalExpenditurePerStudent: 10000,
      operationalExpenditurePerStudent: 30000,
      reportingYearsCount: 1,
      reportingYears: ["2023-24"],
      excludedExpensesTotal: 0,
      pendingFinanceCount: 0,
      blockers: [],
    },
  });
  const fruIncomplete = evaluateMetric("FRU", incompleteYearsInputs);
  assert.equal(fruIncomplete.status, "COMPUTED", "FRU is COMPUTED even with 1 year (partial window labeled clearly)");
  assert.ok(fruIncomplete.notes?.includes("Partial reporting"), "Should note partial coverage");

  // Edge case: 0 approved finance records → PENDING_INPUT
  const zeroFinance = buildMockInputs({
    financeStats: {
      totalApproved: 0,
      capitalExpenditureTotal: 0,
      operationalExpenditureTotal: 0,
      capitalExpenditurePerStudent: 0,
      operationalExpenditurePerStudent: 0,
      reportingYearsCount: 0,
      reportingYears: [],
      excludedExpensesTotal: 0,
      pendingFinanceCount: 0,
      blockers: [],
    },
  });
  const fruZero = evaluateMetric("FRU", zeroFinance);
  assert.equal(fruZero.status, "PENDING_INPUT");
  console.log("✓ FRU computes via DEPARTMENTAL_SIMULATION_RULE (BC/BO targets), shows partial coverage notes, marks PENDING_INPUT on 0 records");
}

// 5. RP: PU & QP (Departmental Simulation Rules)
console.log("\n[TEST] RP - PU & QP (Departmental Simulation Rules)");
{
  const inputs = buildMockInputs();
  const pu = evaluateMetric("PU", inputs);
  assert.equal(pu.status, "COMPUTED", "PU computes via DEPARTMENTAL_SIMULATION_RULE from user-recorded publications");
  assert.equal(pu.result.maxMarks, 35);
  assert.equal(pu.result.rawScore, 14.58, "PU = 35 * min(1.0, 10 / (8 * 3 * 1.0)) = 14.58");
  assert.ok(pu.result.trace.notes?.includes("DEPARTMENTAL_SIMULATION_RULE"));

  const qp = evaluateMetric("QP", inputs);
  assert.equal(qp.status, "COMPUTED", "QP computes via QP_CITATIONS_AND_QUARTILE_V1 from user-entered citations and quartiles");
  assert.equal(qp.result.maxMarks, 40);
  // Citation term: 20 * min(1.0, 60 / (8*5)) = 20 * min(1.0, 60/40) = 20 * 1.0 = 20
  // Quality term:  20 * min(1.0, 5 / 10) = 20 * 0.5 = 10
  // Total: 30
  assert.equal(qp.result.rawScore, 30, "QP = citationTerm (20) + qualityTerm (10) = 30");
  assert.ok(qp.result.trace.notes?.includes("DEPARTMENTAL_SIMULATION_RULE"));
  assert.ok(qp.result.trace.notes?.includes("QP_CITATIONS_AND_QUARTILE_V1"));

  // Edge case: 0 publications → PENDING_INPUT
  const zeroPubInputs = buildMockInputs({
    publicationStats: {
      totalApproved: 0,
      inWindowPublicationsCount: 0,
      verifiedPublicationsCount: 0,
      hasThirdPartySource: false,
      actualCitationsTotal: 0,
      hasCitationData: false,
      citationCoveragePercent: 0,
      distinctQ1Q2Count: 0,
      hasQuartileData: false,
      quartileCoveragePercent: 0,
      isZeroDeclared: false,
      conflictWithZeroDeclaration: false,
      reportingWindowDescription: "3-Year Window (2021–2024)",
    },
  });
  const puZero = evaluateMetric("PU", zeroPubInputs);
  assert.equal(puZero.status, "PENDING_INPUT");
  const qpZero = evaluateMetric("QP", zeroPubInputs);
  assert.equal(qpZero.status, "PENDING_INPUT");

  // Edge case: zero publication declared → COMPUTED with 0
  const zeroDecPubInputs = buildMockInputs({
    publicationStats: {
      totalApproved: 0,
      inWindowPublicationsCount: 0,
      verifiedPublicationsCount: 0,
      hasThirdPartySource: false,
      actualCitationsTotal: 0,
      hasCitationData: false,
      citationCoveragePercent: 0,
      distinctQ1Q2Count: 0,
      hasQuartileData: false,
      quartileCoveragePercent: 0,
      isZeroDeclared: true,
      conflictWithZeroDeclaration: false,
      reportingWindowDescription: "3-Year Window (2021–2024)",
    },
  });
  const puZeroDec = evaluateMetric("PU", zeroDecPubInputs);
  assert.equal(puZeroDec.status, "COMPUTED");
  assert.equal(puZeroDec.result.rawScore, 0, "PU = 0 when zero publication declared");

  // Citation data missing → citation term omitted (not estimated)
  const noCitationInputs = buildMockInputs({
    publicationStats: {
      totalApproved: 10,
      inWindowPublicationsCount: 10,
      verifiedPublicationsCount: 10,
      hasThirdPartySource: false,
      actualCitationsTotal: 0,
      hasCitationData: false,   // <-- no citation data
      citationCoveragePercent: 0,
      distinctQ1Q2Count: 5,
      hasQuartileData: true,
      quartileCoveragePercent: 100,
      isZeroDeclared: false,
      conflictWithZeroDeclaration: false,
      reportingWindowDescription: "3-Year Window (2021–2024)",
    },
  });
  const qpNoCitations = evaluateMetric("QP", noCitationInputs);
  assert.equal(qpNoCitations.status, "COMPUTED");
  // Citation term = 0 (omitted), quality term = 20 * (5/10) = 10
  assert.equal(qpNoCitations.result.rawScore, 10, "QP with no citation data = quality term only (10)");

  console.log("✓ PU and QP compute deterministically — real citations/quartiles used, no artificial estimation");
}

// 6. RP: IPR & FPPP
console.log("\n[TEST] RP - IPR and FPPP");
{
  const inputs = buildMockInputs();
  const ipr = evaluateMetric("IPR", inputs);
  assert.equal(ipr.status, "COMPUTED");
  assert.equal(ipr.result.rawScore, 15); // 10*1.0 + 5*1.0 = 15

  const fppp = evaluateMetric("FPPP", inputs);
  assert.equal(fppp.status, "COMPUTED");
  assert.equal(fppp.result.rawScore, 10); // 7.5*1.0 + 2.5*1.0 = 10

  // IPR with zero declaration → COMPUTED with score 0
  const zeroPatentInputs = buildMockInputs({
    patentStats: {
      totalApproved: 0,
      patentsGranted3Y: 0,
      patentsPublished3Y: 0,
      isZeroGrantedDeclared: true,
      isZeroPublishedDeclared: true,
      conflictWithZeroDeclaration: false,
      reportingWindowDescription: "3-Year Window (2021–2024)",
    },
  });
  const iprZero = evaluateMetric("IPR", zeroPatentInputs);
  assert.equal(iprZero.status, "COMPUTED");
  assert.equal(iprZero.result.rawScore, 0, "IPR = 0 when zero patent activity declared");

  // IPR with no patents and no declaration → PENDING_INPUT
  const noPatentInputs = buildMockInputs({
    patentStats: {
      totalApproved: 0,
      patentsGranted3Y: 0,
      patentsPublished3Y: 0,
      isZeroGrantedDeclared: false,
      isZeroPublishedDeclared: false,
      conflictWithZeroDeclaration: false,
      reportingWindowDescription: "3-Year Window (2021–2024)",
    },
  });
  const iprPending = evaluateMetric("IPR", noPatentInputs);
  assert.equal(iprPending.status, "PENDING_INPUT", "IPR = PENDING_INPUT when no patents and no zero declaration");

  // FPPP with no funding and no declaration → PENDING_INPUT
  const noFundingInputs = buildMockInputs({
    projectStats: {
      totalApproved: 0,
      researchFundingTotal: 0,
      consultancyTotal: 0,
      researchFundingAnnualPerFaculty: 0,
      consultancyAnnualPerFaculty: 0,
      legacyUnassignedCount: 0,
      isZeroResearchDeclared: false,
      isZeroConsultancyDeclared: false,
      conflictWithZeroDeclaration: false,
      reportingWindowDescription: "3-Year Window (2021–2024)",
      facultyDenominator: 8,
      facultyDenominatorMissing: false,
    },
  });
  const fpppPending = evaluateMetric("FPPP", noFundingInputs);
  assert.equal(fpppPending.status, "PENDING_INPUT", "FPPP = PENDING_INPUT when no receipts and no zero declaration");

  console.log("✓ IPR and FPPP: zero declarations → COMPUTED(0), no data → PENDING_INPUT, real data → COMPUTED");
}

// 7. GO: GPH, GUE, GMS
console.log("\n[TEST] GO - Graduation Outcomes (GPH, GUE, GMS)");
{
  const inputs = buildMockInputs();
  const gph = evaluateMetric("GPH", inputs);
  assert.equal(gph.status, "COMPUTED");
  assert.ok((gph.result.rawScore as number) > 30); // 40 * (0.833 + 0.083) = 36.64

  const gue = evaluateMetric("GUE", inputs);
  assert.equal(gue.status, "COMPUTED");
  assert.equal(gue.result.rawScore, 15); // Ng (91.7%) > 80% => full 15 marks

  const gms = evaluateMetric("GMS", inputs);
  assert.equal(gms.status, "COMPUTED");
  assert.equal(gms.result.rawScore, 17.19); // 25 * (550000 / 800000) = 17.19

  // Full score when median salary meets or exceeds target
  const inputsFullGms = buildMockInputs({
    placementStats: {
      ...inputs.placementStats,
      medianSalary: 850000,
    },
  });
  const gmsFull = evaluateMetric("GMS", inputsFullGms);
  assert.equal(gmsFull.result.rawScore, 25);
  console.log("✓ GPH, GUE (capped at 15 for >= 80%), and GMS compute accurately with configured benchmark target");
}

// 8. OI: RD, WD, ESCS, PCS
console.log("\n[TEST] OI - Outreach & Inclusivity (RD, WD, ESCS, PCS)");
{
  const inputs = buildMockInputs();
  const rd = evaluateMetric("RD", inputs);
  assert.equal(rd.status, "COMPUTED");
  assert.equal(rd.result.rawScore, 5); // 25 * (24/120) = 5.0

  const wd = evaluateMetric("WD", inputs);
  assert.equal(wd.status, "COMPUTED");
  assert.equal(wd.result.rawScore, 30); // 50% women students (15) + 25% women faculty (15) = 30

  const escs = evaluateMetric("ESCS", inputs);
  assert.equal(escs.status, "COMPUTED");
  assert.equal(escs.result.rawScore, 20); // 20% fee waiver => 20 marks

  const pcs = evaluateMetric("PCS", inputs);
  assert.equal(pcs.status, "COMPUTED");
  assert.equal(pcs.result.rawScore, 20);
  console.log("✓ Region Diversity, Women Diversity, ESCS, and PCS compute with verified limits");
}

// 9. PR: Perception (Uncomputed when missing official survey)
console.log("\n[TEST] PR - Peer Perception Mandate");
{
  const inputs = buildMockInputs();
  const pr = evaluateMetric("PR", inputs);
  assert.equal(pr.status, "NOT_COMPUTABLE", "PR must be NOT_COMPUTABLE when no official survey score");
  assert.equal(pr.result.rawScore, null);

  // If official score is present
  const inputsWithPR = buildMockInputs({
    perceptionStats: {
      hasOfficialScore: true,
      officialScore: 78.5,
      hasSurveyResponses: false,
      surveyResponseCount: 0,
      surveyMeanRating: 0,
    },
  });
  const prWithScore = evaluateMetric("PR", inputsWithPR);
  assert.equal(prWithScore.status, "COMPUTED");
  assert.equal(prWithScore.result.rawScore, 78.5);
  console.log("✓ PR defaults to NOT_COMPUTABLE and strictly disallows heuristic score imputation");
}

// 10. Determinism Check
console.log("\n[TEST] Mathematical Determinism Test");
{
  const inputs = buildMockInputs();
  const run1 = evaluateMetric("FSR", inputs);
  const run2 = evaluateMetric("FSR", inputs);
  assert.deepEqual(run1, run2, "Identical inputs must yield identical outputs every single time");
  console.log("✓ Determinism verified: 100% mathematical reproducibility");
}

console.log("\n==================================================================");
console.log("ALL NIRF 2025 METRIC FORMULA UNIT TESTS PASSED CLEANLY!");
console.log("==================================================================");

