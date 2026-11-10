import mongoose, { Schema, Document, Model } from "mongoose";
import { ICommonRecordFields } from "@/types/common";
import { commonRecordFieldsDefinition } from "./commonSchema";

export type ExpenditureType = "CAPITAL" | "OPERATIONAL";

export interface IFinanceRecord extends Document, ICommonRecordFields {
  financialYear: string;
  expenditureHead: string;
  amount: number;
  currency: string;
  expenditureType: ExpenditureType;
  purpose: string;
  supportingDocument?: string;
}

const FinanceRecordSchema = new Schema<IFinanceRecord>(
  {
    financialYear: {
      type: String,
      required: [true, "Financial year is required (e.g. 2023-24)"],
      trim: true,
      index: true,
    },
    expenditureHead: {
      type: String,
      required: [true, "Expenditure head is required"],
      trim: true,
      index: true,
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: 0,
    },
    currency: {
      type: String,
      required: true,
      default: "INR",
    },
    expenditureType: {
      type: String,
      required: true,
      enum: ["CAPITAL", "OPERATIONAL"],
      index: true,
    },
    purpose: {
      type: String,
      required: [true, "Purpose description is required"],
      trim: true,
    },
    supportingDocument: {
      type: String,
      default: "",
    },
    ...commonRecordFieldsDefinition,
  },
  {
    timestamps: true,
  }
);

FinanceRecordSchema.index({ department: 1, financialYear: 1, expenditureType: 1, status: 1 });

export const FinanceRecord: Model<IFinanceRecord> =
  mongoose.models.FinanceRecord ||
  mongoose.model<IFinanceRecord>("FinanceRecord", FinanceRecordSchema);

