import mongoose, { Schema, Document, Model } from "mongoose";
import { ICommonRecordFields } from "@/types/common";
import { commonRecordFieldsDefinition } from "./commonSchema";

export type DomicileType = "HOME_STATE" | "OTHER_STATE" | "INTERNATIONAL";

export interface IStudent extends Document, ICommonRecordFields {
  studentId: string;
  prn: string;
  name: string;
  email: string;
  programme: string;
  batch: string;
  admissionYear: number;
  gender: "MALE" | "FEMALE" | "OTHER";
  dateOfBirth: Date;
  domicileState: string;
  domicileType: DomicileType;
  category: string;
  currentStatus: "ACTIVE" | "GRADUATED" | "DISCONTINUED";
  currentSemester: number;
  expectedGraduationYear: number;
  actualGraduationYear?: number | null;
  higherStudiesStatus: string;
}

const StudentSchema = new Schema<IStudent>(
  {
    studentId: {
      type: String,
      required: [true, "Student ID is required"],
      unique: true,
      trim: true,
      index: true,
    },
    prn: {
      type: String,
      required: [true, "PRN is required"],
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Student name is required"],
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: [true, "Institutional email is required"],
      lowercase: true,
      trim: true,
    },
    programme: {
      type: String,
      required: true,
      default: "MCA",
    },
    batch: {
      type: String,
      required: [true, "Batch is required (e.g., 2023-2025)"],
      trim: true,
      index: true,
    },
    admissionYear: {
      type: Number,
      required: [true, "Admission year is required"],
      index: true,
    },
    gender: {
      type: String,
      required: true,
      enum: ["MALE", "FEMALE", "OTHER"],
    },
    dateOfBirth: {
      type: Date,
      required: [true, "Date of birth is required"],
    },
    domicileState: {
      type: String,
      required: [true, "Domicile state is required"],
      trim: true,
    },
    domicileType: {
      type: String,
      required: true,
      enum: ["HOME_STATE", "OTHER_STATE", "INTERNATIONAL"],
      index: true,
    },
    category: {
      type: String,
      required: [true, "Category is required (e.g. OPEN, OBC, SC, ST)"],
      trim: true,
      index: true,
    },
    currentStatus: {
      type: String,
      required: true,
      enum: ["ACTIVE", "GRADUATED", "DISCONTINUED"],
      default: "ACTIVE",
      index: true,
    },
    currentSemester: {
      type: Number,
      required: true,
      min: 1,
      max: 6,
      default: 1,
    },
    expectedGraduationYear: {
      type: Number,
      required: [true, "Expected graduation year is required"],
    },
    actualGraduationYear: {
      type: Number,
      default: null,
    },
    higherStudiesStatus: {
      type: String,
      default: "NOT_PURSUING",
    },
    ...commonRecordFieldsDefinition,
  },
  {
    timestamps: true,
  }
);

StudentSchema.index({ department: 1, academicYear: 1, status: 1 });

export const Student: Model<IStudent> =
  mongoose.models.Student || mongoose.model<IStudent>("Student", StudentSchema);

