import mongoose, { Schema, Document, Model, Types } from "mongoose";
import { ICommonRecordFields, IEvidenceReference } from "@/types/common";
import { commonRecordFieldsDefinition, EvidenceReferenceSchema } from "./commonSchema";

export interface IFacultyReportingFact extends Document, ICommonRecordFields {
  faculty: Types.ObjectId; // ref: Faculty
  facultyId: string;
  name: string;
  email: string;
  designation: string;
  employmentType: "PERMANENT" | "CONTRACT" | "VISITING" | "ADJUNCT";
  isFullTime: boolean;
  taughtBothSemesters: boolean; // NIRF Engineering requirement: taught in both semesters of previous year
  highestQualification: string;
  phdStatus: "AWARDED" | "PURSUING" | "NOT_APPLICABLE";
  isQualificationEligible: boolean; // Ph.D. or M.E./M.Tech/MCA with equivalence; Bachelor's degree not counted
  qualificationEquivalenceNotes?: string;
  experienceYearsAsOfReferenceDate: number; // Experience as of reference date
  experienceReferenceDate: Date;
  experienceBracket: "UP_TO_8" | "EIGHT_TO_15" | "ABOVE_15";
  isEligibleForFSR: boolean; // Evaluated eligible faculty for FSR numerator
  eligibilityRationale?: string;
  evidenceReferences: IEvidenceReference[];
}

const FacultyReportingFactSchema = new Schema<IFacultyReportingFact>(
  {
    faculty: {
      type: Schema.Types.ObjectId,
      ref: "Faculty",
      required: true,
      index: true,
    },
    facultyId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    designation: {
      type: String,
      required: true,
      trim: true,
    },
    employmentType: {
      type: String,
      required: true,
      enum: ["PERMANENT", "CONTRACT", "VISITING", "ADJUNCT"],
      default: "PERMANENT",
    },
    isFullTime: {
      type: Boolean,
      required: true,
      default: true,
    },
    taughtBothSemesters: {
      type: Boolean,
      required: true,
      default: true,
    },
    highestQualification: {
      type: String,
      required: true,
      trim: true,
    },
    phdStatus: {
      type: String,
      required: true,
      enum: ["AWARDED", "PURSUING", "NOT_APPLICABLE"],
      default: "NOT_APPLICABLE",
    },
    isQualificationEligible: {
      type: Boolean,
      required: true,
      default: true,
    },
    qualificationEquivalenceNotes: {
      type: String,
      default: "MCA/M.Tech. in Computer Science & Applications recognized as eligible postgraduate degree per AICTE/VTU norms.",
    },
    experienceYearsAsOfReferenceDate: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    experienceReferenceDate: {
      type: Date,
      required: true,
      default: () => new Date("2024-08-31"),
    },
    experienceBracket: {
      type: String,
      enum: ["UP_TO_8", "EIGHT_TO_15", "ABOVE_15"],
      default: "UP_TO_8",
    },
    isEligibleForFSR: {
      type: Boolean,
      required: true,
      default: true,
    },
    eligibilityRationale: {
      type: String,
      default: "Full-time regular faculty with eligible post-graduate/doctoral qualification who taught in both semesters of the reporting year.",
    },
    evidenceReferences: [EvidenceReferenceSchema],
    ...commonRecordFieldsDefinition,
  },
  {
    timestamps: true,
  }
);

FacultyReportingFactSchema.index(
  { department: 1, facultyId: 1, academicYear: 1 },
  { unique: true }
);

export const FacultyReportingFact: Model<IFacultyReportingFact> =
  mongoose.models.FacultyReportingFact ||
  mongoose.model<IFacultyReportingFact>("FacultyReportingFact", FacultyReportingFactSchema);
