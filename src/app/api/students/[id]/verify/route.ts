import { NextRequest, NextResponse } from "next/server";
import { Student } from "@/models/Student";
import { reviewDecisionSchema } from "@/validators";
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
    const parsed = reviewDecisionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid review decision data", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { decision, comment } = parsed.data;
    const updated = await reviewRecord(
      Student,
      "Student",
      id,
      decision,
      comment,
      authData.user,
      req
    );

    return NextResponse.json({
      success: true,
      message: `Student record status updated to ${updated.status}`,
      record: updated,
      data: updated,
    });
  } catch (error: any) {
    if (error instanceof RecordServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: error.message || "Failed to review record" }, { status: 500 });
  }
}

