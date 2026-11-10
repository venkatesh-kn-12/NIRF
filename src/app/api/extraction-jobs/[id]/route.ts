import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { ExtractionJob } from "@/models/ExtractionJob";
import { extractTokenFromRequest, getSessionUser } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = extractTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const authData = await getSessionUser(token);
    if (!authData) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    await connectDB();

    const job = await ExtractionJob.findById(id)
      .populate("evidenceId")
      .populate("createdBy", "name email role")
      .populate("extractedFields.reviewedBy", "name email role");

    if (!job) {
      return NextResponse.json({ error: "Extraction job not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, job });
  } catch (error: any) {
    console.error("GET /api/extraction-jobs/[id] error:", error);
    return NextResponse.json({ error: error.message || "Failed to retrieve job" }, { status: 500 });
  }
}

