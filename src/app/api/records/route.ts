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

export async function GET(req: NextRequest) {
  try {
    const token = extractTokenFromRequest(req);
    if (!token) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const authData = await getSessionUser(token);
    if (!authData) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const { user } = authData;
    await connectDB();

    let query: Record<string, unknown> = { department: "MCA" };

    // RBAC-based query filtering
    if (user.role === "VIEWER") {
      // VIEWER: read-only access to APPROVED data only
      query.status = "APPROVED";
    } else if (user.role === "FACULTY_CONTRIBUTOR") {
      // FACULTY_CONTRIBUTOR: view assigned or created records, or approved records
      query = {
        department: "MCA",
        $or: [
          { createdBy: user._id },
          { assignedTo: user._id },
          { status: "APPROVED" },
        ],
      };
    }
    // REVIEWER and DEPARTMENT_ADMIN can view all department records

    const records = await DepartmentRecord.find(query)
      .populate("createdBy", "name email employeeId role")
      .populate("updatedBy", "name email employeeId role")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      count: records.length,
      records,
    });
  } catch (error) {
    console.error("GET /api/records error:", error);
    return NextResponse.json({ error: "Failed to retrieve records" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const ipAddress = getClientIp(req);
  const userAgent = getClientUserAgent(req);

  try {
    const token = extractTokenFromRequest(req);
    if (!token) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const authData = await getSessionUser(token);
    if (!authData) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const { user } = authData;

    // RBAC: Only DEPARTMENT_ADMIN and FACULTY_CONTRIBUTOR can create records
    if (!hasRole(user.role, ["DEPARTMENT_ADMIN", "FACULTY_CONTRIBUTOR"])) {
      return NextResponse.json(
        {
          error: "Forbidden. Reviewers and Viewers cannot create records.",
          currentRole: user.role,
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { title, category, academicYear, reportingPeriod, data } = body;

    if (!title || !category) {
      return NextResponse.json(
        { error: "Title and Category are required" },
        { status: 400 }
      );
    }

    await connectDB();

    const newRecord = await DepartmentRecord.create({
      title: title.trim(),
      category,
      department: "MCA",
      academicYear: academicYear || "2023-24",
      reportingPeriod: reportingPeriod || "NIRF-2025",
      status: "DRAFT",
      data: data || {},
      createdBy: user._id,
      updatedBy: user._id,
    });

    // Audit log: record creation
    await logAuditEvent({
      action: "record creation",
      userId: user._id,
      userEmail: user.email,
      userRole: user.role,
      department: "MCA",
      resourceType: "DepartmentRecord",
      resourceId: newRecord._id.toString(),
      details: {
        title: newRecord.title,
        category: newRecord.category,
        academicYear: newRecord.academicYear,
      },
      status: "SUCCESS",
      ipAddress,
      userAgent,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Record created successfully",
        record: newRecord,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/records error:", error);
    return NextResponse.json({ error: "Failed to create record" }, { status: 500 });
  }
}

