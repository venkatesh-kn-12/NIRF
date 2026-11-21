import assert from "node:assert/strict";
import {
  studentSchema,
  facultySchema,
  financeRecordSchema,
  publicationSchema,
  patentSchema,
  projectConsultancySchema,
  graduationOutcomeSchema,
  placementRecordSchema,
  outreachRecordSchema,
  perceptionRecordSchema,
} from "../src/validators";

console.log("--------------------------------------------------");
console.log("MCA NIRF Assist — 10 Models Zod Schema Validation Test");
console.log("--------------------------------------------------");

async function runValidationTests() {
  // 1. Student Schema
  console.log("\n[Test 1] Student Schema Validation");
  {
    const validStudent = {
      studentId: "MCA2024001",
      prn: "1DS24MC001",
      name: "Aarav Sharma",
      email: "aarav.mca@dsatm.edu.in",
      programme: "Master of Computer Applications",
      batch: "2024-2026",
      admissionYear: 2024,
      gender: "MALE",
      dateOfBirth: "2001-05-15",
      domicileState: "Karnataka",
      domicileType: "HOME_STATE",
      category: "General",
      currentStatus: "ACTIVE",
      currentSemester: 1,
      expectedGraduationYear: 2026,
      department: "MCA",
      academicYear: "2024-25",
    };
    const res = studentSchema.safeParse(validStudent);
    assert.ok(res.success, "Valid student must pass validation: " + JSON.stringify(res.error?.issues));

    // Reject invalid department
    const invalidDept = { ...validStudent, department: "CSE" };
    const resDept = studentSchema.safeParse(invalidDept);
    assert.equal(resDept.success, false, "Department must be strictly 'MCA'");

    // Reject invalid domicileType
    const invalidDomicile = { ...validStudent, domicileType: "UNKNOWN" };
    const resDomicile = studentSchema.safeParse(invalidDomicile);
    assert.equal(resDomicile.success, false, "domicileType must match enum");
    console.log("✓ Student validation passed");
  }

  // 2. Faculty Schema
  console.log("\n[Test 2] Faculty Schema Validation");
  {
    const validFaculty = {
      facultyId: "FAC-MCA-001",
      name: "Dr. Sunita Rao",
      email: "sunita.rao@dsatm.edu.in",
      designation: "Associate Professor",
      employmentType: "PERMANENT",
      department: "MCA",
      highestQualification: "Ph.D. Computer Applications",
      phdStatus: "AWARDED",
      phdAwardYear: 2018,
      experienceYears: 12,
      joiningDate: "2015-08-01",
      researchDomains: ["Machine Learning", "Cloud Computing"],
      academicYear: "2024-25",
    };
    const res = facultySchema.safeParse(validFaculty);
    assert.ok(res.success, "Valid faculty must pass validation: " + JSON.stringify(res.error?.issues));

    // Non-MCA rejection
    const invalidDept = { ...validFaculty, department: "ECE" };
    assert.equal(facultySchema.safeParse(invalidDept).success, false);
    console.log("✓ Faculty validation passed");
  }

  // 3. FinanceRecord Schema
  console.log("\n[Test 3] FinanceRecord Schema Validation");
  {
    const validFinance = {
      financialYear: "2023-2024",
      expenditureHead: "Library Resources & Subscriptions",
      amount: 450000,
      currency: "INR",
      expenditureType: "OPERATIONAL",
      purpose: "Procurement of IEEE & ACM digital libraries",
      supportingDocument: "https://dsatm.edu.in/finance/lib_2023_24.pdf",
      department: "MCA",
      academicYear: "2023-24",
    };
    const res = financeRecordSchema.safeParse(validFinance);
    assert.ok(res.success, "Valid finance record must pass validation: " + JSON.stringify(res.error?.issues));

    // Negative amount check
    const negAmount = { ...validFinance, amount: -100 };
    assert.equal(financeRecordSchema.safeParse(negAmount).success, false);
    console.log("✓ FinanceRecord validation passed");
  }

  // 4. Publication Schema
  console.log("\n[Test 4] Publication Schema Validation");
  {
    const validPub = {
      title: "Optimized Transformer Architectures for NLP on Edge Devices",
      authors: ["Dr. Sunita Rao", "Aarav Sharma"],
      doi: "10.1109/ACCESS.2024.1234567",
      url: "https://ieeexplore.ieee.org/document/1234567",
      publicationType: "JOURNAL",
      journalOrConference: "IEEE Access",
      publicationDate: "2024-03-15",
      indexing: "SCOPUS",
      citationCount: 4,
      citationSource: "Scopus",
      retractionStatus: false,
      department: "MCA",
      academicYear: "2023-24",
    };
    const res = publicationSchema.safeParse(validPub);
    assert.ok(res.success, "Valid publication must pass validation: " + JSON.stringify(res.error?.issues));
    console.log("✓ Publication validation passed");
  }

  // 5. Patent Schema
  console.log("\n[Test 5] Patent Schema Validation");
  {
    const validPatent = {
      title: "Smart Attendance Verification System via Biometric Fingerprint Cryptography",
      applicationNumber: "202341012345",
      filingDate: "2023-04-10",
      applicant: "DSATM",
      inventors: ["Dr. Sunita Rao", "Prof. Rajesh Kumar"],
      patentStatus: "PUBLISHED",
      patentOffice: "Indian Patent Office",
      department: "MCA",
      academicYear: "2023-24",
    };
    const res = patentSchema.safeParse(validPatent);
    assert.ok(res.success, "Valid patent must pass validation: " + JSON.stringify(res.error?.issues));
    console.log("✓ Patent validation passed");
  }

  // 6. ProjectConsultancy Schema
  console.log("\n[Test 6] ProjectConsultancy Schema Validation");
  {
    const validProject = {
      title: "AI-based Traffic Management System",
      type: "SPONSORED_PROJECT",
      fundingAgencyOrClient: "DST / SERB",
      sanctionedAmount: 1500000,
      receivedAmount: 750000,
      startDate: "2023-01-15",
      principalInvestigator: "Dr. Sunita Rao",
      department: "MCA",
      academicYear: "2023-24",
    };
    const res = projectConsultancySchema.safeParse(validProject);
    assert.ok(res.success, "Valid project must pass validation: " + JSON.stringify(res.error?.issues));
    console.log("✓ ProjectConsultancy validation passed");
  }

  // 7. GraduationOutcome Schema
  console.log("\n[Test 7] GraduationOutcome Schema Validation");
  {
    const validOutcome = {
      programme: "Master of Computer Applications",
      batch: "2021-2023",
      academicYear: "2022-23",
      eligibleGraduates: 60,
      graduatesInStipulatedTime: 58,
      examinationPassCount: 58,
      higherStudiesCount: 5,
      phdCompletionCount: 0,
      department: "MCA",
    };
    const res = graduationOutcomeSchema.safeParse(validOutcome);
    assert.ok(res.success, "Valid graduation outcome must pass validation: " + JSON.stringify(res.error?.issues));
    console.log("✓ GraduationOutcome validation passed");
  }

  // 8. PlacementRecord Schema
  console.log("\n[Test 8] PlacementRecord Schema Validation");
  {
    const validPlacement = {
      studentReference: "1DS22MC001",
      programme: "Master of Computer Applications",
      batch: "2022-2024",
      employer: "Infosys Ltd",
      offerType: "CAMPUS",
      ctc: 650000,
      offerDate: "2024-02-10",
      joiningStatus: "JOINED",
      higherStudiesStatus: "NOT_APPLICABLE",
      placementYear: 2024,
      department: "MCA",
      academicYear: "2023-24",
    };
    const res = placementRecordSchema.safeParse(validPlacement);
    assert.ok(res.success, "Valid placement record must pass validation: " + JSON.stringify(res.error?.issues));
    console.log("✓ PlacementRecord validation passed");
  }

  // 9. OutreachRecord Schema
  console.log("\n[Test 9] OutreachRecord Schema Validation");
  {
    const validOutreach = {
      recordType: "REGIONAL_DIVERSITY",
      aggregateCount: 15,
      totalEligiblePopulation: 60,
      supportingDocument: "https://dsatm.edu.in/outreach/diversity_2024.pdf",
      department: "MCA",
      academicYear: "2023-24",
    };
    const res = outreachRecordSchema.safeParse(validOutreach);
    assert.ok(res.success, "Valid outreach record must pass validation: " + JSON.stringify(res.error?.issues));
    console.log("✓ OutreachRecord validation passed");
  }

  // 10. PerceptionRecord Schema
  console.log("\n[Test 10] PerceptionRecord Schema Validation");
  {
    const validPerception = {
      sourceType: "OFFICIAL_SCORE",
      score: 82.5,
      maximumScore: 100,
      surveyOrReferencePeriod: "NIRF 2024 Survey Cycle",
      sourceDocument: "https://dsatm.edu.in/perception/nirf_2024.pdf",
      department: "MCA",
      academicYear: "2023-24",
    };
    const res = perceptionRecordSchema.safeParse(validPerception);
    assert.ok(res.success, "Valid perception record must pass validation: " + JSON.stringify(res.error?.issues));
    console.log("✓ PerceptionRecord validation passed");
  }

  console.log("\n==================================================");
  console.log("All 10 Models Zod Validators Verified Successfully!");
  console.log("==================================================");
}

runValidationTests().catch((err) => {
  console.error("Test failure:", err);
  process.exit(1);
});
