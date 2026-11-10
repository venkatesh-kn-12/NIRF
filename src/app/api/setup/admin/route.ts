import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import {
  hashPassword,
  validatePasswordStrength,
  createSession,
  COOKIE_OPTIONS,
  toSafeUser,
  getClientIp,
  getClientUserAgent,
} from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";

/**
 * GET /api/setup/admin
 * Checks whether the initial one-time admin setup is still available or locked
 */
export async function GET() {
  try {
    await connectDB();
    const adminCount = await User.countDocuments({ role: "DEPARTMENT_ADMIN" });

    return NextResponse.json({
      setupAvailable: adminCount === 0,
      adminConfigured: adminCount > 0,
      department: "MCA",
    });
  } catch (error) {
    console.error("Setup check error:", error);
    return NextResponse.json(
      { error: "Failed to check admin setup status" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/setup/admin
 * One-time admin setup. Permanently locked if any DEPARTMENT_ADMIN exists.
 */
export async function POST(req: NextRequest) {
  const ipAddress = getClientIp(req);
  const userAgent = getClientUserAgent(req);

  try {
    await connectDB();

    // 1. Verify that NO DEPARTMENT_ADMIN already exists
    const existingAdmin = await User.findOne({ role: "DEPARTMENT_ADMIN" });
    if (existingAdmin) {
      await logAuditEvent({
        action: "admin setup",
        status: "FAILURE",
        details: { reason: "Attempted setup when DEPARTMENT_ADMIN already exists" },
        ipAddress,
        userAgent,
      });

      return NextResponse.json(
        {
          error:
            "Admin setup is permanently blocked. A Department Administrator already exists.",
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, email, password, employeeId } = body;

    // 2. Validate input presence and format
    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json(
        { error: "Full Name must be at least 2 characters" },
        { status: 400 }
      );
    }

    if (!email || typeof email !== "string" || !/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json(
        { error: "A valid institutional email address is required" },
        { status: 400 }
      );
    }

    if (!employeeId || typeof employeeId !== "string" || employeeId.trim().length < 2) {
      return NextResponse.json(
        { error: "Institutional Employee ID is required" },
        { status: 400 }
      );
    }

    // 3. Validate strong password
    const passwordValidation = validatePasswordStrength(password || "");
    if (!passwordValidation.valid) {
      return NextResponse.json(
        {
          error: "Password does not meet institutional security requirements",
          details: passwordValidation.errors,
        },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanEmployeeId = employeeId.trim();

    // 4. Ensure email is not already in use
    const emailConflict = await User.findOne({ email: cleanEmail });
    if (emailConflict) {
      return NextResponse.json(
        { error: "An account with this email address already exists" },
        { status: 409 }
      );
    }

    // 5. Hash password with bcrypt
    const passwordHash = await hashPassword(password);

    // 6. Create the first Department Administrator
    const newAdmin = await User.create({
      name: name.trim(),
      email: cleanEmail,
      passwordHash,
      role: "DEPARTMENT_ADMIN",
      department: "MCA",
      employeeId: cleanEmployeeId,
      status: "ACTIVE",
      lastLoginAt: new Date(),
    });

    // 7. Create server session
    const session = await createSession(newAdmin._id, newAdmin.role, req);

    // 8. Log audit trail: admin setup & user creation
    await logAuditEvent({
      action: "admin setup",
      userId: newAdmin._id,
      userEmail: newAdmin.email,
      userRole: newAdmin.role,
      department: "MCA",
      resourceType: "User",
      resourceId: newAdmin._id.toString(),
      details: {
        name: newAdmin.name,
        email: newAdmin.email,
        employeeId: newAdmin.employeeId,
        role: newAdmin.role,
        note: "Initial Department Admin established",
      },
      status: "SUCCESS",
      ipAddress,
      userAgent,
    });

    await logAuditEvent({
      action: "user creation",
      userId: newAdmin._id,
      userEmail: newAdmin.email,
      userRole: newAdmin.role,
      department: "MCA",
      resourceType: "User",
      resourceId: newAdmin._id.toString(),
      details: {
        createdRole: newAdmin.role,
        createdBy: "system_setup",
      },
      status: "SUCCESS",
      ipAddress,
      userAgent,
    });

    // 9. Prepare response and set HTTP-only cookie
    const response = NextResponse.json(
      {
        success: true,
        message: "Initial Department Admin successfully configured",
        user: toSafeUser(newAdmin),
      },
      { status: 201 }
    );

    response.cookies.set(COOKIE_OPTIONS.name, session.token, COOKIE_OPTIONS);

    return response;
  } catch (error) {
    console.error("Admin setup error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred during admin setup" },
      { status: 500 }
    );
  }
}

