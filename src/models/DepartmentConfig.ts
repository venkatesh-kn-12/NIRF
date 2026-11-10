import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IDepartmentConfig extends Document {
  institutionName: string;
  department: "MCA";
  programmeName: string;
  homeState: string;
  selectedAcademicYear: string;
  reportingPeriod: string;
  cycleStartDate: string;
  cycleEndDate: string;
  referenceDate: string;
  sanctionedIntake: number;
  notifications: {
    inAppAlerts: boolean;
    highDiscrepancyAlerts: boolean;
    calculationAlerts: boolean;
    emailAlerts: boolean; // false, unsupported in deployment
    smsAlerts: boolean;   // false, unsupported in deployment
  };
  updatedBy?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const DepartmentConfigSchema = new Schema<IDepartmentConfig>(
  {
    institutionName: {
      type: String,
      required: true,
      default: "Dayananda Sagar Academy of Technology & Management",
      trim: true,
    },
    department: {
      type: String,
      required: true,
      default: "MCA",
      enum: ["MCA"],
      unique: true,
      index: true,
    },
    programmeName: {
      type: String,
      required: true,
      default: "Master of Computer Applications",
      trim: true,
    },
    homeState: {
      type: String,
      required: true,
      default: "Karnataka",
      trim: true,
    },
    selectedAcademicYear: {
      type: String,
      required: true,
      default: "2024-25",
      trim: true,
    },
    reportingPeriod: {
      type: String,
      required: true,
      default: "ANNUAL",
      trim: true,
    },
    cycleStartDate: {
      type: String,
      required: true,
      default: "2025-11-01",
    },
    cycleEndDate: {
      type: String,
      required: true,
      default: "2026-02-28",
    },
    referenceDate: {
      type: String,
      required: true,
      default: "2024-12-31",
    },
    sanctionedIntake: {
      type: Number,
      required: true,
      default: 120,
      min: [1, "Sanctioned intake must be at least 1"],
    },
    notifications: {
      inAppAlerts: { type: Boolean, default: true },
      highDiscrepancyAlerts: { type: Boolean, default: true },
      calculationAlerts: { type: Boolean, default: true },
      emailAlerts: { type: Boolean, default: false },
      smsAlerts: { type: Boolean, default: false },
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const DepartmentConfig: Model<IDepartmentConfig> =
  mongoose.models.DepartmentConfig ||
  mongoose.model<IDepartmentConfig>("DepartmentConfig", DepartmentConfigSchema);

