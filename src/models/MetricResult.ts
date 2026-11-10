import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type MetricCalculationStatus =
  | "COMPUTED"
  | "NOT_COMPUTABLE"
  | "AWAITING_SOURCE"
  | "PENDING_INPUT";

export interface IMetricExecutionTraceStep {
  step: string;
  expression: string;
  value: string | number;
}

export interface IMetricResultData {
  rawScore: number | null;
  normalisedScore: number | null;
  weightedScore: number | null;
  maxMarks: number;
  trace: {
    formula: string;
    steps: IMetricExecutionTraceStep[];
    notes?: string;
  };
}

export interface IMetricResult extends Document {
  department: "MCA";
  academicYear: string;
  reportingPeriod: string;
  methodologyVersion: string;
  parameter: "TLR" | "RP" | "GO" | "OI" | "PR" | "OVERALL";
  metricCode: string;
  name: string;
  inputValueSnapshot: Record<string, any>;
  result: IMetricResultData;
  status: MetricCalculationStatus;
  calculatedBy?: Types.ObjectId | null;
  calculatedAt: Date;
  formulaVersion: string;
  auditReference: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MetricResultSchema = new Schema<IMetricResult>(
  {
    department: {
      type: String,
      required: true,
      default: "MCA",
      enum: ["MCA"],
      index: true,
    },
    academicYear: {
      type: String,
      required: true,
      index: true,
    },
    reportingPeriod: {
      type: String,
      required: true,
      default: "ANNUAL",
    },
    methodologyVersion: {
      type: String,
      required: true,
      default: "NIRF_ENGINEERING_2025",
      index: true,
    },
    parameter: {
      type: String,
      required: true,
      enum: ["TLR", "RP", "GO", "OI", "PR", "OVERALL"],
      index: true,
    },
    metricCode: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    inputValueSnapshot: {
      type: Schema.Types.Mixed,
      required: true,
      default: {},
    },
    result: {
      rawScore: { type: Number, default: null },
      normalisedScore: { type: Number, default: null },
      weightedScore: { type: Number, default: null },
      maxMarks: { type: Number, required: true },
      trace: {
        formula: { type: String, default: "" },
        steps: [
          {
            step: { type: String },
            expression: { type: String },
            value: { type: Schema.Types.Mixed },
          },
        ],
        notes: { type: String, default: "" },
      },
    },
    status: {
      type: String,
      required: true,
      enum: ["COMPUTED", "NOT_COMPUTABLE", "AWAITING_SOURCE", "PENDING_INPUT"],
      index: true,
    },
    calculatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    calculatedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    formulaVersion: {
      type: String,
      required: true,
      default: "2025.1",
    },
    auditReference: {
      type: String,
      required: true,
      index: true,
    },
    notes: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

// Compound index for querying specific metric runs
MetricResultSchema.index(
  { department: 1, academicYear: 1, methodologyVersion: 1, metricCode: 1 },
  { unique: false }
);

export const MetricResult: Model<IMetricResult> =
  mongoose.models.MetricResult ||
  mongoose.model<IMetricResult>("MetricResult", MetricResultSchema);

