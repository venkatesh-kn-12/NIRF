import { NextRequest, NextResponse } from "next/server";
import { commitExtractionToDraftRecord } from "@/services/aiExtractionService";
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

    // RBAC: Contributors and Admins can create draft records from verified extractions
    if (!hasRole(user.role, ["DEPARTMENT_ADMIN", "FACULTY_CONTRIBUTOR"])) {
      return NextResponse.json(
        { error: `Forbidden. Role ${user.role} cannot create records.` },
        { status: 403 }
      );
    }

    const result = await commitExtractionToDraftRecord(id, user, req);

    return NextResponse.json({
      success: true,
      message: result.message,
      record: result.record,
      job: result.job,
    });
  } catch (error: any) {
    console.error("POST /api/extraction-jobs/[id]/commit error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to commit extraction to draft record" },
      { status: 400 }
    );
  }
}

