import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const SESSION_COOKIE_NAME = "nirf_session";

// Public routes that never require authentication
const PUBLIC_PATHS = [
  "/login",
  "/setup-admin",
  "/api/auth/login",
  "/api/setup/admin",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Skip Next.js internal files, static assets, and favicon
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.includes(".") // e.g. .ico, .png, .svg
  ) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const isPublicPath = PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(path + "/"));

  // 2. If user is already authenticated and visits /login, redirect to /dashboard
  if (pathname === "/login" && sessionCookie) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // 3. If accessing root path `/`
  if (pathname === "/") {
    if (sessionCookie) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 4. If path is public, allow access
  if (isPublicPath) {
    return NextResponse.next();
  }

  // 5. If path is a protected API route and lacks session token, return 401
  if (pathname.startsWith("/api/")) {
    const authHeader = request.headers.get("authorization");
    const hasBearer = authHeader && authHeader.startsWith("Bearer ");

    if (!sessionCookie && !hasBearer) {
      return NextResponse.json(
        { error: "Authentication required. Please sign in to access this endpoint." },
        { status: 401 }
      );
    }
    return NextResponse.next();
  }

  // 6. If user visits protected frontend pages without session cookie, redirect to /login
  if (!sessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};

