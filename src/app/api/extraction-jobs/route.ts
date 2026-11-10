import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { ExtractionJob } from "@/models/ExtractionJob";
import { createExtractionJob, getAIConfig } from "@/services/aiExtractionService";
import { extractTokenFromRequest, getSessionUser } from "@/lib/auth";
import { hasRole } from "@/lib/rbac";

export async function GET(req: NextRequest) {
  try {
    const token = extractTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const authData = await getSessionUser(token);
    if (!authData) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    await connectDB();

    const searchParams = req.nextUrl.searchParams;
    const evidenceId = searchParams.get("evidenceId");
    const status = searchParams.get("status");

    const query: Record<string, any> = { department: "MCA" };
    if (evidenceId) query.evidenceId = evidenceId;
    if (status) query.status = status;

    const jobs = await ExtractionJob.find(query)
      .populate("evidenceId", "originalFileName storedFileName mimeType fileSize checksum")
      .populate("createdBy", "name email role")
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const aiConfig = getAIConfig();

    return NextResponse.json({
      success: true,
      jobs,
      aiConfigured: aiConfig.isConfigured,
      aiProvider: aiConfig.provider,
    });
  } catch (error: any) {
    console.error("GET /api/extraction-jobs error:", error);
    return NextResponse.json({ error: error.message || "Failed to list extraction jobs" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = extractTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const authData = await getSessionUser(token);
    if (!authData) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    const { user } = authData;

    // RBAC: Contributors and Admins can trigger extraction jobs
    if (!hasRole(user.role, ["DEPARTMENT_ADMIN", "FACULTY_CONTRIBUTOR"])) {
      return NextResponse.json(
        { error: `Forbidden. Role ${user.role} cannot initiate extraction jobs.` },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { evidenceId, relatedRecordType } = body;

    if (!evidenceId || !relatedRecordType) {
      return NextResponse.json(
        { error: "evidenceId and relatedRecordType are required" },
        { status: 400 }
      );
    }

    const job = await createExtractionJob(evidenceId, relatedRecordType, user, req);

    return NextResponse.json(
      {
        success: true,
        message: "Extraction job processed",
        job,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("POST /api/extraction-jobs error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to start extraction job" },
      { status: 400 }
    );
  }
}

