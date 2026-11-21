import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type RPActivityType =
  | "PUBLICATIONS"
  | "PATENTS_PUBLISHED"
  | "PATENTS_GRANTED"
  | "RESEARCH_FUNDING"
  | "CONSULTANCY"
  | "PLACEMENTS"
  | "HIGHER_STUDIES"
  | "DOCTORAL_AWARDS";

export interface IZeroActivityDeclaration extends Document {
  department: "MCA";
  academicYear: string;
  activityType: RPActivityType;
  reason?: string;
  declaredBy: Types.ObjectId;
  declaredByEmail: string;
  declaredByName: string;
  declaredAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ZeroActivityDeclarationSchema = new Schema<IZeroActivityDeclaration>(
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
      default: "2024-25",
      index: true,
    },
    activityType: {
      type: String,
      required: true,
      enum: [
        "PUBLICATIONS",
        "PATENTS_PUBLISHED",
        "PATENTS_GRANTED",
        "RESEARCH_FUNDING",
        "CONSULTANCY",
        "PLACEMENTS",
        "HIGHER_STUDIES",
        "DOCTORAL_AWARDS",
      ],
      index: true,
    },
    reason: {
      type: String,
      default: "No activity recorded for this period by departmental declaration.",
      trim: true,
    },
    declaredBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    declaredByEmail: {
      type: String,
      required: true,
      trim: true,
    },
    declaredByName: {
      type: String,
      required: true,
      trim: true,
    },
    declaredAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index ensuring only one declaration per activity type per department & academic year
ZeroActivityDeclarationSchema.index(
  { department: 1, academicYear: 1, activityType: 1 },
  { unique: true }
);

export const ZeroActivityDeclaration: Model<IZeroActivityDeclaration> =
  mongoose.models.ZeroActivityDeclaration ||
  mongoose.model<IZeroActivityDeclaration>(
    "ZeroActivityDeclaration",
    ZeroActivityDeclarationSchema
  );
