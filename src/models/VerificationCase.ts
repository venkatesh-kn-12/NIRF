import mongoose, { Schema, Document, Model, Types } from "mongoose";
import { EvidenceReferenceSchema } from "./commonSchema";
import { IEvidenceReference } from "@/types/common";

export type NirfParameter = "TLR" | "RP" | "GO" | "OI" | "PR";

export type VerificationIssueType =
  | "MISSING_EVIDENCE"
  | "DUPLICATE"
  | "CALCULATION_MISMATCH"
  | "INVALID_DATE"
  | "UNSUPPORTED_CLAIM"
  | "LOW_CONFIDENCE_EXTRACTION"
  | "MANUAL_REVIEW";

export type VerificationSeverity = "LOW" | "MEDIUM" | "HIGH";

export type VerificationCaseStatus =
  | "OPEN"
  | "IN_REVIEW"
  | "RESOLVED"
  | "REJECTED"
  | "ESCALATED";

export interface IVerificationCase extends Document {
  relatedRecordType: string;
  relatedRecordId: Types.ObjectId | string;
  parameter: NirfParameter;
  issueType: VerificationIssueType;
  severity: VerificationSeverity;
  submittedValue?: any;
  proposedValue?: any;
  difference?: any;
  evidenceReferences: IEvidenceReference[];
  aiExplanation?: string;
  reviewerNotes?: string;
  assignedReviewer?: Types.ObjectId | null;
  status: VerificationCaseStatus;
  resolvedBy?: Types.ObjectId | null;
  resolvedAt?: Date | null;
  department: "MCA";
  academicYear: string;
  createdAt: Date;
  updatedAt: Date;
}

const VerificationCaseSchema = new Schema<IVerificationCase>(
  {
    relatedRecordType: {
      type: String,
      required: [true, "Related record type is required"],
      enum: [
        "Faculty",
        "Student",
        "FinanceRecord",
        "Publication",
        "Patent",
        "ProjectConsultancy",
        "GraduationOutcome",
        "PlacementRecord",
        "OutreachRecord",
        "PerceptionRecord",
        "DepartmentRecord",
      ],
      index: true,
    },
    relatedRecordId: {
      type: Schema.Types.Mixed,
      required: [true, "Related record ID is required"],
      index: true,
    },
    parameter: {
      type: String,
      required: true,
      enum: ["TLR", "RP", "GO", "OI", "PR"],
      index: true,
    },
    issueType: {
      type: String,
      required: true,
      enum: [
        "MISSING_EVIDENCE",
        "DUPLICATE",
        "CALCULATION_MISMATCH",
        "INVALID_DATE",
        "UNSUPPORTED_CLAIM",
        "LOW_CONFIDENCE_EXTRACTION",
        "MANUAL_REVIEW",
      ],
      index: true,
    },
    severity: {
      type: String,
      required: true,
      enum: ["LOW", "MEDIUM", "HIGH"],
      default: "MEDIUM",
      index: true,
    },
    submittedValue: {
      type: Schema.Types.Mixed,
      default: null,
    },
    proposedValue: {
      type: Schema.Types.Mixed,
      default: null,
    },
    difference: {
      type: Schema.Types.Mixed,
      default: null,
    },
    evidenceReferences: {
      type: [EvidenceReferenceSchema],
      default: [],
    },
    aiExplanation: {
      type: String,
      default: "",
    },
    reviewerNotes: {
      type: String,
      default: "",
    },
    assignedReviewer: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    status: {
      type: String,
      required: true,
      enum: ["OPEN", "IN_REVIEW", "RESOLVED", "REJECTED", "ESCALATED"],
      default: "OPEN",
      index: true,
    },
    resolvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    department: {
      type: String,
      required: true,
      default: "MCA",
      enum: ["MCA"],
      index: true,
    },
    academicYear: {
      type: String,
      required: true,
      default: "2024-25",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const VerificationCase: Model<IVerificationCase> =
  mongoose.models.VerificationCase ||
  mongoose.model<IVerificationCase>("VerificationCase", VerificationCaseSchema);

