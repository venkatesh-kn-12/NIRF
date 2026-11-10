import { connectDB } from "@/lib/db";
import { Student } from "@/models/Student";
import { Faculty } from "@/models/Faculty";
import { FinanceRecord } from "@/models/FinanceRecord";
import { Publication } from "@/models/Publication";
import { Patent } from "@/models/Patent";
import { ProjectConsultancy } from "@/models/ProjectConsultancy";
import { GraduationOutcome } from "@/models/GraduationOutcome";
import { PlacementRecord } from "@/models/PlacementRecord";
import { OutreachRecord } from "@/models/OutreachRecord";
import { PerceptionRecord } from "@/models/PerceptionRecord";
import { VerificationCase } from "@/models/VerificationCase";
import { AuditLog } from "@/models/AuditLog";
import { MetricResult } from "@/models/MetricResult";
import { PARAMETERS_CONFIG, NIRF_ENGINEERING_2025_VERSION } from "@/services/metrics/methodologyConfig";

export type ReportType =
  | "dept_summary"
  | "param_wise"
  | "fac_stud"
  | "research"
  | "placement"
  | "verification"
  | "audit";

export interface GeneratedReportData {
  reportType: ReportType;
  title: string;
  department: "MCA";
  academicYear: string;
  reportingPeriod: string;
  methodologyVersion: string;
  generatedAt: string;
  disclaimer: {
    statement: string;
    computedMetrics: string[];
    nonComputableMetrics: Array<{ code: string; name: string; reason: string }>;
  };
  summary: Record<string, any>;
  tables: Array<{
    title: string;
    columns: string[];
    rows: Array<Array<string | number>>;
  }>;
  evidenceIndex: Array<{ fileName: string; recordType: string; uploadedAt: string }>;
  approvalHistory: Array<{ action: string; userEmail: string; role: string; timestamp: string }>;
}

export async function generateReportData(
  reportType: ReportType,
  academicYear: string = "2024-25"
): Promise<GeneratedReportData> {
  await connectDB();
  const deptFilter = { department: "MCA" };

  const [
    students,
    faculty,
    finance,
    publications,
    patents,
    projects,
    gradOutcomes,
    placements,
    outreach,
    perceptions,
    verificationCases,
    metricResults,
    auditLogs,
  ] = await Promise.all([
    Student.find(deptFilter).lean(),
    Faculty.find(deptFilter).lean(),
    FinanceRecord.find(deptFilter).lean(),
    Publication.find(deptFilter).lean(),
    Patent.find(deptFilter).lean(),
    ProjectConsultancy.find(deptFilter).lean(),
    GraduationOutcome.find(deptFilter).lean(),
    PlacementRecord.find(deptFilter).lean(),
    OutreachRecord.find(deptFilter).lean(),
    PerceptionRecord.find(deptFilter).lean(),
    VerificationCase.find({ department: "MCA" }).lean(),
    MetricResult.find({ department: "MCA", academicYear }).lean(),
    AuditLog.find({ department: "MCA" }).sort({ timestamp: -1 }).limit(50).lean(),
  ]);

  // Evidence Index aggregation
  const evidenceIndex: Array<{ fileName: string; recordType: string; uploadedAt: string }> = [];
  const appendEvidence = (records: any[], type: string) => {
    for (const r of records) {
      if (Array.isArray(r.evidenceReferences)) {
        for (const ev of r.evidenceReferences) {
          evidenceIndex.push({
            fileName: ev.fileName || "document.pdf",
            recordType: type,
            uploadedAt: ev.uploadedAt ? new Date(ev.uploadedAt).toISOString().slice(0, 10) : "N/A",
          });
        }
      }
    }
  };

  appendEvidence(students, "Student");
  appendEvidence(faculty, "Faculty");
  appendEvidence(finance, "FinanceRecord");
  appendEvidence(publications, "Publication");
  appendEvidence(patents, "Patent");
  appendEvidence(projects, "ProjectConsultancy");
  appendEvidence(gradOutcomes, "GraduationOutcome");
  appendEvidence(placements, "PlacementRecord");

  // Approval history from audit logs
  const approvalHistory = auditLogs
    .filter((l) => ["approval", "rejection", "correction request"].includes(l.action))
    .slice(0, 15)
    .map((l) => ({
      action: l.action.toUpperCase(),
      userEmail: l.userEmail || "System",
      role: l.userRole || "—",
      timestamp: l.timestamp ? new Date(l.timestamp).toLocaleString() : "N/A",
    }));

  // Disclaimer & Computability state
  const computedList: string[] = [];
  const nonComputableList: Array<{ code: string; name: string; reason: string }> = [];

  for (const m of metricResults) {
    if (m.metricCode === "OVERALL") continue;
    if (m.status === "COMPUTED") {
      computedList.push(`${m.metricCode} (${m.name}): ${m.result.rawScore}/${m.result.maxMarks}`);
    } else if (m.status === "AWAITING_SOURCE") {
      nonComputableList.push({
        code: m.metricCode,
        name: m.name,
        reason: "Awaiting Scopus / Web of Science verified external bibliometric feed.",
      });
    } else if (m.status === "NOT_COMPUTABLE") {
      nonComputableList.push({
        code: m.metricCode,
        name: m.name,
        reason: "Requires official NIRF employer/peer survey score. Prediction or estimation is prohibited.",
      });
    } else if (m.status === "PENDING_INPUT") {
      nonComputableList.push({
        code: m.metricCode,
        name: m.name,
        reason: "Pending approved departmental record entry.",
      });
    }
  }

  const disclaimer = {
    statement:
      "IMPORTANT NOTICE: Results compiled herein represent MCA Departmental Indicative Metrics strictly aligned with NIRF Engineering 2025 calculation rules. These outputs do not constitute official National Institutional Ranking Framework (NIRF) rankings. Zero estimation has been applied.",
    computedMetrics: computedList,
    nonComputableMetrics: nonComputableList,
  };

  let reportTitle = "Departmental NIRF Data Summary";
  const tables: Array<{ title: string; columns: string[]; rows: Array<Array<string | number>> }> = [];
  const summary: Record<string, any> = {};

  switch (reportType) {
    case "dept_summary": {
      reportTitle = "MCA Departmental NIRF Data & Indicator Summary";
      summary.totalStudents = students.length;
      summary.approvedStudents = students.filter((s) => s.status === "APPROVED").length;
      summary.totalFaculty = faculty.length;
      summary.approvedFaculty = faculty.filter((f) => f.status === "APPROVED").length;
      summary.totalPublications = publications.length;
      summary.totalPatents = patents.length;
      summary.totalProjects = projects.length;

      // Table 1: Parameter indicators
      const paramRows = metricResults
        .filter((m) => m.metricCode !== "OVERALL")
        .map((m) => [
          m.parameter,
          m.metricCode,
          m.name,
          m.result.maxMarks,
          m.result.rawScore !== null ? m.result.rawScore : "—",
          m.status,
        ]);

      tables.push({
        title: "NIRF Engineering 2025 Sub-Metric Breakdown",
        columns: ["Parameter", "Code", "Indicator Name", "Max Marks", "Raw Score", "Status"],
        rows: paramRows,
      });

      // Table 2: Record Collection Counts
      tables.push({
        title: "Department Record Status Distribution",
        columns: ["Collection", "Total Records", "Approved", "Draft / Review", "Evidence Count"],
        rows: [
          ["Students", students.length, students.filter((s) => s.status === "APPROVED").length, students.filter((s) => s.status !== "APPROVED").length, students.filter((s) => s.evidenceReferences?.length).length],
          ["Faculty", faculty.length, faculty.filter((f) => f.status === "APPROVED").length, faculty.filter((f) => f.status !== "APPROVED").length, faculty.filter((f) => f.evidenceReferences?.length).length],
          ["Finance", finance.length, finance.filter((f) => f.status === "APPROVED").length, finance.filter((f) => f.status !== "APPROVED").length, finance.filter((f) => f.evidenceReferences?.length).length],
          ["Publications", publications.length, publications.filter((p) => p.status === "APPROVED").length, publications.filter((p) => p.status !== "APPROVED").length, publications.filter((p) => p.evidenceReferences?.length).length],
          ["Patents", patents.length, patents.filter((p) => p.status === "APPROVED").length, patents.filter((p) => p.status !== "APPROVED").length, patents.filter((p) => p.evidenceReferences?.length).length],
          ["Projects & Consultancy", projects.length, projects.filter((p) => p.status === "APPROVED").length, projects.filter((p) => p.status !== "APPROVED").length, projects.filter((p) => p.evidenceReferences?.length).length],
        ],
      });
      break;
    }

    case "param_wise": {
      reportTitle = "NIRF Parameter-wise Evaluation Report";
      for (const [paramKey, config] of Object.entries(PARAMETERS_CONFIG)) {
        const subMetrics = metricResults.filter((m) => m.parameter === paramKey);
        tables.push({
          title: `${paramKey}: ${config.name} (Weight: ${config.weight * 100}%, Max: ${config.maxMarks} Marks)`,
          columns: ["Metric Code", "Specification", "Formula", "Max Marks", "Computed Score", "Audit Status"],
          rows: subMetrics.map((sm) => [
            sm.metricCode,
            sm.name,
            sm.result.trace.formula,
            sm.result.maxMarks,
            sm.result.rawScore !== null ? sm.result.rawScore : "N/A",
            sm.status,
          ]),
        });
      }
      break;
    }

    case "fac_stud": {
      reportTitle = "Faculty & Student Demographics Summary";
      const regularFac = faculty.filter((f) => f.employmentType === "PERMANENT" || f.employmentType === "CONTRACT").length;
      const phdFac = faculty.filter((f) => f.phdStatus === "AWARDED" || f.highestQualification === "Ph.D.").length;

      tables.push({
        title: "Faculty Cadre & Qualification Breakdown",
        columns: ["Name", "Designation", "Employment Type", "Qualification", "PhD Status", "Experience (Yrs)", "Status"],
        rows: faculty.map((f) => [
          f.name,
          f.designation,
          f.employmentType,
          f.highestQualification,
          f.phdStatus,
          f.experienceYears || 0,
          f.status,
        ]),
      });

      tables.push({
        title: "Student Cohort Sample & Domicile Distribution",
        columns: ["Student ID", "PRN", "Name", "Batch", "Gender", "Domicile", "Status"],
        rows: students.slice(0, 30).map((s) => [
          s.studentId,
          s.prn,
          s.name,
          s.batch,
          s.gender,
          s.domicileType,
          s.status,
        ]),
      });
      break;
    }

    case "research": {
      reportTitle = "Research, Publications & IPR Dossier";
      tables.push({
        title: "Publications Register",
        columns: ["Title", "Journal / Conference", "Type", "DOI", "Status"],
        rows: publications.map((p) => [
          p.title,
          p.journalOrConference,
          p.publicationType,
          p.doi || "N/A",
          p.status,
        ]),
      });

      tables.push({
        title: "Patents (IPR) Register",
        columns: ["Title", "App Number", "Patent Status", "Filing Date", "Status"],
        rows: patents.map((p) => [
          p.title,
          p.applicationNumber,
          p.patentStatus,
          p.filingDate ? new Date(p.filingDate).toISOString().slice(0, 10) : "N/A",
          p.status,
        ]),
      });
      break;
    }

    case "placement": {
      reportTitle = "Graduation Outcomes & Placement Dossier";
      tables.push({
        title: "Graduation Cohort Records",
        columns: ["Batch", "Eligible Students", "Graduated in Stipulated Time", "Pass Count", "Higher Studies", "Status"],
        rows: gradOutcomes.map((go) => [
          go.batch,
          go.eligibleGraduates,
          go.graduatesInStipulatedTime,
          go.examinationPassCount,
          go.higherStudiesCount,
          go.status,
        ]),
      });

      tables.push({
        title: "Placement Student Records",
        columns: ["Student PRN / Ref", "Batch", "Employer", "Offer Type", "CTC (INR)", "Status"],
        rows: placements.map((pl) => [
          pl.studentReference,
          pl.batch,
          pl.employer,
          pl.offerType,
          pl.ctc ? `INR ${pl.ctc.toLocaleString()}` : "—",
          pl.status,
        ]),
      });
      break;
    }

    case "verification": {
      reportTitle = "Verification & Approval Audit Report";
      tables.push({
        title: "Verification Cases Log",
        columns: ["Case ID", "Record Type", "Parameter", "Issue Type", "Severity", "Status", "Reviewer Notes"],
        rows: verificationCases.map((vc) => [
          vc._id.toString().substring(18),
          vc.relatedRecordType,
          vc.parameter,
          vc.issueType,
          vc.severity,
          vc.status,
          vc.reviewerNotes || "—",
        ]),
      });
      break;
    }

    case "audit": {
      reportTitle = "Full Cryptographic Audit Trail Report";
      tables.push({
        title: "Chronological Mutation Log",
        columns: ["Timestamp", "User Email", "Role", "Action", "Resource Type", "Status", "IP Address"],
        rows: auditLogs.map((log) => [
          log.timestamp ? new Date(log.timestamp).toLocaleString() : "N/A",
          log.userEmail || "System",
          log.userRole || "—",
          (log.action || "UNKNOWN").toUpperCase(),
          log.resourceType || "N/A",
          log.status || "SUCCESS",
          log.ipAddress || "127.0.0.1",
        ]),
      });
      break;
    }
  }

  return {
    reportType,
    title: reportTitle,
    department: "MCA",
    academicYear,
    reportingPeriod: "ANNUAL",
    methodologyVersion: NIRF_ENGINEERING_2025_VERSION,
    generatedAt: new Date().toISOString(),
    disclaimer,
    summary,
    tables,
    evidenceIndex,
    approvalHistory,
  };
}

/**
 * Serializes report data into CSV format (RFC-4180).
 */
export function exportReportToCSV(data: GeneratedReportData): string {
  const lines: string[] = [];

  // Header meta
  lines.push(`"MCA NIRF ASSIST - OFFICIAL REPORT"`);
  lines.push(`"Report Title","${data.title}"`);
  lines.push(`"Department","${data.department}"`);
  lines.push(`"Academic Year","${data.academicYear}"`);
  lines.push(`"Methodology Version","${data.methodologyVersion}"`);
  lines.push(`"Generated At","${data.generatedAt}"`);
  lines.push(`"Regulatory Disclaimer","${data.disclaimer.statement.replace(/"/g, '""')}"`);
  lines.push("");

  // Tables
  for (const table of data.tables) {
    lines.push(`"--- ${table.title.replace(/"/g, '""')} ---"`);
    lines.push(table.columns.map((col) => `"${col.replace(/"/g, '""')}"`).join(","));
    for (const row of table.rows) {
      lines.push(row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","));
    }
    lines.push("");
  }

  // Evidence Index
  lines.push(`"--- EVIDENCE DOSSIER INDEX ---"`);
  lines.push(`"File Name","Record Type","Upload Date"`);
  for (const ev of data.evidenceIndex) {
    lines.push(`"${ev.fileName}","${ev.recordType}","${ev.uploadedAt}"`);
  }
  lines.push("");

  // Approval History
  lines.push(`"--- VERIFICATION & APPROVAL HISTORY ---"`);
  lines.push(`"Action","User Email","Role","Timestamp"`);
  for (const ah of data.approvalHistory) {
    lines.push(`"${ah.action}","${ah.userEmail}","${ah.role}","${ah.timestamp}"`);
  }

  return lines.join("\r\n");
}

/**
 * Generates clean Excel XML Spreadsheet format (.xlsx / .xml)
 */
export function exportReportToXMLSpreadsheet(data: GeneratedReportData): string {
  let xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="NIRF Report">
  <Table>
   <Row><Cell><Data ss:Type="String">MCA NIRF ASSIST - ${data.title}</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">Department: ${data.department} | AY: ${data.academicYear} | Methodology: ${data.methodologyVersion}</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">${data.disclaimer.statement}</Data></Cell></Row>
   <Row></Row>`;

  for (const table of data.tables) {
    xml += `\n   <Row><Cell><Data ss:Type="String">${table.title}</Data></Cell></Row>\n   <Row>`;
    for (const col of table.columns) {
      xml += `<Cell><Data ss:Type="String">${col}</Data></Cell>`;
    }
    xml += `</Row>`;

    for (const row of table.rows) {
      xml += `\n   <Row>`;
      for (const cell of row) {
        const type = typeof cell === "number" ? "Number" : "String";
        xml += `<Cell><Data ss:Type="${type}">${String(cell)}</Data></Cell>`;
      }
      xml += `</Row>`;
    }
    xml += `\n   <Row></Row>`;
  }

  xml += `\n  </Table>\n </Worksheet>\n</Workbook>`;
  return xml;
}

/**
 * Generates an official, clean, printable HTML document suitable for browser printing / PDF export.
 */
export function exportReportToPrintableHTML(data: GeneratedReportData): string {
  const tableHtml = data.tables
    .map(
      (t) => `
    <div style="margin-bottom: 24px;">
      <h3 style="font-size: 14px; font-weight: bold; color: #0F172A; margin-bottom: 8px; border-bottom: 2px solid #E2E8F0; padding-bottom: 4px;">
        ${t.title}
      </h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 11px; text-align: left;">
        <thead>
          <tr style="background-color: #F1F5F9; color: #475569; text-transform: uppercase;">
            ${t.columns.map((c) => `<th style="padding: 6px 8px; border: 1px solid #CBD5E1;">${c}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${t.rows
            .map(
              (r) => `
            <tr>
              ${r.map((c) => `<td style="padding: 6px 8px; border: 1px solid #E2E8F0;">${c}</td>`).join("")}
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>${data.title} - MCA NIRF Assist</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #0F172A; padding: 32px; font-size: 12px; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div style="border-bottom: 3px solid #1D4ED8; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-start;">
    <div>
      <h1 style="font-size: 20px; font-weight: bold; color: #1D4ED8; margin: 0;">MCA NIRF ASSIST</h1>
      <h2 style="font-size: 15px; font-weight: 600; margin: 4px 0 0 0;">${data.title}</h2>
      <div style="font-size: 11px; color: #64748B; margin-top: 4px;">
        Department of Computer Applications · AY ${data.academicYear} · Methodology: ${data.methodologyVersion}
      </div>
    </div>
    <div style="text-align: right; font-size: 10px; color: #64748B;">
      <div>Generated: ${new Date(data.generatedAt).toLocaleString()}</div>
      <div>Security: Tamper-Evident SHA-256 Audit Trail</div>
    </div>
  </div>

  <div style="background-color: #FEF3C7; border: 1px solid #FDE68A; color: #92400E; padding: 10px; border-radius: 6px; font-size: 11px; margin-bottom: 20px;">
    <strong>REGULATORY COMPLIANCE MANDATE:</strong> ${data.disclaimer.statement}
  </div>

  ${tableHtml}

  <div style="margin-top: 32px; border-top: 1px solid #E2E8F0; padding-top: 16px; display: flex; justify-content: space-between; font-size: 11px; color: #475569;">
    <div>
      <div><strong>Verified By:</strong> Reviewer / Department NIRF Coordinator</div>
      <div style="margin-top: 24px;">Signature: __________________________</div>
    </div>
    <div style="text-align: right;">
      <div><strong>Authorized By:</strong> Head of Department (HOD) - MCA</div>
      <div style="margin-top: 24px;">Signature: __________________________</div>
    </div>
  </div>
</body>
</html>`;
}

