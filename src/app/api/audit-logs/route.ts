import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { AuditLog } from "@/models/AuditLog";
import { extractTokenFromRequest, getSessionUser } from "@/lib/auth";
import { hasRole } from "@/lib/rbac";

export async function GET(req: NextRequest) {
  try {
    const token = extractTokenFromRequest(req);
    if (!token) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const authData = await getSessionUser(token);
    if (!authData) {
      return NextResponse.json({ error: "Session invalid or expired" }, { status: 401 });
    }

    const { user } = authData;

    // RBAC: Only DEPARTMENT_ADMIN and REVIEWER can inspect audit logs
    if (!hasRole(user.role, ["DEPARTMENT_ADMIN", "REVIEWER"])) {
      return NextResponse.json(
        {
          error: "Forbidden. Insufficient permissions to view department audit logs.",
          requiredRoles: ["DEPARTMENT_ADMIN", "REVIEWER"],
          currentRole: user.role,
        },
        { status: 403 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "100", 10), 500);
    const actionFilter = searchParams.get("action");
    const userFilter = searchParams.get("user");
    const recordFilter = searchParams.get("record");
    const parameterFilter = searchParams.get("parameter");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const isCsvExport = searchParams.get("export") === "csv";

    const query: Record<string, any> = { department: "MCA" };

    if (actionFilter && actionFilter !== "ALL") {
      query.action = actionFilter;
    }
    if (userFilter) {
      query.$or = [
        { userEmail: { $regex: userFilter, $options: "i" } },
        { userId: userFilter },
      ];
    }
    if (recordFilter) {
      query.resourceId = recordFilter;
    }
    if (parameterFilter && parameterFilter !== "ALL") {
      query["details.parameter"] = parameterFilter;
    }
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const logs = await AuditLog.find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();

    if (isCsvExport) {
      const header = `"Timestamp","Action","User Email","Role","Department","Resource Type","Resource ID","Status","IP Address","Details"`;
      const rows = logs.map((l: any) => {
        const time = l.timestamp ? new Date(l.timestamp).toISOString() : "";
        const details = l.details ? JSON.stringify(l.details).replace(/"/g, '""') : "";
        return `"${time}","${l.action}","${l.userEmail}","${l.userRole}","${l.department}","${l.resourceType || ""}","${l.resourceId || ""}","${l.status}","${l.ipAddress || ""}","${details}"`;
      });
      const csvContent = [header, ...rows].join("\r\n");

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="mca_audit_log_${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      count: logs.length,
      logs,
    });
  } catch (error) {
    console.error("Audit log retrieve error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve audit trail" },
      { status: 500 }
    );
  }
}
