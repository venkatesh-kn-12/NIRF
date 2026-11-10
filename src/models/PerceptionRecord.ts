import mongoose, { Schema, Document, Model } from "mongoose";
import { ICommonRecordFields } from "@/types/common";
import { commonRecordFieldsDefinition } from "./commonSchema";

export type PerceptionSourceType = "OFFICIAL_SCORE" | "INTERNAL_FEEDBACK";

export interface IPerceptionRecord extends Document, ICommonRecordFields {
  sourceType: PerceptionSourceType;
  score: number;
  maximumScore: number;
  surveyOrReferencePeriod: string;
  sourceDocument?: string;
  remarks?: string;
}

const PerceptionRecordSchema = new Schema<IPerceptionRecord>(
  {
    sourceType: {
      type: String,
      required: true,
      enum: ["OFFICIAL_SCORE", "INTERNAL_FEEDBACK"],
      index: true,
    },
    score: {
      type: Number,
      required: [true, "Score is required"],
      min: 0,
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
    },
    sourceDocument: {
      type: String,
      default: "",
    },
    remarks: {
      type: String,
      default: "",
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

