import mongoose, { Schema, Document, Model } from "mongoose";
import { ICommonRecordFields } from "@/types/common";
import { commonRecordFieldsDefinition } from "./commonSchema";

export type PatentStatus = "FILED" | "PUBLISHED" | "GRANTED" | "REJECTED";

export interface IPatent extends Document, ICommonRecordFields {
  title: string;
  applicationNumber: string;
  filingDate: Date;
  publicationDate?: Date | null;
  grantDate?: Date | null;
  applicant: string;
  inventors: string[];
  patentStatus: PatentStatus;
  patentOffice: string;
}

const PatentSchema = new Schema<IPatent>(
  {
    title: {
      type: String,
      required: [true, "Patent title is required"],
      trim: true,
      index: true,
    },
    applicationNumber: {
      type: String,
      required: [true, "Application number is required"],
      unique: true,
      trim: true,
      index: true,
    },
    filingDate: {
      type: Date,
      required: [true, "Filing date is required"],
    },
    publicationDate: {
      type: Date,
      default: null,
    },
    grantDate: {
      type: Date,
      default: null,
    },
    applicant: {
      type: String,
      required: [true, "Applicant name is required"],
      trim: true,
    },
    inventors: {
      type: [String],
      required: [true, "At least one inventor is required"],
    },
    patentStatus: {
      type: String,
      required: true,
      enum: ["FILED", "PUBLISHED", "GRANTED", "REJECTED"],
      default: "FILED",
      index: true,
    },
    patentOffice: {
      type: String,
      required: true,
      default: "Indian Patent Office (IPO)",
    },
    ...commonRecordFieldsDefinition,
  },
  {
    timestamps: true,
  }
);

PatentSchema.index({ department: 1, patentStatus: 1, status: 1 });

export const Patent: Model<IPatent> =
  mongoose.models.Patent || mongoose.model<IPatent>("Patent", PatentSchema);

