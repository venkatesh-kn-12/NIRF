import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IRPSettings {
  qpModel: string;
  pubTargetPerFacultyPerYear: number;
  citationTargetPerFacultyWindow: number;
  patentsPublishedTarget: number;
  patentsGrantedTarget: number;
  researchFundingTargetPerFacultyYear: number;
  consultancyTargetPerFacultyYear: number;
}

export interface IGOSettings {
  gphModel: string;
  salaryTarget: number;
  phdAwardTargetPerYear: number;
  cohortYearsCount: number;
}

export interface IFacilityChecklist {
  ramps_walkways: boolean;
  lifts_elevators: boolean;
  accessible_toilets: boolean;
  assistive_tech_labs: boolean;
  directional_signage: boolean;
}

export interface IDepartmentConfig extends Document {
  institutionName: string;
  department: "MCA";
  programmeName: string;
  homeState: string;
  selectedAcademicYear: string;
  scoringYear: number;
  simulationPolicy: "COMPLETED_BASELINE" | "CURRENT_PROVISIONAL";
  provisionalCutoffDate: string;
  surveyScale: string;
  facilityChecklist: IFacilityChecklist;
  reportingPeriod: string;
  cycleStartDate: string;
  cycleEndDate: string;
  referenceDate: string;
  sanctionedIntake: number;
  rpSettings: IRPSettings;
  goSettings: IGOSettings;
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
    scoringYear: {
      type: Number,
      required: true,
      default: 2026,
    },
    simulationPolicy: {
      type: String,
      required: true,
      enum: ["COMPLETED_BASELINE", "CURRENT_PROVISIONAL"],
      default: "COMPLETED_BASELINE",
    },
    provisionalCutoffDate: {
      type: String,
      required: true,
      default: "2026-02-28",
    },
    surveyScale: {
      type: String,
      required: true,
      default: "1-5",
    },
    facilityChecklist: {
      ramps_walkways: { type: Boolean, default: false },
      lifts_elevators: { type: Boolean, default: false },
      accessible_toilets: { type: Boolean, default: false },
      assistive_tech_labs: { type: Boolean, default: false },
      directional_signage: { type: Boolean, default: false },
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
    rpSettings: {
      qpModel: {
        type: String,
        default: "QP_CITATIONS_AND_QUARTILE_V1",
        trim: true,
      },
      pubTargetPerFacultyPerYear: {
        type: Number,
        default: 1.0,
        min: 0.1,
      },
      citationTargetPerFacultyWindow: {
        type: Number,
        default: 5.0,
        min: 0.1,
      },
      patentsPublishedTarget: {
        type: Number,
        default: 6,
        min: 1,
      },
      patentsGrantedTarget: {
        type: Number,
        default: 3,
        min: 1,
      },
      researchFundingTargetPerFacultyYear: {
        type: Number,
        default: 50000,
        min: 1000,
      },
      consultancyTargetPerFacultyYear: {
        type: Number,
        default: 25000,
        min: 1000,
      },
    },
    goSettings: {
      gphModel: {
        type: String,
        default: "GPH_UNIQUE_OUTCOMES_V1",
        trim: true,
      },
      salaryTarget: {
        type: Number,
        default: 800000, // 8 LPA preset
        min: 10000,
      },
      phdAwardTargetPerYear: {
        type: Number,
        default: 1.0,
        min: 0.1,
      },
      cohortYearsCount: {
        type: Number,
        default: 3,
        min: 1,
        max: 5,
      },
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

