import mongoose, { Schema, Document, Model } from "mongoose";
import { ICommonRecordFields } from "@/types/common";
import { commonRecordFieldsDefinition } from "./commonSchema";

export type PerceptionSourceType = "OFFICIAL_SCORE" | "INTERNAL_FEEDBACK" | "DEPARTMENT_SURVEY";

export interface IPerceptionRecord extends Document, ICommonRecordFields {
  sourceType: PerceptionSourceType;
  score: number;
  maximumScore: number;
  surveyOrReferencePeriod: string;
  sourceDocument?: string;
  remarks?: string;

  // Granular Survey Response fields
  respondentCategory?: "EMPLOYER" | "ACADEMIC_PEER" | "ALUMNI" | "PARENT" | "OTHER";
  responseId?: string;
  rating?: number;
  ratingScale?: string;
  surveyCycle?: string;
}

const PerceptionRecordSchema = new Schema<IPerceptionRecord>(
  {
    sourceType: {
      type: String,
      required: true,
      enum: ["OFFICIAL_SCORE", "INTERNAL_FEEDBACK", "DEPARTMENT_SURVEY"],
      index: true,
    },
    score: {
      type: Number,
      required: [true, "Score is required"],
      min: 0,
      default: 0,
    },
    maximumScore: {
      type: Number,
      required: true,
      default: 100,
      min: 1,
    },
    surveyOrReferencePeriod: {
      type: String,
      required: [true, "Survey / reference period is required"],
      trim: true,
      default: "2024-25",
    },
    sourceDocument: {
      type: String,
      default: "",
    },
    remarks: {
      type: String,
      default: "",
    },
    respondentCategory: {
      type: String,
      enum: ["EMPLOYER", "ACADEMIC_PEER", "ALUMNI", "PARENT", "OTHER"],
      default: "ACADEMIC_PEER",
    },
    responseId: {
      type: String,
      trim: true,
      index: true,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    ratingScale: {
      type: String,
      default: "1-5",
    },
    surveyCycle: {
      type: String,
      trim: true,
      default: "2024-25",
    },
    ...commonRecordFieldsDefinition,
  },
  {
    timestamps: true,
  }
);

PerceptionRecordSchema.index({ department: 1, sourceType: 1, status: 1 });

export const PerceptionRecord: Model<IPerceptionRecord> =
  mongoose.models.PerceptionRecord ||
  mongoose.model<IPerceptionRecord>("PerceptionRecord", PerceptionRecordSchema);

