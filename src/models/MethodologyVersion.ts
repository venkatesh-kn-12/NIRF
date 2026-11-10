import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IMetricDefinitionConfig {
  metricCode: string;
  parameter: "TLR" | "RP" | "GO" | "OI" | "PR";
  name: string;
  requiredInputs: string[];
  formula: string;
  normalisationRule: string;
  maxMarks: number;
  applicableProgrammes: string[];
  minimumDataRequirements: string;
  isBibliometricOrThirdParty?: boolean;
}

export interface IMethodologyVersion extends Document {
  version: string;
  category: "ENGINEERING";
  effectiveFrom: Date;
  parameters: {
    parameter: "TLR" | "RP" | "GO" | "OI" | "PR";
    name: string;
    weight: number;
    maxMarks: number;
  }[];
  metricDefinitions: IMetricDefinitionConfig[];
  formulas: Record<string, string>;
  normalisationRules: Record<string, string>;
  weights: Record<string, number>;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  createdBy?: Types.ObjectId | null;
  approvedBy?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const MetricDefinitionConfigSchema = new Schema<IMetricDefinitionConfig>(
  {
    metricCode: { type: String, required: true },
    parameter: {
      type: String,
      required: true,
      enum: ["TLR", "RP", "GO", "OI", "PR"],
    },
    name: { type: String, required: true },
    requiredInputs: { type: [String], default: [] },
    formula: { type: String, required: true },
    normalisationRule: { type: String, required: true },
    maxMarks: { type: Number, required: true },
    applicableProgrammes: { type: [String], default: ["MCA"] },
    minimumDataRequirements: { type: String, default: "" },
    isBibliometricOrThirdParty: { type: Boolean, default: false },
  },
  { _id: false }
);

const MethodologyVersionSchema = new Schema<IMethodologyVersion>(
  {
    version: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    category: {
      type: String,
      required: true,
      default: "ENGINEERING",
      enum: ["ENGINEERING"],
    },
    effectiveFrom: {
      type: Date,
      required: true,
      default: () => new Date("2024-04-01"),
    },
    parameters: [
      {
        parameter: {
          type: String,
          required: true,
          enum: ["TLR", "RP", "GO", "OI", "PR"],
        },
        name: { type: String, required: true },
        weight: { type: Number, required: true },
        maxMarks: { type: Number, required: true, default: 100 },
      },
    ],
    metricDefinitions: {
      type: [MetricDefinitionConfigSchema],
      default: [],
    },
    formulas: {
      type: Schema.Types.Mixed,
      default: {},
    },
    normalisationRules: {
      type: Schema.Types.Mixed,
      default: {},
    },
    weights: {
      type: Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      required: true,
      enum: ["DRAFT", "ACTIVE", "ARCHIVED"],
      default: "ACTIVE",
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

export const MethodologyVersion: Model<IMethodologyVersion> =
  mongoose.models.MethodologyVersion ||
  mongoose.model<IMethodologyVersion>("MethodologyVersion", MethodologyVersionSchema);

