import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User, UserRole } from "@/models/User";
import {
  extractTokenFromRequest,
  getSessionUser,
  hashPassword,
  validatePasswordStrength,
  toSafeUser,
  getClientIp,
  getClientUserAgent,
} from "@/lib/auth";
import { hasRole } from "@/lib/rbac";
import { logAuditEvent } from "@/lib/audit";

/**
 * GET /api/users
 * Restricted to DEPARTMENT_ADMIN. Supports search, role/status filtering, and pagination.
 */
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
    if (!hasRole(user.role, ["DEPARTMENT_ADMIN"])) {
      return NextResponse.json(
        { error: "Access denied. Only Department Admins can view user management." },
        { status: 403 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const role = searchParams.get("role")?.trim() || "ALL";
    const status = searchParams.get("status")?.trim() || "ALL";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limitParam = searchParams.get("limit");
    const limit =
      limitParam === "all" || limitParam === "0"
        ? 0
        : Math.max(1, parseInt(limitParam || "10", 10));

    // Base query
    const query: Record<string, any> = { department: "MCA" };

    if (role && role !== "ALL") {
      query.role = role;
    }

    if (status && status !== "ALL") {
      query.status = status;
    }

    if (search) {
      const searchRegex = new RegExp(
        search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "i"
      );
      query.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { employeeId: searchRegex },
        { studentId: searchRegex },
      ];
    }

    // Counts across all users in MCA
    const [totalCount, activeCount, invitedCount, disabledCount] = await Promise.all([
      User.countDocuments({ department: "MCA" }),
      User.countDocuments({ department: "MCA", status: "ACTIVE" }),
      User.countDocuments({ department: "MCA", status: "INVITED" }),
      User.countDocuments({ department: "MCA", status: "DISABLED" }),
    ]);

    const filteredTotal = await User.countDocuments(query);

    let usersQuery = User.find(query).sort({ createdAt: -1 });
    if (limit > 0) {
      usersQuery = usersQuery.skip((page - 1) * limit).limit(limit);
    }
    const users = await usersQuery;

    return NextResponse.json({
      success: true,
      users: users.map(toSafeUser),
      pagination: {
        page,
        limit: limit === 0 ? filteredTotal : limit,
        total: filteredTotal,
        totalPages: limit === 0 ? 1 : Math.ceil(filteredTotal / limit) || 1,
      },
      counts: {
        total: totalCount,
        active: activeCount,
        invited: invitedCount,
        disabled: disabledCount,
      },
    });
  } catch (error) {
    console.error("GET /api/users error:", error);
    return NextResponse.json({ error: "Failed to list users" }, { status: 500 });
  }
}

/**
 * POST /api/users
 * Create a new authorized user. Restricted to DEPARTMENT_ADMIN.
 */
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

    const { user: adminUser } = authData;
    if (!hasRole(adminUser.role, ["DEPARTMENT_ADMIN"])) {
      return NextResponse.json(
        { error: "Access denied. Only Department Admins can create new users." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, email, password, role, employeeId, studentId, status } = body;

    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { error: "Name, email, password, and role are required." },
        { status: 400 }
      );
    }

    const validRoles: UserRole[] = [
      "DEPARTMENT_ADMIN",
      "FACULTY_CONTRIBUTOR",
      "REVIEWER",
      "VIEWER",
    ];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${validRoles.join(", ")}` },
        { status: 400 }
      );
    }

    if (!employeeId && !studentId) {
      return NextResponse.json(
        { error: "Either Employee ID or Student ID is required." },
        { status: 400 }
      );
    }

    const pwdCheck = validatePasswordStrength(password);
    if (!pwdCheck.valid) {
      return NextResponse.json(
        {
          error: "Password does not meet institutional requirements",
          details: pwdCheck.errors,
        },
        { status: 400 }
      );
    }

    await connectDB();

    const cleanEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return NextResponse.json(
        { error: "A user with this institutional email already exists." },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    const newUser = await User.create({
      name: name.trim(),
      email: cleanEmail,
      passwordHash,
      role,
      department: "MCA",
      employeeId: employeeId?.trim(),
      studentId: studentId?.trim(),
      status: status || "ACTIVE",
    });

    // Audit log user creation
    await logAuditEvent({
      action: "user creation",
      userId: adminUser._id,
      userEmail: adminUser.email,
      userRole: adminUser.role,
      department: "MCA",
      resourceType: "User",
      resourceId: newUser._id.toString(),
      details: {
        createdUserId: newUser._id.toString(),
        createdUserEmail: newUser.email,
        assignedRole: newUser.role,
        assignedStatus: newUser.status,
      },
      status: "SUCCESS",
      ipAddress,
      userAgent,
    });

    return NextResponse.json(
      {
        success: true,
        message: "User created successfully",
        user: toSafeUser(newUser),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/users error:", error);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}

