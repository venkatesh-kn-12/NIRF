import { z } from "zod";

export const evidenceReferenceSchema = z.object({
  fileName: z.string().min(1, "File name is required"),
  fileUrl: z.string().url("Valid evidence file URL required"),
  fileSize: z.number().nonnegative().default(0),
});

export const reviewDecisionSchema = z.object({
  decision: z.enum(["APPROVE", "REJECT", "REQUEST_CORRECTION"], {
    message: "Decision must be APPROVE, REJECT, or REQUEST_CORRECTION",
  }),
  comment: z.string().optional().default(""),
});

// Common record base schema
const commonFields = {
  department: z.literal("MCA").default("MCA"),
  academicYear: z.string().min(4, "Academic year required (e.g. 2023-24)").default("2023-24"),
  reportingPeriod: z.string().default("NIRF-2025"),
  assignedTo: z.string().optional().nullable(),
  evidenceReferences: z.array(evidenceReferenceSchema).optional().default([]),
};

// 1. Student Schema
export const studentSchema = z.object({
  studentId: z.string().min(1, "Student ID is required"),
  prn: z.string().min(1, "PRN is required"),
  name: z.string().min(2, "Student name must be at least 2 characters"),
  email: z.string().email("Valid institutional email is required"),
  programme: z.string().default("MCA"),
  batch: z.string().min(4, "Batch is required (e.g. 2023-2025)"),
  admissionYear: z.coerce.number().min(2000).max(2100),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  dateOfBirth: z.coerce.date(),
  domicileState: z.string().min(2, "Domicile state is required"),
  domicileType: z.enum(["HOME_STATE", "OTHER_STATE", "INTERNATIONAL"]),
  category: z.string().min(1, "Category is required (e.g. OPEN, OBC, SC, ST, EWS)"),
  currentStatus: z.enum(["ACTIVE", "GRADUATED", "DISCONTINUED"]).default("ACTIVE"),
  currentSemester: z.coerce.number().min(1).max(6).default(1),
  expectedGraduationYear: z.coerce.number().min(2000).max(2100),
  actualGraduationYear: z.coerce.number().min(2000).max(2100).optional().nullable(),
  higherStudiesStatus: z.string().default("NOT_PURSUING"),
  ...commonFields,
});

export const studentUpdateSchema = studentSchema.partial();

// 2. Faculty Schema
export const facultySchema = z.object({
  facultyId: z.string().min(1, "Faculty ID is required"),
  name: z.string().min(2, "Faculty name must be at least 2 characters"),
  email: z.string().email("Valid email is required"),
  designation: z.string().min(2, "Designation is required"),
  employmentType: z.enum(["PERMANENT", "CONTRACT", "VISITING", "ADJUNCT"]),
  highestQualification: z.string().min(2, "Highest qualification is required"),
  phdStatus: z.enum(["AWARDED", "PURSUING", "NOT_ENROLLED", "NOT_APPLICABLE"]).default("NOT_APPLICABLE"),
  phdAwardYear: z.coerce.number().min(1950).max(2100).optional().nullable(),
  experienceYears: z.coerce.number().min(0, "Experience must be 0 or greater"),
  joiningDate: z.coerce.date(),
  leavingDate: z.coerce.date().optional().nullable(),
  researchDomains: z.array(z.string()).default([]),
  ...commonFields,
});

export const facultyUpdateSchema = facultySchema.partial();

// 3. FinanceRecord Schema
export const financeSchema = z.object({
  financialYear: z.string().min(4, "Financial year is required (e.g. 2023-24)"),
  expenditureHead: z.string().min(2, "Expenditure head is required"),
  amount: z.coerce.number().min(0, "Amount must be positive"),
  currency: z.string().default("INR"),
  expenditureType: z.enum(["CAPITAL", "OPERATIONAL"]),
  purpose: z.string().min(3, "Purpose description is required"),
  supportingDocument: z.string().optional().default(""),
  ...commonFields,
});

export const financeUpdateSchema = financeSchema.partial();
export const financeRecordSchema = financeSchema;
export const financeRecordUpdateSchema = financeUpdateSchema;

// 4. Publication Schema
export const publicationSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  authors: z.array(z.string()).min(1, "At least one author required"),
  doi: z.string().optional().default(""),
  url: z.string().url("Must be valid URL").optional().or(z.literal("")),
  publicationType: z.enum(["JOURNAL", "CONFERENCE", "BOOK_CHAPTER", "OTHER"]).default("JOURNAL"),
  journalOrConference: z.string().min(2, "Journal or Conference name required"),
  publicationDate: z.coerce.date(),
  indexing: z.enum(["SCOPUS", "WEB_OF_SCIENCE", "UGC_CARE", "OTHER"]),
  citationCount: z.coerce.number().min(0).default(0),
  citationSource: z.string().default("Scopus"),
  citationRetrievedAt: z.coerce.date().optional().nullable(),
  affiliationEvidence: z.string().optional().default("DSATM MCA Verified"),
  retractionStatus: z.boolean().default(false),
  ...commonFields,
});

export const publicationUpdateSchema = publicationSchema.partial();

// 5. Patent Schema
export const patentSchema = z.object({
  title: z.string().min(3, "Patent title is required"),
  applicationNumber: z.string().min(3, "Application number is required"),
  filingDate: z.coerce.date(),
  publicationDate: z.coerce.date().optional().nullable(),
  grantDate: z.coerce.date().optional().nullable(),
  applicant: z.string().min(2, "Applicant is required"),
  inventors: z.array(z.string()).min(1, "At least one inventor is required"),
  patentStatus: z.enum(["FILED", "PUBLISHED", "GRANTED", "REJECTED"]).default("FILED"),
  patentOffice: z.string().default("Indian Patent Office (IPO)"),
  ...commonFields,
});

export const patentUpdateSchema = patentSchema.partial();

// 6. ProjectConsultancy Schema
export const projectConsultancySchema = z.object({
  title: z.string().min(3, "Project title is required"),
  type: z.enum(["SPONSORED_PROJECT", "CONSULTANCY"]),
  fundingAgencyOrClient: z.string().min(2, "Funding agency or client is required"),
  sanctionedAmount: z.coerce.number().min(0, "Sanctioned amount must be >= 0"),
  receivedAmount: z.coerce.number().min(0, "Received amount must be >= 0"),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional().nullable(),
  principalInvestigator: z.string().min(2, "Principal investigator is required"),
  coInvestigators: z.array(z.string()).optional().default([]),
  ...commonFields,
});

export const projectConsultancyUpdateSchema = projectConsultancySchema.partial();

// 7. GraduationOutcome Schema
export const graduationOutcomeSchema = z.object({
  programme: z.string().default("MCA"),
  batch: z.string().min(4, "Batch is required (e.g. 2021-2023)"),
  eligibleGraduates: z.coerce.number().min(0),
  graduatesInStipulatedTime: z.coerce.number().min(0),
  examinationPassCount: z.coerce.number().min(0),
  higherStudiesCount: z.coerce.number().min(0).default(0),
  phdCompletionCount: z.coerce.number().min(0).default(0),
  ...commonFields,
});

export const graduationOutcomeUpdateSchema = graduationOutcomeSchema.partial();

// 8. PlacementRecord Schema
export const placementSchema = z.object({
  studentReference: z.string().min(1, "Student reference ID / PRN is required"),
  programme: z.string().default("MCA"),
  batch: z.string().min(4, "Batch is required"),
  employer: z.string().min(2, "Employer name is required"),
  offerType: z.enum(["ON_CAMPUS", "OFF_CAMPUS", "CAMPUS", "PPO", "OTHER"]).default("ON_CAMPUS"),
  ctc: z.coerce.number().min(0, "CTC amount must be positive"),
  offerDate: z.coerce.date(),
  joiningStatus: z.enum(["JOINED", "ACCEPTED", "DECLINED", "PENDING"]).default("JOINED"),
  higherStudiesStatus: z.string().default("NO"),
  placementYear: z.coerce.number().min(2000).max(2100),
  ...commonFields,
});

export const placementUpdateSchema = placementSchema.partial();
export const placementRecordSchema = placementSchema;
export const placementRecordUpdateSchema = placementUpdateSchema;

// 9. OutreachRecord Schema
export const outreachSchema = z.object({
  recordType: z.enum(["REGIONAL_DIVERSITY", "GENDER_DIVERSITY", "FEE_SUPPORT", "ACCESSIBILITY"]),
  aggregateCount: z.coerce.number().min(0),
  totalEligiblePopulation: z.coerce.number().min(0),
  supportingDocument: z.string().optional().default(""),
  ...commonFields,
});

export const outreachUpdateSchema = outreachSchema.partial();
export const outreachRecordSchema = outreachSchema;
export const outreachRecordUpdateSchema = outreachUpdateSchema;

// 10. PerceptionRecord Schema
export const perceptionSchema = z.object({
  sourceType: z.enum(["OFFICIAL_SCORE", "INTERNAL_FEEDBACK"]),
  score: z.coerce.number().min(0),
  maximumScore: z.coerce.number().min(1).default(100),
  surveyOrReferencePeriod: z.string().min(2, "Survey or reference period is required"),
  sourceDocument: z.string().optional().default(""),
  remarks: z.string().optional().default(""),
  ...commonFields,
});

export const perceptionUpdateSchema = perceptionSchema.partial();
export const perceptionRecordSchema = perceptionSchema;
export const perceptionRecordUpdateSchema = perceptionUpdateSchema;

