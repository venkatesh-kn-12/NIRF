import { NextRequest, NextResponse } from "next/server";
import { OutreachRecord } from "@/models/OutreachRecord";
import { outreachUpdateSchema, reviewDecisionSchema } from "@/validators";
import {
  getRecordById,
  updateRecord,
  deleteRecord,
  reviewRecord,
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

    const record = await getRecordById(OutreachRecord, id, authData.user);
    return NextResponse.json({ success: true, record });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode || 500 });
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
      OutreachRecord,
      "OutreachRecord",
      id,
      body,
      outreachUpdateSchema,
      authData.user,
      req
    );

    return NextResponse.json({ success: true, message: "Outreach record updated", record: updated });
  } catch (error: any) {
    if (error instanceof RecordServiceError) {
      return NextResponse.json({ error: error.message, details: error.details }, { status: error.statusCode });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
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

    const result = await deleteRecord(OutreachRecord, "OutreachRecord", id, authData.user, req);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode || 500 });
  }
}

export async function PATCH(
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
    const parsed = reviewDecisionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid decision", details: parsed.error.format() }, { status: 400 });
    }

    const updated = await reviewRecord(
      OutreachRecord,
      "OutreachRecord",
      id,
      parsed.data.decision,
      parsed.data.comment,
      authData.user,
      req
    );

    return NextResponse.json({ success: true, record: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode || 500 });
  }
}

