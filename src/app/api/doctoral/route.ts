import { NextRequest, NextResponse } from "next/server";
import { DoctoralEnrolmentStatement } from "@/models/DoctoralEnrolmentStatement";
import { doctoralEnrolmentSchema } from "@/validators";
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
      DoctoralEnrolmentStatement,
      authData.user,
      searchParams,
      ["programme", "zeroDeclarationReason", "certificationReference"]
    );

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to list doctoral statements" },
      { status: error.statusCode || 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = extractTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const authData = await getSessionUser(token);
    if (!authData) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    const body = await req.json();
    const newRecord = await createRecord(
      DoctoralEnrolmentStatement,
      "DoctoralEnrolmentStatement",
      body,
      doctoralEnrolmentSchema,
      authData.user,
      req
    );

    return NextResponse.json(
      { success: true, message: "Doctoral enrolment statement created", record: newRecord },
      { status: 201 }
    );
  } catch (error: any) {
    if (error instanceof RecordServiceError) {
      return NextResponse.json({ error: error.message, details: error.details }, { status: error.statusCode });
    }
    return NextResponse.json({ error: error.message || "Failed to create statement" }, { status: 500 });
  }
}
