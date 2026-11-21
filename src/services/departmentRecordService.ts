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
    // VIEWER can see RECORDED and legacy APPROVED records
    if (!query.status) {
      query.status = { $in: ["RECORDED", "APPROVED"] };
    }
  } else if (user.role === "FACULTY_CONTRIBUTOR") {
    // Contributor can see recorded/approved records, plus their own drafts
    if (!query.status) {
      query.$or = [
        { status: { $in: ["RECORDED", "APPROVED"] } },
        { createdBy: user._id },
        { assignedTo: user._id },
      ];
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
  const isPublicActive = record.status === "APPROVED" || record.status === "RECORDED";

  if (user.role === "VIEWER") {
    if (!isPublicActive) {
      throw new RecordServiceError("Forbidden. Viewers can only access saved or recorded records.", 403);
    }

    // Preserve record-type visibility & field-level privacy for VIEWER
    const collectionName = (model as any).collection?.name || "";
    if (collectionName === "students") {
      delete record.dateOfBirth;
      delete record.email;
    } else if (collectionName === "financerecords") {
      delete record.voucherNumber;
      delete record.vendor;
    }
  }

  if (user.role === "FACULTY_CONTRIBUTOR") {
    const isOwner = record.createdBy?._id?.toString() === user._id.toString();
    const isAssigned = record.assignedTo?._id?.toString() === user._id.toString();
    if (!isOwner && !isAssigned && !isPublicActive) {
      throw new RecordServiceError("Forbidden. You cannot view this draft or archived record.", 403);
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
    status: (parsed.data as any).status === "DRAFT" ? "DRAFT" : "RECORDED",
    createdBy: user._id,
    updatedBy: user._id,
    auditHistory: [
      {
        action: "RECORD_CREATED",
        performedBy: user._id,
        performedByEmail: user.email,
        performedByRole: user.role,
        timestamp: new Date(),
        details: { modelName, status: (parsed.data as any).status === "DRAFT" ? "DRAFT" : "RECORDED" },
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

  if (record.status === "ARCHIVED" && user.role !== "DEPARTMENT_ADMIN") {
    throw new RecordServiceError(
      "Forbidden. Archived records cannot be edited by faculty contributors.",
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
    details: {
      updatedFields: Object.keys(parsed.data as object),
    },
  });

  await record.save();

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

export async function archiveRecord<T>(
  model: Model<T>,
  modelName: string,
  id: string,
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

  // RBAC: Admins can archive any; Contributors can archive own
  if (user.role === "FACULTY_CONTRIBUTOR") {
    const isOwner = record.createdBy.toString() === user._id.toString();
    if (!isOwner) {
      throw new RecordServiceError("Forbidden. You can only archive your own records.", 403);
    }
  } else if (user.role !== "DEPARTMENT_ADMIN") {
    throw new RecordServiceError("Forbidden. You cannot archive records.", 403);
  }

  record.status = "ARCHIVED";
  record.updatedBy = user._id;
  record.auditHistory.push({
    action: "RECORD_ARCHIVED",
    performedBy: user._id,
    performedByEmail: user.email,
    performedByRole: user.role,
    timestamp: new Date(),
    details: { modelName },
  });

  await record.save();

  const ipAddress = req ? getClientIp(req) : "127.0.0.1";
  const userAgent = req ? getClientUserAgent(req) : "Server";

  await logAuditEvent({
    action: "record update",
    userId: user._id,
    userEmail: user.email,
    userRole: user.role,
    department: "MCA",
    resourceType: modelName,
    resourceId: record._id.toString(),
    details: { modelName, status: "ARCHIVED" },
    status: "SUCCESS",
    ipAddress,
    userAgent,
  });

  return { success: true, message: `${modelName} record archived successfully`, record };
}

export async function restoreRecord<T>(
  model: Model<T>,
  modelName: string,
  id: string,
  user: IUser,
  req?: Request
) {
  if (!Types.ObjectId.isValid(id)) {
    throw new RecordServiceError("Invalid record ID", 400);
  }

  if (user.role !== "DEPARTMENT_ADMIN") {
    throw new RecordServiceError("Forbidden. Only Department Administrators can restore archived records.", 403);
  }

  await connectDB();
  const record: any = await model.findById(id);
  if (!record) {
    throw new RecordServiceError("Record not found", 404);
  }

  record.status = "RECORDED";
  record.updatedBy = user._id;
  record.auditHistory.push({
    action: "RECORD_RESTORED",
    performedBy: user._id,
    performedByEmail: user.email,
    performedByRole: user.role,
    timestamp: new Date(),
    details: { modelName },
  });

  await record.save();

  const ipAddress = req ? getClientIp(req) : "127.0.0.1";
  const userAgent = req ? getClientUserAgent(req) : "Server";

  await logAuditEvent({
    action: "record update",
    userId: user._id,
    userEmail: user.email,
    userRole: user.role,
    department: "MCA",
    resourceType: modelName,
    resourceId: record._id.toString(),
    details: { modelName, status: "RECORDED", restored: true },
    status: "SUCCESS",
    ipAddress,
    userAgent,
  });

  return { success: true, message: `${modelName} record restored to recorded status`, record };
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

  // RBAC: Only DEPARTMENT_ADMIN can permanently delete records. Contributors archive.
  if (user.role !== "DEPARTMENT_ADMIN") {
    throw new RecordServiceError(
      "Forbidden. Only Department Administrators can permanently delete records. Contributors can archive records.",
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
): Promise<any> {
  throw new RecordServiceError(
    "The operational reviewer/verification workflow has been decommissioned. Department records operate under the direct DRAFT / RECORDED / ARCHIVED lifecycle and are active once RECORDED.",
    410
  );
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

