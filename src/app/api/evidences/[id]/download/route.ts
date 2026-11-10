import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Evidence } from "@/models/Evidence";
import { readEvidenceFile } from "@/services/evidenceStorage";
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

    const evidence = await Evidence.findById(id);
    if (!evidence) {
      return NextResponse.json({ error: "Evidence record not found" }, { status: 404 });
    }

    const buffer = await readEvidenceFile(evidence.storedFileName);

    // Return binary file with safe headers
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": evidence.mimeType || "application/octet-stream",
        "Content-Disposition": `inline; filename="${encodeURIComponent(evidence.originalFileName)}"`,
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error: any) {
    console.error("GET /api/evidences/[id]/download error:", error);
    return NextResponse.json({ error: error.message || "Failed to download file" }, { status: 500 });
  }
}
