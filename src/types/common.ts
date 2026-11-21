import { Types } from "mongoose";

export type ActiveRecordStatus = "DRAFT" | "RECORDED" | "ARCHIVED";
export type LegacyRecordStatus = "SUBMITTED" | "APPROVED" | "REJECTED" | "CORRECTION_REQUESTED";
export type RecordStatus = ActiveRecordStatus | LegacyRecordStatus;

export interface IEvidenceReference {
  fileName: string;
  fileUrl: string;
  fileSize: number;
  uploadedAt: Date;
  uploadedBy: Types.ObjectId;
}

export interface IAuditHistoryEntry {
  action: string;
  performedBy: Types.ObjectId;
  performedByEmail?: string;
  performedByRole?: string;
  timestamp: Date;
  details?: Record<string, unknown>;
}

export interface ICommonRecordFields {
  department: "MCA";
  academicYear: string;
  reportingPeriod: string;
  status: RecordStatus;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
  assignedTo?: Types.ObjectId | null;
  reviewerComment?: string;
  evidenceReferences: IEvidenceReference[];
  auditHistory: IAuditHistoryEntry[];
  createdAt: Date;
  updatedAt: Date;
}

