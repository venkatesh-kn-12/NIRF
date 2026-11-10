import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import {
  verifyPassword,
  createSession,
  COOKIE_OPTIONS,
  toSafeUser,
  getClientIp,
  getClientUserAgent,
} from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const ipAddress = getClientIp(req);
  const userAgent = getClientUserAgent(req);

  try {
    await connectDB();

    const body = await req.json();
    const { email, identifier, password } = body;
    const loginIdentifier = (identifier || email || "").trim();

    if (!loginIdentifier || !password) {
      await logAuditEvent({
        action: "failed login",
        status: "FAILURE",
        details: { reason: "Missing identifier or password" },
        ipAddress,
        userAgent,
      });

      return NextResponse.json(
        { error: "Email or Institutional ID and password are required" },
        { status: 400 }
      );
    }

    // Look up user by institutional email, employeeId, or studentId
    const user = await User.findOne({
      $or: [
        { email: loginIdentifier.toLowerCase() },
        { employeeId: loginIdentifier },
        { studentId: loginIdentifier },
      ],
    }).select("+passwordHash");

    if (!user) {
      await logAuditEvent({
        action: "failed login",
        status: "FAILURE",
        details: { attemptedIdentifier: loginIdentifier, reason: "User not found" },
        ipAddress,
        userAgent,
      });

      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Check account status
    if (user.status === "DISABLED") {
      await logAuditEvent({
        action: "failed login",
        userId: user._id,
        userEmail: user.email,
        userRole: user.role,
        status: "FAILURE",
        details: { reason: "Account is disabled" },
        ipAddress,
        userAgent,
      });

      return NextResponse.json(
        { error: "This institutional account is disabled. Contact your Department Admin." },
        { status: 403 }
      );
    }

    if (user.status === "INVITED") {
      await logAuditEvent({
        action: "failed login",
        userId: user._id,
        userEmail: user.email,
        userRole: user.role,
        status: "FAILURE",
        details: { reason: "Account not activated" },
        ipAddress,
        userAgent,
      });

      return NextResponse.json(
        { error: "This institutional account invitation has not been activated." },
        { status: 403 }
      );
    }

    // Verify password hash with bcrypt
    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      await logAuditEvent({
        action: "failed login",
        userId: user._id,
        userEmail: user.email,
        userRole: user.role,
        status: "FAILURE",
        details: { reason: "Incorrect password" },
        ipAddress,
        userAgent,
      });

      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Successful login: update lastLoginAt
    user.lastLoginAt = new Date();
    await user.save();

    // Create session in MongoDB
    const session = await createSession(user._id, user.role, req);

    // Audit log successful login
    await logAuditEvent({
      action: "login",
      userId: user._id,
      userEmail: user.email,
      userRole: user.role,
      department: user.department,
      status: "SUCCESS",
      details: {
        method: "password",
        loginTime: new Date().toISOString(),
      },
      ipAddress,
      userAgent,
    });

    const response = NextResponse.json({
      success: true,
      message: "Authentication successful",
      user: toSafeUser(user),
    });

    // Set server HTTP-only, SameSite cookie
    response.cookies.set(COOKIE_OPTIONS.name, session.token, COOKIE_OPTIONS);

    return response;
  } catch (error) {
    console.error("Login route error:", error);
    return NextResponse.json(
      { error: "An internal server error occurred during authentication" },
      { status: 500 }
    );
  }
}

