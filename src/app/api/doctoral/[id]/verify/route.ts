import { NextRequest, NextResponse } from "next/server";
import { DoctoralEnrolmentStatement } from "@/models/DoctoralEnrolmentStatement";
import { reviewRecord, RecordServiceError } from "@/services/departmentRecordService";
import { extractTokenFromRequest, getSessionUser } from "@/lib/auth";

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

    const body = await req.json();
    const { decision, comment } = body;

    if (!["APPROVE", "REJECT", "REQUEST_CORRECTION"].includes(decision)) {
      return NextResponse.json({ error: "Invalid review decision" }, { status: 400 });
    }

    const reviewed = await reviewRecord(
      DoctoralEnrolmentStatement,
      "DoctoralEnrolmentStatement",
      id,
      decision,
      comment || "",
      authData.user,
      req
    );

    return NextResponse.json({
      success: true,
      message: `Doctoral statement ${decision.toLowerCase()}d successfully`,
      record: reviewed,
    });
  } catch (error: any) {
    if (error instanceof RecordServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: error.message || "Failed to process review" }, { status: 500 });
  }
}
