import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import { Student } from "@/models/Student";
import { Faculty } from "@/models/Faculty";
import { FinanceRecord } from "@/models/FinanceRecord";
import { Publication } from "@/models/Publication";
import { Patent } from "@/models/Patent";
import { ProjectConsultancy } from "@/models/ProjectConsultancy";
import { GraduationOutcome } from "@/models/GraduationOutcome";
import { PlacementRecord } from "@/models/PlacementRecord";
import { OutreachRecord } from "@/models/OutreachRecord";
import { PerceptionRecord } from "@/models/PerceptionRecord";
import { DepartmentRecord } from "@/models/DepartmentRecord";
import {
  extractTokenFromRequest,
  getSessionUser,
  getClientIp,
  getClientUserAgent,
} from "@/lib/auth";
import { hasRole } from "@/lib/rbac";
import { logAuditEvent } from "@/lib/audit";

const MODEL_MAP: Record<string, any> = {
  Student,
  Faculty,
  FinanceRecord,
  Publication,
  Patent,
  ProjectConsultancy,
  GraduationOutcome,
  PlacementRecord,
  OutreachRecord,
  PerceptionRecord,
  DepartmentRecord,
};

async function findTargetRecord(recordId: string, recordType?: string) {
  if (!Types.ObjectId.isValid(recordId)) return null;

  if (recordType && MODEL_MAP[recordType]) {
    const doc = await MODEL_MAP[recordType].findById(recordId);
    if (doc) return { doc, type: recordType };
  }

  // If not specified or not found in specified type, search common models
  const candidateModels: Array<{ type: string; model: any }> = [
    { type: "Student", model: Student },
    { type: "Faculty", model: Faculty },
    { type: "FinanceRecord", model: FinanceRecord },
    { type: "Publication", model: Publication },
    { type: "Patent", model: Patent },
    { type: "ProjectConsultancy", model: ProjectConsultancy },
    { type: "GraduationOutcome", model: GraduationOutcome },
    { type: "PlacementRecord", model: PlacementRecord },
    { type: "OutreachRecord", model: OutreachRecord },
    { type: "PerceptionRecord", model: PerceptionRecord },
    { type: "DepartmentRecord", model: DepartmentRecord },
  ];

  for (const item of candidateModels) {
    const found = await (item.model as any).findById(recordId);
    if (found) return { doc: found, type: item.type };
  }

  return null;
}

export async function POST(req: NextRequest) {
  const ipAddress = getClientIp(req);
  const userAgent = getClientUserAgent(req);

  try {
    const token = extractTokenFromRequest(req);
    if (!token) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const authData = await getSessionUser(token);
    if (!authData) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const { user } = authData;

    // RBAC: Only DEPARTMENT_ADMIN and FACULTY_CONTRIBUTOR can upload evidence
    if (!hasRole(user.role, ["DEPARTMENT_ADMIN", "FACULTY_CONTRIBUTOR"])) {
      return NextResponse.json(
        {
          error: "Forbidden. Only Contributors and Department Admins can upload evidence.",
          currentRole: user.role,
        },
        { status: 403 }
      );
    }

    await connectDB();

    let recordId: string | undefined;
    let recordType: string | undefined;
    let fileName: string | undefined;
    let fileUrl: string | undefined;
    let fileSize: number = 1024;

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      recordId = (formData.get("recordId") as string) || undefined;
      recordType = (formData.get("recordType") as string) || undefined;
      const file = formData.get("file") as File | null;

      if (!file) {
        return NextResponse.json({ error: "File is required in upload" }, { status: 400 });
      }

      fileName = file.name;
      fileSize = file.size;

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const uploadPath = path.join(process.cwd(), "public", "uploads", safeName);

      await writeFile(uploadPath, buffer);
      fileUrl = `/uploads/${safeName}`;
    } else {
      const body = await req.json();
      recordId = body.recordId;
      recordType = body.recordType;
      fileName = body.fileName;
      fileUrl = body.fileUrl;
      fileSize = body.fileSize || 1024;
    }

    if (!fileName || !fileUrl) {
      return NextResponse.json(
        { error: "fileName and fileUrl are required" },
        { status: 400 }
      );
    }

    let targetRecord: any = null;
    let detectedType = recordType || "EvidenceDocument";

    if (recordId) {
      const match = await findTargetRecord(recordId, recordType);
      if (match) {
        targetRecord = match.doc;
        detectedType = match.type;

        // Check ownership if FACULTY_CONTRIBUTOR
        if (user.role === "FACULTY_CONTRIBUTOR") {
          const isOwner = targetRecord.createdBy?.toString() === user._id.toString();
          const isAssigned = targetRecord.assignedTo?.toString() === user._id.toString();
          if (!isOwner && !isAssigned) {
            return NextResponse.json(
              { error: "Forbidden. Cannot upload evidence for unassigned records." },
              { status: 403 }
            );
          }
        }

        if (!targetRecord.evidenceReferences) {
          targetRecord.evidenceReferences = [];
        }

        targetRecord.evidenceReferences.push({
          fileName,
          fileUrl,
          fileSize,
          uploadedAt: new Date(),
          uploadedBy: user._id,
        });

        targetRecord.updatedBy = user._id;

        if (Array.isArray(targetRecord.auditHistory)) {
          targetRecord.auditHistory.push({
            action: "EVIDENCE_ATTACHED",
            performedBy: user._id,
            performedByEmail: user.email,
            performedByRole: user.role,
            timestamp: new Date(),
            details: { fileName, fileUrl, fileSize },
          });
        }

        await targetRecord.save();
      }
    }

    // Audit log: file upload
    await logAuditEvent({
      action: "file upload",
      userId: user._id,
      userEmail: user.email,
      userRole: user.role,
      department: "MCA",
      resourceType: detectedType,
      resourceId: targetRecord?._id?.toString() || recordId || "",
      details: {
        fileName,
        fileUrl,
        fileSize,
        recordId: recordId || null,
        recordType: detectedType,
      },
      status: "SUCCESS",
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      message: "Evidence registered successfully",
      evidence: {
        fileName,
        fileUrl,
        fileSize,
        uploadedAt: new Date().toISOString(),
        uploadedBy: user._id.toString(),
      },
      record: targetRecord,
    });
  } catch (err: unknown) {
    console.error("Evidence upload error:", err);
    return NextResponse.json(
      { error: "Failed to process evidence", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
