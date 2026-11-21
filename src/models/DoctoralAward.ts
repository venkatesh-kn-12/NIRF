import mongoose, { Schema, Document, Model } from "mongoose";
import { ICommonRecordFields } from "@/types/common";
import { commonRecordFieldsDefinition } from "./commonSchema";

export interface IDoctoralAward extends Document, ICommonRecordFields {
  scholarName: string;
  studentReference?: string;
  programme: string;
  thesisTitle: string;
  supervisorName: string;
  awardDate: Date;
  awardYear: number;
}

const DoctoralAwardSchema = new Schema<IDoctoralAward>(
  {
    scholarName: {
      type: String,
      required: [true, "Doctoral scholar name is required"],
      trim: true,
      index: true,
    },
    studentReference: {
      type: String,
      default: "",
      trim: true,
    },
    programme: {
      type: String,
      required: true,
      default: "MCA",
    },
    thesisTitle: {
      type: String,
      required: [true, "Thesis title is required"],
      trim: true,
    },
    supervisorName: {
      type: String,
      required: [true, "Supervisor / Guide name is required"],
      trim: true,
    },
    awardDate: {
      type: Date,
      required: [true, "Degree award date is required"],
      index: true,
    },
    awardYear: {
      type: Number,
      required: [true, "Award calendar year is required"],
      index: true,
    },
    ...commonRecordFieldsDefinition,
  },
  {
    timestamps: true,
  }
);

DoctoralAwardSchema.index({ department: 1, awardYear: 1, status: 1 });

export const DoctoralAward: Model<IDoctoralAward> =
  mongoose.models.DoctoralAward ||
  mongoose.model<IDoctoralAward>("DoctoralAward", DoctoralAwardSchema);
