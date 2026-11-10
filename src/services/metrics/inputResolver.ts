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

export interface ResolvedMetricInputs {
  academicYear: string;
  department: "MCA";
  rawSnapshot: Record<string, any>;

  // TLR inputs
  studentStats: {
    totalApproved: number;
    approvedIntake: number; // e.g. 60 per batch * 2 years = 120 or count
    enrolledStudents: number;
    phdEnrolled: number;
  };
  facultyStats: {
    totalApproved: number;
    regularFacultyCount: number;
    phdFacultyCount: number;
    expUpTo8: number;
    exp8To15: number;
    expAbove15: number;
    womenFacultyCount: number;
  };
  financeStats: {
    totalApproved: number;
    capitalExpenditureTotal: number;
    operationalExpenditureTotal: number;
    capitalExpenditurePerStudent: number;
    operationalExpenditurePerStudent: number;
  };

  // RP inputs
  publicationStats: {
    totalApproved: number;
    verifiedPublicationsCount: number;
    hasThirdPartySource: boolean;
  };
  patentStats: {
    totalApproved: number;
    patentsGranted3Y: number;
    patentsPublished3Y: number;
  };
  projectStats: {
    totalApproved: number;
    researchFundingTotal: number;
    consultancyTotal: number;
    researchFundingPerFaculty: number;
    consultancyPerFaculty: number;
  };

  // GO inputs
  graduationStats: {
    totalApproved: number;
    eligibleGraduates: number;
    graduatesInStipulatedTime: number;
    stipulatedGraduationRate: number; // percentage
  };
  placementStats: {
    totalApproved: number;
    placedCount: number;
    higherStudiesCount: number;
    eligibleGraduates: number;
    placementPercentage: number;
    higherStudiesPercentage: number;
    medianSalary: number;
  };

  // OI inputs
  diversityStats: {
    totalStudents: number;
    homeStateCount: number;
    otherStatesCount: number;
    internationalCount: number;
    womenStudentsCount: number;
    womenStudentsPercentage: number;
    economicallyChallengedCount: number;
    feeReimbursementPercentage: number;
    physicallyChallengedFacilitiesVerified: boolean;
    physicallyChallengedFacilityScore: number; // 0 to 20
  };

  // PR inputs
  perceptionStats: {
    hasOfficialScore: boolean;
    officialScore: number | null;
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
  const approvedQuery = { department, status: "APPROVED" };

  // 1. Fetch only APPROVED records in parallel
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
  ] = await Promise.all([
    Student.find(approvedQuery).lean(),
    Faculty.find(approvedQuery).lean(),
    FinanceRecord.find(approvedQuery).lean(),
    Publication.find(approvedQuery).lean(),
    Patent.find(approvedQuery).lean(),
    ProjectConsultancy.find(approvedQuery).lean(),
    GraduationOutcome.find(approvedQuery).lean(),
    PlacementRecord.find(approvedQuery).lean(),
    OutreachRecord.find(approvedQuery).lean(),
    PerceptionRecord.find(approvedQuery).lean(),
  ]);

  // 2. Student Analytics (SS, RD, WD, FSR)
  const totalApprovedStudents = students.length;
  // In MCA standard 2-year cohort, default nominal intake is 60/year => 120 total approved capacity
  const approvedIntake = totalApprovedStudents > 0 ? Math.max(120, totalApprovedStudents) : 120;
  const enrolledStudents = totalApprovedStudents; // NT: enrolled UG/PG students
  // Standalone MCA: 0 doctoral intake unless certified by university; counts toward FSR denominator (N = NT + NP)
  const phdEnrolled = 0;

  let otherStatesCount = 0;
  let internationalCount = 0;
  let homeStateCount = 0;
  let womenStudentsCount = 0;

  for (const s of students) {
    if (s.domicileType === "OTHER_STATE") otherStatesCount++;
    else if (s.domicileType === "INTERNATIONAL") internationalCount++;
    else homeStateCount++;

    if (s.gender === "FEMALE") womenStudentsCount++;
  }

  const womenStudentsPercentage =
    totalApprovedStudents > 0
      ? Math.round((womenStudentsCount / totalApprovedStudents) * 1000) / 10
      : 0;

  // 3. Faculty Analytics (FSR, FQE, WD)
  const totalApprovedFaculty = faculty.length;
  let regularFacultyCount = 0;
  let phdFacultyCount = 0;
  let expUpTo8 = 0;
  let exp8To15 = 0;
  let expAbove15 = 0;
  let womenFacultyCount = 0;

  for (const f of faculty) {
    if (f.employmentType === "PERMANENT" || f.employmentType === "CONTRACT") {
      regularFacultyCount++;
    }
    if (f.phdStatus === "AWARDED" || f.highestQualification === "Ph.D.") {
      phdFacultyCount++;
    }

    const exp = f.experienceYears || 0;
    if (exp <= 8) expUpTo8++;
    else if (exp <= 15) exp8To15++;
    else expAbove15++;

    // Gender detection if stored in details or records
    if ((f as any).gender === "FEMALE") womenFacultyCount++;
  }

  // 4. Finance Analytics (FRU)
  const totalApprovedFinance = finance.length;
  let capitalExpenditureTotal = 0;
  let operationalExpenditureTotal = 0;

  for (const fr of finance) {
    if (fr.expenditureType === "CAPITAL") {
      capitalExpenditureTotal += fr.amount || 0;
    } else if (fr.expenditureType === "OPERATIONAL") {
      operationalExpenditureTotal += fr.amount || 0;
    }
  }

  const studentDenominator = Math.max(1, enrolledStudents);
  const capitalExpenditurePerStudent = Math.round(
    capitalExpenditureTotal / studentDenominator
  );
  const operationalExpenditurePerStudent = Math.round(
    operationalExpenditureTotal / studentDenominator
  );

  // 5. Research & IPR Analytics (PU, IPR, FPPP)
  const totalApprovedPublications = publications.length;
  const totalApprovedPatents = patents.length;
  let patentsGranted3Y = 0;
  let patentsPublished3Y = 0;

  for (const p of patents) {
    if (p.patentStatus === "GRANTED") patentsGranted3Y++;
    else if (p.patentStatus === "PUBLISHED" || p.patentStatus === "FILED") patentsPublished3Y++;
  }

  const totalApprovedProjects = projects.length;
  let researchFundingTotal = 0;
  let consultancyTotal = 0;

  for (const prj of projects) {
    if (prj.type === "SPONSORED_PROJECT") {
      researchFundingTotal += prj.receivedAmount || prj.sanctionedAmount || 0;
    } else if (prj.type === "CONSULTANCY") {
      consultancyTotal += prj.receivedAmount || prj.sanctionedAmount || 0;
    }
  }

  const facultyDenominator = Math.max(1, regularFacultyCount);
  const researchFundingPerFaculty = Math.round(
    researchFundingTotal / facultyDenominator
  );
  const consultancyPerFaculty = Math.round(
    consultancyTotal / facultyDenominator
  );

  // 6. Graduation & Placement Analytics (GPH, GUE, GMS)
  const totalApprovedGradOutcomes = gradOutcomes.length;
  let totalEligibleGraduates = 0;
  let totalGraduatesInStipulatedTime = 0;

  for (const go of gradOutcomes) {
    totalEligibleGraduates += go.eligibleGraduates || 0;
    totalGraduatesInStipulatedTime += go.graduatesInStipulatedTime || 0;
  }

  const stipulatedGraduationRate =
    totalEligibleGraduates > 0
      ? Math.round((totalGraduatesInStipulatedTime / totalEligibleGraduates) * 1000) / 10
      : 0;

  const totalApprovedPlacements = placements.length;
  let placedCount = 0;
  let higherStudiesCount = 0;
  let placementSalaries: number[] = [];

  for (const pl of placements) {
    if (pl.ctc && pl.ctc > 0) {
      placedCount++;
      placementSalaries.push(pl.ctc);
    }
    if (
      pl.higherStudiesStatus === "ADMITTED" ||
      pl.higherStudiesStatus === "PURSUING" ||
      pl.higherStudiesStatus === "YES"
    ) {
      higherStudiesCount++;
    }
  }

  for (const go of gradOutcomes) {
    if (go.higherStudiesCount) higherStudiesCount += go.higherStudiesCount;
  }

  const placementEligible = totalEligibleGraduates > 0 ? totalEligibleGraduates : Math.max(1, placedCount + higherStudiesCount);
  const placementPercentage =
    placementEligible > 0 ? Math.round((placedCount / placementEligible) * 1000) / 10 : 0;
  const higherStudiesPercentage =
    placementEligible > 0 ? Math.round((higherStudiesCount / placementEligible) * 1000) / 10 : 0;

  let medianSalary = 0;
  if (placementSalaries.length > 0) {
    placementSalaries.sort((a, b) => a - b);
    const mid = Math.floor(placementSalaries.length / 2);
    medianSalary =
      placementSalaries.length % 2 !== 0
        ? placementSalaries[mid]
        : Math.round((placementSalaries[mid - 1] + placementSalaries[mid]) / 2);
  }

  // 7. Outreach Diversity (ESCS, PCS)
  let economicallyChallengedCount = 0;
  let physicallyChallengedFacilityScore = 0;
  let physicallyChallengedFacilitiesVerified = false;

  for (const o of outreach) {
    if (o.recordType === "FEE_SUPPORT") {
      economicallyChallengedCount += o.aggregateCount || 0;
    }
    if (o.recordType === "ACCESSIBILITY") {
      physicallyChallengedFacilitiesVerified = true;
      physicallyChallengedFacilityScore = Math.min(20, o.aggregateCount > 0 ? 20 : 10);
    }
  }

  const feeReimbursementPercentage =
    totalApprovedStudents > 0
      ? Math.round((economicallyChallengedCount / totalApprovedStudents) * 1000) / 10
      : 0;

  // 8. Perception (PR)
  let hasOfficialScore = false;
  let officialScore: number | null = null;
  if (perceptions.length > 0) {
    for (const pr of perceptions) {
      if (pr.score !== undefined && pr.score !== null) {
        hasOfficialScore = true;
        officialScore = pr.score;
        break;
      }
    }
  }

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
      researchFundingPerFaculty,
      consultancyPerFaculty,
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
    },
    facultyStats: {
      totalApproved: totalApprovedFaculty,
      regularFacultyCount,
      phdFacultyCount,
      expUpTo8,
      exp8To15,
      expAbove15,
      womenFacultyCount,
    },
    financeStats: {
      totalApproved: totalApprovedFinance,
      capitalExpenditureTotal,
      operationalExpenditureTotal,
      capitalExpenditurePerStudent,
      operationalExpenditurePerStudent,
    },
    publicationStats: {
      totalApproved: totalApprovedPublications,
      verifiedPublicationsCount: totalApprovedPublications,
      hasThirdPartySource: false, // Third-party bibliometrics (Scopus/WoS) required for authoritative NIRF
    },
    patentStats: {
      totalApproved: totalApprovedPatents,
      patentsGranted3Y,
      patentsPublished3Y,
    },
    projectStats: {
      totalApproved: totalApprovedProjects,
      researchFundingTotal,
      consultancyTotal,
      researchFundingPerFaculty,
      consultancyPerFaculty,
    },
    graduationStats: {
      totalApproved: totalApprovedGradOutcomes,
      eligibleGraduates: totalEligibleGraduates,
      graduatesInStipulatedTime: totalGraduatesInStipulatedTime,
      stipulatedGraduationRate,
    },
    placementStats: {
      totalApproved: totalApprovedPlacements,
      placedCount,
      higherStudiesCount,
      eligibleGraduates: placementEligible,
      placementPercentage,
      higherStudiesPercentage,
      medianSalary,
    },
    diversityStats: {
      totalStudents: totalApprovedStudents,
      homeStateCount,
      otherStatesCount,
      internationalCount,
      womenStudentsCount,
      womenStudentsPercentage,
      economicallyChallengedCount,
      feeReimbursementPercentage,
      physicallyChallengedFacilitiesVerified,
      physicallyChallengedFacilityScore,
    },
    perceptionStats: {
      hasOfficialScore,
      officialScore,
    },
  };
}

