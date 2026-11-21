import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User, ActiveRole } from "@/models/User";
import { Session } from "@/models/Session";
import { extractTokenFromRequest, getSessionUser } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";

/**
 * GET /api/users/migrate-reviewers
 * Performs an idempotent dry-run inspection of users with the legacy REVIEWER role.
 */
export async function GET(req: NextRequest) {
  try {
    const token = extractTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

    const auth = await getSessionUser(token);
    if (!auth || auth.user.role !== "DEPARTMENT_ADMIN") {
      return NextResponse.json({ error: "Forbidden. Admin only." }, { status: 403 });
    }

    await connectDB();

    const legacyReviewers = await User.find({ role: "REVIEWER" })
      .select("_id name email role status employeeId createdAt lastLoginAt")
      .lean();

    return NextResponse.json({
      success: true,
      legacyReviewersCount: legacyReviewers.length,
      legacyReviewers,
      availableTargetRoles: ["FACULTY_CONTRIBUTOR", "VIEWER"],
      recommendation:
        legacyReviewers.length === 0
          ? "No legacy reviewer accounts found in database. All accounts comply with the 3 active roles."
          : `Found ${legacyReviewers.length} legacy reviewer account(s). Use POST to remap them to FACULTY_CONTRIBUTOR or VIEWER.`,
    });
  } catch (err: any) {
    console.error("GET /api/users/migrate-reviewers error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/users/migrate-reviewers
 * Explicitly remaps one or more legacy reviewers to an active role (or disables them)
 * and invalidates their sessions.
 */
export async function POST(req: NextRequest) {
  try {
    const token = extractTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

    const auth = await getSessionUser(token);
    if (!auth || auth.user.role !== "DEPARTMENT_ADMIN") {
      return NextResponse.json({ error: "Forbidden. Admin only." }, { status: 403 });
    }

    await connectDB();
    const body = await req.json();
    const { mappings } = body; // Array of { userId: string, targetRole: ActiveRole, targetStatus?: "ACTIVE" | "DISABLED" }

    if (!Array.isArray(mappings) || mappings.length === 0) {
      return NextResponse.json(
        { error: "Invalid payload. 'mappings' array of { userId, targetRole } is required." },
        { status: 400 }
      );
    }

    const validTargetRoles: ActiveRole[] = ["FACULTY_CONTRIBUTOR", "VIEWER"];
    const results = [];

    for (const m of mappings) {
      if (!validTargetRoles.includes(m.targetRole)) {
        return NextResponse.json(
          { error: `Invalid targetRole '${m.targetRole}'. Allowed: ${validTargetRoles.join(", ")}` },
          { status: 400 }
        );
      }

      const user = await User.findById(m.userId);
      if (!user) continue;

      const previousRole = user.role;
      user.role = m.targetRole as any;
      if (m.targetStatus) {
        user.status = m.targetStatus;
      }
      await user.save();

      // Invalidate existing sessions for this user so they re-authenticate with new role
      await Session.deleteMany({ userId: user._id });

      await logAuditEvent({
        action: "role change",
        userId: auth.user._id,
        userEmail: auth.user.email,
        userRole: auth.user.role,
        department: "MCA",
        resourceType: "User",
        resourceId: user._id.toString(),
        details: {
          event: "LEGACY_ROLE_MIGRATION",
          previousRole,
          newRole: m.targetRole,
          sessionsInvalidated: true,
        },
        status: "SUCCESS",
      });

      results.push({
        userId: user._id,
        email: user.email,
        previousRole,
        newRole: user.role,
        status: user.status,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Migrated ${results.length} reviewer account(s). Affected sessions invalidated.`,
      migratedUsers: results,
    });
  } catch (err: any) {
    console.error("POST /api/users/migrate-reviewers error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
