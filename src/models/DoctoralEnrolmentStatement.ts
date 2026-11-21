import mongoose, { Schema, Document, Model } from "mongoose";
import { ICommonRecordFields, IEvidenceReference } from "@/types/common";
import { commonRecordFieldsDefinition, EvidenceReferenceSchema } from "./commonSchema";

export interface IDoctoralScholar {
  scholarName: string;
  usn: string;
  registrationDate: Date;
  guideName: string;
  researchTopic: string;
  enrolmentStatus: "FULL_TIME" | "PART_TIME" | "COMPLETED" | "DISCONTINUED";
}

export interface IDoctoralEnrolmentStatement extends Document, ICommonRecordFields {
  programme: string;
  enrolledDoctoralCount: number; // NP
  isExplicitZero: boolean;
  zeroDeclarationReason?: string;
  scholars: IDoctoralScholar[];
  certifiedByHOD: boolean;
  certificationReference?: string;
  evidenceReferences: IEvidenceReference[];
}

const DoctoralScholarSchema = new Schema<IDoctoralScholar>(
  {
    scholarName: { type: String, required: true, trim: true },
    usn: { type: String, required: true, trim: true },
    registrationDate: { type: Date, required: true },
    guideName: { type: String, required: true, trim: true },
    researchTopic: { type: String, default: "" },
    enrolmentStatus: {
      type: String,
      enum: ["FULL_TIME", "PART_TIME", "COMPLETED", "DISCONTINUED"],
      default: "FULL_TIME",
    },
  },
  { _id: true }
);

const DoctoralEnrolmentStatementSchema = new Schema<IDoctoralEnrolmentStatement>(
  {
    programme: {
      type: String,
      required: true,
      default: "MCA",
      index: true,
    },
    enrolledDoctoralCount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    isExplicitZero: {
      type: Boolean,
      default: true,
      index: true,
    },
    zeroDeclarationReason: {
      type: String,
      default: "MCA research centre active under VTU; zero primary doctoral scholars enrolled as of reporting reference date.",
      trim: true,
    },
    scholars: [DoctoralScholarSchema],
    certifiedByHOD: {
      type: Boolean,
      default: true,
    },
    certificationReference: {
      type: String,
      default: "",
      trim: true,
    },
    evidenceReferences: [EvidenceReferenceSchema],
    ...commonRecordFieldsDefinition,
  },
  {
    timestamps: true,
  }
);

DoctoralEnrolmentStatementSchema.index(
  { department: 1, programme: 1, academicYear: 1 },
  { unique: true }
);

export const DoctoralEnrolmentStatement: Model<IDoctoralEnrolmentStatement> =
  mongoose.models.DoctoralEnrolmentStatement ||
  mongoose.model<IDoctoralEnrolmentStatement>("DoctoralEnrolmentStatement", DoctoralEnrolmentStatementSchema);
