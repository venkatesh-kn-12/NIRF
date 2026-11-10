import { NextRequest, NextResponse } from "next/server";
import { extractTokenFromRequest, getSessionUser } from "@/lib/auth";
import { hasRole } from "@/lib/rbac";
import { requestCorrectionViaVerification } from "@/services/verificationService";

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

    const body = await req.json().catch(() => ({}));
    const instructions =
      (body as Record<string, unknown>).instructions as string ||
      (body as Record<string, unknown>).notes as string ||
      "";
    const { id } = await params;

    const result = await requestCorrectionViaVerification(id, instructions, user, req);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[POST /api/verification-cases/[id]/request-correction]", err);
    const status = message.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

