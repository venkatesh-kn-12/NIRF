import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { DepartmentRecord } from "@/models/DepartmentRecord";
import {
  extractTokenFromRequest,
  getSessionUser,
  getClientIp,
  getClientUserAgent,
} from "@/lib/auth";
import { hasRole } from "@/lib/rbac";
import { logAuditEvent } from "@/lib/audit";
import { AuditAction } from "@/models/AuditLog";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ipAddress = getClientIp(req);
  const userAgent = getClientUserAgent(req);

  try {
    const { id } = await params;
    const token = extractTokenFromRequest(req);
    if (!token) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const authData = await getSessionUser(token);
    if (!authData) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const { user } = authData;

    // RBAC: Only REVIEWER and DEPARTMENT_ADMIN can verify, approve, reject, or request correction
    if (!hasRole(user.role, ["DEPARTMENT_ADMIN", "REVIEWER"])) {
      return NextResponse.json(
        {
          error: "Forbidden. Only Reviewers and Department Admins can verify records.",
          currentRole: user.role,
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { decision, comment } = body;

    if (!decision || !["APPROVE", "REJECT", "REQUEST_CORRECTION"].includes(decision)) {
      return NextResponse.json(
        { error: "Valid decision required: APPROVE | REJECT | REQUEST_CORRECTION" },
        { status: 400 }
      );
    }

    await connectDB();
    const record = await DepartmentRecord.findById(id);
    if (!record) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
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
    await record.save();

    // Audit log
    await logAuditEvent({
      action: auditAction,
      userId: user._id,
      userEmail: user.email,
      userRole: user.role,
      department: "MCA",
      resourceType: "DepartmentRecord",
      resourceId: record._id.toString(),
      details: {
        recordTitle: record.title,
        decision,
        comment: comment || "",
        newStatus: record.status,
      },
      status: "SUCCESS",
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      message: `Record successfully updated to ${record.status}`,
      record,
    });
  } catch (error) {
    console.error("POST /api/records/[id]/verify error:", error);
    return NextResponse.json(
      { error: "Failed to process verification decision" },
      { status: 500 }
    );
  }
}

