import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User, UserRole } from "@/models/User";
import {
  extractTokenFromRequest,
  getSessionUser,
  toSafeUser,
  getClientIp,
  getClientUserAgent,
} from "@/lib/auth";
import { hasRole } from "@/lib/rbac";
import { logAuditEvent } from "@/lib/audit";

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
        { error: "Access denied. Only Department Admins can change user roles." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { role } = body;

    const validRoles: UserRole[] = [
      "DEPARTMENT_ADMIN",
      "FACULTY_CONTRIBUTOR",
      "REVIEWER",
      "VIEWER",
    ];
    if (!role || !validRoles.includes(role)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${validRoles.join(", ")}` },
        { status: 400 }
      );
    }

    await connectDB();
    const targetUser = await User.findById(id);
    if (!targetUser) {
      return NextResponse.json({ error: "Target user not found" }, { status: 404 });
    }

    // Prevent demoting the last active Department Admin
    if (
      targetUser.role === "DEPARTMENT_ADMIN" &&
      role !== "DEPARTMENT_ADMIN" &&
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

    const oldRole = targetUser.role;
    targetUser.role = role;
    await targetUser.save();

    // Audit log role change
    await logAuditEvent({
      action: "role change",
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
        newRole: role,
      },
      status: "SUCCESS",
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      message: `Role updated from ${oldRole} to ${role}`,
      user: toSafeUser(targetUser),
    });
  } catch (error) {
    console.error("PATCH /api/users/[id]/role error:", error);
    return NextResponse.json(
      { error: "Failed to update user role" },
      { status: 500 }
    );
  }
}

