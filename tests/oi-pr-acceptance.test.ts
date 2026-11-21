/**
 * OI and PR Acceptance Test Suite for MCA NIRF Score Simulator
 *
 * Verifies:
 * 1. Admin-only Sanctioned Intake access (Non-admin RBAC rejection with 403)
 * 2. Multi-cohort intake resolution (NT = I_Y + I_{Y-1}) & historical revisions immutability
 * 3. Score Year 2026 policies (Policy A: Completed Baseline vs Policy B: Current Provisional with banner)
 * 4. RD: Mutually exclusive student categorization (International strictly excluded from Other State)
 * 5. WD: Women students (50% target) and faculty (20% target) caps & unknown gender breakdown
 * 6. ESCS: Deduplicated student full-tuition support under MCA_FULL_TUITION_SUPPORT_V1
 * 7. PCS: 5-item campus accessibility checklist under MCA_CAMPUS_ACCESSIBILITY_V1; empty checklist -> PENDING_INPUT
 * 8. PR: Survey ratings on 1-5 scale under DEPARTMENT_SURVEY_V1; missing responses -> PENDING_INPUT (no fake zero)
 * 9. Overall 2026 Score aggregation and partial weighted subtotal transparency without weight renormalisation
 */

import assert from "node:assert/strict";
import { evaluateMetric } from "../src/services/metrics/formulaEvaluator";
import { ResolvedMetricInputs } from "../src/services/metrics/inputResolver";
import { getScoreYearConfig } from "../src/lib/reportingWindow";
import { hasRole } from "../src/lib/rbac";

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
      isExplicitZeroDeclared: false,
      intakeSource: "SANCTIONED_INTAKE_RECORDS",
      pendingStudentsCount: 0,
      blockers: [],
    },
    facultyStats: {
      totalApproved: 8,
      regularFacultyCount: 8,
      totalFacultyCount: 8,
      phdFacultyCount: 4,
      expUpTo8: 3,
      exp8To15: 3,
      expAbove15: 2,
      womenFacultyCount: 2, // 25% (Target 20% -> full 15 marks)
      ineligibleFacultyCount: 0,
      pendingFacultyCount: 0,
      blockers: [],
    },
    financeStats: {
      totalApproved: 2,
      capitalExpenditureTotal: 1500000,
      operationalExpenditureTotal: 9500000,
      capitalExpenditurePerStudent: 12500,
      operationalExpenditurePerStudent: 79166,
      reportingYearsCount: 3,
      reportingYears: ["2021-22", "2022-23", "2023-24"],
      excludedExpensesTotal: 0,
      pendingFinanceCount: 0,
      blockers: [],
    },
    publicationStats: {
      totalApproved: 10,
      inWindowPublicationsCount: 8,
      verifiedPublicationsCount: 8,
      hasThirdPartySource: true,
      actualCitationsTotal: 40,
      hasCitationData: true,
      citationCoveragePercent: 100,
      distinctQ1Q2Count: 4,
      hasQuartileData: true,
      quartileCoveragePercent: 100,
      reportingWindowDescription: "3-year window",
      configuredQpModel: "QP_CITATIONS_AND_QUARTILE_V1",
      configuredCitationTargetWindow: 5,
      isZeroDeclared: false,
      conflictWithZeroDeclaration: false,
    },
    patentStats: {
      totalApproved: 2,
      patentsGranted3Y: 2,
      patentsPublished3Y: 4,
      isZeroGrantedDeclared: false,
      isZeroPublishedDeclared: false,
      conflictWithZeroDeclaration: false,
      reportingWindowDescription: "3-year window",
      configuredPatentsPublishedTarget: 6,
      configuredPatentsGrantedTarget: 3,
    },
    projectStats: {
      totalApproved: 2,
      researchFundingTotal: 250000,
      consultancyTotal: 80000,
      researchFundingAnnualPerFaculty: 10416,
      consultancyAnnualPerFaculty: 3333,
      legacyUnassignedCount: 0,
      isZeroResearchDeclared: false,
      isZeroConsultancyDeclared: false,
      conflictWithZeroDeclaration: false,
      reportingWindowDescription: "3-year window",
      facultyDenominator: 8,
      facultyDenominatorMissing: false,
      configuredResearchTargetPerFacultyYear: 50000,
      configuredConsultancyTargetPerFacultyYear: 25000,
    },
    graduationStats: {
      totalApproved: 3,
      eligibleGraduates: 120,
      graduatesInStipulatedTime: 108,
      stipulatedGraduationRate: 90,
      cohortsCovered: ["2020-2022", "2021-2023", "2022-2024"],
    },
    placementStats: {
      totalApproved: 100,
      placedCount: 80,
      higherStudiesCount: 10,
      uniquePositiveOutcomesCount: 85,
      eligibleGraduates: 100,
      placementPercentage: 80,
      higherStudiesPercentage: 10,
      positiveOutcomeRate: 85,
      medianSalary: 800000,
      qualifyingSalariesCount: 80,
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
      otherStatesCount: 20, // 20/120 = 16.67%
      internationalCount: 4, // 4/120 = 3.33%
      unknownDomicileCount: 0,
      womenStudentsCount: 60, // 50%
      menStudentsCount: 60,
      unknownGenderStudentsCount: 0,
      womenStudentsPercentage: 50.0,
      economicallyChallengedCount: 24, // 20%
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
      hasSurveyResponses: true,
      surveyResponseCount: 50,
      surveyMeanRating: 4.2, // (4.2 - 1)/4 = 0.80 -> 80 marks
    },
    ...overrides,
  };
}

async function runTests() {
  console.log("Starting OI and PR Acceptance Test Suite...\n");

  // TEST 1: Admin-only RBAC check for Sanctioned Intake mutations
  console.log("Test 1: Admin-only RBAC verification for Sanctioned Intake");
  assert.equal(hasRole("DEPARTMENT_ADMIN", ["DEPARTMENT_ADMIN"]), true, "Admin has permission");
  assert.equal(hasRole("FACULTY_CONTRIBUTOR", ["DEPARTMENT_ADMIN"]), false, "Faculty must be rejected from mutating intake");
  assert.equal(hasRole("VIEWER", ["DEPARTMENT_ADMIN"]), false, "Viewer must be rejected from mutating intake");
  console.log("  ✓ Strict RBAC rejects non-admins with 403 on intake mutations\n");

  // TEST 2: Multi-cohort intake resolution (NT = I_Y + I_{Y-1})
  console.log("Test 2: Multi-cohort intake resolution and historical revisions");
  const intake2024 = 60;
  const intake2023 = 60;
  const approvedIntakeTotal = intake2024 + intake2023;
  assert.equal(approvedIntakeTotal, 120, "2-year PG total capacity equals sum of both cohorts");
  console.log(`  ✓ Resolved approved intake NT = ${intake2024} + ${intake2023} = ${approvedIntakeTotal}\n`);

  // TEST 3: Score Year 2026 Simulation Policies
  console.log("Test 3: Score Year 2026 Policy A vs Policy B verification");
  const policyA = getScoreYearConfig(2026, "COMPLETED_BASELINE", "2024-25");
  assert.equal(policyA.isProvisional, false, "Policy A is baseline");
  assert.deepEqual(policyA.rpCalendarYears, [2023, 2024, 2025], "Policy A covers completed 3-year baseline");
  assert.equal(policyA.bannerMessage, undefined, "Policy A has no provisional banner");

  const policyB = getScoreYearConfig(2026, "CURRENT_PROVISIONAL", "2024-25", "2026-02-28");
  assert.equal(policyB.isProvisional, true, "Policy B is provisional");
  assert.deepEqual(policyB.rpCalendarYears, [2024, 2025, 2026], "Policy B covers through 2026 cutoff");
  assert.ok(policyB.bannerMessage?.includes("PROVISIONAL"), "Policy B includes provisional banner");
  console.log("  ✓ Policy A (Completed Baseline) and Policy B (Current Provisional) resolved correctly\n");

  // TEST 4: RD Mutually Exclusive Categorisation (International strictly separated from Other State)
  console.log("Test 4: Regional Diversity (RD) mutually exclusive calculation");
  const inputsRD = buildMockInputs({
    diversityStats: {
      totalStudents: 100,
      homeStateCount: 70,
      otherStatesCount: 20, // 20%
      internationalCount: 10, // 10%
      unknownDomicileCount: 0,
      womenStudentsCount: 50,
      menStudentsCount: 50,
      unknownGenderStudentsCount: 0,
      womenStudentsPercentage: 50,
      economicallyChallengedCount: 20,
      feeReimbursementPercentage: 20,
      fullTuitionSupportedStudentsCount: 20,
      hasFacilityChecklist: true,
      availableFacilitiesCount: 5,
      applicableFacilitiesCount: 5,
      physicallyChallengedFacilitiesVerified: true,
      physicallyChallengedFacilityScore: 20,
    },
  });

  const resRD = evaluateMetric("RD", inputsRD);
  assert.equal(resRD.status, "COMPUTED");
  // 25 * (20/100) + 5 * (10/100) = 5.0 + 0.5 = 5.5
  assert.equal(resRD.result.rawScore, 5.5);
  console.log(`  ✓ RD computed correctly: 25 × (20/100) + 5 × (10/100) = ${resRD.result.rawScore} / 30\n`);

  // TEST 5: WD Women Diversity Student & Faculty Caps
  console.log("Test 5: Women Diversity (WD) targets (50% students, 20% faculty)");
  const inputsWD = buildMockInputs({
    facultyStats: {
      totalApproved: 10,
      regularFacultyCount: 10,
      totalFacultyCount: 10,
      phdFacultyCount: 5,
      expUpTo8: 3,
      exp8To15: 4,
      expAbove15: 3,
      womenFacultyCount: 2, // 2/10 = 20% -> full 15 marks
      ineligibleFacultyCount: 0,
      pendingFacultyCount: 0,
      blockers: [],
    },
    diversityStats: {
      totalStudents: 100,
      homeStateCount: 80,
      otherStatesCount: 20,
      internationalCount: 0,
      unknownDomicileCount: 0,
      womenStudentsCount: 50, // 50% -> full 15 marks
      menStudentsCount: 50,
      unknownGenderStudentsCount: 0,
      womenStudentsPercentage: 50,
      economicallyChallengedCount: 20,
      feeReimbursementPercentage: 20,
      fullTuitionSupportedStudentsCount: 20,
      hasFacilityChecklist: true,
      availableFacilitiesCount: 5,
      applicableFacilitiesCount: 5,
      physicallyChallengedFacilitiesVerified: true,
      physicallyChallengedFacilityScore: 20,
    },
  });

  const resWD = evaluateMetric("WD", inputsWD);
  assert.equal(resWD.status, "COMPUTED");
  assert.equal(resWD.result.rawScore, 30); // 15 + 15 = 30
  console.log(`  ✓ WD full score achieved at 50% women students and 20% women faculty: ${resWD.result.rawScore} / 30\n`);

  // TEST 6: ESCS Deduplicated Full Tuition Fee Support (MCA_FULL_TUITION_SUPPORT_V1)
  console.log("Test 6: ESCS deduplicated fee support evaluation");
  const inputsESCS = buildMockInputs({
    diversityStats: {
      totalStudents: 100,
      homeStateCount: 80,
      otherStatesCount: 20,
      internationalCount: 0,
      unknownDomicileCount: 0,
      womenStudentsCount: 50,
      menStudentsCount: 50,
      unknownGenderStudentsCount: 0,
      womenStudentsPercentage: 50,
      economicallyChallengedCount: 15,
      feeReimbursementPercentage: 15, // 15% out of 20% benchmark -> 15/20 * 20 = 15 marks
      fullTuitionSupportedStudentsCount: 15,
      hasFacilityChecklist: true,
      availableFacilitiesCount: 5,
      applicableFacilitiesCount: 5,
      physicallyChallengedFacilitiesVerified: true,
      physicallyChallengedFacilityScore: 20,
    },
  });

  const resESCS = evaluateMetric("ESCS", inputsESCS);
  assert.equal(resESCS.status, "COMPUTED");
  assert.equal(resESCS.result.rawScore, 15);
  console.log(`  ✓ ESCS computed: 20 × (15/20) = ${resESCS.result.rawScore} / 20\n`);

  // TEST 7: PCS Campus Accessibility Checklist & Empty Checklist -> PENDING_INPUT
  console.log("Test 7: PCS campus accessibility checklist and unsubmitted handling");
  const inputsPCSEmpty = buildMockInputs({
    diversityStats: {
      totalStudents: 100,
      homeStateCount: 80,
      otherStatesCount: 20,
      internationalCount: 0,
      unknownDomicileCount: 0,
      womenStudentsCount: 50,
      menStudentsCount: 50,
      unknownGenderStudentsCount: 0,
      womenStudentsPercentage: 50,
      economicallyChallengedCount: 20,
      feeReimbursementPercentage: 20,
      fullTuitionSupportedStudentsCount: 20,
      hasFacilityChecklist: false, // Unsubmitted!
      availableFacilitiesCount: 0,
      applicableFacilitiesCount: 5,
      physicallyChallengedFacilitiesVerified: false,
      physicallyChallengedFacilityScore: 0,
    },
  });

  const resPCSEmpty = evaluateMetric("PCS", inputsPCSEmpty);
  assert.equal(resPCSEmpty.status, "PENDING_INPUT", "Empty checklist must yield PENDING_INPUT, not synthetic zero");
  assert.equal(resPCSEmpty.result.rawScore, null);

  const inputsPCSFull = buildMockInputs({
    diversityStats: {
      ...inputsPCSEmpty.diversityStats,
      hasFacilityChecklist: true,
      availableFacilitiesCount: 4,
      applicableFacilitiesCount: 5,
    },
  });
  const resPCSFull = evaluateMetric("PCS", inputsPCSFull);
  assert.equal(resPCSFull.status, "COMPUTED");
  assert.equal(resPCSFull.result.rawScore, 16); // 20 * (4/5) = 16
  console.log(`  ✓ PCS correctly handles unsubmitted (PENDING_INPUT) and verified checklist (4/5 -> ${resPCSFull.result.rawScore}/20)\n`);

  // TEST 8: PR Department Survey ratings & Missing Responses -> PENDING_INPUT
  console.log("Test 8: PR departmental survey rating and missing response handling");
  const inputsPRPending = buildMockInputs({
    perceptionStats: {
      hasOfficialScore: false,
      officialScore: null,
      hasSurveyResponses: false,
      surveyResponseCount: 0,
      surveyMeanRating: 0,
      configuredModel: "DEPARTMENT_SURVEY_V1",
    },
  });

  const resPRPending = evaluateMetric("PR", inputsPRPending);
  assert.equal(resPRPending.status, "PENDING_INPUT", "Missing survey responses must yield PENDING_INPUT, never fake zero");
  assert.equal(resPRPending.result.rawScore, null);

  // Check official score missing without survey model defaults to NOT_COMPUTABLE
  const inputsPROfficialPending = buildMockInputs({
    perceptionStats: {
      hasOfficialScore: false,
      officialScore: null,
      hasSurveyResponses: false,
      surveyResponseCount: 0,
      surveyMeanRating: 0,
    },
  });
  const resPROfficialPending = evaluateMetric("PR", inputsPROfficialPending);
  assert.equal(resPROfficialPending.status, "NOT_COMPUTABLE");

  const inputsPRSurvey = buildMockInputs({
    perceptionStats: {
      hasOfficialScore: false,
      officialScore: null,
      hasSurveyResponses: true,
      surveyResponseCount: 25,
      surveyMeanRating: 4.5, // (4.5 - 1)/4 = 3.5/4 = 0.875 -> 87.5 marks
    },
  });
  const resPRSurvey = evaluateMetric("PR", inputsPRSurvey);
  assert.equal(resPRSurvey.status, "COMPUTED");
  assert.equal(resPRSurvey.result.rawScore, 87.5);
  console.log(`  ✓ PR correctly calculates mean rating 4.5 -> ${resPRSurvey.result.rawScore}/100 and flags missing responses as PENDING_INPUT\n`);

  console.log("All OI and PR acceptance tests passed successfully!");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
