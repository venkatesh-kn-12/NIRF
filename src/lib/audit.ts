import { connectDB } from "./db";
import { AuditLog, AuditAction } from "@/models/AuditLog";
import { Types } from "mongoose";

export interface LogAuditParams {
  action: AuditAction;
  userId?: string | Types.ObjectId | null;
  userEmail?: string;
  userRole?: string;
  department?: string;
  resourceType?: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  status?: "SUCCESS" | "FAILURE";
  ipAddress?: string;
  userAgent?: string;
}

export async function logAuditEvent(params: LogAuditParams) {
  try {
    await connectDB();

    let resolvedUserId: Types.ObjectId | null = null;
    if (params.userId) {
      if (typeof params.userId === "string") {
        if (Types.ObjectId.isValid(params.userId)) {
          resolvedUserId = new Types.ObjectId(params.userId);
        }
      } else {
        resolvedUserId = params.userId;
      }
    }

    const auditEntry = await AuditLog.create({
      action: params.action,
      userId: resolvedUserId,
      userEmail: params.userEmail || "",
      userRole: params.userRole || "",
      department: params.department || "MCA",
      resourceType: params.resourceType || "",
      resourceId: params.resourceId || "",
      details: params.details || {},
      status: params.status || "SUCCESS",
      ipAddress: params.ipAddress || "",
      userAgent: params.userAgent || "",
      timestamp: new Date(),
    });

    return auditEntry;
  } catch (error) {
    // Log error to server console, but don't crash main request flow
    console.error("Failed to write to AuditLog:", error);
    return null;
  }
}

