import mongoose, { Schema, Document, Model } from "mongoose";
import { ICommonRecordFields } from "@/types/common";
import { commonRecordFieldsDefinition } from "./commonSchema";

export interface IPublication extends Document, ICommonRecordFields {
  title: string;
  authors: string[];
  doi?: string;
  url?: string;
  publicationType: string;
  journalOrConference: string;
  publicationDate: Date;
  indexing: string;
  citationCount: number;
  citationSource: string;
  citationRetrievedAt?: Date | null;
  affiliationEvidence?: string;
  retractionStatus: boolean;
}

const PublicationSchema = new Schema<IPublication>(
  {
    title: {
      type: String,
      required: [true, "Publication title is required"],
      trim: true,
      index: true,
    },
    authors: {
      type: [String],
      required: [true, "At least one author is required"],
    },
    doi: {
      type: String,
      trim: true,
      default: "",
    },
    url: {
      type: String,
      trim: true,
      default: "",
    },
    publicationType: {
      type: String,
      required: true,
      enum: ["JOURNAL", "CONFERENCE", "BOOK_CHAPTER", "OTHER"],
      default: "JOURNAL",
    },
    journalOrConference: {
      type: String,
      required: [true, "Journal or Conference name is required"],
      trim: true,
    },
    publicationDate: {
      type: Date,
      required: [true, "Publication date is required"],
    },
    indexing: {
      type: String,
      required: true,
      enum: ["SCOPUS", "WEB_OF_SCIENCE", "UGC_CARE", "OTHER"],
      default: "SCOPUS",
      index: true,
    },
    citationCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    citationSource: {
      type: String,
      default: "Scopus",
    },
    citationRetrievedAt: {
      type: Date,
      default: null,
    },
    affiliationEvidence: {
      type: String,
      default: "Affiliation verified per institutional policy",
    },
    retractionStatus: {
      type: Boolean,
      default: false,
    },
    ...commonRecordFieldsDefinition,
  },
  {
    timestamps: true,
  }
);

PublicationSchema.index({ department: 1, indexing: 1, status: 1 });

export const Publication: Model<IPublication> =
  mongoose.models.Publication || mongoose.model<IPublication>("Publication", PublicationSchema);

