import { NextRequest, NextResponse } from "next/server";
import { extractTokenFromRequest, getSessionUser } from "@/lib/auth";
import { hasRole } from "@/lib/rbac";
import { attachEvidenceToCase } from "@/services/verificationService";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = extractTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const authData = await getSessionUser(token);
    if (!authData) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = authData.user;
    if (!hasRole(user.role, ["DEPARTMENT_ADMIN", "REVIEWER"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const fileName = (body as Record<string, unknown>).fileName as string;
    const fileUrl = (body as Record<string, unknown>).fileUrl as string;
    const fileSize = ((body as Record<string, unknown>).fileSize as number) || 0;
    if (!fileName || !fileUrl) {
      return NextResponse.json({ error: "fileName and fileUrl are required" }, { status: 400 });
    }

    const { id } = await params;
    const result = await attachEvidenceToCase(id, { fileName, fileUrl, fileSize }, user, req);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[POST /api/verification-cases/[id]/attach-evidence]", err);
    const status = message.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

