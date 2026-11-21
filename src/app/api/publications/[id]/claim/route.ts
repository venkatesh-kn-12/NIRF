import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Publication } from "@/models/Publication";
import { Faculty } from "@/models/Faculty";
import { extractTokenFromRequest, getSessionUser, getClientIp, getClientUserAgent } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { Types } from "mongoose";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid publication ID" }, { status: 400 });
    }

    const token = extractTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const authData = await getSessionUser(token);
    if (!authData) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    if (authData.user.role === "VIEWER") {
      return NextResponse.json({ error: "Viewers cannot claim publications" }, { status: 403 });
    }

    await connectDB();
    const publication = await Publication.findById(id);
    if (!publication) {
      return NextResponse.json({ error: "Publication not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const targetFacultyId = body.facultyId || authData.user._id;

    // Check if faculty profile exists
    let facultyDoc = await Faculty.findOne({
      $or: [
        { email: authData.user.email },
        { user: authData.user._id },
        ...(Types.ObjectId.isValid(targetFacultyId) ? [{ _id: targetFacultyId }] : []),
      ],
    });

    const facultyRef = facultyDoc?._id || (Types.ObjectId.isValid(targetFacultyId) ? targetFacultyId : null);

    // Add to internalFaculty if not already present
    if (facultyRef && !publication.internalFaculty.some((f: any) => f.toString() === facultyRef.toString())) {
      publication.internalFaculty.push(facultyRef as any);
    }

    publication.claimedBy = new Types.ObjectId(authData.user._id);
    publication.claimedAt = new Date();
    publication.updatedBy = authData.user._id;

    publication.auditHistory.push({
      action: "RECORD_UPDATED",
      performedBy: authData.user._id,
      performedByEmail: authData.user.email,
      performedByRole: authData.user.role,
      timestamp: new Date(),
      details: { action: "CLAIMED_AUTHORSHIP", facultyRef },
    });

    await publication.save();

    const ipAddress = getClientIp(req);
    const userAgent = getClientUserAgent(req);
    await logAuditEvent({
      action: "record update",
      userId: authData.user._id,
      userEmail: authData.user.email,
      userRole: authData.user.role,
      department: "MCA",
      resourceType: "Publication",
      resourceId: publication._id.toString(),
      details: { action: "CLAIMED_AUTHORSHIP", title: publication.title },
      status: "SUCCESS",
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      message: "Authorship claimed successfully",
      record: publication,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to claim publication" },
      { status: 500 }
    );
  }
}
