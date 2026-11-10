import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Evidence } from "@/models/Evidence";
import { storeEvidenceFile } from "@/services/evidenceStorage";
import { extractTokenFromRequest, getSessionUser, getClientIp, getClientUserAgent } from "@/lib/auth";
import { hasRole } from "@/lib/rbac";
import { logAuditEvent } from "@/lib/audit";

export async function GET(req: NextRequest) {
  try {
    const token = extractTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const authData = await getSessionUser(token);
    if (!authData) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    await connectDB();

    const searchParams = req.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const skip = (page - 1) * limit;

    const query: Record<string, any> = { department: "MCA" };

    const type = searchParams.get("type");
    if (type) query.relatedRecordType = type;

    const status = searchParams.get("status");
    if (status) query.uploadStatus = status;

    const q = searchParams.get("q");
    if (q) {
      query.originalFileName = { $regex: q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
    }

    const [data, total] = await Promise.all([
      Evidence.find(query)
        .populate("uploadedBy", "name email role employeeId")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Evidence.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (error: any) {
    console.error("GET /api/evidences error:", error);
    return NextResponse.json({ error: error.message || "Failed to list evidences" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const ipAddress = getClientIp(req);
  const userAgent = getClientUserAgent(req);

  try {
    const token = extractTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const authData = await getSessionUser(token);
    if (!authData) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    const { user } = authData;

    // RBAC: Contributors and Admins can upload
    if (!hasRole(user.role, ["DEPARTMENT_ADMIN", "FACULTY_CONTRIBUTOR"])) {
      return NextResponse.json(
        { error: `Forbidden. Role ${user.role} is not permitted to upload evidence.` },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const relatedRecordType = (formData.get("relatedRecordType") as string) || "Faculty";
    const academicYear = (formData.get("academicYear") as string) || "2024-25";
    const reportingPeriod = (formData.get("reportingPeriod") as string) || "NIRF-2025";
    const relatedRecordId = (formData.get("relatedRecordId") as string) || null;

    if (!file) {
      return NextResponse.json({ error: "No file was provided in form data" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Securely validate and store file outside public directory
    const stored = await storeEvidenceFile(buffer, file.name, file.type);

    await connectDB();

    const evidence = await Evidence.create({
      originalFileName: stored.originalFileName,
      storedFileName: stored.storedFileName,
      mimeType: stored.mimeType,
      fileSize: stored.fileSize,
      checksum: stored.checksum,
      uploadedBy: user._id,
      department: "MCA",
      academicYear,
      reportingPeriod,
      relatedRecordId,
      relatedRecordType,
      storagePath: stored.storagePath,
      uploadStatus: "STORED",
    });

    // Audit log: file upload
    await logAuditEvent({
      action: "file upload",
      userId: user._id,
      userEmail: user.email,
      userRole: user.role,
      department: "MCA",
      resourceType: "Evidence",
      resourceId: evidence._id.toString(),
      details: {
        originalFileName: stored.originalFileName,
        storedFileName: stored.storedFileName,
        fileSize: stored.fileSize,
        checksum: stored.checksum,
        mimeType: stored.mimeType,
        relatedRecordType,
      },
      status: "SUCCESS",
      ipAddress,
      userAgent,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Evidence file securely stored and registered",
        evidence,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("POST /api/evidences error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process evidence upload" },
      { status: 400 }
    );
  }
}

