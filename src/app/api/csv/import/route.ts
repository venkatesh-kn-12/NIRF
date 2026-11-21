import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { extractTokenFromRequest, getSessionUser, getClientIp, getClientUserAgent } from "@/lib/auth";
import { hasRole } from "@/lib/rbac";
import { logAuditEvent } from "@/lib/audit";
import { Student } from "@/models/Student";
import { Faculty } from "@/models/Faculty";
import { Publication } from "@/models/Publication";
import { Patent } from "@/models/Patent";
import { FinanceRecord } from "@/models/FinanceRecord";
import { ProjectConsultancy } from "@/models/ProjectConsultancy";
import { PlacementRecord } from "@/models/PlacementRecord";
import { GraduationOutcome } from "@/models/GraduationOutcome";
import { DoctoralAward } from "@/models/DoctoralAward";
import {
  studentSchema,
  facultySchema,
  publicationSchema,
  patentSchema,
  financeSchema,
  projectConsultancySchema,
  placementSchema,
  graduationOutcomeSchema,
  doctoralAwardSchema,
} from "@/validators";

export async function POST(req: NextRequest) {
  try {
    const token = extractTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const authData = await getSessionUser(token);
    if (!authData) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    const { user } = authData;

    // Both Admin and Faculty Contributor can import data
    if (!hasRole(user.role, ["DEPARTMENT_ADMIN", "FACULTY_CONTRIBUTOR"])) {
      return NextResponse.json(
        { error: `Forbidden. Role ${user.role} is not permitted to import records.` },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { module: moduleName, rows } = body;

    if (!moduleName || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: "Invalid request. Provide 'module' and a non-empty array of 'rows'." },
        { status: 400 }
      );
    }

    await connectDB();

    const results = {
      total: rows.length,
      imported: 0,
      skippedDuplicates: 0,
      errors: [] as Array<{ row: number; error: string; data?: any }>,
      savedIds: [] as string[],
    };

    const targetModule = moduleName.toLowerCase();

    for (let i = 0; i < rows.length; i++) {
      const rawRow = rows[i];
      const rowNum = i + 1;

      try {
        switch (targetModule) {
          case "students": {
            const studentName = rawRow.name || rawRow.fullName || rawRow.studentName || "";
            const studentPrn = rawRow.prn || rawRow.usn || rawRow.rollNo || rawRow.studentId || "";
            const admYear = Number(rawRow.admissionYear) || (rawRow.batch ? parseInt(rawRow.batch.toString().split("-")[0]) : 2024);
            const expGradYear = Number(rawRow.expectedGraduationYear) || (admYear + 2);
            const dob = rawRow.dateOfBirth ? new Date(rawRow.dateOfBirth) : new Date(admYear - 22, 0, 1);
            const domState = rawRow.domicileState || rawRow.homeState || "Karnataka";
            const rawStateType = (rawRow.domicileType || rawRow.stateType || "HOME_STATE").toString().toUpperCase();
            const domType = rawStateType.includes("OTHER") ? "OTHER_STATE" : rawStateType.includes("INT") ? "INTERNATIONAL" : "HOME_STATE";

            const checkId = rawRow.studentId || studentPrn;
            if (checkId || studentPrn) {
              const existing = await Student.findOne({
                department: "MCA",
                $or: [
                  ...(checkId ? [{ studentId: checkId }] : []),
                  ...(studentPrn ? [{ prn: studentPrn }] : []),
                ],
              });
              if (existing) {
                results.skippedDuplicates++;
                continue;
              }
            }

            const parsed = studentSchema.safeParse({
              ...rawRow,
              studentId: checkId,
              name: studentName,
              prn: studentPrn,
              programme: rawRow.programme || rawRow.program || "MCA",
              admissionYear: admYear,
              expectedGraduationYear: expGradYear,
              dateOfBirth: dob,
              gender: (rawRow.gender || "MALE").toString().toUpperCase(),
              socialCategory: (rawRow.socialCategory || rawRow.category || "GENERAL").toString().toUpperCase(),
              domicileState: domState,
              domicileType: domType,
              isEconomicallyBackward: String(rawRow.isEconomicallyBackward).toLowerCase() === "true",
              isSociallyChallenged: String(rawRow.isSociallyChallenged).toLowerCase() === "true",
              tuitionFeeReimbursed: String(rawRow.tuitionFeeReimbursed).toLowerCase() === "true",
              reimbursementType: rawRow.reimbursementType || "NONE",
              department: "MCA",
              status: "RECORDED",
            });

            if (!parsed.success) {
              results.errors.push({
                row: rowNum,
                error: parsed.error.issues.map((err) => `${err.path.join(".")}: ${err.message}`).join("; "),
                data: rawRow,
              });
              continue;
            }

            const doc = await Student.create({
              ...parsed.data,
              department: "MCA",
              status: "RECORDED",
              createdBy: user._id,
              updatedBy: user._id,
            });
            results.imported++;
            results.savedIds.push(doc._id.toString());
            break;
          }

          case "faculty": {
            const facId = rawRow.facultyId || rawRow.employeeId || "";
            const facEmail = rawRow.email || "";

            if (facId || facEmail) {
              const existing = await Faculty.findOne({
                department: "MCA",
                $or: [
                  ...(facId ? [{ facultyId: facId }] : []),
                  ...(facEmail ? [{ email: facEmail.toLowerCase() }] : []),
                ],
              });
              if (existing) {
                results.skippedDuplicates++;
                continue;
              }
            }

            const parsed = facultySchema.safeParse({
              ...rawRow,
              facultyId: facId,
              name: rawRow.name || "",
              email: facEmail.toLowerCase(),
              designation: rawRow.designation || "Assistant Professor",
              employmentType: (rawRow.employmentType || "PERMANENT").toString().toUpperCase(),
              highestQualification: rawRow.highestQualification || "Post Graduate",
              qualificationField: rawRow.qualificationField || "Computer Applications",
              phdStatus: (rawRow.phdStatus || "NOT_APPLICABLE").toString().toUpperCase(),
              experienceYears: Number(rawRow.experienceYears) || 0,
              gender: (rawRow.gender || "MALE").toString().toUpperCase(),
              dateOfJoining: rawRow.dateOfJoining ? new Date(rawRow.dateOfJoining) : new Date(2020, 0, 1),
              department: "MCA",
              status: "RECORDED",
            });

            if (!parsed.success) {
              results.errors.push({
                row: rowNum,
                error: parsed.error.issues.map((err) => `${err.path.join(".")}: ${err.message}`).join("; "),
                data: rawRow,
              });
              continue;
            }

            const doc = await Faculty.create({
              ...parsed.data,
              department: "MCA",
              status: "RECORDED",
              createdBy: user._id,
              updatedBy: user._id,
            });
            results.imported++;
            results.savedIds.push(doc._id.toString());
            break;
          }

          case "publications": {
            const pubTitle = rawRow.title?.toString().trim() || "";
            const pubDoi = rawRow.doi?.toString().trim() || "";

            if (!pubTitle) {
              results.errors.push({ row: rowNum, error: "Publication title is required", data: rawRow });
              continue;
            }

            const existing = await Publication.findOne({
              department: "MCA",
              $or: [
                { title: { $regex: new RegExp(`^${pubTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") } },
                ...(pubDoi ? [{ doi: pubDoi }] : []),
              ],
            });
            if (existing) {
              results.skippedDuplicates++;
              continue;
            }

            const rawAuthors = rawRow.authors?.toString().trim() || "";
            const authorsList = rawAuthors ? rawAuthors.split(",").map((s: string) => s.trim()).filter(Boolean) : ["Faculty Member"];

            const rawIndexing = (rawRow.indexing || "OTHER").toString().toUpperCase();
            const indexing = rawIndexing.includes("SCOPUS") ? "SCOPUS" : rawIndexing.includes("WEB") || rawIndexing.includes("WOS") ? "WEB_OF_SCIENCE" : rawIndexing.includes("UGC") ? "UGC_CARE" : rawIndexing.includes("IEEE") ? "IEEE_XPLORE" : "OTHER";

            const parsed = publicationSchema.safeParse({
              ...rawRow,
              title: pubTitle,
              authors: authorsList,
              publicationType: (rawRow.publicationType || "JOURNAL").toString().toUpperCase(),
              journalOrConference: rawRow.journalOrConference || rawRow.journal || "Conference/Journal",
              publicationYear: Number(rawRow.publicationYear) || new Date().getFullYear(),
              indexing,
              doi: pubDoi || undefined,
              url: rawRow.url || undefined,
              publisher: rawRow.publisher || undefined,
              citationCount: rawRow.citationCount !== undefined && rawRow.citationCount !== "" ? Number(rawRow.citationCount) : null,
              journalQuartile: rawRow.journalQuartile || "UNKNOWN",
              department: "MCA",
              status: "RECORDED",
            });

            if (!parsed.success) {
              results.errors.push({
                row: rowNum,
                error: parsed.error.issues.map((err) => `${err.path.join(".")}: ${err.message}`).join("; "),
                data: rawRow,
              });
              continue;
            }

            const doc = await Publication.create({
              ...parsed.data,
              department: "MCA",
              status: "RECORDED",
              createdBy: user._id,
              updatedBy: user._id,
            });
            results.imported++;
            results.savedIds.push(doc._id.toString());
            break;
          }

          case "patents": {
            const appNo = rawRow.applicationNumber?.toString().trim() || "";
            const patentTitle = rawRow.title?.toString().trim() || "";
            const jur = rawRow.jurisdiction?.toString().trim() || "INDIA";

            if (!appNo && !patentTitle) {
              results.errors.push({ row: rowNum, error: "Application number or title is required", data: rawRow });
              continue;
            }

            const existing = await Patent.findOne({
              department: "MCA",
              $or: [
                ...(appNo ? [{ applicationNumber: appNo, jurisdiction: jur }] : []),
                ...(patentTitle ? [{ title: { $regex: new RegExp(`^${patentTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") } }] : []),
              ],
            });
            if (existing) {
              results.skippedDuplicates++;
              continue;
            }

            const rawInventors = rawRow.inventors?.toString().trim() || "";
            const inventorsList = rawInventors ? rawInventors.split(",").map((s: string) => s.trim()).filter(Boolean) : ["Faculty Inventor"];

            const rawStatus = (rawRow.legalStatus || "PUBLISHED").toString().toUpperCase();
            const legalStatus = rawStatus.includes("GRANT") ? "GRANTED" : rawStatus.includes("COMMERCIAL") ? "COMMERCIALIZED" : rawStatus.includes("FILE") ? "FILED" : "PUBLISHED";

            const parsed = patentSchema.safeParse({
              ...rawRow,
              title: patentTitle,
              applicationNumber: appNo || `MCA-PAT-${Date.now()}`,
              jurisdiction: jur,
              applicant: rawRow.applicant || "Dayananda Sagar Academy of Technology and Management",
              inventors: inventorsList,
              filingDate: rawRow.filingDate ? new Date(rawRow.filingDate) : new Date(2023, 0, 1),
              publicationDate: rawRow.publicationDate ? new Date(rawRow.publicationDate) : undefined,
              grantDate: rawRow.grantDate ? new Date(rawRow.grantDate) : undefined,
              legalStatus,
              department: "MCA",
              status: "RECORDED",
            });

            if (!parsed.success) {
              results.errors.push({
                row: rowNum,
                error: parsed.error.issues.map((err) => `${err.path.join(".")}: ${err.message}`).join("; "),
                data: rawRow,
              });
              continue;
            }

            const doc = await Patent.create({
              ...parsed.data,
              department: "MCA",
              status: "RECORDED",
              createdBy: user._id,
              updatedBy: user._id,
            });
            results.imported++;
            results.savedIds.push(doc._id.toString());
            break;
          }

          case "finance": {
            const parsed = financeSchema.safeParse({
              ...rawRow,
              financialYear: rawRow.financialYear?.toString().trim() || "2024-25",
              expenditureType: (rawRow.expenditureType || "OPERATIONAL").toString().toUpperCase(),
              expenditureHead: rawRow.expenditureHead || "Department Operational Expense",
              granularity: rawRow.granularity || "ANNUAL_AGGREGATE",
              amount: Number(rawRow.amount) || 0,
              unit: rawRow.unit || "INR",
              purpose: rawRow.purpose || "MCA Department Academic & Operational Expenditure",
              isExcluded: String(rawRow.isExcluded).toLowerCase() === "true",
              exclusionType: rawRow.exclusionType || "NONE",
              department: "MCA",
              status: "RECORDED",
            });

            if (!parsed.success) {
              results.errors.push({
                row: rowNum,
                error: parsed.error.issues.map((err) => `${err.path.join(".")}: ${err.message}`).join("; "),
                data: rawRow,
              });
              continue;
            }

            const doc = await FinanceRecord.create({
              ...parsed.data,
              department: "MCA",
              status: "RECORDED",
              createdBy: user._id,
              updatedBy: user._id,
            });
            results.imported++;
            results.savedIds.push(doc._id.toString());
            break;
          }

          case "projects": {
            const title = rawRow.title?.toString().trim() || "";
            const pi = rawRow.principalInvestigator?.toString().trim() || rawRow.pi?.toString().trim() || "";
            if (!title) {
              results.errors.push({ row: rowNum, error: "Project title is required", data: rawRow });
              continue;
            }

            const existing = await ProjectConsultancy.findOne({
              department: "MCA",
              title: { $regex: new RegExp(`^${title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
              principalInvestigator: pi,
            });
            if (existing) {
              results.skippedDuplicates++;
              continue;
            }

            const receipts: Array<Record<string, unknown>> = [];
            const receiptFY = rawRow.receiptFinancialYear?.toString().trim();
            const receiptAmt = Number(rawRow.receiptAmount);
            if (receiptFY && receiptAmt > 0) {
              const receipt: Record<string, unknown> = {
                financialYear: receiptFY,
                amount: receiptAmt,
                mcaAllocationPercentage: Number(rawRow.receiptAllocationPct) || 100,
              };
              if (rawRow.receiptDate) receipt.receiptDate = new Date(rawRow.receiptDate);
              if (rawRow.receiptRef) receipt.referenceNumber = rawRow.receiptRef.toString().trim();
              receipts.push(receipt);
            }

            const rawCoIs = rawRow.coInvestigators?.toString().trim() || "";
            const coIs = rawCoIs ? rawCoIs.split(",").map((s: string) => s.trim()).filter(Boolean) : [];

            const payload = {
              title,
              type: (rawRow.type?.toString().toUpperCase() === "CONSULTANCY" ? "CONSULTANCY" : "SPONSORED_PROJECT") as "SPONSORED_PROJECT" | "CONSULTANCY",
              fundingAgencyOrClient: rawRow.fundingAgencyOrClient?.toString().trim() || rawRow.agency?.toString().trim() || "Unknown",
              projectNumber: rawRow.projectNumber?.toString().trim() || `PRJ-${Date.now()}`,
              principalInvestigator: pi || "Faculty PI",
              coInvestigators: coIs,
              sanctionedAmount: Number(rawRow.sanctionedAmount) || 0,
              receivedAmount: Number(rawRow.receivedAmount) || 0,
              startDate: rawRow.startDate ? new Date(rawRow.startDate) : new Date(2022, 0, 1),
              endDate: rawRow.endDate ? new Date(rawRow.endDate) : new Date(2024, 11, 31),
              scope: (rawRow.scope?.toString().toUpperCase() === "INSTITUTION" ? "INSTITUTION" : "DEPARTMENT") as "DEPARTMENT" | "INSTITUTION",
              receipts,
              department: "MCA" as const,
              status: "RECORDED" as const,
            };

            const parsed = projectConsultancySchema.safeParse(payload);
            if (!parsed.success) {
              results.errors.push({
                row: rowNum,
                error: parsed.error.issues.map((err) => `${err.path.join(".")}: ${err.message}`).join("; "),
                data: rawRow,
              });
              continue;
            }

            const doc = await ProjectConsultancy.create({
              ...parsed.data,
              department: "MCA",
              status: "RECORDED",
              createdBy: user._id,
              updatedBy: user._id,
            });
            results.imported++;
            results.savedIds.push(doc._id.toString());
            break;
          }

          case "placements": {
            const studentRef = (rawRow.studentReference || rawRow.studentId || rawRow.prn || rawRow.usn || "").toString().trim();
            const employerName = (rawRow.employer || rawRow.company || "").toString().trim();
            const batchVal = (rawRow.batch || "2022-2024").toString().trim();
            const placementYear = Number(rawRow.placementYear) || 2024;
            const ctc = Number(rawRow.ctc) || Number(rawRow.salary) || 0;
            const offerDate = rawRow.offerDate ? new Date(rawRow.offerDate) : new Date(placementYear, 4, 1);

            if (!studentRef || !employerName) {
              results.errors.push({
                row: rowNum,
                error: "Missing required fields: studentReference and employer",
                data: rawRow,
              });
              continue;
            }

            const existing = await PlacementRecord.findOne({
              department: "MCA",
              studentReference: studentRef,
              employer: { $regex: new RegExp(`^${employerName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
              placementYear,
            });
            if (existing) {
              results.skippedDuplicates++;
              continue;
            }

            const parsed = placementSchema.safeParse({
              ...rawRow,
              studentReference: studentRef,
              employer: employerName,
              batch: batchVal,
              programme: rawRow.programme || "MCA",
              offerType: rawRow.offerType || "ON_CAMPUS",
              ctc,
              offerDate,
              joiningStatus: rawRow.joiningStatus || "JOINED",
              higherStudiesStatus: rawRow.higherStudiesStatus || "NO",
              placementYear,
              department: "MCA",
              status: "RECORDED",
            });

            if (!parsed.success) {
              results.errors.push({
                row: rowNum,
                error: parsed.error.issues.map((err) => `${err.path.join(".")}: ${err.message}`).join("; "),
                data: rawRow,
              });
              continue;
            }

            const doc = await PlacementRecord.create({
              ...parsed.data,
              department: "MCA",
              status: "RECORDED",
              createdBy: user._id,
              updatedBy: user._id,
            });
            results.imported++;
            results.savedIds.push(doc._id.toString());
            break;
          }

          case "graduation-outcomes": {
            const batchVal = (rawRow.batch || "").toString().trim();
            if (!batchVal) {
              results.errors.push({ row: rowNum, error: "Batch is required", data: rawRow });
              continue;
            }

            const existing = await GraduationOutcome.findOne({
              department: "MCA",
              batch: batchVal,
              programme: rawRow.programme || "MCA",
            });
            if (existing) {
              results.skippedDuplicates++;
              continue;
            }

            const parsed = graduationOutcomeSchema.safeParse({
              ...rawRow,
              programme: rawRow.programme || "MCA",
              batch: batchVal,
              eligibleGraduates: Number(rawRow.eligibleGraduates) || 0,
              graduatesInStipulatedTime: Number(rawRow.graduatesInStipulatedTime) || 0,
              examinationPassCount: Number(rawRow.examinationPassCount) || 0,
              higherStudiesCount: Number(rawRow.higherStudiesCount) || 0,
              phdCompletionCount: Number(rawRow.phdCompletionCount) || 0,
              department: "MCA",
              status: "RECORDED",
            });

            if (!parsed.success) {
              results.errors.push({
                row: rowNum,
                error: parsed.error.issues.map((err) => `${err.path.join(".")}: ${err.message}`).join("; "),
                data: rawRow,
              });
              continue;
            }

            const doc = await GraduationOutcome.create({
              ...parsed.data,
              department: "MCA",
              status: "RECORDED",
              createdBy: user._id,
              updatedBy: user._id,
            });
            results.imported++;
            results.savedIds.push(doc._id.toString());
            break;
          }

          case "doctoral-awards": {
            const scholarName = (rawRow.scholarName || rawRow.name || "").toString().trim();
            const thesisTitle = (rawRow.thesisTitle || rawRow.title || "").toString().trim();
            const awardYear = Number(rawRow.awardYear) || (rawRow.awardDate ? new Date(rawRow.awardDate).getFullYear() : 2024);
            const awardDate = rawRow.awardDate ? new Date(rawRow.awardDate) : new Date(awardYear, 5, 1);

            if (!scholarName || !thesisTitle) {
              results.errors.push({
                row: rowNum,
                error: "scholarName and thesisTitle are required",
                data: rawRow,
              });
              continue;
            }

            const existing = await DoctoralAward.findOne({
              department: "MCA",
              scholarName: { $regex: new RegExp(`^${scholarName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
              awardYear,
            });
            if (existing) {
              results.skippedDuplicates++;
              continue;
            }

            const parsed = doctoralAwardSchema.safeParse({
              ...rawRow,
              scholarName,
              thesisTitle,
              supervisorName: (rawRow.supervisorName || rawRow.guideName || "Supervisor").toString().trim(),
              programme: rawRow.programme || "MCA",
              studentReference: rawRow.studentReference || "",
              awardDate,
              awardYear,
              department: "MCA",
              status: "RECORDED",
            });

            if (!parsed.success) {
              results.errors.push({
                row: rowNum,
                error: parsed.error.issues.map((err) => `${err.path.join(".")}: ${err.message}`).join("; "),
                data: rawRow,
              });
              continue;
            }

            const doc = await DoctoralAward.create({
              ...parsed.data,
              department: "MCA",
              status: "RECORDED",
              createdBy: user._id,
              updatedBy: user._id,
            });
            results.imported++;
            results.savedIds.push(doc._id.toString());
            break;
          }

          default:
            return NextResponse.json({ error: `Unsupported module: ${moduleName}` }, { status: 400 });
        }
      } catch (rowErr: any) {
        results.errors.push({
          row: rowNum,
          error: rowErr.message || "Failed to import row",
          data: rawRow,
        });
      }
    }

    const ipAddress = getClientIp(req);
    const userAgent = getClientUserAgent(req);
    await logAuditEvent({
      action: "record creation",
      userId: user._id,
      userEmail: user.email,
      userRole: user.role,
      department: "MCA",
      resourceType: targetModule,
      details: {
        batchImport: true,
        importedCount: results.imported,
        skippedDuplicates: results.skippedDuplicates,
        errorCount: results.errors.length,
      },
      status: "SUCCESS",
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      message: `Batch CSV import completed. ${results.imported} imported, ${results.skippedDuplicates} skipped, ${results.errors.length} errors.`,
      ...results,
    });
  } catch (error: any) {
    console.error("POST /api/csv/import error:", error);
    return NextResponse.json({ error: error.message || "CSV import failed" }, { status: 500 });
  }
}
