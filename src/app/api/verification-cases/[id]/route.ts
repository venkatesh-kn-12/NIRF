import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { VerificationCase } from "@/models/VerificationCase";
import { extractTokenFromRequest, getSessionUser } from "@/lib/auth";
import { hasRole } from "@/lib/rbac";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = extractTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const authData = await getSessionUser(token);
    if (!authData) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasRole(authData.user.role, ["DEPARTMENT_ADMIN", "REVIEWER", "FACULTY_CONTRIBUTOR"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const { id } = await params;
    const verificationCase = await VerificationCase.findById(id)
      .populate("assignedReviewer", "name email role")
      .populate("resolvedBy", "name email role")
      .lean();

    if (!verificationCase) {
      return NextResponse.json({ error: "Verification case not found" }, { status: 404 });
    }

    return NextResponse.json({ case: verificationCase });
  } catch (err: unknown) {
    console.error("[GET /api/verification-cases/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

