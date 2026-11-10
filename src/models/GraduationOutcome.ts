import mongoose, { Schema, Document, Model } from "mongoose";
import { ICommonRecordFields } from "@/types/common";
import { commonRecordFieldsDefinition } from "./commonSchema";

export interface IGraduationOutcome extends Document, ICommonRecordFields {
  programme: string;
  batch: string;
  eligibleGraduates: number;
  graduatesInStipulatedTime: number;
  examinationPassCount: number;
  higherStudiesCount: number;
  phdCompletionCount: number;
}

const GraduationOutcomeSchema = new Schema<IGraduationOutcome>(
  {
    programme: {
      type: String,
      required: true,
      default: "MCA",
    },
    batch: {
      type: String,
      required: [true, "Batch is required (e.g. 2021-2023)"],
      trim: true,
      index: true,
    },
    eligibleGraduates: {
      type: Number,
      required: [true, "Eligible graduates count is required"],
      min: 0,
    },
    graduatesInStipulatedTime: {
      type: Number,
      required: [true, "Graduates in stipulated time is required"],
      min: 0,
    },
    examinationPassCount: {
      type: Number,
      required: [true, "Examination pass count is required"],
      min: 0,
    },
    higherStudiesCount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    phdCompletionCount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    ...commonRecordFieldsDefinition,
  },
  {
    timestamps: true,
  }
);

GraduationOutcomeSchema.index({ department: 1, batch: 1, status: 1 });

export const GraduationOutcome: Model<IGraduationOutcome> =
  mongoose.models.GraduationOutcome ||
  mongoose.model<IGraduationOutcome>("GraduationOutcome", GraduationOutcomeSchema);

