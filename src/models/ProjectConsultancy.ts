import mongoose, { Schema, Document, Model, Types } from "mongoose";
import { ICommonRecordFields } from "@/types/common";
import { commonRecordFieldsDefinition } from "./commonSchema";

export type ProjectType = "SPONSORED_PROJECT" | "CONSULTANCY";

export interface IProjectReceipt {
  _id?: Types.ObjectId;
  receiptDate?: Date | null;
  financialYear: string; // e.g. "2023-24"
  amount: number; // amount in INR
  referenceNumber?: string;
  mcaAllocationPercentage: number; // default: 100%
  notes?: string;
  supportingDocument?: string;
  createdAt?: Date;
}

export interface IProjectConsultancy extends Document, ICommonRecordFields {
  title: string;
  type: ProjectType;
  fundingAgencyOrClient: string;
  projectNumber?: string;
  sanctionedAmount?: number;
  receivedAmount: number; // aggregate or legacy received amount
  startDate: Date;
  endDate?: Date | null;
  principalInvestigator: string;
  coInvestigators: string[];
  scope: "DEPARTMENT" | "INSTITUTION";
  notes?: string;
  receipts: IProjectReceipt[];
  legacyReceiptYear?: string | null; // e.g. "2023-24" assigned for legacy aggregates
}

const ProjectReceiptSchema = new Schema<IProjectReceipt>(
  {
    receiptDate: {
      type: Date,
      default: null,
    },
    financialYear: {
      type: String,
      required: [true, "Receipt financial year is required (e.g. 2023-24)"],
      trim: true,
      index: true,
    },
    amount: {
      type: Number,
      required: [true, "Receipt amount is required"],
      min: [0, "Receipt amount must be positive"],
      default: 0,
    },
    referenceNumber: {
      type: String,
      trim: true,
      default: "",
    },
    mcaAllocationPercentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 100,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    supportingDocument: {
      type: String,
      trim: true,
      default: "",
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

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
    projectNumber: {
      type: String,
      trim: true,
      default: "",
    },
    sanctionedAmount: {
      type: Number,
      min: 0,
      default: 0,
    },
    receivedAmount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
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
    scope: {
      type: String,
      enum: ["DEPARTMENT", "INSTITUTION"],
      default: "DEPARTMENT",
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    receipts: [ProjectReceiptSchema],
    legacyReceiptYear: {
      type: String,
      trim: true,
      default: null,
    },
    ...commonRecordFieldsDefinition,
  },
  {
    timestamps: true,
  }
);

ProjectConsultancySchema.index({ department: 1, type: 1, status: 1 });
ProjectConsultancySchema.index({ department: 1, academicYear: 1, status: 1 });

export const ProjectConsultancy: Model<IProjectConsultancy> =
  mongoose.models.ProjectConsultancy ||
  mongoose.model<IProjectConsultancy>(
    "ProjectConsultancy",
    ProjectConsultancySchema
  );
