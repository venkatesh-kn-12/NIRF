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
  category: z.string().optional().default(""),
  subcategory: z.string().optional().default(""),
  granularity: z.enum(["TRANSACTION", "ANNUAL_AGGREGATE"]).default("ANNUAL_AGGREGATE"),
  voucherNumber: z.string().optional().default(""),
  vendor: z.string().optional().default(""),
  amount: z.coerce.number().min(0, "Amount must be positive"),
  currency: z.string().default("INR"),
  unit: z.enum(["INR", "LAKHS", "CRORES"]).default("INR"),
  amountInINR: z.coerce.number().min(0).optional().default(0),
  amountPaise: z.coerce.number().optional(),
  allocationPercentage: z.coerce.number().min(0).max(100).default(100),
  allocationBasis: z.string().optional().default("DIRECT_DEPARTMENTAL"),
  expenditureType: z.enum(["CAPITAL", "OPERATIONAL"]),
  purpose: z.string().min(3, "Purpose description is required"),
  supportingDocument: z.string().optional().default(""),
  isExcluded: z.boolean().default(false),
  exclusionType: z.enum(["NONE", "BUILDING_CONSTRUCTION", "HOSTEL_MAINTENANCE", "OTHER"]).default("NONE"),
  exclusionReason: z.string().optional().default(""),
  reportingScope: z.enum(["DEPARTMENT", "INSTITUTION"]).default("DEPARTMENT"),
  allocationMethod: z.string().optional().default("DIRECT_DEPARTMENTAL"),
  matchingStudentDenominator: z.coerce.number().min(1).optional().default(120),
  ...commonFields,
});

export const financeUpdateSchema = financeSchema.partial();
export const financeRecordSchema = financeSchema;
export const financeRecordUpdateSchema = financeUpdateSchema;

// 3a. Sanctioned Intake Schema
export const sanctionedIntakeSchema = z.object({
  programme: z.string().default("MCA"),
  cohortYear: z.string().min(4, "Cohort year is required (e.g. 2024-2026)"),
  intakeYear: z.coerce.number().min(2000),
  approvedIntake: z.coerce.number().min(1, "Approved intake must be at least 1"),
  approvalAuthority: z.enum(["AICTE", "VTU", "STATE_GOVT", "UNIVERSITY", "OTHER"]).default("AICTE"),
  approvalOrderNumber: z.string().min(2, "Approval order number is required"),
  approvalDate: z.coerce.date().optional().nullable(),
  effectiveAcademicYear: z.string().min(4).default("2024-25"),
  scope: z.enum(["DEPARTMENT", "INSTITUTION"]).default("DEPARTMENT"),
  ...commonFields,
});
export const sanctionedIntakeUpdateSchema = sanctionedIntakeSchema.partial();

// 3b. Doctoral Enrolment Statement Schema
export const doctoralEnrolmentSchema = z.object({
  programme: z.string().default("MCA"),
  enrolledDoctoralCount: z.coerce.number().min(0).default(0),
  isExplicitZero: z.boolean().default(true),
  zeroDeclarationReason: z.string().optional().default(""),
  scholars: z
    .array(
      z.object({
        scholarName: z.string().min(1),
        usn: z.string().min(1),
        registrationDate: z.coerce.date(),
        guideName: z.string().min(1),
        researchTopic: z.string().optional().default(""),
        enrolmentStatus: z.enum(["FULL_TIME", "PART_TIME", "COMPLETED", "DISCONTINUED"]).default("FULL_TIME"),
      })
    )
    .default([]),
  certifiedByHOD: z.boolean().default(true),
  certificationReference: z.string().optional().default(""),
  ...commonFields,
});
export const doctoralEnrolmentUpdateSchema = doctoralEnrolmentSchema.partial();

// 3c. Faculty Reporting Fact Schema
export const facultyReportingFactSchema = z.object({
  faculty: z.string().min(1, "Faculty reference is required"),
  facultyId: z.string().min(1, "Faculty ID is required"),
  name: z.string().min(1, "Faculty name is required"),
  email: z.string().email(),
  designation: z.string().min(1),
  employmentType: z.enum(["PERMANENT", "CONTRACT", "VISITING", "ADJUNCT"]).default("PERMANENT"),
  isFullTime: z.boolean().default(true),
  taughtBothSemesters: z.boolean().default(true),
  highestQualification: z.string().min(1),
  phdStatus: z.enum(["AWARDED", "PURSUING", "NOT_APPLICABLE"]).default("NOT_APPLICABLE"),
  isQualificationEligible: z.boolean().default(true),
  qualificationEquivalenceNotes: z.string().optional().default(""),
  experienceYearsAsOfReferenceDate: z.coerce.number().min(0).default(0),
  experienceReferenceDate: z.coerce.date().default(() => new Date("2024-08-31")),
  experienceBracket: z.enum(["UP_TO_8", "EIGHT_TO_15", "ABOVE_15"]).default("UP_TO_8"),
  isEligibleForFSR: z.boolean().default(true),
  eligibilityRationale: z.string().optional().default(""),
  ...commonFields,
});
export const facultyReportingFactUpdateSchema = facultyReportingFactSchema.partial();

// 4. Publication Schema
export const publicationAuthorSchema = z.object({
  authorName: z.string().min(1, "Author name is required"),
  authorOrder: z.coerce.number().min(1).default(1),
  facultyRef: z.string().optional().nullable(),
  facultyId: z.string().optional().default(""),
  affiliation: z.string().optional().default(""),
  isCorresponding: z.boolean().optional().default(false),
  orcid: z.string().optional().default(""),
});

export const publicationIndexingSchema = z.object({
  sourceName: z.enum(["SCOPUS", "WEB_OF_SCIENCE", "UGC_CARE", "OTHER", "UNKNOWN"]).default("SCOPUS"),
  recordId: z.string().optional().default(""),
  url: z.string().optional().default(""),
  referenceYear: z.coerce.number().optional().nullable(),
  provenance: z.enum(["SELF_REPORTED", "DOCUMENT_SUPPORTED", "EXTERNAL_SOURCE"]).default("DOCUMENT_SUPPORTED"),
  retrievedAt: z.coerce.date().optional().nullable(),
});

export const publicationQuartileSchema = z.object({
  quartile: z.enum(["Q1", "Q2", "Q3", "Q4", "UNKNOWN", "NOT_APPLICABLE"]).default("UNKNOWN"),
  source: z.string().optional().default(""),
  year: z.coerce.number().optional().nullable(),
  subjectCategory: z.string().optional().default(""),
});

export const publicationSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  authors: z.array(z.string()).min(1, "At least one author required").default(["Author"]),
  authorsList: z.array(publicationAuthorSchema).optional().default([]),
  doi: z.string().optional().default(""),
  url: z.string().url("Must be valid URL").optional().or(z.literal("")),
  publicationType: z.enum(["JOURNAL", "CONFERENCE", "BOOK_CHAPTER", "OTHER", "UNKNOWN"]).default("JOURNAL"),
  pubStatus: z.enum(["PUBLISHED", "ACCEPTED_IN_PRESS", "UNDER_REVIEW", "PREPRINT"]).default("PUBLISHED"),
  journalOrConference: z.string().min(2, "Journal or Conference name required"),
  publisher: z.string().optional().default(""),
  volume: z.string().optional().default(""),
  issue: z.string().optional().default(""),
  pages: z.string().optional().default(""),
  issnOrIsbn: z.string().optional().default(""),
  publicationDate: z.coerce.date().optional().default(() => new Date()),
  publicationYear: z.coerce.number().optional().default(() => new Date().getFullYear()),
  publicationMonth: z.coerce.number().optional().nullable(),
  exactPublicationDate: z.coerce.date().optional().nullable(),
  datePrecision: z.enum(["YEAR", "MONTH", "DAY"]).default("YEAR"),
  indexing: z.enum(["SCOPUS", "WEB_OF_SCIENCE", "UGC_CARE", "OTHER"]).default("SCOPUS"),
  indexingList: z.array(publicationIndexingSchema).optional().default([]),
  quartiles: z.array(publicationQuartileSchema).optional().default([]),
  citationCount: z.coerce.number().min(0).default(0),
  citationSource: z.string().default("Scopus"),
  citationRetrievedAt: z.coerce.date().optional().nullable(),
  internalFaculty: z.array(z.string()).optional().default([]),
  claimedBy: z.string().optional().nullable(),
  claimedAt: z.coerce.date().optional().nullable(),
  affiliationEvidence: z.string().optional().default("DSATM MCA Verified"),
  retractionStatus: z.boolean().default(false),
  ...commonFields,
});

export const publicationUpdateSchema = publicationSchema.partial();

// 5. Patent Schema
export const patentInventorSchema = z.object({
  name: z.string().min(1, "Inventor name is required"),
  order: z.coerce.number().min(1).default(1),
  facultyRef: z.string().optional().nullable(),
  facultyId: z.string().optional().default(""),
  affiliation: z.string().optional().default(""),
});

export const patentSchema = z.object({
  title: z.string().min(3, "Patent title is required"),
  applicationNumber: z.string().min(3, "Application number is required"),
  jurisdiction: z.enum(["INDIA", "USPTO", "EPO", "WIPO", "UK", "AUSTRALIA", "OTHER"]).default("INDIA"),
  filingDate: z.coerce.date(),
  publicationDate: z.coerce.date().optional().nullable(),
  grantDate: z.coerce.date().optional().nullable(),
  publicationNumber: z.string().optional().default(""),
  grantNumber: z.string().optional().default(""),
  applicant: z.string().min(2, "Applicant is required").default("Dayananda Sagar Academy of Technology and Management"),
  applicants: z.array(z.string()).optional().default([]),
  assignees: z.array(z.string()).optional().default([]),
  institutionAssociation: z.boolean().default(true),
  ownershipEvidence: z.string().optional().default(""),
  inventors: z.array(z.string()).min(1, "At least one inventor is required"),
  inventorsList: z.array(patentInventorSchema).optional().default([]),
  internalFaculty: z.array(z.string()).optional().default([]),
  legalStatus: z.enum(["FILED", "PUBLISHED", "UNDER_EXAMINATION", "GRANTED", "REFUSED", "WITHDRAWN", "ABANDONED", "EXPIRED", "UNKNOWN"]).default("FILED"),
  patentStatus: z.enum(["FILED", "PUBLISHED", "GRANTED", "REJECTED"]).default("FILED"),
  patentOffice: z.string().default("Indian Patent Office (IPO)"),
  sourceUrl: z.string().optional().default(""),
  ...commonFields,
});

export const patentUpdateSchema = patentSchema.partial();

// 6. ProjectConsultancy Schema
export const projectReceiptSchema = z.object({
  _id: z.string().optional(),
  receiptDate: z.coerce.date().optional().nullable(),
  financialYear: z.string().min(4, "Financial year required (e.g. 2023-24)"),
  amount: z.coerce.number().min(0, "Receipt amount must be >= 0"),
  referenceNumber: z.string().optional().default(""),
  mcaAllocationPercentage: z.coerce.number().min(0).max(100).default(100),
  notes: z.string().optional().default(""),
  supportingDocument: z.string().optional().default(""),
});

export const projectConsultancySchema = z.object({
  title: z.string().min(3, "Project title is required"),
  type: z.enum(["SPONSORED_PROJECT", "CONSULTANCY"]),
  fundingAgencyOrClient: z.string().min(2, "Funding agency or client is required"),
  projectNumber: z.string().optional().default(""),
  sanctionedAmount: z.coerce.number().min(0, "Sanctioned amount must be >= 0").optional().default(0),
  receivedAmount: z.coerce.number().min(0, "Received amount must be >= 0").default(0),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional().nullable(),
  principalInvestigator: z.string().min(2, "Principal investigator is required"),
  coInvestigators: z.array(z.string()).optional().default([]),
  scope: z.enum(["DEPARTMENT", "INSTITUTION"]).default("DEPARTMENT"),
  notes: z.string().optional().default(""),
  receipts: z.array(projectReceiptSchema).optional().default([]),
  legacyReceiptYear: z.string().optional().nullable(),
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

// 8b. DoctoralAward Schema (GO - GPHD)
export const doctoralAwardSchema = z.object({
  scholarName: z.string().min(2, "Scholar name is required"),
  studentReference: z.string().optional().default(""),
  programme: z.string().default("MCA"),
  thesisTitle: z.string().min(3, "Thesis title is required"),
  supervisorName: z.string().min(2, "Supervisor name is required"),
  awardDate: z.coerce.date(),
  awardYear: z.coerce.number().min(2000).max(2100),
  ...commonFields,
});

export const doctoralAwardUpdateSchema = doctoralAwardSchema.partial();

// 9. OutreachRecord Schema
export const outreachSchema = z.object({
  recordType: z.enum(["REGIONAL_DIVERSITY", "GENDER_DIVERSITY", "FEE_SUPPORT", "ACCESSIBILITY"]),
  aggregateCount: z.coerce.number().min(0).default(0),
  totalEligiblePopulation: z.coerce.number().min(0).default(0),
  supportingDocument: z.string().optional().default(""),
  studentReference: z.string().optional(),
  isFullTuitionSupport: z.boolean().optional().default(false),
  sponsoringAgency: z.string().optional().default(""),
  facilityId: z.string().optional(),
  facilityName: z.string().optional(),
  facilityStatus: z.enum(["AVAILABLE", "NOT_AVAILABLE", "NOT_APPLICABLE"]).optional().default("AVAILABLE"),
  notes: z.string().optional().default(""),
  ...commonFields,
});

export const outreachUpdateSchema = outreachSchema.partial();
export const outreachRecordSchema = outreachSchema;
export const outreachRecordUpdateSchema = outreachUpdateSchema;

// 10. PerceptionRecord Schema
export const perceptionSchema = z.object({
  sourceType: z.enum(["OFFICIAL_SCORE", "INTERNAL_FEEDBACK", "DEPARTMENT_SURVEY"]).default("DEPARTMENT_SURVEY"),
  score: z.coerce.number().min(0).default(0),
  maximumScore: z.coerce.number().min(1).default(100),
  surveyOrReferencePeriod: z.string().min(2, "Survey or reference period is required").default("2024-25"),
  sourceDocument: z.string().optional().default(""),
  remarks: z.string().optional().default(""),
  respondentCategory: z.enum(["EMPLOYER", "ACADEMIC_PEER", "ALUMNI", "PARENT", "OTHER"]).optional().default("ACADEMIC_PEER"),
  responseId: z.string().optional(),
  rating: z.coerce.number().min(1).max(5).optional(),
  ratingScale: z.string().optional().default("1-5"),
  surveyCycle: z.string().optional().default("2024-25"),
  ...commonFields,
});

export const perceptionUpdateSchema = perceptionSchema.partial();
export const perceptionRecordSchema = perceptionSchema;
export const perceptionRecordUpdateSchema = perceptionUpdateSchema;

