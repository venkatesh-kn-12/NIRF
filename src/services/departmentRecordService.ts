import { Model, Types } from "mongoose";
import { ZodSchema } from "zod";
import { connectDB } from "@/lib/db";
import { IUser } from "@/models/User";
import { hasRole } from "@/lib/rbac";
import { logAuditEvent } from "@/lib/audit";
import { getClientIp, getClientUserAgent } from "@/lib/auth";
import { AuditAction } from "@/models/AuditLog";
import { IEvidenceReference } from "@/types/common";
import { runAutomatedVerificationChecks } from "./verificationService";

export class RecordServiceError extends Error {
  statusCode: number;
  details?: unknown;

  constructor(message: string, statusCode = 400, details?: unknown) {
    super(message);
    this.name = "RecordServiceError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

export async function listRecords<T>(
  model: Model<T>,
  user: IUser,
  searchParams: URLSearchParams,
  searchFields: string[] = ["name", "title"]
) {
  await connectDB();

  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
  const skip = (page - 1) * limit;

  const query: Record<string, unknown> = { department: "MCA" };

  // Status filter
  const statusParam = searchParams.get("status");
  if (statusParam) {
    query.status = statusParam;
  }

  // Academic year filter
  const academicYearParam = searchParams.get("academicYear");
  if (academicYearParam) {
    query.academicYear = academicYearParam;
  }

  // Batch filter (for Student, GraduationOutcome, Placement)
  const batchParam = searchParams.get("batch");
  if (batchParam) {
    query.batch = batchParam;
  }

  // Additional dynamic filters (e.g. designation, category, type)
  for (const [key, value] of searchParams.entries()) {
    if (
      !["page", "limit", "status", "academicYear", "batch", "q", "search"].includes(key) &&
      value
    ) {
      query[key] = value;
    }
  }

  // RBAC query scoping
  if (user.role === "VIEWER") {
    // VIEWER can ONLY see APPROVED records
    query.status = "APPROVED";
  } else if (user.role === "FACULTY_CONTRIBUTOR") {
    // If not explicitly requesting APPROVED records, limit to own, assigned, or approved
    if (query.status !== "APPROVED") {
      const existingStatus = query.status;
      query.$or = [
        { createdBy: user._id },
        { assignedTo: user._id },
        { status: "APPROVED" },
      ];
      if (existingStatus) {
        query.status = existingStatus;
      } else {
        delete query.status;
      }
    }
  }

  // Text search — must not overwrite any existing $or (e.g. RBAC scope)
  const search = searchParams.get("q") || searchParams.get("search");
  if (search && search.trim() && searchFields.length > 0) {
    const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const searchOr = searchFields.map((field) => ({
      [field]: { $regex: escaped, $options: "i" },
    }));
    if (query.$or) {
      // Combine existing RBAC $or with text search $or using $and
      query.$and = [{ $or: query.$or as any }, { $or: searchOr }];
      delete query.$or;
    } else {
      query.$or = searchOr;
    }
  }

  const [data, total] = await Promise.all([
    model
      .find(query)
      .populate("createdBy", "name email employeeId role")
      .populate("updatedBy", "name email employeeId role")
      .populate("assignedTo", "name email employeeId role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    model.countDocuments(query),
  ]);

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

export async function getRecordById<T>(
  model: Model<T>,
  id: string,
  user: IUser
) {
  await connectDB();

  if (!Types.ObjectId.isValid(id)) {
    throw new RecordServiceError("Invalid record ID", 400);
  }

  const record: any = await model
    .findById(id)
    .populate("createdBy", "name email employeeId role")
    .populate("updatedBy", "name email employeeId role")
    .populate("assignedTo", "name email employeeId role")
    .lean();

  if (!record) {
    throw new RecordServiceError("Record not found", 404);
  }

  // RBAC view verification
  if (user.role === "VIEWER" && record.status !== "APPROVED") {
    throw new RecordServiceError("Forbidden. Viewers can only access approved records.", 403);
  }

  if (user.role === "FACULTY_CONTRIBUTOR") {
    const isOwner = record.createdBy?._id?.toString() === user._id.toString();
    const isAssigned = record.assignedTo?._id?.toString() === user._id.toString();
    if (!isOwner && !isAssigned && record.status !== "APPROVED") {
      throw new RecordServiceError("Forbidden. You cannot view this unapproved record.", 403);
    }
  }

  return record;
}

export async function createRecord<T>(
  model: Model<T>,
  modelName: string,
  rawData: unknown,
  validator: ZodSchema,
  user: IUser,
  req?: Request
) {
  // RBAC: Only DEPARTMENT_ADMIN and FACULTY_CONTRIBUTOR can create records
  if (!hasRole(user.role, ["DEPARTMENT_ADMIN", "FACULTY_CONTRIBUTOR"])) {
    throw new RecordServiceError(
      `Forbidden. Role ${user.role} is not permitted to create ${modelName} records.`,
      403
    );
  }

  const parsed = validator.safeParse(rawData);
  if (!parsed.success) {
    throw new RecordServiceError("Validation failed", 400, parsed.error.format());
  }

  await connectDB();

  const ipAddress = req ? getClientIp(req) : "127.0.0.1";
  const userAgent = req ? getClientUserAgent(req) : "Server";

  const newRecordData = {
    ...(parsed.data as Record<string, any>),
    department: "MCA", // Strict institutional constraint
    status: "DRAFT",
    createdBy: user._id,
    updatedBy: user._id,
    auditHistory: [
      {
        action: "RECORD_CREATED",
        performedBy: user._id,
        performedByEmail: user.email,
        performedByRole: user.role,
        timestamp: new Date(),
        details: { modelName },
      },
    ],
  };

  const record: any = await model.create(newRecordData);

  // Run automated verification checks asynchronously (non-blocking)
  runAutomatedVerificationChecks(modelName, record, user, req).catch((err) =>
    console.error("[VerificationChecks] Error after create:", err)
  );

  // Write to AuditLog
  await logAuditEvent({
    action: "record creation",
    userId: user._id,
    userEmail: user.email,
    userRole: user.role,
    department: "MCA",
    resourceType: modelName,
    resourceId: record._id.toString(),
    details: {
      identifier: record.studentId || record.facultyId || record.title || record.financialYear,
    },
    status: "SUCCESS",
    ipAddress,
    userAgent,
  });

  return record;
}

export async function updateRecord<T>(
  model: Model<T>,
  modelName: string,
  id: string,
  rawData: unknown,
  validator: ZodSchema,
  user: IUser,
  req?: Request
) {
  if (!Types.ObjectId.isValid(id)) {
    throw new RecordServiceError("Invalid record ID", 400);
  }

  await connectDB();
  const record: any = await model.findById(id);
  if (!record) {
    throw new RecordServiceError("Record not found", 404);
  }

  // RBAC checks
  if (user.role === "VIEWER" || user.role === "REVIEWER") {
    throw new RecordServiceError(
      `Forbidden. Role ${user.role} cannot edit records directly.`,
      403
    );
  }

  if (user.role === "FACULTY_CONTRIBUTOR") {
    const isOwner = record.createdBy.toString() === user._id.toString();
    const isAssigned = record.assignedTo?.toString() === user._id.toString();
    if (!isOwner && !isAssigned) {
      throw new RecordServiceError(
        "Forbidden. You can only edit records created by or assigned to you.",
        403
      );
    }
  }

  const parsed = validator.safeParse(rawData);
  if (!parsed.success) {
    throw new RecordServiceError("Validation failed", 400, parsed.error.format());
  }

  const ipAddress = req ? getClientIp(req) : "127.0.0.1";
  const userAgent = req ? getClientUserAgent(req) : "Server";

  // Apply updates
  Object.assign(record, parsed.data as object);
  record.department = "MCA";
  record.updatedBy = user._id;

  record.auditHistory.push({
    action: "RECORD_UPDATED",
    performedBy: user._id,
    performedByEmail: user.email,
    performedByRole: user.role,
    timestamp: new Date(),
    details: { updatedFields: Object.keys(parsed.data as object) },
  });

  await record.save();

  // Run automated verification checks asynchronously (non-blocking)
  runAutomatedVerificationChecks(modelName, record, user, req).catch((err) =>
    console.error("[VerificationChecks] Error after update:", err)
  );

  // AuditLog entry
  await logAuditEvent({
    action: "record update",
    userId: user._id,
    userEmail: user.email,
    userRole: user.role,
    department: "MCA",
    resourceType: modelName,
    resourceId: record._id.toString(),
    details: {
      modelName,
      updatedFields: Object.keys(parsed.data as object),
    },
    status: "SUCCESS",
    ipAddress,
    userAgent,
  });

  return record;
}

export async function deleteRecord<T>(
  model: Model<T>,
  modelName: string,
  id: string,
  user: IUser,
  req?: Request
) {
  if (!Types.ObjectId.isValid(id)) {
    throw new RecordServiceError("Invalid record ID", 400);
  }

  // RBAC: Only DEPARTMENT_ADMIN can delete records
  if (!hasRole(user.role, ["DEPARTMENT_ADMIN"])) {
    throw new RecordServiceError(
      "Forbidden. Only Department Administrators can permanently delete records.",
      403
    );
  }

  await connectDB();
  const record: any = await model.findById(id);
  if (!record) {
    throw new RecordServiceError("Record not found", 404);
  }

  await model.deleteOne({ _id: id });

  const ipAddress = req ? getClientIp(req) : "127.0.0.1";
  const userAgent = req ? getClientUserAgent(req) : "Server";

  await logAuditEvent({
    action: "record deletion",
    userId: user._id,
    userEmail: user.email,
    userRole: user.role,
    department: "MCA",
    resourceType: modelName,
    resourceId: id,
    details: { modelName },
    status: "SUCCESS",
    ipAddress,
    userAgent,
  });

  return { success: true, message: `${modelName} record deleted successfully` };
}

export async function reviewRecord<T>(
  model: Model<T>,
  modelName: string,
  id: string,
  decision: "APPROVE" | "REJECT" | "REQUEST_CORRECTION",
  comment: string,
  user: IUser,
  req?: Request
) {
  if (!Types.ObjectId.isValid(id)) {
    throw new RecordServiceError("Invalid record ID", 400);
  }

  // RBAC: Only REVIEWER and DEPARTMENT_ADMIN can review records
  if (!hasRole(user.role, ["DEPARTMENT_ADMIN", "REVIEWER"])) {
    throw new RecordServiceError(
      "Forbidden. Only Reviewers and Department Admins can verify records.",
      403
    );
  }

  await connectDB();
  const record: any = await model.findById(id);
  if (!record) {
    throw new RecordServiceError("Record not found", 404);
  }

  let auditAction: AuditAction;
  if (decision === "APPROVE") {
    record.status = "APPROVED";
    auditAction = "approval";
  } else if (decision === "REJECT") {
    record.status = "REJECTED";
    auditAction = "rejection";
  } else {
    record.status = "CORRECTION_REQUESTED";
    auditAction = "correction request";
  }

  record.reviewerComment = comment || "";
  record.updatedBy = user._id;

  record.auditHistory.push({
    action: `REVIEW_${decision}`,
    performedBy: user._id,
    performedByEmail: user.email,
    performedByRole: user.role,
    timestamp: new Date(),
    details: { decision, comment },
  });

  await record.save();

  const ipAddress = req ? getClientIp(req) : "127.0.0.1";
  const userAgent = req ? getClientUserAgent(req) : "Server";

  await logAuditEvent({
    action: auditAction,
    userId: user._id,
    userEmail: user.email,
    userRole: user.role,
    department: "MCA",
    resourceType: modelName,
    resourceId: record._id.toString(),
    details: { decision, comment, status: record.status },
    status: "SUCCESS",
    ipAddress,
    userAgent,
  });

  return record;
}

export async function attachEvidence<T>(
  model: Model<T>,
  modelName: string,
  id: string,
  evidence: { fileName: string; fileUrl: string; fileSize?: number },
  user: IUser,
  req?: Request
) {
  if (!Types.ObjectId.isValid(id)) {
    throw new RecordServiceError("Invalid record ID", 400);
  }

  if (!hasRole(user.role, ["DEPARTMENT_ADMIN", "FACULTY_CONTRIBUTOR"])) {
    throw new RecordServiceError("Forbidden. Cannot upload evidence.", 403);
  }

  await connectDB();
  const record: any = await model.findById(id);
  if (!record) {
    throw new RecordServiceError("Record not found", 404);
  }

  if (user.role === "FACULTY_CONTRIBUTOR") {
    const isOwner = record.createdBy.toString() === user._id.toString();
    const isAssigned = record.assignedTo?.toString() === user._id.toString();
    if (!isOwner && !isAssigned) {
      throw new RecordServiceError("Forbidden. Cannot upload evidence for unassigned records.", 403);
    }
  }

  const evidenceRef: IEvidenceReference = {
    fileName: evidence.fileName,
    fileUrl: evidence.fileUrl,
    fileSize: evidence.fileSize || 0,
    uploadedAt: new Date(),
    uploadedBy: user._id,
  };

  record.evidenceReferences.push(evidenceRef);
  record.updatedBy = user._id;

  record.auditHistory.push({
    action: "EVIDENCE_ATTACHED",
    performedBy: user._id,
    performedByEmail: user.email,
    performedByRole: user.role,
    timestamp: new Date(),
    details: { fileName: evidence.fileName, fileUrl: evidence.fileUrl },
  });

  await record.save();

  const ipAddress = req ? getClientIp(req) : "127.0.0.1";
  const userAgent = req ? getClientUserAgent(req) : "Server";

  await logAuditEvent({
    action: "file upload",
    userId: user._id,
    userEmail: user.email,
    userRole: user.role,
    department: "MCA",
    resourceType: modelName,
    resourceId: record._id.toString(),
    details: { fileName: evidence.fileName, fileUrl: evidence.fileUrl },
    status: "SUCCESS",
    ipAddress,
    userAgent,
  });

  return record;
}

