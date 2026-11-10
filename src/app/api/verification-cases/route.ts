import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { VerificationCase } from "@/models/VerificationCase";
import { extractTokenFromRequest, getSessionUser } from "@/lib/auth";
import { hasRole } from "@/lib/rbac";

export async function GET(req: NextRequest) {
  try {
    const token = extractTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const authData = await getSessionUser(token);
    if (!authData) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = authData.user;
    if (!hasRole(user.role, ["DEPARTMENT_ADMIN", "REVIEWER", "FACULTY_CONTRIBUTOR"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const issueType = searchParams.get("issueType");
    const severity = searchParams.get("severity");
    const parameter = searchParams.get("parameter");
    const recordType = searchParams.get("recordType");
    const q = searchParams.get("q");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { department: "MCA" };
    if (status) filter.status = status;
    if (issueType) filter.issueType = issueType;
    if (severity) filter.severity = severity;
    if (parameter) filter.parameter = parameter;
    if (recordType) filter.relatedRecordType = recordType;
    if (q) {
      filter.$or = [
        { aiExplanation: { $regex: q, $options: "i" } },
        { reviewerNotes: { $regex: q, $options: "i" } },
        { relatedRecordType: { $regex: q, $options: "i" } },
      ];
    }

    const [cases, total] = await Promise.all([
      VerificationCase.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("assignedReviewer", "name email role")
        .populate("resolvedBy", "name email role")
        .lean(),
      VerificationCase.countDocuments(filter),
    ]);

    return NextResponse.json({
      cases,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err: unknown) {
    console.error("[GET /api/verification-cases]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = extractTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const authData = await getSessionUser(token);
    if (!authData) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = authData.user;
    if (!hasRole(user.role, ["DEPARTMENT_ADMIN", "REVIEWER"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const body = await req.json();
    const { relatedRecordType, relatedRecordId, parameter, reviewerNotes } = body;

    if (!relatedRecordType || !relatedRecordId || !parameter) {
      return NextResponse.json(
        { error: "relatedRecordType, relatedRecordId, and parameter are required" },
        { status: 400 }
      );
    }

    const newCase = await VerificationCase.create({
      relatedRecordType,
      relatedRecordId,
      parameter,
      issueType: "MANUAL_REVIEW",
      severity: "MEDIUM",
      reviewerNotes: reviewerNotes || "",
      status: "OPEN",
      department: "MCA",
      academicYear: body.academicYear || "2024-25",
      assignedReviewer: user._id,
    });

    return NextResponse.json({ case: newCase }, { status: 201 });
  } catch (err: unknown) {
    console.error("[POST /api/verification-cases]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

