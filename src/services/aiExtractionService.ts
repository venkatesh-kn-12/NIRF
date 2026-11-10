import path from "path";
import { connectDB } from "@/lib/db";
import { Evidence } from "@/models/Evidence";
import { ExtractionJob, IExtractedField } from "@/models/ExtractionJob";
import { VerificationCase } from "@/models/VerificationCase";
import { IUser } from "@/models/User";
import { logAuditEvent } from "@/lib/audit";
import { getClientIp, getClientUserAgent } from "@/lib/auth";
import { readEvidenceFile } from "./evidenceStorage";
import { createRecord, updateRecord } from "./departmentRecordService";
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
import {
  studentSchema,
  facultySchema,
  financeSchema,
  publicationSchema,
  patentSchema,
  projectConsultancySchema,
  graduationOutcomeSchema,
  placementSchema,
  outreachSchema,
  perceptionSchema,
} from "@/validators";

export const RECORD_TYPE_CONFIG: Record<
  string,
  {
    model: any;
    modelName: string;
    validator: any;
    expectedFields: Array<{ name: string; label: string; type: string }>;
  }
> = {
  Faculty: {
    model: Faculty,
    modelName: "Faculty",
    validator: facultySchema,
    expectedFields: [
      { name: "facultyId", label: "Faculty ID", type: "string" },
      { name: "name", label: "Faculty Full Name", type: "string" },
      { name: "email", label: "Institutional Email", type: "email" },
      { name: "designation", label: "Designation", type: "string" },
      { name: "employmentType", label: "Employment Type (PERMANENT/CONTRACT/VISITING/ADJUNCT)", type: "string" },
      { name: "highestQualification", label: "Highest Qualification", type: "string" },
      { name: "phdStatus", label: "PhD Status (AWARDED/PURSUING/NOT_APPLICABLE)", type: "string" },
      { name: "phdAwardYear", label: "PhD Award Year", type: "number" },
      { name: "experienceYears", label: "Experience in Years", type: "number" },
      { name: "joiningDate", label: "Date of Joining (YYYY-MM-DD)", type: "date" },
      { name: "researchDomains", label: "Research Domains", type: "array" },
    ],
  },
  Student: {
    model: Student,
    modelName: "Student",
    validator: studentSchema,
    expectedFields: [
      { name: "studentId", label: "Student ID", type: "string" },
      { name: "prn", label: "PRN / Roll Number", type: "string" },
      { name: "name", label: "Student Full Name", type: "string" },
      { name: "email", label: "Email Address", type: "email" },
      { name: "batch", label: "Batch (e.g. 2024-2026)", type: "string" },
      { name: "admissionYear", label: "Admission Year", type: "number" },
      { name: "gender", label: "Gender (MALE/FEMALE/OTHER)", type: "string" },
      { name: "dateOfBirth", label: "Date of Birth (YYYY-MM-DD)", type: "date" },
      { name: "domicileState", label: "Domicile State", type: "string" },
      { name: "domicileType", label: "Domicile Type (HOME_STATE/OTHER_STATE/INTERNATIONAL)", type: "string" },
      { name: "category", label: "Category (General/OBC/SC/ST)", type: "string" },
      { name: "currentStatus", label: "Current Status (ACTIVE/GRADUATED/DISCONTINUED)", type: "string" },
      { name: "currentSemester", label: "Current Semester (1-6)", type: "number" },
      { name: "expectedGraduationYear", label: "Expected Graduation Year", type: "number" },
    ],
  },
  FinanceRecord: {
    model: FinanceRecord,
    modelName: "FinanceRecord",
    validator: financeSchema,
    expectedFields: [
      { name: "financialYear", label: "Financial Year (e.g. 2023-24)", type: "string" },
      { name: "expenditureHead", label: "Expenditure Head", type: "string" },
      { name: "amount", label: "Amount in INR", type: "number" },
      { name: "expenditureType", label: "Type (CAPITAL/OPERATIONAL)", type: "string" },
      { name: "purpose", label: "Purpose & Narrative", type: "string" },
    ],
  },
  Publication: {
    model: Publication,
    modelName: "Publication",
    validator: publicationSchema,
    expectedFields: [
      { name: "title", label: "Publication Title", type: "string" },
      { name: "authors", label: "Authors List", type: "array" },
      { name: "doi", label: "DOI Number", type: "string" },
      { name: "journalOrConference", label: "Journal or Conference Name", type: "string" },
      { name: "publicationDate", label: "Publication Date (YYYY-MM-DD)", type: "date" },
      { name: "indexing", label: "Indexing (SCOPUS/WEB_OF_SCIENCE/UGC_CARE/OTHER)", type: "string" },
      { name: "citationCount", label: "Citation Count", type: "number" },
    ],
  },
  Patent: {
    model: Patent,
    modelName: "Patent",
    validator: patentSchema,
    expectedFields: [
      { name: "title", label: "Patent Title", type: "string" },
      { name: "applicationNumber", label: "Application Number", type: "string" },
      { name: "filingDate", label: "Filing Date (YYYY-MM-DD)", type: "date" },
      { name: "applicant", label: "Applicant Name", type: "string" },
      { name: "inventors", label: "Inventors List", type: "array" },
      { name: "patentStatus", label: "Status (FILED/PUBLISHED/GRANTED/REJECTED)", type: "string" },
      { name: "patentOffice", label: "Patent Office", type: "string" },
    ],
  },
  ProjectConsultancy: {
    model: ProjectConsultancy,
    modelName: "ProjectConsultancy",
    validator: projectConsultancySchema,
    expectedFields: [
      { name: "title", label: "Project Title", type: "string" },
      { name: "type", label: "Type (SPONSORED_PROJECT/CONSULTANCY)", type: "string" },
      { name: "fundingAgencyOrClient", label: "Funding Agency or Client", type: "string" },
      { name: "sanctionedAmount", label: "Sanctioned Amount", type: "number" },
      { name: "receivedAmount", label: "Received Amount", type: "number" },
      { name: "startDate", label: "Start Date (YYYY-MM-DD)", type: "date" },
      { name: "principalInvestigator", label: "Principal Investigator", type: "string" },
    ],
  },
  GraduationOutcome: {
    model: GraduationOutcome,
    modelName: "GraduationOutcome",
    validator: graduationOutcomeSchema,
    expectedFields: [
      { name: "programme", label: "Programme", type: "string" },
      { name: "batch", label: "Graduating Batch", type: "string" },
      { name: "eligibleGraduates", label: "Eligible Students", type: "number" },
      { name: "graduatesInStipulatedTime", label: "Graduated in Stipulated Time", type: "number" },
      { name: "examinationPassCount", label: "Passed Final Examination", type: "number" },
      { name: "higherStudiesCount", label: "Progressed to Higher Studies", type: "number" },
    ],
  },
  PlacementRecord: {
    model: PlacementRecord,
    modelName: "PlacementRecord",
    validator: placementSchema,
    expectedFields: [
      { name: "studentReference", label: "Student PRN / ID", type: "string" },
      { name: "batch", label: "Batch", type: "string" },
      { name: "employer", label: "Employer / Company Name", type: "string" },
      { name: "offerType", label: "Offer Type (ON_CAMPUS/OFF_CAMPUS/PPO)", type: "string" },
      { name: "ctc", label: "CTC / Annual Package (INR)", type: "number" },
      { name: "offerDate", label: "Offer Date (YYYY-MM-DD)", type: "date" },
      { name: "placementYear", label: "Placement Year", type: "number" },
    ],
  },
  OutreachRecord: {
    model: OutreachRecord,
    modelName: "OutreachRecord",
    validator: outreachSchema,
    expectedFields: [
      { name: "recordType", label: "Record Type (REGIONAL_DIVERSITY/GENDER_DIVERSITY/FEE_SUPPORT)", type: "string" },
      { name: "aggregateCount", label: "Count of Students", type: "number" },
      { name: "totalEligiblePopulation", label: "Total Population", type: "number" },
    ],
  },
  PerceptionRecord: {
    model: PerceptionRecord,
    modelName: "PerceptionRecord",
    validator: perceptionSchema,
    expectedFields: [
      { name: "sourceType", label: "Source Type (OFFICIAL_SCORE/INTERNAL_FEEDBACK)", type: "string" },
      { name: "score", label: "Score Obtained", type: "number" },
      { name: "maximumScore", label: "Maximum Possible Score", type: "number" },
      { name: "surveyOrReferencePeriod", label: "Reference Period", type: "string" },
    ],
  },
};

/**
 * Checks if an AI provider API key is configured.
 */
export function getAIConfig() {
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.LLM_API_KEY ||
    process.env.OPENAI_API_KEY ||
    "";

  return {
    isConfigured: Boolean(apiKey.trim()),
    provider: process.env.GEMINI_API_KEY
      ? "Google Gemini"
      : process.env.OPENAI_API_KEY
      ? "OpenAI"
      : process.env.LLM_API_KEY
      ? "Generic LLM"
      : null,
    apiKey: apiKey.trim(),
  };
}

/**
 * Extracts fields from evidence document via real LLM API if configured.
 * Strictly avoids fake/mock data: returns empty extraction with manual-entry placeholders if key is absent.
 */
async function callLLMExtractor(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  recordType: string
): Promise<{
  success: boolean;
  fields: IExtractedField[];
  error?: string;
}> {
  const aiConfig = getAIConfig();

  if (!aiConfig.isConfigured) {
    return {
      success: false,
      fields: [],
      error: "AI extraction API key is not configured (GEMINI_API_KEY / LLM_API_KEY). Manual data entry and document tagging are enabled.",
    };
  }

  const config = RECORD_TYPE_CONFIG[recordType];
  const fieldList = config ? config.expectedFields.map((f) => `${f.name} (${f.label}, ${f.type})`).join(", ") : "";

  // Prepare text content for text-based formats (CSV, TXT, or small files)
  let textSample = "";
  if (mimeType.includes("csv") || mimeType.includes("text") || fileName.endsWith(".csv")) {
    textSample = fileBuffer.toString("utf-8").slice(0, 8000);
  }

  const systemPrompt = `You are a strict academic data extraction assistant for NIRF institutional accreditation.
Analyze the provided document data for the target entity type: "${recordType}".
Extract values for the following expected fields:
${fieldList}

REQUIREMENTS:
1. Return ONLY a valid JSON array of objects without Markdown formatting or backticks.
2. Each object MUST strictly match:
   {
     "fieldName": "exact field name from expected list",
     "extractedValue": value (string, number, array, or boolean),
     "confidence": number between 0 and 100,
     "sourceReference": "exact quote or row/column location in document",
     "reasoningSummary": "concise explanation of how value was located and inferred"
   }
3. NEVER fabricate or guess values not present in the document. For fields not mentioned, do NOT invent data; set confidence to 0 or omit.
4. Extract exactly one object per field found.`;

  try {
    if (process.env.GEMINI_API_KEY) {
      // Call Google Gemini API
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${aiConfig.apiKey}`;

      const contents: any[] = [];
      const parts: any[] = [{ text: systemPrompt }];

      if (textSample) {
        parts.push({ text: `\n\n--- DOCUMENT CONTENT (${fileName}) ---\n${textSample}` });
      } else {
        // Send base64 for PDF or image
        parts.push({
          inlineData: {
            mimeType: mimeType || "application/pdf",
            data: fileBuffer.toString("base64"),
          },
        });
        parts.push({ text: `Please extract the fields from the attached file ${fileName}.` });
      }

      contents.push({ parts });

      const resp = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents }),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`Gemini API error (${resp.status}): ${errText}`);
      }

      const resData = await resp.json();
      const rawText = resData.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const cleaned = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();

      const parsedArray = JSON.parse(cleaned);
      if (!Array.isArray(parsedArray)) {
        throw new Error("Invalid response format: expected JSON array");
      }

      const fields: IExtractedField[] = parsedArray.map((item: any) => ({
        fieldName: String(item.fieldName),
        extractedValue: item.extractedValue,
        confidence: Math.max(0, Math.min(100, Number(item.confidence) || 0)),
        sourceReference: String(item.sourceReference || fileName),
        reasoningSummary: String(item.reasoningSummary || ""),
        reviewStatus: "PENDING",
      }));

      return { success: true, fields };
    } else {
      // Fallback for OpenAI or other LLM
      const openAiUrl = "https://api.openai.com/v1/chat/completions";
      const resp = await fetch(openAiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${aiConfig.apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Document ${fileName}:\n${textSample || "[Document attached]"}` },
          ],
          response_format: { type: "json_object" },
        }),
      });

      if (!resp.ok) {
        throw new Error(`LLM API returned ${resp.status}`);
      }

      const data = await resp.json();
      const content = data.choices?.[0]?.message?.content || "{}";
      const parsed = JSON.parse(content);
      const list = Array.isArray(parsed) ? parsed : parsed.fields || [];

      const fields: IExtractedField[] = list.map((item: any) => ({
        fieldName: String(item.fieldName),
        extractedValue: item.extractedValue,
        confidence: Math.max(0, Math.min(100, Number(item.confidence) || 0)),
        sourceReference: String(item.sourceReference || fileName),
        reasoningSummary: String(item.reasoningSummary || ""),
        reviewStatus: "PENDING",
      }));

      return { success: true, fields };
    }
  } catch (err: unknown) {
    return {
      success: false,
      fields: [],
      error: `Extraction failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/**
 * Initiates an extraction job.
 * Creates ExtractionJob, writes audit logs, parses document if API key is present,
 * or prepares manual entry placeholders if not configured.
 */
export async function createExtractionJob(
  evidenceId: string,
  relatedRecordType: string,
  user: IUser,
  req?: Request
) {
  await connectDB();

  const evidence = await Evidence.findById(evidenceId);
  if (!evidence) {
    throw new Error("Evidence document not found");
  }

  const ipAddress = req ? getClientIp(req) : "127.0.0.1";
  const userAgent = req ? getClientUserAgent(req) : "Server";

  // Create initial job in QUEUED status
  const job = await ExtractionJob.create({
    evidenceId: evidence._id,
    relatedRecordType,
    status: "PROCESSING",
    extractedFields: [],
    confidenceScores: {},
    sourceReferences: [evidence.originalFileName],
    errors: [],
    startedAt: new Date(),
    department: "MCA",
    academicYear: evidence.academicYear || "2024-25",
    createdBy: user._id,
  });

  // Audit log: extraction start
  await logAuditEvent({
    action: "extraction start",
    userId: user._id,
    userEmail: user.email,
    userRole: user.role,
    department: "MCA",
    resourceType: "ExtractionJob",
    resourceId: job._id.toString(),
    details: {
      evidenceId: evidence._id.toString(),
      originalFileName: evidence.originalFileName,
      relatedRecordType,
    },
    status: "SUCCESS",
    ipAddress,
    userAgent,
  });

  // Read the secure file
  let fileBuffer: Buffer;
  try {
    fileBuffer = await readEvidenceFile(evidence.storedFileName);
  } catch (err) {
    job.status = "FAILED";
    job.errors.push("Failed to read stored evidence file");
    job.completedAt = new Date();
    await job.save();
    return job;
  }

  // Attempt real LLM extraction
  const extractionResult = await callLLMExtractor(
    fileBuffer,
    evidence.originalFileName,
    evidence.mimeType,
    relatedRecordType
  );

  const confidenceScores: Record<string, number> = {};

  if (extractionResult.success && extractionResult.fields.length > 0) {
    job.extractedFields = extractionResult.fields;
    let hasLowConfidence = false;

    for (const f of extractionResult.fields) {
      confidenceScores[f.fieldName] = f.confidence;
      if (f.confidence < 80) {
        hasLowConfidence = true;
      }
    }

    job.confidenceScores = confidenceScores;
    // Low-confidence fields MUST require manual review
    job.status = hasLowConfidence ? "NEEDS_REVIEW" : "COMPLETED";
    job.completedAt = new Date();

    if (hasLowConfidence) {
      const lowFields = extractionResult.fields
        .filter((f) => f.confidence < 80)
        .map((f) => `${f.fieldName} (${f.confidence}%)`)
        .join(", ");

      await VerificationCase.create({
        relatedRecordType,
        relatedRecordId: job._id,
        parameter: "TLR",
        issueType: "LOW_CONFIDENCE_EXTRACTION",
        severity: "MEDIUM",
        submittedValue: `Job ${job._id.toString().slice(-6)}`,
        proposedValue: "Manual Review Required",
        difference: lowFields,
        evidenceReferences: [
          {
            fileName: evidence.originalFileName,
            fileUrl: `/api/evidences/${evidence._id}/download`,
            fileSize: evidence.fileSize,
            uploadedAt: new Date(),
            uploadedBy: user._id,
          },
        ],
        aiExplanation: `Evidence document '${evidence.originalFileName}' resulted in low confidence (<80%) for fields: ${lowFields}. Requires manual verification.`,
        status: "OPEN",
        department: "MCA",
        academicYear: evidence.academicYear || "2024-25",
      }).catch((err) => console.error("Auto verification case creation error:", err));
    }
  } else {
    // If AI is not configured or failed, prepare schema template fields for manual data entry
    const config = RECORD_TYPE_CONFIG[relatedRecordType];
    const defaultFields: IExtractedField[] = config
      ? config.expectedFields.map((f) => ({
          fieldName: f.name,
          extractedValue: null,
          confidence: 0,
          sourceReference: evidence.originalFileName,
          reasoningSummary: extractionResult.error || "Manual data entry required",
          reviewStatus: "PENDING",
        }))
      : [];

    job.extractedFields = defaultFields;
    job.status = "NEEDS_REVIEW";
    if (extractionResult.error) {
      job.errors.push(extractionResult.error);
    }
    job.completedAt = new Date();
  }

  await job.save();

  // Audit log: extraction completion
  await logAuditEvent({
    action: "extraction completion",
    userId: user._id,
    userEmail: user.email,
    userRole: user.role,
    department: "MCA",
    resourceType: "ExtractionJob",
    resourceId: job._id.toString(),
    details: {
      status: job.status,
      fieldsCount: job.extractedFields.length,
      errors: job.errors,
    },
    status: "SUCCESS",
    ipAddress,
    userAgent,
  });

  return job;
}

/**
 * Handles user review on an individual extracted field.
 * Allows user to ACCEPT, REJECT, or MANUALLY CORRECT each field.
 */
export async function reviewExtractedField(
  jobId: string,
  fieldIndexOrName: number | string,
  decision: "ACCEPTED" | "REJECTED" | "CORRECTED",
  correctedValue: any,
  user: IUser,
  req?: Request
) {
  await connectDB();

  const job = await ExtractionJob.findById(jobId);
  if (!job) {
    throw new Error("Extraction job not found");
  }

  let targetField: IExtractedField | undefined;
  if (typeof fieldIndexOrName === "number") {
    targetField = job.extractedFields[fieldIndexOrName];
  } else {
    targetField = job.extractedFields.find((f) => f.fieldName === fieldIndexOrName);
  }

  if (!targetField) {
    throw new Error(`Field '${fieldIndexOrName}' not found in extraction job`);
  }

  targetField.reviewStatus = decision;
  targetField.reviewedBy = user._id;
  targetField.reviewedAt = new Date();

  let auditAction: "field acceptance" | "field rejection" | "manual correction" = "field acceptance";

  if (decision === "CORRECTED") {
    targetField.correctedValue = correctedValue;
    targetField.confidence = 100; // Human verified
    auditAction = "manual correction";
  } else if (decision === "REJECTED") {
    auditAction = "field rejection";
  } else {
    auditAction = "field acceptance";
  }

  // Update confidence score
  job.confidenceScores[targetField.fieldName] = targetField.confidence;
  job.markModified("extractedFields");
  job.markModified("confidenceScores");

  await job.save();

  const ipAddress = req ? getClientIp(req) : "127.0.0.1";
  const userAgent = req ? getClientUserAgent(req) : "Server";

  await logAuditEvent({
    action: auditAction,
    userId: user._id,
    userEmail: user.email,
    userRole: user.role,
    department: "MCA",
    resourceType: "ExtractionJob",
    resourceId: job._id.toString(),
    details: {
      fieldName: targetField.fieldName,
      decision,
      extractedValue: targetField.extractedValue,
      correctedValue: targetField.correctedValue,
    },
    status: "SUCCESS",
    ipAddress,
    userAgent,
  });

  return job;
}

/**
 * Commits approved/reviewed fields into a DRAFT canonical record.
 * GUARANTEED: NEVER creates an approved record directly! AI extractions always create/update DRAFT records.
 */
export async function commitExtractionToDraftRecord(
  jobId: string,
  user: IUser,
  req?: Request
) {
  await connectDB();

  const job = await ExtractionJob.findById(jobId).populate("evidenceId");
  if (!job) {
    throw new Error("Extraction job not found");
  }

  const config = RECORD_TYPE_CONFIG[job.relatedRecordType];
  if (!config) {
    throw new Error(`Unsupported record type: ${job.relatedRecordType}`);
  }

  // Build record payload from accepted or corrected fields
  const recordPayload: Record<string, any> = {
    department: "MCA",
    academicYear: job.academicYear || "2024-25",
    reportingPeriod: "NIRF-2025",
    status: "DRAFT", // Strict: AI CANNOT create approved records
  };

  const evidence = job.evidenceId as any;
  if (evidence) {
    recordPayload.evidenceReferences = [
      {
        fileName: evidence.originalFileName,
        fileUrl: `/api/evidences/${evidence._id}/download`,
        fileSize: evidence.fileSize,
        uploadedAt: new Date(),
        uploadedBy: user._id,
      },
    ];
  }

  for (const field of job.extractedFields) {
    if (field.reviewStatus === "ACCEPTED") {
      recordPayload[field.fieldName] = field.extractedValue;
    } else if (field.reviewStatus === "CORRECTED") {
      recordPayload[field.fieldName] = field.correctedValue;
    }
  }

  let createdOrUpdatedDoc: any;

  if (job.targetRecordId) {
    createdOrUpdatedDoc = await updateRecord(
      config.model,
      config.modelName,
      job.targetRecordId.toString(),
      recordPayload,
      config.validator.partial(),
      user,
      req
    );
  } else {
    createdOrUpdatedDoc = await createRecord(
      config.model,
      config.modelName,
      recordPayload,
      config.validator,
      user,
      req
    );
    job.targetRecordId = createdOrUpdatedDoc._id;
  }

  job.status = "COMPLETED";
  await job.save();

  if (evidence) {
    evidence.relatedRecordId = createdOrUpdatedDoc._id;
    evidence.relatedRecordType = config.modelName;
    await evidence.save();
  }

  return {
    success: true,
    message: `Draft ${config.modelName} record created successfully from verified extraction.`,
    record: createdOrUpdatedDoc,
    job,
  };
}

