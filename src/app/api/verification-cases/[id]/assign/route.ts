import { NextRequest, NextResponse } from "next/server";
import { extractTokenFromRequest, getSessionUser } from "@/lib/auth";
import { hasRole } from "@/lib/rbac";
import { assignReviewerToCase } from "@/services/verificationService";

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
    if (!hasRole(user.role, ["DEPARTMENT_ADMIN"])) {
      return NextResponse.json(
        { error: "Forbidden: only DEPARTMENT_ADMIN can assign reviewers" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const reviewerId = (body as Record<string, unknown>).reviewerId as string;
    if (!reviewerId) {
      return NextResponse.json({ error: "reviewerId is required" }, { status: 400 });
    }

    const { id } = await params;
    const result = await assignReviewerToCase(id, reviewerId, user, req);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[POST /api/verification-cases/[id]/assign]", err);
    const status = message.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

