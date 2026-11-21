import mongoose, { Schema, Document, Model } from "mongoose";
import { ICommonRecordFields } from "@/types/common";
import { commonRecordFieldsDefinition } from "./commonSchema";

export type ExpenditureType = "CAPITAL" | "OPERATIONAL";
export type Granularity = "TRANSACTION" | "ANNUAL_AGGREGATE";
export type ExclusionType = "NONE" | "BUILDING_CONSTRUCTION" | "HOSTEL_MAINTENANCE" | "OTHER";
export type CurrencyUnit = "INR" | "LAKHS" | "CRORES";

export type CapitalCategory =
  | "EQUIPMENT"
  | "COMPUTERS_HARDWARE"
  | "FURNITURE"
  | "LIBRARY_ASSETS"
  | "BUILDING_CONSTRUCTION"
  | "OTHER_CAPITAL";

export type OperationalCategory =
  | "SALARIES"
  | "CONSUMABLES"
  | "SUBSCRIPTIONS"
  | "MAINTENANCE"
  | "UTILITIES"
  | "HOSTEL_MAINTENANCE"
  | "OTHER_RECURRING";

export interface IFinanceRecord extends Document, ICommonRecordFields {
  financialYear: string;
  expenditureHead: string;
  category?: string;
  subcategory?: string;
  granularity: Granularity;
  voucherNumber?: string;
  vendor?: string;
  amount: number;
  currency: string;
  unit: CurrencyUnit;
  amountInINR: number;
  amountPaise: number;
  allocationPercentage: number;
  allocationBasis: string;
  expenditureType: ExpenditureType;
  purpose: string;
  supportingDocument?: string;
  isExcluded: boolean;
  exclusionType: ExclusionType;
  exclusionReason?: string;
  reportingScope: "DEPARTMENT" | "INSTITUTION";
  allocationMethod?: string;
  matchingStudentDenominator?: number;
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
    category: {
      type: String,
      trim: true,
      default: "",
    },
    subcategory: {
      type: String,
      trim: true,
      default: "",
    },
    granularity: {
      type: String,
      enum: ["TRANSACTION", "ANNUAL_AGGREGATE"],
      default: "ANNUAL_AGGREGATE",
      index: true,
    },
    voucherNumber: {
      type: String,
      trim: true,
      default: "",
    },
    vendor: {
      type: String,
      trim: true,
      default: "",
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
    unit: {
      type: String,
      required: true,
      enum: ["INR", "LAKHS", "CRORES"],
      default: "INR",
    },
    amountInINR: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    amountPaise: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    allocationPercentage: {
      type: Number,
      default: 100,
      min: 0,
      max: 100,
    },
    allocationBasis: {
      type: String,
      default: "DIRECT_DEPARTMENTAL",
      trim: true,
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
    isExcluded: {
      type: Boolean,
      default: false,
      index: true,
    },
    exclusionType: {
      type: String,
      enum: ["NONE", "BUILDING_CONSTRUCTION", "HOSTEL_MAINTENANCE", "OTHER"],
      default: "NONE",
    },
    exclusionReason: {
      type: String,
      default: "",
      trim: true,
    },
    reportingScope: {
      type: String,
      enum: ["DEPARTMENT", "INSTITUTION"],
      default: "DEPARTMENT",
    },
    allocationMethod: {
      type: String,
      default: "DIRECT_DEPARTMENTAL",
      trim: true,
    },
    matchingStudentDenominator: {
      type: Number,
      default: 120,
      min: 1,
    },
    ...commonRecordFieldsDefinition,
  },
  {
    timestamps: true,
  }
);

FinanceRecordSchema.pre("save", function (next) {
  let multiplier = 1;
  if (this.unit === "LAKHS") multiplier = 100000;
  if (this.unit === "CRORES") multiplier = 10000000;

  const rawInINR = (this.amount || 0) * multiplier;
  const allocation = (this.allocationPercentage ?? 100) / 100;
  this.amountInINR = Math.round(rawInINR * allocation * 100) / 100;
  this.amountPaise = Math.round(this.amountInINR * 100);

  if (this.exclusionType && this.exclusionType !== "NONE") {
    this.isExcluded = true;
  }
  next();
});

FinanceRecordSchema.index({ department: 1, financialYear: 1, expenditureType: 1, status: 1 });
FinanceRecordSchema.index({ department: 1, financialYear: 1, granularity: 1 });

export const FinanceRecord: Model<IFinanceRecord> =
  mongoose.models.FinanceRecord ||
  mongoose.model<IFinanceRecord>("FinanceRecord", FinanceRecordSchema);

