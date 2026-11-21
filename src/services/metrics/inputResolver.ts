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
import { DepartmentConfig } from "@/models/DepartmentConfig";
import { SanctionedIntake } from "@/models/SanctionedIntake";
import { DoctoralEnrolmentStatement } from "@/models/DoctoralEnrolmentStatement";
import { FacultyReportingFact } from "@/models/FacultyReportingFact";
import { ZeroActivityDeclaration } from "@/models/ZeroActivityDeclaration";
import { DoctoralAward } from "@/models/DoctoralAward";
import {
  getRPReportingWindow,
  getGOReportingWindow,
  isPublicationInWindow,
  isDateInWindow,
  isFinancialYearInWindow,
} from "@/lib/reportingWindow";

export interface ResolvedMetricInputs {
  academicYear: string;
  department: "MCA";
  rawSnapshot: Record<string, any>;

  // TLR inputs
  studentStats: {
    totalApproved: number;
    approvedIntake: number; // NT: total sanctioned approved capacity
    enrolledStudents: number; // NE: total enrolled students
    phdEnrolled: number; // NP: total doctoral students
    isExplicitZeroDeclared: boolean;
    intakeSource: "SANCTIONED_INTAKE_RECORDS" | "DEPARTMENT_CONFIG_FALLBACK";
    pendingStudentsCount: number;
    blockers: string[];
  };
  facultyStats: {
    totalApproved: number;
    regularFacultyCount: number; // F: eligible regular faculty who taught both semesters
    totalFacultyCount: number;
    phdFacultyCount: number;
    expUpTo8: number;
    exp8To15: number;
    expAbove15: number;
    womenFacultyCount: number;
    ineligibleFacultyCount: number;
    pendingFacultyCount: number;
    blockers: string[];
  };
  financeStats: {
    totalApproved: number;
    capitalExpenditureTotal: number;
    operationalExpenditureTotal: number;
    capitalExpenditurePerStudent: number; // BC
    operationalExpenditurePerStudent: number; // BO
    reportingYearsCount: number;
    reportingYears: string[];
    excludedExpensesTotal: number;
    pendingFinanceCount: number;
    blockers: string[];
  };

  // RP inputs
  publicationStats: {
    totalApproved: number;
    inWindowPublicationsCount: number;
    verifiedPublicationsCount: number;
    hasThirdPartySource: boolean;
    actualCitationsTotal: number;
    hasCitationData: boolean;
    citationCoveragePercent: number;
    distinctQ1Q2Count: number;
    hasQuartileData: boolean;
    quartileCoveragePercent: number;
    isZeroDeclared: boolean;
    conflictWithZeroDeclaration: boolean;
    reportingWindowDescription: string;
    configuredPubTargetPerFaculty?: number;
    configuredCitationTargetWindow?: number;
    configuredQpModel?: string;
  };
  patentStats: {
    totalApproved: number;
    patentsGranted3Y: number;
    patentsPublished3Y: number;
    isZeroGrantedDeclared: boolean;
    isZeroPublishedDeclared: boolean;
    conflictWithZeroDeclaration: boolean;
    reportingWindowDescription: string;
    configuredPatentsPublishedTarget?: number;
    configuredPatentsGrantedTarget?: number;
  };
  projectStats: {
    totalApproved: number;
    researchFundingTotal: number;
    consultancyTotal: number;
    researchFundingAnnualPerFaculty: number;
    consultancyAnnualPerFaculty: number;
    legacyUnassignedCount: number;
    isZeroResearchDeclared: boolean;
    isZeroConsultancyDeclared: boolean;
    conflictWithZeroDeclaration: boolean;
    reportingWindowDescription: string;
    facultyDenominator: number;
    facultyDenominatorMissing: boolean;
    configuredResearchTargetPerFacultyYear?: number;
    configuredConsultancyTargetPerFacultyYear?: number;
  };

  // GO inputs
  graduationStats: {
    totalApproved: number;
    eligibleGraduates: number;
    graduatesInStipulatedTime: number;
    stipulatedGraduationRate: number; // percentage
    cohortsCovered: string[];
  };
  placementStats: {
    totalApproved: number;
    placedCount: number;
    higherStudiesCount: number;
    uniquePositiveOutcomesCount: number;
    eligibleGraduates: number;
    placementPercentage: number;
    higherStudiesPercentage: number;
    positiveOutcomeRate: number;
    medianSalary: number;
    qualifyingSalariesCount: number;
    isZeroPlacementsDeclared: boolean;
    isZeroHigherStudiesDeclared: boolean;
    hasZeroPlacementsConflict: boolean;
    hasZeroHigherStudiesConflict: boolean;
    configuredSalaryTarget: number;
    configuredGphModel: string;
  };
  doctoralAwardStats: {
    totalApproved: number;
    totalAwardsInWindow: number;
    avgAwardsPerYear: number;
    isZeroDoctoralDeclared: boolean;
    hasZeroDoctoralConflict: boolean;
    configuredPhdTargetPerYear: number;
  };

  // OI inputs
  diversityStats: {
    totalStudents: number;
    homeStateCount: number;
    otherStatesCount: number;
    internationalCount: number;
    unknownDomicileCount: number;
    womenStudentsCount: number;
    menStudentsCount: number;
    unknownGenderStudentsCount: number;
    womenStudentsPercentage: number;
    economicallyChallengedCount: number;
    feeReimbursementPercentage: number;
    fullTuitionSupportedStudentsCount: number;
    hasFacilityChecklist: boolean;
    availableFacilitiesCount: number;
    applicableFacilitiesCount: number;
    physicallyChallengedFacilitiesVerified: boolean;
    physicallyChallengedFacilityScore: number; // 0 to 20
  };

  // PR inputs
  perceptionStats: {
    hasOfficialScore: boolean;
    officialScore: number | null;
    hasSurveyResponses: boolean;
    surveyResponseCount: number;
    surveyMeanRating: number;
    configuredModel?: string;
  };
}

/**
 * Resolves all inputs strictly from APPROVED records for the MCA department.
 * Implements Rule 4: Never estimate missing values.
 */
export async function resolveApprovedMetricInputs(
  academicYear: string
): Promise<ResolvedMetricInputs> {
  const department = "MCA";
  // Rule 4: Include RECORDED and legacy APPROVED records in calculation snapshots
  const activeRecordQuery = { department, status: { $in: ["RECORDED", "APPROVED"] } };
  const pendingQuery = { department, status: { $in: ["DRAFT", "SUBMITTED", "CORRECTION_REQUESTED"] } };

  // 1. Fetch records and institutional configuration in parallel
  const [
    deptConfig,
    sanctionedIntakeRecords,
    doctoralStatements,
    facultyReportingFacts,
    students,
    pendingStudentsCount,
    faculty,
    pendingFacultyCount,
    finance,
    pendingFinanceCount,
    publications,
    patents,
    projects,
    gradOutcomes,
    placements,
    doctoralAwards,
    outreach,
    perceptions,
    zeroDeclarationsDocs,
  ] = await Promise.all([
    DepartmentConfig.findOne({ department }).lean(),
    SanctionedIntake.find(activeRecordQuery).sort({ intakeYear: -1 }).lean(),
    DoctoralEnrolmentStatement.findOne({ department, academicYear, status: { $in: ["RECORDED", "APPROVED"] } }).lean(),
    FacultyReportingFact.find({ department, academicYear, status: { $in: ["RECORDED", "APPROVED"] } }).lean(),
    Student.find(activeRecordQuery).lean(),
    Student.countDocuments(pendingQuery),
    Faculty.find(activeRecordQuery).lean(),
    Faculty.countDocuments(pendingQuery),
    FinanceRecord.find(activeRecordQuery).lean(),
    FinanceRecord.countDocuments(pendingQuery),
    Publication.find(activeRecordQuery).lean(),
    Patent.find(activeRecordQuery).lean(),
    ProjectConsultancy.find(activeRecordQuery).lean(),
    GraduationOutcome.find(activeRecordQuery).lean(),
    PlacementRecord.find(activeRecordQuery).lean(),
    DoctoralAward.find(activeRecordQuery).lean(),
    OutreachRecord.find(activeRecordQuery).lean(),
    PerceptionRecord.find(activeRecordQuery).lean(),
    ZeroActivityDeclaration.find({ department, academicYear }).lean(),
  ]);

  const zeroDeclarations = new Set<string>(
    (zeroDeclarationsDocs || []).map((d: any) => d.activityType)
  );
  const rpWindow = getRPReportingWindow(academicYear);

  // 2. Student Analytics (SS, RD, WD, FSR)
  const studentBlockers: string[] = [];
  let approvedIntake = 0;
  let intakeSource: "SANCTIONED_INTAKE_RECORDS" | "DEPARTMENT_CONFIG_FALLBACK" = "DEPARTMENT_CONFIG_FALLBACK";

  const baseYearMatch = academicYear.match(/^(\d{4})/);
  const baseYear = baseYearMatch ? parseInt(baseYearMatch[1], 10) : 2024;

  if (sanctionedIntakeRecords.length > 0) {
    intakeSource = "SANCTIONED_INTAKE_RECORDS";
    // For MCA 2-year PG, match the 2 active cohorts: intakeYear (1st yr) and intakeYear - 1 (2nd yr)
    const matchedFirstYear = sanctionedIntakeRecords.find((r) => r.intakeYear === baseYear);
    const matchedSecondYear = sanctionedIntakeRecords.find((r) => r.intakeYear === baseYear - 1);

    if (matchedFirstYear && matchedSecondYear) {
      approvedIntake = (matchedFirstYear.approvedIntake || 0) + (matchedSecondYear.approvedIntake || 0);
    } else {
      // In MCA standard 2-year cohort, sum latest 2 cohorts active in the reporting year
      const activeCohorts = sanctionedIntakeRecords.slice(0, 2);
      approvedIntake = activeCohorts.reduce((acc, r) => acc + (r.approvedIntake || 0), 0);
    }
  } else {
    approvedIntake = deptConfig?.sanctionedIntake || 120;
    studentBlockers.push("SANCTIONED_INTAKE_STATIC_FALLBACK: Using DepartmentConfig static intake instead of approved cohort-wise EOA records");
  }

  const totalApprovedStudents = students.length;
  if (totalApprovedStudents === 0) {
    if (pendingStudentsCount > 0) {
      studentBlockers.push(`STUDENTS_PENDING_APPROVAL: ${pendingStudentsCount} student records submitted awaiting verification`);
    } else {
      studentBlockers.push("MISSING_INPUT: Zero approved student records found in repository");
    }
  }

  let enrolledStudents = 0; // NT: enrolled PG students
  let phdEnrolled = 0;      // NP: enrolled doctoral students
  let isExplicitZeroDeclared = false;

  if (doctoralStatements) {
    phdEnrolled = doctoralStatements.enrolledDoctoralCount || 0;
    isExplicitZeroDeclared = doctoralStatements.isExplicitZero;
  }

  let otherStatesCount = 0;
  let internationalCount = 0;
  let homeStateCount = 0;
  let unknownDomicileCount = 0;
  let womenStudentsCount = 0;
  let menStudentsCount = 0;
  let unknownGenderStudentsCount = 0;

  for (const s of students) {
    const prog = (s.programme || "").toUpperCase();
    if (prog.includes("PHD") || prog.includes("DOCTOR")) {
      if (!doctoralStatements) phdEnrolled++;
    } else {
      enrolledStudents++;
    }

    const rawDom = (s.domicileType || (s as any).stateType || "").toString().toUpperCase();
    if (rawDom.includes("INT")) {
      internationalCount++;
    } else if (rawDom.includes("OTHER")) {
      otherStatesCount++;
    } else if (rawDom.includes("HOME") || (s as any).domicileState === "Karnataka" || (s as any).domicileState === deptConfig?.homeState) {
      homeStateCount++;
    } else if (!rawDom && !(s as any).domicileState) {
      unknownDomicileCount++;
    } else {
      homeStateCount++;
    }

    const g = (s.gender || "").toUpperCase();
    if (g === "FEMALE" || g === "F") womenStudentsCount++;
    else if (g === "MALE" || g === "M") menStudentsCount++;
    else unknownGenderStudentsCount++;
  }

  if (enrolledStudents === 0 && phdEnrolled === 0 && totalApprovedStudents > 0) {
    enrolledStudents = totalApprovedStudents;
  }

  const womenStudentsPercentage =
    totalApprovedStudents > 0
      ? Math.round((womenStudentsCount / totalApprovedStudents) * 1000) / 10
      : 0;

  // 3. Faculty Analytics (FSR, FQE, WD)
  const facultyBlockers: string[] = [];
  const totalApprovedFaculty = facultyReportingFacts.length > 0 ? facultyReportingFacts.length : faculty.length;
  let regularFacultyCount = 0; // F
  let phdFacultyCount = 0;
  let expUpTo8 = 0;
  let exp8To15 = 0;
  let expAbove15 = 0;
  let womenFacultyCount = 0;
  let ineligibleFacultyCount = 0;

  if (totalApprovedFaculty === 0) {
    if (pendingFacultyCount > 0) {
      facultyBlockers.push(`FACULTY_PENDING_APPROVAL: ${pendingFacultyCount} faculty records submitted awaiting verification`);
    } else {
      facultyBlockers.push("MISSING_INPUT: Zero approved faculty records found in repository");
    }
  }

  if (facultyReportingFacts.length > 0) {
    for (const fact of facultyReportingFacts) {
      if (fact.isEligibleForFSR) {
        regularFacultyCount++;
      } else {
        ineligibleFacultyCount++;
      }

      const qual = (fact.highestQualification || "").toUpperCase();
      if (fact.phdStatus === "AWARDED" || qual.includes("PHD") || qual.includes("PH.D")) {
        phdFacultyCount++;
      }

      if (fact.experienceBracket === "UP_TO_8") expUpTo8++;
      else if (fact.experienceBracket === "EIGHT_TO_15") exp8To15++;
      else expAbove15++;

      if ((fact as any).gender === "FEMALE") womenFacultyCount++;
    }
  } else {
    for (const f of faculty) {
      const isRegular = f.employmentType === "PERMANENT" || f.employmentType === "CONTRACT";
      const qual = (f.highestQualification || "").toUpperCase();
      const isEligibleDegree =
        qual.includes("PHD") ||
        qual.includes("PH.D") ||
        qual.includes("M.TECH") ||
        qual.includes("M.E") ||
        qual.includes("MCA") ||
        qual.includes("MASTER");

      if (isRegular && isEligibleDegree) {
        regularFacultyCount++;
      } else {
        ineligibleFacultyCount++;
      }

      if (f.phdStatus === "AWARDED" || qual.includes("PH.D") || qual.includes("PHD")) {
        phdFacultyCount++;
      }

      const exp = f.experienceYears || 0;
      if (exp <= 8) expUpTo8++;
      else if (exp <= 15) exp8To15++;
      else expAbove15++;

      if ((f as any).gender === "FEMALE") womenFacultyCount++;
    }
  }

  // 4. Finance Analytics (FRU)
  const financeBlockers: string[] = [];
  const totalApprovedFinance = finance.length;
  let capitalExpenditureTotal = 0;
  let operationalExpenditureTotal = 0;
  let excludedExpensesTotal = 0;

  if (totalApprovedFinance === 0) {
    if (pendingFinanceCount > 0) {
      financeBlockers.push(`FINANCE_PENDING_APPROVAL: ${pendingFinanceCount} finance records submitted awaiting verification`);
    } else {
      financeBlockers.push("MISSING_INPUT: Zero approved finance expenditure records found");
    }
  }

  // Prevent double counting: Partition by financial year and granularity
  const yearRecordsMap = new Map<string, typeof finance>();
  for (const fr of finance) {
    const fy = fr.financialYear || "UNKNOWN";
    if (!yearRecordsMap.has(fy)) {
      yearRecordsMap.set(fy, []);
    }
    yearRecordsMap.get(fy)!.push(fr);
  }

  const distinctYears = new Set<string>();

  for (const [fy, records] of yearRecordsMap.entries()) {
    if (fy !== "UNKNOWN") distinctYears.add(fy);

    // Sum excluded amounts for tracking
    for (const r of records) {
      if (r.isExcluded) {
        excludedExpensesTotal += (r.amountInINR || r.amount || 0);
      }
    }

    const nonExcluded = records.filter((r) => !r.isExcluded);

    // Check if there are ANNUAL_AGGREGATE records for this year
    const aggregates = nonExcluded.filter((r) => (r as any).granularity === "ANNUAL_AGGREGATE");
    const recordsToSum = aggregates.length > 0 ? aggregates : nonExcluded;

    for (const fr of recordsToSum) {
      const amt = fr.amountInINR || fr.amount || 0;
      if (fr.expenditureType === "CAPITAL") {
        capitalExpenditureTotal += amt;
      } else if (fr.expenditureType === "OPERATIONAL") {
        operationalExpenditureTotal += amt;
      }
    }
  }

  const reportingYears = Array.from(distinctYears);
  const reportingYearsCount = reportingYears.length;
  if (reportingYearsCount < 3 && totalApprovedFinance > 0) {
    financeBlockers.push(`INCOMPLETE_REPORTING_YEARS: NIRF requires 3 consecutive financial years; only ${reportingYearsCount} year(s) found (${reportingYears.join(", ")})`);
  }

  const yearsCount = Math.max(1, reportingYearsCount || 1);
  const totalStudentBody = enrolledStudents + phdEnrolled;
  const studentDenominator = Math.max(1, totalStudentBody);

  const annualCapital = capitalExpenditureTotal / yearsCount;
  const annualOperational = operationalExpenditureTotal / yearsCount;

  const capitalExpenditurePerStudent = Math.round(
    annualCapital / studentDenominator
  );
  const operationalExpenditurePerStudent = Math.round(
    annualOperational / studentDenominator
  );

  // 5. Research & IPR Analytics (PU, QP, IPR, FPPP)
  // —— Publications ——
  const totalApprovedPublications = publications.length;
  let inWindowPublicationsCount = 0;
  let verifiedPublicationsCount = 0;
  let hasThirdPartySource = false;

  // Citation tracking — only sum publications that HAVE a non-null citationCount
  let actualCitationsTotal = 0;
  let citationCoveredCount = 0;  // pubs with non-null citationCount (including 0)

  // Q1/Q2 counting — deduplicate by pub _id (a paper is counted once even with multiple quartile entries)
  const distinctQ1Q2PubIds = new Set<string>();
  let quartileCoveredCount = 0;  // pubs with at least one quartile entry

  for (const pub of publications) {
    if ((pub as any).retractionStatus === true || (pub as any).retractionStatus === "RETRACTED") {
      continue;
    }

    const isInWindow = isPublicationInWindow((pub as any).publicationYear, rpWindow);
    if (isInWindow) {
      inWindowPublicationsCount++;
    }

    const idx = (pub.indexing || "").toUpperCase();
    const hasIndexedSource =
      idx.includes("SCOPUS") ||
      idx.includes("WEB_OF_SCIENCE") ||
      idx.includes("UGC_CARE") ||
      (pub as any).indexingList?.some((il: any) =>
        ["SCOPUS", "WEB_OF_SCIENCE", "UGC_CARE"].includes(il.sourceName)
      );

    if (hasIndexedSource) {
      verifiedPublicationsCount++;
    }
    if (pub.doi || (pub as any).normalizedDoi || (pub as any).indexingList?.length > 0) {
      hasThirdPartySource = true;
    }

    // Citation aggregation — only for in-window pubs with explicit citationCount (null = unknown)
    if (isInWindow) {
      const cc = (pub as any).citationCount;
      if (cc !== null && cc !== undefined && typeof cc === "number") {
        actualCitationsTotal += cc;
        citationCoveredCount++;
      }

      // Quartile tracking — count pub once if it has any Q1/Q2 quartile entry
      const pubIdStr = String((pub as any)._id || "");
      const quartileEntries: any[] = (pub as any).quartiles || [];
      if (quartileEntries.length > 0) {
        quartileCoveredCount++;
        const hasQ1Q2 = quartileEntries.some((q: any) =>
          q.quartile === "Q1" || q.quartile === "Q2"
        );
        if (hasQ1Q2 && pubIdStr) {
          distinctQ1Q2PubIds.add(pubIdStr);
        }
      }
    }
  }

  const distinctQ1Q2Count = distinctQ1Q2PubIds.size;
  const hasCitationData = citationCoveredCount > 0;
  const citationCoveragePercent = inWindowPublicationsCount > 0
    ? Math.round((citationCoveredCount / inWindowPublicationsCount) * 1000) / 10
    : 0;
  const hasQuartileData = quartileCoveredCount > 0;
  const quartileCoveragePercent = inWindowPublicationsCount > 0
    ? Math.round((quartileCoveredCount / inWindowPublicationsCount) * 1000) / 10
    : 0;

  // Zero declaration conflict check for publications
  const pubZeroDeclared = zeroDeclarations.has("PUBLICATIONS");
  const pubConflictWithZero = pubZeroDeclared && inWindowPublicationsCount > 0;

  // —— Patents ——
  const totalApprovedPatents = patents.length;
  let patentsGranted3Y = 0;
  let patentsPublished3Y = 0;

  // Deduplicate by (jurisdiction, normalizedApplicationNumber) — same app# in different jurisdictions = distinct
  const countedGrantedKeys = new Set<string>();
  const countedPublishedKeys = new Set<string>();

  for (const p of patents) {
    const appNum = ((p as any).normalizedApplicationNumber || p.applicationNumber || "").toLowerCase().trim();
    const jurisdiction = ((p as any).jurisdiction || "UNKNOWN").toUpperCase();
    const dedupeKey = `${jurisdiction}::${appNum}`;

    // 1. PG: Patents Granted
    // Evaluates grant event: grantDate in window, or if status is GRANTED and no date specified
    const hasGrantDate = !!(p as any).grantDate;
    const isGrantedStatus = (p as any).legalStatus === "GRANTED" || p.patentStatus === "GRANTED";
    const qualifiesPG = (hasGrantDate && isDateInWindow((p as any).grantDate, rpWindow)) ||
      (!hasGrantDate && isGrantedStatus);

    if (qualifiesPG && !countedGrantedKeys.has(dedupeKey)) {
      countedGrantedKeys.add(dedupeKey);
      patentsGranted3Y++;
    }

    // 2. PP: Patents Published
    // Evaluates publication event: publicationDate in window, or status PUBLISHED (without date)
    // CRITICAL: Filed-only patents (legalStatus === 'FILED' or filingDate only) MUST NOT contribute to PP!
    const hasPubDate = !!(p as any).publicationDate;
    const isPublishedStatus = (p as any).legalStatus === "PUBLISHED" || p.patentStatus === "PUBLISHED";
    const qualifiesPP = (hasPubDate && isDateInWindow((p as any).publicationDate, rpWindow)) ||
      (!hasPubDate && isPublishedStatus);

    if (qualifiesPP && !countedPublishedKeys.has(dedupeKey)) {
      countedPublishedKeys.add(dedupeKey);
      patentsPublished3Y++;
    }
  }

  const isZeroGrantedDeclared = zeroDeclarations.has("PATENTS_GRANTED");
  const isZeroPublishedDeclared = zeroDeclarations.has("PATENTS_PUBLISHED");
  const patentConflictWithZero =
    (isZeroGrantedDeclared && patentsGranted3Y > 0) ||
    (isZeroPublishedDeclared && patentsPublished3Y > 0);

  // —— Projects & Consultancy ——
  const totalApprovedProjects = projects.length;
  let researchFundingTotal = 0;
  let consultancyTotal = 0;
  let legacyUnassignedCount = 0;

  for (const prj of projects) {
    // Aggregate only receipt-confirmed amounts, never fall back to sanctionedAmount
    const receipts: any[] = (prj as any).receipts || [];
    let prjReceived = 0;
    let hasReceiptData = receipts.length > 0;

    if (hasReceiptData) {
      for (const r of receipts) {
        const inWindow =
          (r.receiptDate && isDateInWindow(r.receiptDate, rpWindow)) ||
          (r.financialYear && isFinancialYearInWindow(r.financialYear, rpWindow));
        if (inWindow) {
          const alloc = typeof r.mcaAllocationPercentage === "number" ? r.mcaAllocationPercentage / 100 : 1.0;
          prjReceived += (r.amount || 0) * alloc;
        }
      }
    } else {
      // Legacy record: use receivedAmount if set (never sanctionedAmount fallback)
      const legacyFY: string | undefined = (prj as any).legacyReceiptYear;
      const legacyInWindow = legacyFY
        ? isFinancialYearInWindow(legacyFY, rpWindow)
        : false; // Cannot determine window without date — flag as legacy unassigned
      if (legacyInWindow && prj.receivedAmount) {
        prjReceived = prj.receivedAmount;
      } else if (!legacyFY && prj.receivedAmount && prj.receivedAmount > 0) {
        // Legacy with receivedAmount but no year info — cannot window-filter, count conservatively
        legacyUnassignedCount++;
        prjReceived = prj.receivedAmount;
      }
    }

    if (prj.type === "SPONSORED_PROJECT") {
      researchFundingTotal += prjReceived;
    } else if (prj.type === "CONSULTANCY") {
      consultancyTotal += prjReceived;
    }
  }

  const facultyDenominator = Math.max(1, regularFacultyCount);
  const facultyDenominatorMissing = regularFacultyCount <= 0;
  const N = rpWindow.yearsCount; // 3

  // Annual per-faculty figures (divide by N=3 and faculty count F)
  const researchFundingAnnualPerFaculty = Math.round(researchFundingTotal / N / facultyDenominator);
  const consultancyAnnualPerFaculty = Math.round(consultancyTotal / N / facultyDenominator);

  // Keep backward-compatible names for existing rawSnapshot usage
  const researchFundingPerFaculty = researchFundingAnnualPerFaculty;
  const consultancyPerFaculty = consultancyAnnualPerFaculty;

  const isZeroResearchDeclared = zeroDeclarations.has("RESEARCH_FUNDING");
  const isZeroConsultancyDeclared = zeroDeclarations.has("CONSULTANCY");
  const projectConflictWithZero =
    (isZeroResearchDeclared && researchFundingTotal > 0) ||
    (isZeroConsultancyDeclared && consultancyTotal > 0);

  // 6. Graduation & Placement Analytics (GPH, GUE, GMS, GPHD)
  const goWindow = getGOReportingWindow(academicYear);
  const totalApprovedGradOutcomes = gradOutcomes.length;
  let totalEligibleGraduates = 0;
  let totalGraduatesInStipulatedTime = 0;
  let aggregateHigherStudies = 0;
  const cohortsCoveredSet = new Set<string>();

  for (const go of gradOutcomes) {
    totalEligibleGraduates += go.eligibleGraduates || 0;
    totalGraduatesInStipulatedTime += go.graduatesInStipulatedTime || 0;
    if (go.higherStudiesCount) aggregateHigherStudies += go.higherStudiesCount;
    if (go.batch) cohortsCoveredSet.add(go.batch);
  }

  const stipulatedGraduationRate =
    totalEligibleGraduates > 0
      ? Math.round((totalGraduatesInStipulatedTime / totalEligibleGraduates) * 1000) / 10
      : 0;

  // Placements & Higher Studies Deduplication
  // Each student must be uniquely counted in positive outcomes
  const totalApprovedPlacements = placements.length;
  const studentOutcomeMap = new Map<
    string,
    {
      placed: boolean;
      higherStudies: boolean;
      highestCtc: number;
      offersCount: number;
    }
  >();

  for (const pl of placements) {
    const studentRef = (pl.studentReference || pl._id.toString()).trim();
    if (!studentOutcomeMap.has(studentRef)) {
      studentOutcomeMap.set(studentRef, {
        placed: false,
        higherStudies: false,
        highestCtc: 0,
        offersCount: 0,
      });
    }
    const student = studentOutcomeMap.get(studentRef)!;

    // Check if placement offer is valid (accepted/joined and positive CTC)
    const isAcceptedOffer = pl.joiningStatus !== "DECLINED";
    if (isAcceptedOffer && pl.ctc && pl.ctc > 0) {
      student.placed = true;
      student.highestCtc = Math.max(student.highestCtc, pl.ctc);
      student.offersCount++;
    }

    // Check higher studies flag on placement record
    const hsStatus = (pl.higherStudiesStatus || "").toUpperCase();
    if (hsStatus === "ADMITTED" || hsStatus === "PURSUING" || hsStatus === "YES") {
      student.higherStudies = true;
    }
  }

  let placedCount = 0;
  let higherStudiesCount = 0;
  let uniquePositiveOutcomesCount = 0;
  const qualifyingSalaries: number[] = [];

  for (const [, student] of studentOutcomeMap.entries()) {
    if (student.placed) {
      placedCount++;
      if (student.highestCtc > 0) {
        qualifyingSalaries.push(student.highestCtc);
      }
    }
    if (student.higherStudies) {
      higherStudiesCount++;
    }
    if (student.placed || student.higherStudies) {
      uniquePositiveOutcomesCount++;
    }
  }

  // If higher studies were only entered via aggregate GraduationOutcome:
  if (higherStudiesCount === 0 && aggregateHigherStudies > 0) {
    higherStudiesCount = aggregateHigherStudies;
    uniquePositiveOutcomesCount += aggregateHigherStudies;
  }

  const placementEligible = totalEligibleGraduates > 0 ? totalEligibleGraduates : Math.max(1, uniquePositiveOutcomesCount);
  const placementPercentage =
    placementEligible > 0 ? Math.round((placedCount / placementEligible) * 1000) / 10 : 0;
  const higherStudiesPercentage =
    placementEligible > 0 ? Math.round((higherStudiesCount / placementEligible) * 1000) / 10 : 0;
  const positiveOutcomeRate =
    placementEligible > 0 ? Math.round((uniquePositiveOutcomesCount / placementEligible) * 1000) / 10 : 0;

  // True median salary
  let medianSalary = 0;
  if (qualifyingSalaries.length > 0) {
    qualifyingSalaries.sort((a, b) => a - b);
    const mid = Math.floor(qualifyingSalaries.length / 2);
    medianSalary =
      qualifyingSalaries.length % 2 !== 0
        ? qualifyingSalaries[mid]
        : Math.round((qualifyingSalaries[mid - 1] + qualifyingSalaries[mid]) / 2);
  }

  // Doctoral Awards (GPHD)
  const totalApprovedDoctoralAwards = doctoralAwards.length;
  let doctoralAwardsInWindow = 0;
  for (const doc of doctoralAwards) {
    const yr = doc.awardYear || (doc.awardDate ? new Date(doc.awardDate).getFullYear() : null);
    if (yr && yr >= rpWindow.startCalendarYear && yr <= rpWindow.endCalendarYear) {
      doctoralAwardsInWindow++;
    } else if (doc.awardDate && isDateInWindow(doc.awardDate, rpWindow)) {
      doctoralAwardsInWindow++;
    }
  }
  const avgDoctoralAwardsPerYear = Math.round((doctoralAwardsInWindow / 3) * 100) / 100;

  // Zero Declarations for GO
  const isZeroPlacementsDeclared = zeroDeclarations.has("PLACEMENTS");
  const isZeroHigherStudiesDeclared = zeroDeclarations.has("HIGHER_STUDIES");
  const isZeroDoctoralDeclared = zeroDeclarations.has("DOCTORAL_AWARDS");

  const hasZeroPlacementsConflict = isZeroPlacementsDeclared && placedCount > 0;
  const hasZeroHigherStudiesConflict = isZeroHigherStudiesDeclared && higherStudiesCount > 0;
  const hasZeroDoctoralConflict = isZeroDoctoralDeclared && doctoralAwardsInWindow > 0;

  // 7. Outreach Diversity (ESCS, PCS)
  const fullTuitionStudents = new Set<string>();
  let aggregateFeeSupportCount = 0;

  for (const s of students) {
    if ((s as any).tuitionFeeReimbursed === true) {
      fullTuitionStudents.add(s.studentId || (s as any).prn || s._id.toString());
    }
  }

  for (const o of outreach) {
    if (o.recordType === "FEE_SUPPORT") {
      if (o.studentReference && o.isFullTuitionSupport !== false) {
        fullTuitionStudents.add(o.studentReference);
      } else if (o.aggregateCount > 0) {
        aggregateFeeSupportCount += o.aggregateCount;
      }
    }
  }

  // Authoritative deduplication: Individual student records (from Student entity or Outreach studentReference)
  // are the primary authoritative source. Aggregate Outreach records are used only if individual count is 0.
  const fullTuitionSupportedStudentsCount =
    fullTuitionStudents.size > 0 ? fullTuitionStudents.size : aggregateFeeSupportCount;
  const economicallyChallengedCount = fullTuitionSupportedStudentsCount;
  const feeReimbursementPercentage =
    totalApprovedStudents > 0
      ? Math.round((fullTuitionSupportedStudentsCount / totalApprovedStudents) * 1000) / 10
      : 0;

  // PCS Campus Accessibility Checklist
  let hasFacilityChecklist = false;
  let availableFacilitiesCount = 0;
  let notApplicableFacilitiesCount = 0;
  const standardFacilityKeys = [
    "ramps_walkways",
    "lifts_elevators",
    "accessible_toilets",
    "assistive_tech_labs",
    "directional_signage",
  ];

  const accessibilityRecords = outreach.filter((o) => o.recordType === "ACCESSIBILITY");
  if (accessibilityRecords.length > 0) {
    hasFacilityChecklist = true;
    for (const rec of accessibilityRecords) {
      if (rec.facilityStatus === "AVAILABLE" || (rec.aggregateCount && rec.aggregateCount > 0)) {
        availableFacilitiesCount++;
      } else if (rec.facilityStatus === "NOT_APPLICABLE") {
        notApplicableFacilitiesCount++;
      }
    }
    if (accessibilityRecords.some((r) => r.aggregateCount && r.aggregateCount >= 20)) {
      availableFacilitiesCount = 5;
    }
  } else if (deptConfig?.facilityChecklist) {
    const chk = deptConfig.facilityChecklist;
    const hasAnyTrue = standardFacilityKeys.some((k) => Boolean((chk as any)[k]));
    if (hasAnyTrue) {
      hasFacilityChecklist = true;
      availableFacilitiesCount = standardFacilityKeys.filter((k) => Boolean((chk as any)[k])).length;
    }
  }

  const applicableFacilitiesCount = Math.max(1, 5 - notApplicableFacilitiesCount);
  const physicallyChallengedFacilityScore = hasFacilityChecklist
    ? Math.round((availableFacilitiesCount / applicableFacilitiesCount) * 20 * 100) / 100
    : 0;
  const physicallyChallengedFacilitiesVerified = hasFacilityChecklist && availableFacilitiesCount > 0;

  // 8. Perception (PR)
  let hasOfficialScore = false;
  let officialScore: number | null = null;
  const surveyRatings: number[] = [];

  for (const pr of perceptions) {
    if (pr.sourceType === "OFFICIAL_SCORE" && pr.score !== undefined && pr.score !== null) {
      hasOfficialScore = true;
      officialScore = pr.score;
    } else if (pr.rating !== undefined && pr.rating !== null && pr.rating >= 1 && pr.rating <= 5) {
      surveyRatings.push(pr.rating);
    } else if (pr.sourceType === "DEPARTMENT_SURVEY" && pr.score !== undefined && pr.score >= 1 && pr.score <= 5) {
      surveyRatings.push(pr.score);
    } else if (pr.sourceType === "INTERNAL_FEEDBACK" && pr.score !== undefined && pr.score >= 1 && pr.score <= 5) {
      surveyRatings.push(pr.score);
    }
  }

  const hasSurveyResponses = surveyRatings.length > 0;
  const surveyResponseCount = surveyRatings.length;
  const surveyMeanRating = hasSurveyResponses
    ? Math.round((surveyRatings.reduce((a, b) => a + b, 0) / surveyRatings.length) * 100) / 100
    : 0;

  // Build immutable snapshot object
  const rawSnapshot = {
    academicYear,
    department: "MCA",
    snapshotTimestamp: new Date().toISOString(),
    counts: {
      approvedStudents: totalApprovedStudents,
      approvedFaculty: totalApprovedFaculty,
      approvedFinance: totalApprovedFinance,
      approvedPublications: totalApprovedPublications,
      approvedPatents: totalApprovedPatents,
      approvedProjects: totalApprovedProjects,
      approvedGradOutcomes: totalApprovedGradOutcomes,
      approvedPlacements: totalApprovedPlacements,
      approvedOutreach: outreach.length,
      approvedPerception: perceptions.length,
    },
    metricsData: {
      enrolledStudents,
      approvedIntake,
      phdEnrolled,
      regularFacultyCount,
      phdFacultyCount,
      womenFacultyCount,
      womenStudentsCount,
      womenStudentsPercentage,
      otherStatesCount,
      internationalCount,
      capitalExpenditurePerStudent,
      operationalExpenditurePerStudent,
      patentsGranted3Y,
      patentsPublished3Y,
      inWindowPublicationsCount,
      actualCitationsTotal,
      distinctQ1Q2Count,
      researchFundingAnnualPerFaculty,
      consultancyAnnualPerFaculty,
      stipulatedGraduationRate,
      placementPercentage,
      higherStudiesPercentage,
      medianSalary,
      feeReimbursementPercentage,
      physicallyChallengedFacilityScore,
      hasOfficialScore,
      officialScore,
    },
  };

  return {
    academicYear,
    department: "MCA",
    rawSnapshot,
    studentStats: {
      totalApproved: totalApprovedStudents,
      approvedIntake,
      enrolledStudents,
      phdEnrolled,
      isExplicitZeroDeclared,
      intakeSource,
      pendingStudentsCount,
      blockers: studentBlockers,
    },
    facultyStats: {
      totalApproved: totalApprovedFaculty,
      regularFacultyCount,
      totalFacultyCount: faculty.length,
      phdFacultyCount,
      expUpTo8,
      exp8To15,
      expAbove15,
      womenFacultyCount,
      ineligibleFacultyCount,
      pendingFacultyCount,
      blockers: facultyBlockers,
    },
    financeStats: {
      totalApproved: totalApprovedFinance,
      capitalExpenditureTotal,
      operationalExpenditureTotal,
      capitalExpenditurePerStudent,
      operationalExpenditurePerStudent,
      reportingYearsCount,
      reportingYears,
      excludedExpensesTotal,
      pendingFinanceCount,
      blockers: financeBlockers,
    },
    publicationStats: {
      totalApproved: totalApprovedPublications,
      inWindowPublicationsCount,
      verifiedPublicationsCount,
      hasThirdPartySource,
      actualCitationsTotal,
      hasCitationData,
      citationCoveragePercent,
      distinctQ1Q2Count,
      hasQuartileData,
      quartileCoveragePercent,
      isZeroDeclared: pubZeroDeclared,
      conflictWithZeroDeclaration: pubConflictWithZero,
      reportingWindowDescription: rpWindow.description,
      configuredPubTargetPerFaculty: deptConfig?.rpSettings?.pubTargetPerFacultyPerYear ?? 1.0,
      configuredCitationTargetWindow: deptConfig?.rpSettings?.citationTargetPerFacultyWindow ?? 5.0,
      configuredQpModel: deptConfig?.rpSettings?.qpModel ?? "QP_CITATIONS_AND_QUARTILE_V1",
    },
    patentStats: {
      totalApproved: totalApprovedPatents,
      patentsGranted3Y,
      patentsPublished3Y,
      isZeroGrantedDeclared,
      isZeroPublishedDeclared,
      conflictWithZeroDeclaration: patentConflictWithZero,
      reportingWindowDescription: rpWindow.description,
      configuredPatentsPublishedTarget: deptConfig?.rpSettings?.patentsPublishedTarget ?? 6,
      configuredPatentsGrantedTarget: deptConfig?.rpSettings?.patentsGrantedTarget ?? 3,
    },
    projectStats: {
      totalApproved: totalApprovedProjects,
      researchFundingTotal,
      consultancyTotal,
      researchFundingAnnualPerFaculty,
      consultancyAnnualPerFaculty,
      legacyUnassignedCount,
      isZeroResearchDeclared,
      isZeroConsultancyDeclared,
      conflictWithZeroDeclaration: projectConflictWithZero,
      reportingWindowDescription: rpWindow.description,
      facultyDenominator,
      facultyDenominatorMissing,
      configuredResearchTargetPerFacultyYear: deptConfig?.rpSettings?.researchFundingTargetPerFacultyYear ?? 50000,
      configuredConsultancyTargetPerFacultyYear: deptConfig?.rpSettings?.consultancyTargetPerFacultyYear ?? 25000,
    },
    graduationStats: {
      totalApproved: totalApprovedGradOutcomes,
      eligibleGraduates: totalEligibleGraduates,
      graduatesInStipulatedTime: totalGraduatesInStipulatedTime,
      stipulatedGraduationRate,
      cohortsCovered: Array.from(cohortsCoveredSet),
    },
    placementStats: {
      totalApproved: totalApprovedPlacements,
      placedCount,
      higherStudiesCount,
      uniquePositiveOutcomesCount,
      eligibleGraduates: placementEligible,
      placementPercentage,
      higherStudiesPercentage,
      positiveOutcomeRate,
      medianSalary,
      qualifyingSalariesCount: qualifyingSalaries.length,
      isZeroPlacementsDeclared,
      isZeroHigherStudiesDeclared,
      hasZeroPlacementsConflict,
      hasZeroHigherStudiesConflict,
      configuredSalaryTarget: deptConfig?.goSettings?.salaryTarget ?? 800000,
      configuredGphModel: deptConfig?.goSettings?.gphModel ?? "GPH_UNIQUE_OUTCOMES_V1",
    },
    doctoralAwardStats: {
      totalApproved: totalApprovedDoctoralAwards,
      totalAwardsInWindow: doctoralAwardsInWindow,
      avgAwardsPerYear: avgDoctoralAwardsPerYear,
      isZeroDoctoralDeclared,
      hasZeroDoctoralConflict,
      configuredPhdTargetPerYear: deptConfig?.goSettings?.phdAwardTargetPerYear ?? 1.0,
    },
    diversityStats: {
      totalStudents: totalApprovedStudents,
      homeStateCount,
      otherStatesCount,
      internationalCount,
      unknownDomicileCount,
      womenStudentsCount,
      menStudentsCount,
      unknownGenderStudentsCount,
      womenStudentsPercentage,
      economicallyChallengedCount,
      feeReimbursementPercentage,
      fullTuitionSupportedStudentsCount,
      hasFacilityChecklist,
      availableFacilitiesCount,
      applicableFacilitiesCount,
      physicallyChallengedFacilitiesVerified,
      physicallyChallengedFacilityScore,
    },
    perceptionStats: {
      hasOfficialScore,
      officialScore,
      hasSurveyResponses,
      surveyResponseCount,
      surveyMeanRating,
    },
  };
}

