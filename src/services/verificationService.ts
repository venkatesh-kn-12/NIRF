import { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import {
  VerificationCase,
  IVerificationCase,
  NirfParameter,
  VerificationIssueType,
  VerificationSeverity,
} from "@/models/VerificationCase";
import { IUser } from "@/models/User";
import { hasRole } from "@/lib/rbac";
import { logAuditEvent } from "@/lib/audit";
import { getClientIp, getClientUserAgent } from "@/lib/auth";

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

export const MODEL_REGISTRY: Record<string, { model: any; param: NirfParameter; name: string }> = {
  Student: { model: Student, param: "TLR", name: "Student Strength (SS)" },
  Faculty: { model: Faculty, param: "TLR", name: "Faculty-Student Ratio & Quality (FSR/FQE)" },
  FinanceRecord: { model: FinanceRecord, param: "TLR", name: "Financial Resources Utilization (FRU)" },
  Publication: { model: Publication, param: "RP", name: "Publications & Citations (PU/CI)" },
  Patent: { model: Patent, param: "RP", name: "Intellectual Property Rights (IPR)" },
  ProjectConsultancy: { model: ProjectConsultancy, param: "RP", name: "Sponsored Projects & Consultancy (FPPP)" },
  GraduationOutcome: { model: GraduationOutcome, param: "GO", name: "Graduation Outcomes (GUE)" },
  PlacementRecord: { model: PlacementRecord, param: "GO", name: "Placements & Higher Studies (GPHE)" },
  OutreachRecord: { model: OutreachRecord, param: "OI", name: "Outreach & Inclusivity (OI)" },
  PerceptionRecord: { model: PerceptionRecord, param: "PR", name: "Peer Perception (PR)" },
};

/**
 * Automatically evaluates a record against regulatory consistency checks,
 * creating VerificationCase entries for any detected discrepancies.
 */
export async function runAutomatedVerificationChecks(
  recordType: string,
  record: any,
  user?: IUser,
  req?: Request
): Promise<IVerificationCase[]> {
  await connectDB();

  const config = MODEL_REGISTRY[recordType];
  if (!config) return [];

  const createdCases: IVerificationCase[] = [];
  const recordId = record._id?.toString() || record.id;
  const param = config.param;
  const academicYear = record.academicYear || "2024-25";

  // Helper to ensure case uniqueness
  async function createCase(
    issueType: VerificationIssueType,
    severity: VerificationSeverity,
    submittedValue: any,
    proposedValue: any,
    difference: any,
    aiExplanation: string
  ) {
    const existing = await VerificationCase.findOne({
      relatedRecordType: recordType,
      relatedRecordId: recordId,
      issueType,
      status: { $in: ["OPEN", "IN_REVIEW"] },
    });

    if (existing) return existing;

    const newCase = await VerificationCase.create({
      relatedRecordType: recordType,
      relatedRecordId: recordId,
      parameter: param,
      issueType,
      severity,
      submittedValue,
      proposedValue,
      difference,
      evidenceReferences: record.evidenceReferences || [],
      aiExplanation,
      reviewerNotes: "",
      status: "OPEN",
      department: "MCA",
      academicYear,
    });

    if (user) {
      const ipAddress = req ? getClientIp(req) : "127.0.0.1";
      const userAgent = req ? getClientUserAgent(req) : "Server";
      await logAuditEvent({
        action: "record creation",
        userId: user._id,
        userEmail: user.email,
        userRole: user.role,
        department: "MCA",
        resourceType: "VerificationCase",
        resourceId: newCase._id.toString(),
        details: { recordType, recordId, issueType, severity },
        status: "SUCCESS",
        ipAddress,
        userAgent,
      });
    }

    return newCase;
  }

  // Check 1: Missing Evidence
  const hasEvidence = Array.isArray(record.evidenceReferences) && record.evidenceReferences.length > 0;
  if (!hasEvidence) {
    const c = await createCase(
      "MISSING_EVIDENCE",
      "HIGH",
      "No documents attached",
      "Mandatory PDF / document proof",
      "0 documents on file",
      `Under NIRF guidelines, ${recordType} records require official document corroboration before accreditation inclusion.`
    );
    if (c) createdCases.push(c);
  }

  // Check 2: Duplicates
  if (recordType === "Student" && record.prn) {
    const duplicate = await Student.findOne({ prn: record.prn, _id: { $ne: record._id } });
    if (duplicate) {
      const c = await createCase(
        "DUPLICATE",
        "HIGH",
        `PRN: ${record.prn} (${record.name})`,
        `Existing PRN record ID: ${duplicate._id}`,
        "Duplicate student registration detected",
        `Student PRN ${record.prn} matches another record in the MCA repository. Duplicate entries distort intake and student strength figures.`
      );
      if (c) createdCases.push(c);
    }
  } else if (recordType === "Faculty" && record.facultyId) {
    const duplicate = await Faculty.findOne({ facultyId: record.facultyId, _id: { $ne: record._id } });
    if (duplicate) {
      const c = await createCase(
        "DUPLICATE",
        "HIGH",
        `Faculty ID: ${record.facultyId} (${record.name})`,
        `Existing Faculty record ID: ${duplicate._id}`,
        "Duplicate faculty identifier detected",
        `Faculty ID ${record.facultyId} is already registered under another MCA faculty entry.`
      );
      if (c) createdCases.push(c);
    }
  } else if (recordType === "Publication" && record.doi && record.doi.trim()) {
    const duplicate = await Publication.findOne({ doi: record.doi.trim(), _id: { $ne: record._id } });
    if (duplicate) {
      const c = await createCase(
        "DUPLICATE",
        "HIGH",
        `DOI: ${record.doi}`,
        `Existing publication ID: ${duplicate._id}`,
        "Duplicate DOI detected",
        `Publication DOI ${record.doi} matches an existing scholarly article entry in the database.`
      );
      if (c) createdCases.push(c);
    }
  } else if (recordType === "Patent" && record.applicationNumber) {
    const duplicate = await Patent.findOne({ applicationNumber: record.applicationNumber, _id: { $ne: record._id } });
    if (duplicate) {
      const c = await createCase(
        "DUPLICATE",
        "HIGH",
        `App Number: ${record.applicationNumber}`,
        `Existing patent ID: ${duplicate._id}`,
        "Duplicate patent application detected",
        `Patent application number ${record.applicationNumber} already exists in the department intellectual property repository.`
      );
      if (c) createdCases.push(c);
    }
  }

  // Check 3: Calculation & Consistency Mismatches
  if (recordType === "GraduationOutcome") {
    if (record.graduatesInStipulatedTime > record.eligibleGraduates) {
      const c = await createCase(
        "CALCULATION_MISMATCH",
        "HIGH",
        `Graduates in Stipulated Time: ${record.graduatesInStipulatedTime}`,
        `Maximum eligible graduates: ${record.eligibleGraduates}`,
        `Surplus count: +${record.graduatesInStipulatedTime - record.eligibleGraduates}`,
        "Graduates in stipulated time cannot exceed total eligible students in the cohort."
      );
      if (c) createdCases.push(c);
    }
    if (record.examinationPassCount > record.eligibleGraduates) {
      const c = await createCase(
        "CALCULATION_MISMATCH",
        "HIGH",
        `Examination Pass Count: ${record.examinationPassCount}`,
        `Maximum eligible graduates: ${record.eligibleGraduates}`,
        `Surplus count: +${record.examinationPassCount - record.eligibleGraduates}`,
        "Students passing final exam cannot exceed eligible candidates in the cohort."
      );
      if (c) createdCases.push(c);
    }
  } else if (recordType === "FinanceRecord") {
    if (record.amount <= 0) {
      const c = await createCase(
        "CALCULATION_MISMATCH",
        "MEDIUM",
        `Amount: INR ${record.amount}`,
        "Amount > 0",
        "Non-positive expenditure value",
        "Institutional capital and operational expenditures must be strictly positive figures."
      );
      if (c) createdCases.push(c);
    }
  } else if (recordType === "OutreachRecord") {
    if (record.aggregateCount > record.totalEligiblePopulation) {
      const c = await createCase(
        "CALCULATION_MISMATCH",
        "HIGH",
        `Count: ${record.aggregateCount}`,
        `Total Eligible: ${record.totalEligiblePopulation}`,
        `Overflow delta: +${record.aggregateCount - record.totalEligiblePopulation}`,
        "Disadvantaged/diversity count cannot exceed total eligible department cohort population."
      );
      if (c) createdCases.push(c);
    }
  } else if (recordType === "PerceptionRecord") {
    if (record.score > record.maximumScore) {
      const c = await createCase(
        "CALCULATION_MISMATCH",
        "HIGH",
        `Score: ${record.score}`,
        `Max score: ${record.maximumScore}`,
        `Score overflow: +${record.score - record.maximumScore}`,
        "Perception score exceeds theoretical maximum scale."
      );
      if (c) createdCases.push(c);
    }
  }

  // Check 4: Invalid Dates & Reporting Period Anachronisms
  const now = new Date();
  if (recordType === "Student") {
    if (record.dateOfBirth && new Date(record.dateOfBirth) > now) {
      const c = await createCase(
        "INVALID_DATE",
        "HIGH",
        `DOB: ${new Date(record.dateOfBirth).toISOString().slice(0, 10)}`,
        `DOB < ${now.toISOString().slice(0, 10)}`,
        "Date of birth in future",
        "Student birth date cannot be chronologically positioned in the future."
      );
      if (c) createdCases.push(c);
    }
    if (record.admissionYear && record.expectedGraduationYear && record.admissionYear > record.expectedGraduationYear) {
      const c = await createCase(
        "INVALID_DATE",
        "MEDIUM",
        `Admission: ${record.admissionYear}, Graduation: ${record.expectedGraduationYear}`,
        `Graduation year >= ${record.admissionYear + 2}`,
        "Inverted academic timeline",
        "Expected graduation year for 2-year MCA degree must succeed admission year."
      );
      if (c) createdCases.push(c);
    }
  } else if (recordType === "Faculty") {
    if (record.joiningDate && new Date(record.joiningDate) > now) {
      const c = await createCase(
        "INVALID_DATE",
        "MEDIUM",
        `Joining Date: ${new Date(record.joiningDate).toISOString().slice(0, 10)}`,
        `Joining Date <= ${now.toISOString().slice(0, 10)}`,
        "Future joining date",
        "Faculty joining date cannot be set in the future for active NIRF service accounting."
      );
      if (c) createdCases.push(c);
    }
    if (record.phdAwardYear && record.phdAwardYear > now.getFullYear()) {
      const c = await createCase(
        "INVALID_DATE",
        "HIGH",
        `PhD Year: ${record.phdAwardYear}`,
        `PhD Year <= ${now.getFullYear()}`,
        "Future PhD award year",
        "PhD qualification award year cannot exceed current calendar year."
      );
      if (c) createdCases.push(c);
    }
  }

  return createdCases;
}

/**
 * Reviewer Action: Approves the record and resolves the verification case.
 * Enforces strict rule: ONLY REVIEWER and DEPARTMENT_ADMIN can approve.
 * Never auto-approved. A record becomes APPROVED only after successful verification.
 */
export async function approveRecordViaVerification(
  caseId: string,
  reviewerNotes: string,
  user: IUser,
  req?: Request
) {
  if (!hasRole(user.role, ["DEPARTMENT_ADMIN", "REVIEWER"])) {
    throw new Error(`Forbidden. Role ${user.role} is not authorized to approve records.`);
  }

  await connectDB();

  const vCase = await VerificationCase.findById(caseId);
  if (!vCase) {
    throw new Error("Verification case not found");
  }

  const config = MODEL_REGISTRY[vCase.relatedRecordType];
  if (!config) {
    throw new Error(`Unsupported model: ${vCase.relatedRecordType}`);
  }

  // 1. Mark verification case as RESOLVED
  vCase.status = "RESOLVED";
  vCase.resolvedBy = user._id;
  vCase.resolvedAt = new Date();
  vCase.reviewerNotes = reviewerNotes || vCase.reviewerNotes;
  await vCase.save();

  // 2. Check if all open issues for this record are resolved
  const remainingOpenCases = await VerificationCase.countDocuments({
    relatedRecordType: vCase.relatedRecordType,
    relatedRecordId: vCase.relatedRecordId,
    status: { $in: ["OPEN", "IN_REVIEW", "ESCALATED"] },
  });

  const recordDoc: any = await config.model.findById(vCase.relatedRecordId);
  if (!recordDoc) {
    throw new Error("Target canonical record not found");
  }

  if (remainingOpenCases === 0) {
    // Only set APPROVED if all discrepancies are cleared!
    recordDoc.status = "APPROVED";
    recordDoc.reviewerComment = reviewerNotes || "Approved via Verification Queue resolution.";
    recordDoc.updatedBy = user._id;

    if (Array.isArray(recordDoc.auditHistory)) {
      recordDoc.auditHistory.push({
        action: "RECORD_APPROVED_VERIFICATION",
        performedBy: user._id,
        performedByEmail: user.email,
        performedByRole: user.role,
        timestamp: new Date(),
        details: { caseId: vCase._id.toString(), notes: reviewerNotes },
      });
    }
    await recordDoc.save();
  }

  // 3. Write AuditLog entry
  const ipAddress = req ? getClientIp(req) : "127.0.0.1";
  const userAgent = req ? getClientUserAgent(req) : "Server";

  await logAuditEvent({
    action: "approval",
    userId: user._id,
    userEmail: user.email,
    userRole: user.role,
    department: "MCA",
    resourceType: vCase.relatedRecordType,
    resourceId: vCase.relatedRecordId.toString(),
    details: {
      caseId: vCase._id.toString(),
      issueType: vCase.issueType,
      recordStatus: recordDoc.status,
      reviewerNotes,
      remainingOpenCases,
    },
    status: "SUCCESS",
    ipAddress,
    userAgent,
  });

  return { vCase, record: recordDoc, fullyApproved: recordDoc.status === "APPROVED" };
}

/**
 * Reviewer Action: Rejects the record and marks verification case REJECTED.
 * Strictly enforced: Only REVIEWER and DEPARTMENT_ADMIN can reject.
 */
export async function rejectRecordViaVerification(
  caseId: string,
  reason: string,
  user: IUser,
  req?: Request
) {
  if (!hasRole(user.role, ["DEPARTMENT_ADMIN", "REVIEWER"])) {
    throw new Error(`Forbidden. Role ${user.role} is not authorized to reject records.`);
  }

  if (!reason || !reason.trim()) {
    throw new Error("Rejection reason is mandatory.");
  }

  await connectDB();

  const vCase = await VerificationCase.findById(caseId);
  if (!vCase) {
    throw new Error("Verification case not found");
  }

  const config = MODEL_REGISTRY[vCase.relatedRecordType];
  if (!config) {
    throw new Error(`Unsupported model: ${vCase.relatedRecordType}`);
  }

  vCase.status = "REJECTED";
  vCase.resolvedBy = user._id;
  vCase.resolvedAt = new Date();
  vCase.reviewerNotes = reason;
  await vCase.save();

  const recordDoc: any = await config.model.findById(vCase.relatedRecordId);
  if (recordDoc) {
    recordDoc.status = "REJECTED";
    recordDoc.reviewerComment = reason;
    recordDoc.updatedBy = user._id;

    if (Array.isArray(recordDoc.auditHistory)) {
      recordDoc.auditHistory.push({
        action: "RECORD_REJECTED_VERIFICATION",
        performedBy: user._id,
        performedByEmail: user.email,
        performedByRole: user.role,
        timestamp: new Date(),
        details: { caseId: vCase._id.toString(), reason },
      });
    }
    await recordDoc.save();
  }

  const ipAddress = req ? getClientIp(req) : "127.0.0.1";
  const userAgent = req ? getClientUserAgent(req) : "Server";

  await logAuditEvent({
    action: "rejection",
    userId: user._id,
    userEmail: user.email,
    userRole: user.role,
    department: "MCA",
    resourceType: vCase.relatedRecordType,
    resourceId: vCase.relatedRecordId.toString(),
    details: { caseId: vCase._id.toString(), reason, issueType: vCase.issueType },
    status: "SUCCESS",
    ipAddress,
    userAgent,
  });

  return { vCase, record: recordDoc };
}

/**
 * Reviewer Action: Requests correction on the case and flags record.
 */
export async function requestCorrectionViaVerification(
  caseId: string,
  instructions: string,
  user: IUser,
  req?: Request
) {
  if (!hasRole(user.role, ["DEPARTMENT_ADMIN", "REVIEWER"])) {
    throw new Error(`Forbidden. Role ${user.role} is not authorized.`);
  }

  if (!instructions || !instructions.trim()) {
    throw new Error("Correction instructions are mandatory.");
  }

  await connectDB();

  const vCase = await VerificationCase.findById(caseId);
  if (!vCase) {
    throw new Error("Verification case not found");
  }

  const config = MODEL_REGISTRY[vCase.relatedRecordType];
  if (!config) {
    throw new Error(`Unsupported model: ${vCase.relatedRecordType}`);
  }

  vCase.status = "IN_REVIEW";
  vCase.reviewerNotes = instructions;
  await vCase.save();

  const recordDoc: any = await config.model.findById(vCase.relatedRecordId);
  if (recordDoc) {
    recordDoc.status = "CORRECTION_REQUESTED";
    recordDoc.reviewerComment = instructions;
    recordDoc.updatedBy = user._id;

    if (Array.isArray(recordDoc.auditHistory)) {
      recordDoc.auditHistory.push({
        action: "CORRECTION_REQUESTED_VERIFICATION",
        performedBy: user._id,
        performedByEmail: user.email,
        performedByRole: user.role,
        timestamp: new Date(),
        details: { caseId: vCase._id.toString(), instructions },
      });
    }
    await recordDoc.save();
  }

  const ipAddress = req ? getClientIp(req) : "127.0.0.1";
  const userAgent = req ? getClientUserAgent(req) : "Server";

  await logAuditEvent({
    action: "correction request",
    userId: user._id,
    userEmail: user.email,
    userRole: user.role,
    department: "MCA",
    resourceType: vCase.relatedRecordType,
    resourceId: vCase.relatedRecordId.toString(),
    details: { caseId: vCase._id.toString(), instructions },
    status: "SUCCESS",
    ipAddress,
    userAgent,
  });

  return { vCase, record: recordDoc };
}

/**
 * Assigns reviewer to case.
 */
export async function assignReviewerToCase(
  caseId: string,
  reviewerId: string,
  user: IUser,
  req?: Request
) {
  if (!hasRole(user.role, ["DEPARTMENT_ADMIN", "REVIEWER"])) {
    throw new Error("Forbidden.");
  }

  await connectDB();

  const vCase = await VerificationCase.findById(caseId);
  if (!vCase) throw new Error("Verification case not found");

  vCase.assignedReviewer = new Types.ObjectId(reviewerId);
  vCase.status = "IN_REVIEW";
  await vCase.save();

  const ipAddress = req ? getClientIp(req) : "127.0.0.1";
  const userAgent = req ? getClientUserAgent(req) : "Server";

  await logAuditEvent({
    action: "role change",
    userId: user._id,
    userEmail: user.email,
    userRole: user.role,
    department: "MCA",
    resourceType: "VerificationCase",
    resourceId: vCase._id.toString(),
    details: { assignedReviewer: reviewerId },
    status: "SUCCESS",
    ipAddress,
    userAgent,
  });

  return vCase;
}

/**
 * Updates reviewer notes on a case.
 */
export async function updateCaseNotes(
  caseId: string,
  notes: string,
  user: IUser
) {
  await connectDB();
  const vCase = await VerificationCase.findById(caseId);
  if (!vCase) throw new Error("Verification case not found");

  vCase.reviewerNotes = notes;
  await vCase.save();
  return vCase;
}

/**
 * Attaches evidence document to verification case.
 */
export async function attachEvidenceToCase(
  caseId: string,
  evidenceRef: { fileName: string; fileUrl: string; fileSize?: number },
  user: IUser,
  req?: Request
) {
  await connectDB();
  const vCase = await VerificationCase.findById(caseId);
  if (!vCase) throw new Error("Verification case not found");

  vCase.evidenceReferences.push({
    fileName: evidenceRef.fileName,
    fileUrl: evidenceRef.fileUrl,
    fileSize: evidenceRef.fileSize || 1024,
    uploadedAt: new Date(),
    uploadedBy: user._id,
  });

  await vCase.save();

  // Also attach to the canonical record if possible
  const config = MODEL_REGISTRY[vCase.relatedRecordType];
  if (config) {
    const recordDoc: any = await config.model.findById(vCase.relatedRecordId);
    if (recordDoc && Array.isArray(recordDoc.evidenceReferences)) {
      recordDoc.evidenceReferences.push({
        fileName: evidenceRef.fileName,
        fileUrl: evidenceRef.fileUrl,
        fileSize: evidenceRef.fileSize || 1024,
        uploadedAt: new Date(),
        uploadedBy: user._id,
      });
      await recordDoc.save();
    }
  }

  const ipAddress = req ? getClientIp(req) : "127.0.0.1";
  const userAgent = req ? getClientUserAgent(req) : "Server";

  await logAuditEvent({
    action: "file upload",
    userId: user._id,
    userEmail: user.email,
    userRole: user.role,
    department: "MCA",
    resourceType: "VerificationCase",
    resourceId: vCase._id.toString(),
    details: { fileName: evidenceRef.fileName },
    status: "SUCCESS",
    ipAddress,
    userAgent,
  });

  return vCase;
}

