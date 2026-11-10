import mongoose, { Schema, Document, Model } from "mongoose";
import { ICommonRecordFields } from "@/types/common";
import { commonRecordFieldsDefinition } from "./commonSchema";

export type EmploymentType = "PERMANENT" | "CONTRACT" | "VISITING" | "ADJUNCT";

export interface IFaculty extends Document, ICommonRecordFields {
  facultyId: string;
  name: string;
  email: string;
  designation: string;
  employmentType: EmploymentType;
  highestQualification: string;
  phdStatus: "AWARDED" | "PURSUING" | "NOT_ENROLLED" | "NOT_APPLICABLE";
  phdAwardYear?: number | null;
  experienceYears: number;
  joiningDate: Date;
  leavingDate?: Date | null;
  researchDomains: string[];
}

const FacultySchema = new Schema<IFaculty>(
  {
    facultyId: {
      type: String,
      required: [true, "Faculty ID is required"],
      unique: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Faculty name is required"],
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: [true, "Email address is required"],
      lowercase: true,
      trim: true,
    },
    designation: {
      type: String,
      required: [true, "Designation is required"],
      trim: true,
      index: true,
    },
    employmentType: {
      type: String,
      required: true,
      enum: ["PERMANENT", "CONTRACT", "VISITING", "ADJUNCT"],
      default: "PERMANENT",
      index: true,
    },
    highestQualification: {
      type: String,
      required: [true, "Highest qualification is required"],
      trim: true,
    },
    phdStatus: {
      type: String,
      required: true,
      enum: ["AWARDED", "PURSUING", "NOT_ENROLLED", "NOT_APPLICABLE"],
      default: "NOT_APPLICABLE",
      index: true,
    },
    phdAwardYear: {
      type: Number,
      default: null,
    },
    experienceYears: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    joiningDate: {
      type: Date,
      required: [true, "Joining date is required"],
    },
    leavingDate: {
      type: Date,
      default: null,
    },
    researchDomains: {
      type: [String],
      default: [],
    },
    ...commonRecordFieldsDefinition,
  },
  {
    timestamps: true,
  }
);

FacultySchema.index({ department: 1, academicYear: 1, status: 1 });

export const Faculty: Model<IFaculty> =
  mongoose.models.Faculty || mongoose.model<IFaculty>("Faculty", FacultySchema);

