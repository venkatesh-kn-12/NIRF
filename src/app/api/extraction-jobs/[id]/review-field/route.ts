import { NextRequest, NextResponse } from "next/server";
import { reviewExtractedField } from "@/services/aiExtractionService";
import { extractTokenFromRequest, getSessionUser } from "@/lib/auth";
import { hasRole } from "@/lib/rbac";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = extractTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const authData = await getSessionUser(token);
    if (!authData) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    const { user } = authData;

    // RBAC: Contributors and Admins can review/confirm extracted fields
    if (!hasRole(user.role, ["DEPARTMENT_ADMIN", "FACULTY_CONTRIBUTOR", "REVIEWER"])) {
      return NextResponse.json(
        { error: `Forbidden. Role ${user.role} cannot review extracted fields.` },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { fieldIndexOrName, decision, correctedValue } = body;

    if (
      fieldIndexOrName === undefined ||
      !decision ||
      !["ACCEPTED", "REJECTED", "CORRECTED"].includes(decision)
    ) {
      return NextResponse.json(
        { error: "Valid fieldIndexOrName and decision (ACCEPTED | REJECTED | CORRECTED) are required" },
        { status: 400 }
      );
    }

    const updatedJob = await reviewExtractedField(
      id,
      fieldIndexOrName,
      decision,
      correctedValue,
      user,
      req
    );

    return NextResponse.json({
      success: true,
      message: `Field marked as ${decision}`,
      job: updatedJob,
    });
  } catch (error: any) {
    console.error("POST /api/extraction-jobs/[id]/review-field error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update field status" },
      { status: 400 }
    );
  }
}

