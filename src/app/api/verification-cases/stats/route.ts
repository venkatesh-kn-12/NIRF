import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { VerificationCase } from "@/models/VerificationCase";
import { extractTokenFromRequest, getSessionUser } from "@/lib/auth";
import { hasRole } from "@/lib/rbac";

export async function GET(req: NextRequest) {
  try {
    const token = extractTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const authData = await getSessionUser(token);
    if (!authData) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasRole(authData.user.role, ["DEPARTMENT_ADMIN", "REVIEWER", "FACULTY_CONTRIBUTOR"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const openStatuses = ["OPEN", "IN_REVIEW"];

    const [totalOpen, highSeverity, missingEvidence, byParameter, recentResolved] =
      await Promise.all([
        VerificationCase.countDocuments({
          department: "MCA",
          status: { $in: openStatuses },
        }),
        VerificationCase.countDocuments({
          department: "MCA",
          status: { $in: openStatuses },
          severity: "HIGH",
        }),
        VerificationCase.countDocuments({
          department: "MCA",
          status: { $in: openStatuses },
          issueType: "MISSING_EVIDENCE",
        }),
        VerificationCase.aggregate([
          { $match: { department: "MCA", status: { $in: openStatuses } } },
          { $group: { _id: "$parameter", count: { $sum: 1 } } },
        ]),
        VerificationCase.find({
          department: "MCA",
          status: { $in: ["RESOLVED", "REJECTED"] },
          resolvedAt: { $exists: true },
        })
          .select("createdAt resolvedAt")
          .lean()
          .limit(100),
      ]);

    // Calculate average resolution time in hours
    let avgResolutionHours = 0;
    if (recentResolved.length > 0) {
      const totalMs = recentResolved.reduce((sum: number, c: Record<string, unknown>) => {
        const resolved = c.resolvedAt as string | undefined;
        const created = c.createdAt as string | undefined;
        if (resolved && created) {
          return sum + (new Date(resolved).getTime() - new Date(created).getTime());
        }
        return sum;
      }, 0);
      avgResolutionHours =
        Math.round((totalMs / recentResolved.length / 3600000) * 10) / 10;
    }

    const parameterCounts: Record<string, number> = {};
    for (const p of byParameter) {
      parameterCounts[p._id as string] = p.count as number;
    }

    return NextResponse.json({
      totalOpen,
      highSeverity,
      missingEvidence,
      avgResolutionHours,
      byParameter: parameterCounts,
    });
  } catch (err: unknown) {
    console.error("[GET /api/verification-cases/stats]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

