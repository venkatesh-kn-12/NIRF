import { NextRequest, NextResponse } from "next/server";
import {
  extractTokenFromRequest,
  invalidateSession,
  getSessionUser,
  COOKIE_OPTIONS,
  getClientIp,
  getClientUserAgent,
} from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const ipAddress = getClientIp(req);
  const userAgent = getClientUserAgent(req);

  try {
    const token = extractTokenFromRequest(req);

    if (token) {
      const authData = await getSessionUser(token);

      if (authData) {
        const { session, user } = authData;

        // Invalidate database session
        await invalidateSession(token);

        // Audit log logout
        await logAuditEvent({
          action: "logout",
          userId: user._id,
          userEmail: user.email,
          userRole: user.role,
          department: user.department,
          status: "SUCCESS",
          details: {
            sessionAgeMs: Date.now() - session.createdAt.getTime(),
          },
          ipAddress,
          userAgent,
        });
      } else {
        await invalidateSession(token);
      }
    }

    const response = NextResponse.json({
      success: true,
      message: "Successfully signed out",
    });

    // Clear server-set cookie
    response.cookies.set(COOKIE_OPTIONS.name, "", {
      ...COOKIE_OPTIONS,
      maxAge: 0,
      expires: new Date(0),
    });

    return response;
  } catch (error) {
    console.error("Logout route error:", error);
    const response = NextResponse.json(
      { error: "Error occurred during logout" },
      { status: 500 }
    );
    response.cookies.set(COOKIE_OPTIONS.name, "", {
      ...COOKIE_OPTIONS,
      maxAge: 0,
      expires: new Date(0),
    });
    return response;
  }
}

