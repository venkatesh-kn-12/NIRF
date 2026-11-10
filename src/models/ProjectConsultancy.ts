import mongoose, { Schema, Document, Model } from "mongoose";
import { ICommonRecordFields } from "@/types/common";
import { commonRecordFieldsDefinition } from "./commonSchema";

export type ProjectType = "SPONSORED_PROJECT" | "CONSULTANCY";

export interface IProjectConsultancy extends Document, ICommonRecordFields {
  title: string;
  type: ProjectType;
  fundingAgencyOrClient: string;
  sanctionedAmount: number;
  receivedAmount: number;
  startDate: Date;
  endDate?: Date | null;
  principalInvestigator: string;
  coInvestigators: string[];
}

const ProjectConsultancySchema = new Schema<IProjectConsultancy>(
  {
    title: {
      type: String,
      required: [true, "Project / Consultancy title is required"],
      trim: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: ["SPONSORED_PROJECT", "CONSULTANCY"],
      index: true,
    },
    fundingAgencyOrClient: {
      type: String,
      required: [true, "Funding agency or client name is required"],
      trim: true,
      index: true,
    },
    sanctionedAmount: {
      type: Number,
      required: [true, "Sanctioned amount is required"],
      min: 0,
    },
    receivedAmount: {
      type: Number,
      required: [true, "Received amount is required"],
      min: 0,
    },
    startDate: {
      type: Date,
      required: [true, "Start date is required"],
    },
    endDate: {
      type: Date,
      default: null,
    },
    principalInvestigator: {
      type: String,
      required: [true, "Principal investigator is required"],
      trim: true,
    },
    coInvestigators: {
      type: [String],
      default: [],
    },
    ...commonRecordFieldsDefinition,
  },
  {
    timestamps: true,
  }
);

ProjectConsultancySchema.index({ department: 1, type: 1, status: 1 });

export const ProjectConsultancy: Model<IProjectConsultancy> =
  mongoose.models.ProjectConsultancy ||
  mongoose.model<IProjectConsultancy>("ProjectConsultancy", ProjectConsultancySchema);

