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

export async function PUT(
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

    // RBAC: Only DEPARTMENT_ADMIN and FACULTY_CONTRIBUTOR can edit records
    if (!hasRole(user.role, ["DEPARTMENT_ADMIN", "FACULTY_CONTRIBUTOR"])) {
      return NextResponse.json(
        { error: "Forbidden. Only Contributors and Admins can edit records." },
        { status: 403 }
      );
    }

    await connectDB();
    const record = await DepartmentRecord.findById(id);
    if (!record) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    // Faculty Contributor can only edit assigned records or their own records
    if (user.role === "FACULTY_CONTRIBUTOR") {
      const isOwner = record.createdBy.toString() === user._id.toString();
      const isAssigned = record.assignedTo?.toString() === user._id.toString();
      if (!isOwner && !isAssigned) {
        return NextResponse.json(
          { error: "Access denied. You can only edit records assigned to you." },
          { status: 403 }
        );
      }
    }

    const body = await req.json();
    const { title, data, status } = body;

    if (title) record.title = title.trim();
    if (data) record.data = data;
    if (status && ["DRAFT", "SUBMITTED"].includes(status)) {
      record.status = status;
    }
    record.updatedBy = user._id;

    await record.save();

    // Audit log: record update
    await logAuditEvent({
      action: "record update",
      userId: user._id,
      userEmail: user.email,
      userRole: user.role,
      department: "MCA",
      resourceType: "DepartmentRecord",
      resourceId: record._id.toString(),
      details: {
        title: record.title,
        status: record.status,
      },
      status: "SUCCESS",
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      message: "Record updated successfully",
      record,
    });
  } catch (error) {
    console.error("PUT /api/records/[id] error:", error);
    return NextResponse.json({ error: "Failed to update record" }, { status: 500 });
  }
}

export async function DELETE(
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

    // RBAC: Only DEPARTMENT_ADMIN can delete records
    if (!hasRole(user.role, ["DEPARTMENT_ADMIN"])) {
      return NextResponse.json(
        { error: "Forbidden. Only Department Admins can delete records." },
        { status: 403 }
      );
    }

    await connectDB();
    const record = await DepartmentRecord.findById(id);
    if (!record) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    await DepartmentRecord.deleteOne({ _id: record._id });

    // Audit log: record deletion
    await logAuditEvent({
      action: "record deletion",
      userId: user._id,
      userEmail: user.email,
      userRole: user.role,
      department: "MCA",
      resourceType: "DepartmentRecord",
      resourceId: record._id.toString(),
      details: {
        title: record.title,
        category: record.category,
      },
      status: "SUCCESS",
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      message: "Record deleted successfully",
    });
  } catch (error) {
    console.error("DELETE /api/records/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete record" }, { status: 500 });
  }
}

