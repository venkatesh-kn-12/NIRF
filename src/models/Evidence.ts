import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type EvidenceUploadStatus = "PENDING" | "STORED" | "FAILED" | "DELETED";

export interface IEvidence extends Document {
  originalFileName: string;
  storedFileName: string;
  mimeType: string;
  fileSize: number;
  checksum: string;
  uploadedBy: Types.ObjectId;
  department: "MCA";
  academicYear: string;
  reportingPeriod: string;
  relatedRecordId?: Types.ObjectId | string | null;
  relatedRecordType?: string | null;
  storagePath: string;
  uploadStatus: EvidenceUploadStatus;
  createdAt: Date;
  updatedAt: Date;
}

const EvidenceSchema = new Schema<IEvidence>(
  {
    originalFileName: {
      type: String,
      required: [true, "Original file name is required"],
      trim: true,
    },
    storedFileName: {
      type: String,
      required: [true, "Stored file name is required"],
      unique: true,
      trim: true,
      index: true,
    },
    mimeType: {
      type: String,
      required: [true, "MIME type is required"],
      index: true,
    },
    fileSize: {
      type: Number,
      required: [true, "File size is required"],
      min: 0,
    },
    checksum: {
      type: String,
      required: [true, "SHA-256 checksum is required"],
      index: true,
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Uploader is required"],
      index: true,
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
    reportingPeriod: {
      type: String,
      required: true,
      default: "NIRF-2025",
      index: true,
    },
    relatedRecordId: {
      type: Schema.Types.Mixed,
      default: null,
      index: true,
    },
    relatedRecordType: {
      type: String,
      default: null,
      index: true,
    },
    storagePath: {
      type: String,
      required: [true, "Storage path is required"],
    },
    uploadStatus: {
      type: String,
      required: true,
      enum: ["PENDING", "STORED", "FAILED", "DELETED"],
      default: "STORED",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent re-compilation in development
export const Evidence: Model<IEvidence> =
  mongoose.models.Evidence || mongoose.model<IEvidence>("Evidence", EvidenceSchema);

