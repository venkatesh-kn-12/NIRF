import crypto from "crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { connectDB } from "./db";
import { User, IUser, UserRole } from "@/models/User";
import { Session, ISession } from "@/models/Session";
import { Types } from "mongoose";

export const SESSION_COOKIE_NAME = "nirf_session";
export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days

export const COOKIE_OPTIONS = {
  name: SESSION_COOKIE_NAME,
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_MAX_AGE_SECONDS,
};

/**
 * Hash password using bcrypt with 12 salt rounds
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

/**
 * Verify password against bcrypt hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Validates password strength according to institutional security standards
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!password || password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number");
  }
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    errors.push("Password must contain at least one special character");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Extract client IP from Request headers
 */
export function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "127.0.0.1";
}

/**
 * Extract User Agent from Request headers
 */
export function getClientUserAgent(req: Request): string {
  return req.headers.get("user-agent") || "Unknown";
}

/**
 * Creates a cryptographically secure session document in MongoDB
 */
export async function createSession(
  userId: string | Types.ObjectId,
  role: UserRole,
  req?: Request
): Promise<ISession> {
  await connectDB();

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);

  const userAgent = req ? getClientUserAgent(req) : "Unknown";
  const ipAddress = req ? getClientIp(req) : "127.0.0.1";

  const session = await Session.create({
    token,
    userId: typeof userId === "string" ? new Types.ObjectId(userId) : userId,
    role,
    department: "MCA",
    userAgent,
    ipAddress,
    expiresAt,
  });

  return session;
}

/**
 * Invalidate a session by token
 */
export async function invalidateSession(token: string): Promise<void> {
  await connectDB();
  await Session.deleteOne({ token });
}

/**
 * Invalidate all sessions for a user (e.g. after password change)
 */
export async function invalidateAllUserSessions(
  userId: string | Types.ObjectId,
  exceptToken?: string
): Promise<void> {
  await connectDB();
  const filter: Record<string, unknown> = {
    userId: typeof userId === "string" ? new Types.ObjectId(userId) : userId,
  };
  if (exceptToken) {
    filter.token = { $ne: exceptToken };
  }
  await Session.deleteMany(filter);
}

/**
 * Resolve user and session from a token string
 */
export async function getSessionUser(
  token: string
): Promise<{ session: ISession; user: IUser } | null> {
  if (!token) return null;

  await connectDB();

  const session = await Session.findOne({ token });
  if (!session) return null;

  if (session.expiresAt.getTime() < Date.now()) {
    await Session.deleteOne({ _id: session._id });
    return null;
  }

  const user = await User.findById(session.userId);
  if (!user || user.status !== "ACTIVE") {
    // If user no longer exists or is disabled, delete the session
    await Session.deleteOne({ _id: session._id });
    return null;
  }

  return { session, user };
}

/**
 * Extract token from standard Cookie header or Bearer token
 */
export function extractTokenFromRequest(req: Request): string | null {
  const cookieHeader = req.headers.get("cookie");
  if (cookieHeader) {
    const cookiesArr = cookieHeader.split(";");
    for (const c of cookiesArr) {
      const [name, ...val] = c.trim().split("=");
      if (name === SESSION_COOKIE_NAME) {
        return decodeURIComponent(val.join("="));
      }
    }
  }

  // Fallback to Authorization header
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7).trim();
  }

  return null;
}

/**
 * Verify session from an incoming Request object (API route helper)
 */
export async function verifyAuth(
  req: Request
): Promise<{ session: ISession; user: IUser } | null> {
  const token = extractTokenFromRequest(req);
  if (!token) return null;
  return getSessionUser(token);
}

/**
 * Get current authenticated user in Server Components and Server Actions
 */
export async function getCurrentUser(): Promise<{ session: ISession; user: IUser } | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;
    return getSessionUser(token);
  } catch {
    return null;
  }
}

/**
 * Format a user object for safe public return (no passwordHash or internal sensitive data)
 */
export function toSafeUser(user: IUser) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department,
    employeeId: user.employeeId,
    studentId: user.studentId,
    status: user.status,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

