import { NextRequest, NextResponse } from "next/server";
import { Student } from "@/models/Student";
import { studentSchema } from "@/validators";
import { listRecords, createRecord, RecordServiceError } from "@/services/departmentRecordService";
import { extractTokenFromRequest, getSessionUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const token = extractTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const authData = await getSessionUser(token);
    if (!authData) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    const searchParams = req.nextUrl.searchParams;
    const result = await listRecords(
      Student,
      authData.user,
      searchParams,
      ["name", "studentId", "prn", "batch", "email"]
    );

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error("GET /api/students error:", error);
    return NextResponse.json({ error: error.message || "Failed to list students" }, { status: error.statusCode || 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = extractTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const authData = await getSessionUser(token);
    if (!authData) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    const body = await req.json();
    const newStudent = await createRecord(
      Student,
      "Student",
      body,
      studentSchema,
      authData.user,
      req
    );

    return NextResponse.json({ success: true, message: "Student record created", record: newStudent, data: newStudent }, { status: 201 });
  } catch (error: any) {
    if (error instanceof RecordServiceError) {
      return NextResponse.json({ error: error.message, details: error.details }, { status: error.statusCode });
    }
    console.error("POST /api/students error:", error);
    return NextResponse.json({ error: error.message || "Failed to create student" }, { status: 500 });
  }
}

