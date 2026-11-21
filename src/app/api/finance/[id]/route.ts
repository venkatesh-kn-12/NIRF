import { NextRequest, NextResponse } from "next/server";
import { FinanceRecord } from "@/models/FinanceRecord";
import { financeUpdateSchema } from "@/validators";
import {
  getRecordById,
  updateRecord,
  deleteRecord,
  archiveRecord,
  restoreRecord,
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

    const record = await getRecordById(FinanceRecord, id, authData.user);
    return NextResponse.json({ success: true, record });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to retrieve finance record" },
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
      FinanceRecord,
      "FinanceRecord",
      id,
      body,
      financeUpdateSchema,
      authData.user,
      req
    );

    return NextResponse.json({ success: true, message: "Finance record updated", record: updated });
  } catch (error: any) {
    if (error instanceof RecordServiceError) {
      return NextResponse.json({ error: error.message, details: error.details }, { status: error.statusCode });
    }
    return NextResponse.json({ error: error.message || "Failed to update finance record" }, { status: 500 });
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

    const result = await deleteRecord(FinanceRecord, "FinanceRecord", id, authData.user, req);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to delete finance record" },
      { status: error.statusCode || 500 }
    );
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
    const action = body?.action;

    if (action === "archive") {
      const res = await archiveRecord(FinanceRecord, "FinanceRecord", id, authData.user, req);
      return NextResponse.json(res);
    }
    if (action === "restore") {
      const res = await restoreRecord(FinanceRecord, "FinanceRecord", id, authData.user, req);
      return NextResponse.json(res);
    }

    return NextResponse.json({ error: "Unknown action. Supported actions: archive, restore" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Action failed" },
      { status: error.statusCode || 500 }
    );
  }
}
