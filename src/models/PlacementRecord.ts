import mongoose, { Schema, Document, Model } from "mongoose";
import { ICommonRecordFields } from "@/types/common";
import { commonRecordFieldsDefinition } from "./commonSchema";

export interface IPlacementRecord extends Document, ICommonRecordFields {
  studentReference: string;
  programme: string;
  batch: string;
  employer: string;
  offerType: string;
  ctc: number;
  offerDate: Date;
  joiningStatus: string;
  higherStudiesStatus: string;
  placementYear: number;
}

const PlacementRecordSchema = new Schema<IPlacementRecord>(
  {
    studentReference: {
      type: String,
      required: [true, "Student reference (ID / PRN) is required"],
      trim: true,
      index: true,
    },
    programme: {
      type: String,
      required: true,
      default: "MCA",
    },
    batch: {
      type: String,
      required: [true, "Batch is required"],
      trim: true,
      index: true,
    },
    employer: {
      type: String,
      required: [true, "Employer name is required"],
      trim: true,
      index: true,
    },
    offerType: {
      type: String,
      required: true,
      enum: ["ON_CAMPUS", "OFF_CAMPUS", "PPO", "OTHER"],
      default: "ON_CAMPUS",
    },
    ctc: {
      type: Number,
      required: [true, "CTC amount (annual in INR) is required"],
      min: 0,
    },
    offerDate: {
      type: Date,
      required: [true, "Offer date is required"],
    },
    joiningStatus: {
      type: String,
      required: true,
      enum: ["JOINED", "ACCEPTED", "DECLINED", "PENDING"],
      default: "JOINED",
      index: true,
    },
    higherStudiesStatus: {
      type: String,
      default: "NO",
    },
    placementYear: {
      type: Number,
      required: [true, "Placement year is required"],
      index: true,
    },
    ...commonRecordFieldsDefinition,
  },
  {
    timestamps: true,
  }
);

PlacementRecordSchema.index({ department: 1, batch: 1, placementYear: 1, status: 1 });

export const PlacementRecord: Model<IPlacementRecord> =
  mongoose.models.PlacementRecord ||
  mongoose.model<IPlacementRecord>("PlacementRecord", PlacementRecordSchema);

