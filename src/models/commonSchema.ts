import { Schema } from "mongoose";
import { IEvidenceReference, IAuditHistoryEntry } from "@/types/common";

export const EvidenceReferenceSchema = new Schema<IEvidenceReference>(
  {
    fileName: { type: String, required: true },
    fileUrl: { type: String, required: true },
    fileSize: { type: Number, required: true, default: 0 },
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { _id: true }
);

export const AuditHistoryEntrySchema = new Schema<IAuditHistoryEntry>(
  {
    action: { type: String, required: true },
    performedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    performedByEmail: { type: String, default: "" },
    performedByRole: { type: String, default: "" },
    timestamp: { type: Date, default: Date.now },
    details: { type: Schema.Types.Mixed, default: {} },
  },
  { _id: true }
);

export const commonRecordFieldsDefinition: Record<string, any> = {
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
    index: true,
  },
  status: {
    type: String,
    required: true,
    enum: ["DRAFT", "SUBMITTED", "APPROVED", "REJECTED", "CORRECTION_REQUESTED"],
    default: "DRAFT",
    index: true,
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
  assignedTo: {
    type: Schema.Types.ObjectId,
    ref: "User",
    default: null,
    index: true,
  },
  reviewerComment: {
    type: String,
    default: "",
  },
  evidenceReferences: {
    type: [EvidenceReferenceSchema],
    default: [],
  },
  auditHistory: {
    type: [AuditHistoryEntrySchema],
    default: [],
  },
};

