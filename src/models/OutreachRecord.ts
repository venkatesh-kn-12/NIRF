import mongoose, { Schema, Document, Model } from "mongoose";
import { ICommonRecordFields } from "@/types/common";
import { commonRecordFieldsDefinition } from "./commonSchema";

export type OutreachType =
  | "REGIONAL_DIVERSITY"
  | "GENDER_DIVERSITY"
  | "FEE_SUPPORT"
  | "ACCESSIBILITY";

export interface IOutreachRecord extends Document, ICommonRecordFields {
  recordType: OutreachType;
  aggregateCount: number;
  totalEligiblePopulation: number;
  supportingDocument?: string;

  // Granular Student Fee Support fields
  studentReference?: string;
  isFullTuitionSupport?: boolean;
  sponsoringAgency?: string;

  // Granular Accessibility Checklist fields
  facilityId?: string;
  facilityName?: string;
  facilityStatus?: "AVAILABLE" | "NOT_AVAILABLE" | "NOT_APPLICABLE";
  notes?: string;
}

const OutreachRecordSchema = new Schema<IOutreachRecord>(
  {
    recordType: {
      type: String,
      required: true,
      enum: ["REGIONAL_DIVERSITY", "GENDER_DIVERSITY", "FEE_SUPPORT", "ACCESSIBILITY"],
      index: true,
    },
    aggregateCount: {
      type: Number,
      required: [true, "Aggregate count is required"],
      min: 0,
      default: 0,
    },
    totalEligiblePopulation: {
      type: Number,
      required: [true, "Total eligible population is required"],
      min: 0,
      default: 0,
    },
    supportingDocument: {
      type: String,
      default: "",
    },
    studentReference: {
      type: String,
      trim: true,
      index: true,
    },
    isFullTuitionSupport: {
      type: Boolean,
      default: false,
    },
    sponsoringAgency: {
      type: String,
      trim: true,
      default: "",
    },
    facilityId: {
      type: String,
      trim: true,
      index: true,
    },
    facilityName: {
      type: String,
      trim: true,
      default: "",
    },
    facilityStatus: {
      type: String,
      enum: ["AVAILABLE", "NOT_AVAILABLE", "NOT_APPLICABLE"],
      default: "AVAILABLE",
    },
    notes: {
      type: String,
      default: "",
    },
    ...commonRecordFieldsDefinition,
  },
  {
    timestamps: true,
  }
);

OutreachRecordSchema.index({ department: 1, recordType: 1, academicYear: 1, status: 1 });

export const OutreachRecord: Model<IOutreachRecord> =
  mongoose.models.OutreachRecord ||
  mongoose.model<IOutreachRecord>("OutreachRecord", OutreachRecordSchema);

