import { NextRequest, NextResponse } from "next/server";
import { Student } from "@/models/Student";
import { studentUpdateSchema } from "@/validators";
import {
  getRecordById,
  updateRecord,
  deleteRecord,
  RecordServiceError,
} from "@/services/departmentRecordService";
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

    const record = await getRecordById(Student, id, authData.user);
    return NextResponse.json({ success: true, record });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to retrieve student record" },
      { status: error.statusCode || 500 }
    );
  }
}

export async function PUT(
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
    const updated = await updateRecord(
      Student,
      "Student",
      id,
      body,
      studentUpdateSchema,
      authData.user,
      req
    );

    return NextResponse.json({ success: true, message: "Student record updated", record: updated });
  } catch (error: any) {
    if (error instanceof RecordServiceError) {
      return NextResponse.json({ error: error.message, details: error.details }, { status: error.statusCode });
    }
    return NextResponse.json({ error: error.message || "Failed to update student record" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = extractTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const authData = await getSessionUser(token);
    if (!authData) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    const result = await deleteRecord(Student, "Student", id, authData.user, req);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to delete student record" },
      { status: error.statusCode || 500 }
    );
  }
}

