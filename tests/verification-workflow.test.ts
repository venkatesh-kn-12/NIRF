import assert from "node:assert/strict";
import mongoose from "mongoose";
import { connectDB } from "../src/lib/db";
import { User, IUser } from "../src/models/User";
import { Student } from "../src/models/Student";
import { Faculty } from "../src/models/Faculty";
import { GraduationOutcome } from "../src/models/GraduationOutcome";
import { VerificationCase } from "../src/models/VerificationCase";
import { AuditLog } from "../src/models/AuditLog";
import {
  runAutomatedVerificationChecks,
  approveRecordViaVerification,
  rejectRecordViaVerification,
  requestCorrectionViaVerification,
  assignReviewerToCase,
  updateCaseNotes,
  attachEvidenceToCase,
} from "../src/services/verificationService";

async function runVerificationWorkflowTests() {
  console.log("==================================================================");
  console.log("STARTING VERIFICATION AND APPROVAL WORKFLOW INTEGRATION TESTS");
  console.log("==================================================================");

  await connectDB();

  // Clean test collection artifacts
  await VerificationCase.deleteMany({ department: "MCA" });
  await Student.deleteMany({ email: { $regex: /@verify-test\.edu\.in$/ } });
  await Faculty.deleteMany({ email: { $regex: /@verify-test\.edu\.in$/ } });
  await GraduationOutcome.deleteMany({ reportingPeriod: "TEST-VERIFY" });

  // 1. Create Test Users: ADMIN, REVIEWER, CONTRIBUTOR, VIEWER
  const adminUser = await User.findOneAndUpdate(
    { email: "admin@verify-test.edu.in" },
    {
      name: "Admin Verify",
      email: "admin@verify-test.edu.in",
      passwordHash: "hash",
      role: "DEPARTMENT_ADMIN",
      department: "MCA",
      status: "ACTIVE",
    },
    { upsert: true, new: true }
  );

  const reviewerUser = await User.findOneAndUpdate(
    { email: "reviewer@verify-test.edu.in" },
    {
      name: "Reviewer Verify",
      email: "reviewer@verify-test.edu.in",
      passwordHash: "hash",
      role: "REVIEWER",
      department: "MCA",
      status: "ACTIVE",
    },
    { upsert: true, new: true }
  );

  const contributorUser = await User.findOneAndUpdate(
    { email: "contrib@verify-test.edu.in" },
    {
      name: "Contributor Verify",
      email: "contrib@verify-test.edu.in",
      passwordHash: "hash",
      role: "FACULTY_CONTRIBUTOR",
      department: "MCA",
      status: "ACTIVE",
    },
    { upsert: true, new: true }
  );

  const viewerUser = await User.findOneAndUpdate(
    { email: "viewer@verify-test.edu.in" },
    {
      name: "Viewer Verify",
      email: "viewer@verify-test.edu.in",
      passwordHash: "hash",
      role: "VIEWER",
      department: "MCA",
      status: "ACTIVE",
    },
    { upsert: true, new: true }
  );

  console.log("\n--- STEP 1: Verify Automated Case Generation (Missing Evidence) ---");
  const studentWithoutEvidence = await Student.create({
    studentId: "STU-VERIFY-001",
    prn: "PRN-VERIFY-001",
    name: "Arjun Verma",
    email: "arjun@verify-test.edu.in",
    programme: "MCA",
    batch: "2023-2025",
    admissionYear: 2023,
    gender: "MALE",
    dateOfBirth: new Date("2000-05-15"),
    domicileState: "Karnataka",
    domicileType: "HOME_STATE",
    category: "GENERAL",
    currentStatus: "ACTIVE",
    currentSemester: 3,
    expectedGraduationYear: 2025,
    higherStudiesStatus: "NO",
    evidenceReferences: [], // Empty evidence!
    department: "MCA",
    academicYear: "2024-25",
    status: "DRAFT",
    createdBy: contributorUser._id,
    updatedBy: contributorUser._id,
  });

  const casesCreated = await runAutomatedVerificationChecks(
    "Student",
    studentWithoutEvidence,
    contributorUser
  );

  assert.ok(casesCreated.length >= 1, "Should create verification case for missing evidence");
  const missingEvCase = casesCreated.find((c) => c.issueType === "MISSING_EVIDENCE");
  assert.ok(missingEvCase, "Missing evidence case must exist");
  assert.equal(missingEvCase.severity, "HIGH");
  assert.equal(missingEvCase.parameter, "TLR");
  assert.equal(missingEvCase.status, "OPEN");
  console.log("✓ Automated MISSING_EVIDENCE case created with parameter TLR and HIGH severity");

  console.log("\n--- STEP 2: Verify Duplicate Detection Check ---");
  const duplicateStudent = new Student({
    studentId: "STU-VERIFY-002",
    prn: "PRN-VERIFY-001", // DUPLICATE PRN!
    name: "Arjun Duplicate",
    email: "arjun2@verify-test.edu.in",
    programme: "MCA",
    batch: "2023-2025",
    admissionYear: 2023,
    gender: "MALE",
    dateOfBirth: new Date("2000-05-15"),
    domicileState: "Karnataka",
    domicileType: "HOME_STATE",
    category: "GENERAL",
    currentStatus: "ACTIVE",
    currentSemester: 3,
    expectedGraduationYear: 2025,
    higherStudiesStatus: "NO",
    evidenceReferences: [{ fileName: "doc.pdf", fileUrl: "http://example.com/doc.pdf" }],
    department: "MCA",
    academicYear: "2024-25",
    status: "DRAFT",
    createdBy: contributorUser._id,
    updatedBy: contributorUser._id,
  });
  await duplicateStudent.save();

  const dupCases = await runAutomatedVerificationChecks("Student", duplicateStudent, contributorUser);
  const duplicateCase = dupCases.find((c) => c.issueType === "DUPLICATE");
  assert.ok(duplicateCase, "Should create DUPLICATE verification case");
  assert.equal(duplicateCase.severity, "HIGH");
  console.log("✓ Automated DUPLICATE case detected and created for duplicate PRN");

  console.log("\n--- STEP 3: Verify Calculation Mismatch Detection Check ---");
  const invalidGradOutcome = await GraduationOutcome.create({
    academicYear: "2023-24",
    reportingPeriod: "TEST-VERIFY",
    programme: "MCA",
    batchYear: 2021,
    eligibleGraduates: 60,
    graduatesInStipulatedTime: 75, // MISMATCH: 75 > 60!
    examinationPassCount: 60,
    medianSalary: 650000,
    higherStudiesCount: 5,
    evidenceReferences: [{ fileName: "grad.pdf", fileUrl: "http://example.com/grad.pdf" }],
    department: "MCA",
    status: "DRAFT",
    createdBy: contributorUser._id,
    updatedBy: contributorUser._id,
  });

  const calcCases = await runAutomatedVerificationChecks(
    "GraduationOutcome",
    invalidGradOutcome,
    contributorUser
  );
  const mismatchCase = calcCases.find((c) => c.issueType === "CALCULATION_MISMATCH");
  assert.ok(mismatchCase, "Should detect CALCULATION_MISMATCH when graduates > eligible");
  assert.equal(mismatchCase.parameter, "GO");
  console.log("✓ Automated CALCULATION_MISMATCH case created with parameter GO");

  console.log("\n--- STEP 4: Reviewer Actions - Attach Evidence & Notes ---");
  await updateCaseNotes(missingEvCase._id.toString(), "Requested admission register copy", reviewerUser);
  const updatedCaseDoc = await VerificationCase.findById(missingEvCase._id);
  assert.equal(updatedCaseDoc?.reviewerNotes, "Requested admission register copy");
  console.log("✓ Reviewer notes updated successfully");

  await attachEvidenceToCase(
    missingEvCase._id.toString(),
    {
      fileName: "Admission_Register_Arjun.pdf",
      fileUrl: "http://example.com/arjun_reg.pdf",
      fileSize: 1048576,
    },
    reviewerUser
  );
  const caseWithEvidence = await VerificationCase.findById(missingEvCase._id);
  assert.equal(caseWithEvidence?.evidenceReferences.length, 1);
  assert.equal(caseWithEvidence?.evidenceReferences[0].fileName, "Admission_Register_Arjun.pdf");

  // Also canonical record received evidence
  const updatedStudentDoc = await Student.findById(studentWithoutEvidence._id);
  assert.equal(updatedStudentDoc?.evidenceReferences.length, 1);
  console.log("✓ Evidence attached to VerificationCase and reflected on canonical record");

  console.log("\n--- STEP 5: Assign Reviewer Action ---");
  await assignReviewerToCase(
    missingEvCase._id.toString(),
    reviewerUser._id.toString(),
    adminUser
  );
  const assignedCase = await VerificationCase.findById(missingEvCase._id);
  assert.equal(assignedCase?.assignedReviewer?.toString(), reviewerUser._id.toString());
  assert.equal(assignedCase?.status, "IN_REVIEW");
  console.log("✓ Reviewer assigned and case status shifted to IN_REVIEW");

  console.log("\n--- STEP 6: RBAC Enforcement on Approval/Rejection ---");
  // Contributor attempting to approve must throw Forbidden
  await assert.rejects(
    async () => {
      await approveRecordViaVerification(
        missingEvCase._id.toString(),
        "Contributor trying to approve",
        contributorUser
      );
    },
    /Forbidden/,
    "FACULTY_CONTRIBUTOR must be rejected when attempting approval"
  );
  console.log("✓ FACULTY_CONTRIBUTOR blocked from approving");

  // Viewer attempting to approve must throw Forbidden
  await assert.rejects(
    async () => {
      await approveRecordViaVerification(
        missingEvCase._id.toString(),
        "Viewer trying to approve",
        viewerUser
      );
    },
    /Forbidden/,
    "VIEWER must be rejected when attempting approval"
  );
  console.log("✓ VIEWER blocked from approving");

  console.log("\n--- STEP 7: Request Correction Action ---");
  await requestCorrectionViaVerification(
    missingEvCase._id.toString(),
    "Please upload signed seal copy from Principal",
    reviewerUser
  );
  const studentAfterCorrection = await Student.findById(studentWithoutEvidence._id);
  assert.equal(studentAfterCorrection?.status, "CORRECTION_REQUESTED");
  assert.equal(studentAfterCorrection?.reviewerComment, "Please upload signed seal copy from Principal");
  console.log("✓ Record status updated to CORRECTION_REQUESTED with instructions");

  console.log("\n--- STEP 8: Rejection Requires Mandatory Reason ---");
  await assert.rejects(
    async () => {
      await rejectRecordViaVerification(missingEvCase._id.toString(), "", reviewerUser);
    },
    /Rejection reason is mandatory/,
    "Rejection without reason must fail"
  );
  console.log("✓ Empty rejection reason rejected as expected");

  console.log("\n--- STEP 9: Approval & Status Progression (All Open Cases Resolved) ---");
  // Reviewer approves the case
  const approveResult = await approveRecordViaVerification(
    missingEvCase._id.toString(),
    "Document verified against University register.",
    reviewerUser
  );

  assert.equal(approveResult.vCase.status, "RESOLVED");
  assert.ok(approveResult.fullyApproved, "Should be fully approved since no other open cases exist");
  assert.equal(approveResult.record.status, "APPROVED");

  const studentFinal = await Student.findById(studentWithoutEvidence._id);
  assert.equal(studentFinal?.status, "APPROVED");
  console.log("✓ VerificationCase resolved and canonical Student record marked APPROVED");

  console.log("\n--- STEP 10: AuditLog Verification for Workflow Mutations ---");
  const auditLogs = await AuditLog.find({
    department: "MCA",
    resourceType: { $in: ["VerificationCase", "Student"] },
  }).sort({ createdAt: -1 });

  const actions = auditLogs.map((l) => l.action);
  assert.ok(actions.includes("approval"), "AuditLog must contain approval action");
  assert.ok(actions.includes("correction request"), "AuditLog must contain correction request action");
  assert.ok(actions.includes("file upload"), "AuditLog must contain file upload action");
  assert.ok(actions.includes("role change"), "AuditLog must contain role change action");
  console.log("✓ All verification workflow mutations verified in immutable AuditLog:", actions.slice(0, 5));

  console.log("==================================================================");
  console.log("ALL VERIFICATION AND APPROVAL WORKFLOW TESTS PASSED CLEANLY!");
  console.log("==================================================================");

  await mongoose.disconnect();
}

runVerificationWorkflowTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});

