import { NextRequest, NextResponse } from "next/server";
import { extractTokenFromRequest, getSessionUser } from "@/lib/auth";
import { hasRole } from "@/lib/rbac";
import { updateCaseNotes } from "@/services/verificationService";

export async function PATCH(
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
    const notes = (body as Record<string, unknown>).notes;
    if (typeof notes !== "string") {
      return NextResponse.json({ error: "notes must be a string" }, { status: 400 });
    }

    const { id } = await params;
    const result = await updateCaseNotes(id, notes, user);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[PATCH /api/verification-cases/[id]/notes]", err);
    const status = message.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

