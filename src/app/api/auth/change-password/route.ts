import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import {
  extractTokenFromRequest,
  getSessionUser,
  verifyPassword,
  hashPassword,
  validatePasswordStrength,
  invalidateAllUserSessions,
  getClientIp,
  getClientUserAgent,
} from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const ipAddress = getClientIp(req);
  const userAgent = getClientUserAgent(req);

  try {
    const token = extractTokenFromRequest(req);
    if (!token) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const authData = await getSessionUser(token);
    if (!authData) {
      return NextResponse.json(
        { error: "Session expired or invalid" },
        { status: 401 }
      );
    }

    const { user, session } = authData;

    const body = await req.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Current password and new password are required" },
        { status: 400 }
      );
    }

    await connectDB();
    const dbUser = await User.findById(user._id).select("+passwordHash");
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify current password
    const isCurrentValid = await verifyPassword(currentPassword, dbUser.passwordHash);
    if (!isCurrentValid) {
      await logAuditEvent({
        action: "password change",
        userId: dbUser._id,
        userEmail: dbUser.email,
        userRole: dbUser.role,
        status: "FAILURE",
        details: { reason: "Incorrect current password provided" },
        ipAddress,
        userAgent,
      });

      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 400 }
      );
    }

    // Verify new password is not identical to current
    if (currentPassword === newPassword) {
      return NextResponse.json(
        { error: "New password cannot be the same as the current password" },
        { status: 400 }
      );
    }

    // Validate new password strength
    const validation = validatePasswordStrength(newPassword);
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: "New password does not meet institutional security requirements",
          details: validation.errors,
        },
        { status: 400 }
      );
    }

    // Hash and persist new password
    dbUser.passwordHash = await hashPassword(newPassword);
    await dbUser.save();

    // Invalidate all other sessions for security, preserving the current session
    await invalidateAllUserSessions(dbUser._id, session.token);

    // Audit log successful password change
    await logAuditEvent({
      action: "password change",
      userId: dbUser._id,
      userEmail: dbUser.email,
      userRole: dbUser.role,
      department: dbUser.department,
      status: "SUCCESS",
      details: { note: "Password updated and other active sessions invalidated" },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change password route error:", error);
    return NextResponse.json(
      { error: "Failed to update password" },
      { status: 500 }
    );
  }
}

