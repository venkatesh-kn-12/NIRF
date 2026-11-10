import { NextRequest, NextResponse } from "next/server";
import { PerceptionRecord } from "@/models/PerceptionRecord";
import { perceptionSchema, perceptionUpdateSchema, reviewDecisionSchema } from "@/validators";
import {
  listRecords,
  createRecord,
  getRecordById,
  updateRecord,
  deleteRecord,
  reviewRecord,
  RecordServiceError,
} from "@/services/departmentRecordService";
import { extractTokenFromRequest, getSessionUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const token = extractTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const authData = await getSessionUser(token);
    if (!authData) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    const searchParams = req.nextUrl.searchParams;
    const result = await listRecords(
      PerceptionRecord,
      authData.user,
      searchParams,
      ["sourceType", "surveyOrReferencePeriod", "remarks"]
    );

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to list perception records" }, { status: error.statusCode || 500 });
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
      PerceptionRecord,
      "PerceptionRecord",
      body,
      perceptionSchema,
      authData.user,
      req
    );

    return NextResponse.json({ success: true, message: "Perception record created", record: newRecord }, { status: 201 });
  } catch (error: any) {
    if (error instanceof RecordServiceError) {
      return NextResponse.json({ error: error.message, details: error.details }, { status: error.statusCode });
    }
    return NextResponse.json({ error: error.message || "Failed to create perception record" }, { status: 500 });
  }
}

