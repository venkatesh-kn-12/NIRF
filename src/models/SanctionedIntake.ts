import mongoose, { Schema, Document, Model } from "mongoose";
import { ICommonRecordFields, IEvidenceReference } from "@/types/common";
import { commonRecordFieldsDefinition, EvidenceReferenceSchema } from "./commonSchema";

export interface IIntakeRevision {
  approvedIntake: number;
  approvalOrderNumber: string;
  revisedAt: Date;
  revisedBy: Schema.Types.ObjectId;
  reason: string;
}

export interface ISanctionedIntake extends Document, ICommonRecordFields {
  programme: string;
  cohortYear: string; // e.g. "2024-2026" or "2024"
  intakeYear: number;  // e.g. 2024
  approvedIntake: number;
  approvalAuthority: "AICTE" | "VTU" | "STATE_GOVT" | "UNIVERSITY" | "OTHER";
  approvalOrderNumber: string;
  approvalDate?: Date | null;
  effectiveAcademicYear: string; // e.g. "2024-25"
  scope: "DEPARTMENT" | "INSTITUTION";
  revisions: IIntakeRevision[];
  evidenceReferences: IEvidenceReference[];
}

const IntakeRevisionSchema = new Schema<IIntakeRevision>(
  {
    approvedIntake: { type: Number, required: true },
    approvalOrderNumber: { type: String, required: true },
    revisedAt: { type: Date, default: Date.now },
    revisedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    reason: { type: String, default: "" },
  },
  { _id: true }
);

const SanctionedIntakeSchema = new Schema<ISanctionedIntake>(
  {
    programme: {
      type: String,
      required: true,
      default: "MCA",
      trim: true,
      index: true,
    },
    cohortYear: {
      type: String,
      required: [true, "Cohort year is required (e.g. 2024-2026)"],
      trim: true,
    },
    intakeYear: {
      type: Number,
      required: [true, "Intake year is required (e.g. 2024)"],
      index: true,
    },
    approvedIntake: {
      type: Number,
      required: [true, "Approved intake is required"],
      min: [1, "Sanctioned intake must be at least 1"],
    },
    approvalAuthority: {
      type: String,
      required: true,
      enum: ["AICTE", "VTU", "STATE_GOVT", "UNIVERSITY", "OTHER"],
      default: "AICTE",
    },
    approvalOrderNumber: {
      type: String,
      required: [true, "Approval order/EOA number is required"],
      trim: true,
    },
    approvalDate: {
      type: Date,
      default: null,
    },
    effectiveAcademicYear: {
      type: String,
      required: true,
      default: "2024-25",
      index: true,
    },
    scope: {
      type: String,
      enum: ["DEPARTMENT", "INSTITUTION"],
      default: "DEPARTMENT",
    },
    revisions: [IntakeRevisionSchema],
    evidenceReferences: [EvidenceReferenceSchema],
    ...commonRecordFieldsDefinition,
  },
  {
    timestamps: true,
  }
);

SanctionedIntakeSchema.index(
  { department: 1, programme: 1, intakeYear: 1, effectiveAcademicYear: 1 },
  { unique: true }
);

export const SanctionedIntake: Model<ISanctionedIntake> =
  mongoose.models.SanctionedIntake ||
  mongoose.model<ISanctionedIntake>("SanctionedIntake", SanctionedIntakeSchema);
