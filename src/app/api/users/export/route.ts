import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { extractTokenFromRequest, getSessionUser } from "@/lib/auth";
import { hasRole } from "@/lib/rbac";

/**
 * GET /api/users/export
 * Exports the filtered user roster as CSV.
 * Restricted to DEPARTMENT_ADMIN.
 */
export async function GET(req: NextRequest) {
  try {
    const token = extractTokenFromRequest(req);
    if (!token) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const authData = await getSessionUser(token);
    if (!authData) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const { user } = authData;
    if (!hasRole(user.role, ["DEPARTMENT_ADMIN"])) {
      return NextResponse.json(
        { error: "Access denied. Only Department Admins can export the user roster." },
        { status: 403 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const role = searchParams.get("role")?.trim() || "ALL";
    const status = searchParams.get("status")?.trim() || "ALL";

    const query: Record<string, any> = { department: "MCA" };

    if (role && role !== "ALL") {
      query.role = role;
    }

    if (status && status !== "ALL") {
      query.status = status;
    }

    if (search) {
      const searchRegex = new RegExp(
        search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "i"
      );
      query.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { employeeId: searchRegex },
        { studentId: searchRegex },
      ];
    }

    const users = await User.find(query).sort({ createdAt: -1 });

    // Format CSV
    const headers = ["Name", "Institutional Email", "Role", "Identifier", "Status", "Created At"];
    const escapeCsv = (val: string | undefined | null) => {
      if (val === undefined || val === null) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = users.map((u) => {
      const identifier = u.employeeId || u.studentId || "N/A";
      const createdAtStr = u.createdAt ? new Date(u.createdAt).toISOString().split("T")[0] : "N/A";
      return [
        escapeCsv(u.name),
        escapeCsv(u.email),
        escapeCsv(u.role),
        escapeCsv(identifier),
        escapeCsv(u.status),
        escapeCsv(createdAtStr),
      ].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\r\n");

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="mca_user_roster_${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("GET /api/users/export error:", error);
    return NextResponse.json({ error: "Failed to export user roster" }, { status: 500 });
  }
}

