import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type ExtractionJobStatus =
  | "QUEUED"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "NEEDS_REVIEW";

export type FieldReviewStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "CORRECTED";

export interface IExtractedField {
  fieldName: string;
  extractedValue: any;
  confidence: number; // 0 to 100
  sourceReference: string;
  reasoningSummary: string;
  reviewStatus: FieldReviewStatus;
  correctedValue?: any;
  reviewedBy?: Types.ObjectId | null;
  reviewedAt?: Date | null;
}

export interface IExtractionJob {
  _id: Types.ObjectId;
  evidenceId: Types.ObjectId;
  relatedRecordType: string;
  targetRecordId?: Types.ObjectId | string | null;
  status: ExtractionJobStatus;
  extractedFields: IExtractedField[];
  confidenceScores: Record<string, number>;
  sourceReferences: string[];
  errors: string[];
  startedAt?: Date | null;
  completedAt?: Date | null;
  department: "MCA";
  academicYear: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ExtractedFieldSchema = new Schema<IExtractedField>(
  {
    fieldName: { type: String, required: true },
    extractedValue: { type: Schema.Types.Mixed, default: null },
    confidence: { type: Number, required: true, min: 0, max: 100 },
    sourceReference: { type: String, default: "" },
    reasoningSummary: { type: String, default: "" },
    reviewStatus: {
      type: String,
      required: true,
      enum: ["PENDING", "ACCEPTED", "REJECTED", "CORRECTED"],
      default: "PENDING",
    },
    correctedValue: { type: Schema.Types.Mixed, default: null },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt: { type: Date, default: null },
  },
  { _id: true }
);

const ExtractionJobSchema = new Schema<IExtractionJob>(
  {
    evidenceId: {
      type: Schema.Types.ObjectId,
      ref: "Evidence",
      required: [true, "Evidence ID is required"],
      index: true,
    },
    relatedRecordType: {
      type: String,
      required: [true, "Target record type is required"],
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
      ],
      index: true,
    },
    targetRecordId: {
      type: Schema.Types.Mixed,
      default: null,
      index: true,
    },
    status: {
      type: String,
      required: true,
      enum: ["QUEUED", "PROCESSING", "COMPLETED", "FAILED", "NEEDS_REVIEW"],
      default: "QUEUED",
      index: true,
    },
    extractedFields: {
      type: [ExtractedFieldSchema],
      default: [],
    },
    confidenceScores: {
      type: Schema.Types.Mixed,
      default: {},
    },
    sourceReferences: {
      type: [String],
      default: [],
    },
    errors: {
      type: [String],
      default: [],
    },
    startedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
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
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    suppressReservedKeysWarning: true,
  }
);

export const ExtractionJob: Model<IExtractionJob> =
  mongoose.models.ExtractionJob ||
  mongoose.model<IExtractionJob>("ExtractionJob", ExtractionJobSchema);

