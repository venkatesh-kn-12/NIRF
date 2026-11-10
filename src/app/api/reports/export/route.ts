import { NextRequest, NextResponse } from "next/server";
import { extractTokenFromRequest, getSessionUser } from "@/lib/auth";
import { hasRole } from "@/lib/rbac";
import {
  generateReportData,
  exportReportToCSV,
  exportReportToXMLSpreadsheet,
  exportReportToPrintableHTML,
  ReportType,
} from "@/services/reportService";

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
    if (!hasRole(user.role, ["DEPARTMENT_ADMIN", "REVIEWER", "FACULTY_CONTRIBUTOR", "VIEWER"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const reportType = (searchParams.get("reportType") || "dept_summary") as ReportType;
    const academicYear = searchParams.get("academicYear") || "2024-25";
    const format = (searchParams.get("format") || "csv").toLowerCase();

    const reportData = await generateReportData(reportType, academicYear);

    const safeTitle = reportData.title.toLowerCase().replace(/[^a-z0-9]/g, "_");
    const fileName = `${safeTitle}_${academicYear}`;

    if (format === "csv") {
      const csv = exportReportToCSV(reportData);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${fileName}.csv"`,
        },
      });
    } else if (format === "xlsx") {
      const xml = exportReportToXMLSpreadsheet(reportData);
      return new NextResponse(xml, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.ms-excel",
          "Content-Disposition": `attachment; filename="${fileName}.xls"`,
        },
      });
    } else if (format === "pdf" || format === "html") {
      const html = exportReportToPrintableHTML(reportData);
      return new NextResponse(html, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Disposition": `inline; filename="${fileName}.html"`,
        },
      });
    }

    return NextResponse.json({ error: "Unsupported format. Use csv, xlsx, or pdf." }, { status: 400 });
  } catch (error: unknown) {
    console.error("GET /api/reports/export error:", error);
    return NextResponse.json(
      { error: "Failed to export report" },
      { status: 500 }
    );
  }
}

