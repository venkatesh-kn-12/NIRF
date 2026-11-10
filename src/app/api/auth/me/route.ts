import { NextRequest, NextResponse } from "next/server";
import {
  extractTokenFromRequest,
  getSessionUser,
  toSafeUser,
  COOKIE_OPTIONS,
} from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const token = extractTokenFromRequest(req);

    if (!token) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const authData = await getSessionUser(token);

    if (!authData) {
      const response = NextResponse.json(
        { error: "Session is invalid or has expired" },
        { status: 401 }
      );
      // Clean up invalid cookie
      response.cookies.set(COOKIE_OPTIONS.name, "", {
        ...COOKIE_OPTIONS,
        maxAge: 0,
        expires: new Date(0),
      });
      return response;
    }

    const { user } = authData;

    return NextResponse.json({
      authenticated: true,
      user: toSafeUser(user),
    });
  } catch (error) {
    console.error("GET /api/auth/me error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve authenticated user" },
      { status: 500 }
    );
  }
}

