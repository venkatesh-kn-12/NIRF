import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User, UserRole, UserStatus } from "@/models/User";
import {
  extractTokenFromRequest,
  getSessionUser,
  toSafeUser,
  getClientIp,
  getClientUserAgent,
  invalidateAllUserSessions,
} from "@/lib/auth";
import { hasRole } from "@/lib/rbac";
import { logAuditEvent } from "@/lib/audit";

/**
 * GET /api/users/[id]
 * Fetch user details (restricted to DEPARTMENT_ADMIN).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { user: adminUser } = authData;
    if (!hasRole(adminUser.role, ["DEPARTMENT_ADMIN"])) {
      return NextResponse.json(
        { error: "Access denied. Only Department Admins can view user details." },
        { status: 403 }
      );
    }

    await connectDB();
    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user: toSafeUser(user),
    });
  } catch (error) {
    console.error("GET /api/users/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
  }
}

/**
 * PATCH /api/users/[id]
 * Edit user details, role, or status (restricted to DEPARTMENT_ADMIN).
 */
export async function PATCH(
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

    const { user: adminUser } = authData;
    if (!hasRole(adminUser.role, ["DEPARTMENT_ADMIN"])) {
      return NextResponse.json(
        { error: "Access denied. Only Department Admins can edit users." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, role, status, employeeId, studentId } = body;

    await connectDB();
    const targetUser = await User.findById(id);
    if (!targetUser) {
      return NextResponse.json({ error: "Target user not found" }, { status: 404 });
    }

    const oldRole = targetUser.role;
    const oldStatus = targetUser.status;

    // Check demotion of last active Department Admin
    if (
      role &&
      role !== "DEPARTMENT_ADMIN" &&
      targetUser.role === "DEPARTMENT_ADMIN" &&
      targetUser.status === "ACTIVE"
    ) {
      const activeAdminCount = await User.countDocuments({
        department: "MCA",
        role: "DEPARTMENT_ADMIN",
        status: "ACTIVE",
        _id: { $ne: targetUser._id },
      });
      if (activeAdminCount === 0) {
        return NextResponse.json(
          { error: "Cannot demote the last active Department Administrator." },
          { status: 400 }
        );
      }
    }

    // Check disabling of last active Department Admin
    if (
      status === "DISABLED" &&
      targetUser.role === "DEPARTMENT_ADMIN" &&
      targetUser.status === "ACTIVE"
    ) {
      const activeAdminCount = await User.countDocuments({
        department: "MCA",
        role: "DEPARTMENT_ADMIN",
        status: "ACTIVE",
        _id: { $ne: targetUser._id },
      });
      if (activeAdminCount === 0) {
        return NextResponse.json(
          { error: "Cannot disable the last active Department Administrator." },
          { status: 400 }
        );
      }
    }

    const validRoles: UserRole[] = [
      "DEPARTMENT_ADMIN",
      "FACULTY_CONTRIBUTOR",
      "REVIEWER",
      "VIEWER",
    ];
    if (role && !validRoles.includes(role)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${validRoles.join(", ")}` },
        { status: 400 }
      );
    }

    const validStatuses: UserStatus[] = ["ACTIVE", "INVITED", "DISABLED"];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    // Apply updates
    if (typeof name === "string" && name.trim()) {
      targetUser.name = name.trim();
    }
    if (role && validRoles.includes(role)) {
      targetUser.role = role;
    }
    if (status && validStatuses.includes(status)) {
      targetUser.status = status;
    }
    if (employeeId !== undefined) {
      targetUser.employeeId = employeeId ? employeeId.trim() : undefined;
    }
    if (studentId !== undefined) {
      targetUser.studentId = studentId ? studentId.trim() : undefined;
    }

    // Re-verify either employeeId or studentId is present
    if (!targetUser.employeeId && !targetUser.studentId) {
      return NextResponse.json(
        { error: "Either Employee ID or Student ID must be provided." },
        { status: 400 }
      );
    }

    await targetUser.save();

    // If disabled or role changed, invalidate existing sessions immediately
    if (status === "DISABLED" || (role && role !== oldRole)) {
      await invalidateAllUserSessions(targetUser._id);
    }

    // Audit changes
    let auditAction = "record update" as const;
    if (status && status !== oldStatus) {
      auditAction = "status change" as any;
    } else if (role && role !== oldRole) {
      auditAction = "role change" as any;
    }

    await logAuditEvent({
      action: auditAction as any,
      userId: adminUser._id,
      userEmail: adminUser.email,
      userRole: adminUser.role,
      department: "MCA",
      resourceType: "User",
      resourceId: targetUser._id.toString(),
      details: {
        targetUserId: targetUser._id.toString(),
        targetEmail: targetUser.email,
        oldRole,
        newRole: targetUser.role,
        oldStatus,
        newStatus: targetUser.status,
      },
      status: "SUCCESS",
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      message: "User updated successfully",
      user: toSafeUser(targetUser),
    });
  } catch (error) {
    console.error("PATCH /api/users/[id] error:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

