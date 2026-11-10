import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type RecordStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED" | "CORRECTION_REQUESTED";

export interface IEvidenceReference {
  fileName: string;
  fileUrl: string;
  fileSize: number;
  uploadedAt: Date;
  uploadedBy: Types.ObjectId;
}

export interface IDepartmentRecord extends Document {
  title: string;
  category: "STUDENTS" | "FACULTY" | "PUBLICATIONS" | "PLACEMENTS" | "FINANCE" | "OUTREACH" | "PERCEPTION";
  department: string;
  academicYear: string;
  reportingPeriod: string;
  status: RecordStatus;
  data: Record<string, unknown>;
  evidenceReferences: IEvidenceReference[];
  reviewerComment?: string;
  assignedTo?: Types.ObjectId | null;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const EvidenceSchema = new Schema<IEvidenceReference>({
  fileName: { type: String, required: true },
  fileUrl: { type: String, required: true },
  fileSize: { type: Number, required: true },
  uploadedAt: { type: Date, default: Date.now },
  uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
});

const DepartmentRecordSchema = new Schema<IDepartmentRecord>(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: ["STUDENTS", "FACULTY", "PUBLICATIONS", "PLACEMENTS", "FINANCE", "OUTREACH", "PERCEPTION"],
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
      default: "2023-24",
      index: true,
    },
    reportingPeriod: {
      type: String,
      required: true,
      default: "NIRF-2025",
    },
    status: {
      type: String,
      required: true,
      enum: ["DRAFT", "SUBMITTED", "APPROVED", "REJECTED", "CORRECTION_REQUESTED"],
      default: "DRAFT",
      index: true,
    },
    data: {
      type: Schema.Types.Mixed,
      default: {},
    },
    evidenceReferences: [EvidenceSchema],
    reviewerComment: {
      type: String,
      default: "",
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const DepartmentRecord: Model<IDepartmentRecord> =
  mongoose.models.DepartmentRecord ||
  mongoose.model<IDepartmentRecord>("DepartmentRecord", DepartmentRecordSchema);

