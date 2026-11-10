import { NextRequest, NextResponse } from "next/server";
import { Faculty } from "@/models/Faculty";
import { facultySchema } from "@/validators";
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
      Faculty,
      authData.user,
      searchParams,
      ["name", "facultyId", "email", "designation"]
    );

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error("GET /api/faculty error:", error);
    return NextResponse.json({ error: error.message || "Failed to list faculty" }, { status: error.statusCode || 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = extractTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const authData = await getSessionUser(token);
    if (!authData) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    const body = await req.json();
    const newFaculty = await createRecord(
      Faculty,
      "Faculty",
      body,
      facultySchema,
      authData.user,
      req
    );

    return NextResponse.json({ success: true, message: "Faculty record created", record: newFaculty, data: newFaculty }, { status: 201 });
  } catch (error: any) {
    if (error instanceof RecordServiceError) {
      return NextResponse.json({ error: error.message, details: error.details }, { status: error.statusCode });
    }
    console.error("POST /api/faculty error:", error);
    return NextResponse.json({ error: error.message || "Failed to create faculty record" }, { status: 500 });
  }
}

