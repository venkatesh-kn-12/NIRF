import mongoose, { Schema, Document, Model, Types } from "mongoose";
import { ICommonRecordFields } from "@/types/common";
import { commonRecordFieldsDefinition } from "./commonSchema";

export type PublicationType =
  | "JOURNAL"
  | "CONFERENCE"
  | "BOOK_CHAPTER"
  | "OTHER"
  | "UNKNOWN";

export type PublicationStatus =
  | "PUBLISHED"
  | "ACCEPTED_IN_PRESS"
  | "UNDER_REVIEW"
  | "PREPRINT";

export type DatePrecision = "YEAR" | "MONTH" | "DAY";

export type IndexingSourceName =
  | "SCOPUS"
  | "WEB_OF_SCIENCE"
  | "UGC_CARE"
  | "OTHER"
  | "UNKNOWN";

export type IndexingProvenance =
  | "SELF_REPORTED"
  | "DOCUMENT_SUPPORTED"
  | "EXTERNAL_SOURCE";

export type JournalQuartile =
  | "Q1"
  | "Q2"
  | "Q3"
  | "Q4"
  | "UNKNOWN"
  | "NOT_APPLICABLE";

export type RetractionStatus = "UNKNOWN" | "NOT_RETRACTED" | "RETRACTED";

export interface IPublicationAuthor {
  authorName: string;
  authorOrder: number;
  facultyRef?: Types.ObjectId | null;
  facultyId?: string;
  affiliation?: string;
  isCorresponding?: boolean;
  orcid?: string;
}

export interface IPublicationIndexing {
  sourceName: IndexingSourceName;
  recordId?: string;
  url?: string;
  referenceYear?: number;
  provenance: IndexingProvenance;
  retrievedAt?: Date | null;
}

export interface IPublicationQuartile {
  quartile: JournalQuartile;
  source?: string;
  year?: number;
  subjectCategory?: string;
  sourceUrl?: string;
}

export interface IPublication extends Document, ICommonRecordFields {
  title: string;
  publicationType: PublicationType;
  journalOrConference: string;
  publisher?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  issnOrIsbn?: string;
  pubStatus: PublicationStatus;
  publicationYear: number;
  publicationMonth?: number | null;
  exactPublicationDate?: Date | null;
  datePrecision: DatePrecision;

  // DOI & Normalised Identifier
  doi?: string;
  normalizedDoi?: string | null;
  url?: string;
  documentId?: string;

  // Authors (ordered repeatable list)
  authorsList: IPublicationAuthor[];
  authors: string[]; // backward-compatible flat string list

  // Faculty Associations & Ownership claims
  internalFaculty: Types.ObjectId[];
  claimedBy?: Types.ObjectId | null;
  claimedAt?: Date | null;

  // Indexing entries
  indexingList: IPublicationIndexing[];
  indexing: string; // primary indexing string for backward compatibility

  // Quartiles
  quartiles: IPublicationQuartile[];

  // Citations & Bibliometrics
  citationCount: number | null; // null if unknown, not default 0
  citationMeasurementDate?: Date | null;
  citationWindow?: string;
  citationSource?: string;
  citationRetrievedAt?: Date | null;

  // Retraction Tracking
  retractionStatus: RetractionStatus;
  retractionDate?: Date | null;
  retractionSource?: string;

  affiliationEvidence?: string;
}

const PublicationAuthorSchema = new Schema<IPublicationAuthor>(
  {
    authorName: { type: String, required: true, trim: true },
    authorOrder: { type: Number, required: true, min: 1 },
    facultyRef: { type: Schema.Types.ObjectId, ref: "Faculty", default: null },
    facultyId: { type: String, trim: true, default: "" },
    affiliation: { type: String, trim: true, default: "" },
    isCorresponding: { type: Boolean, default: false },
    orcid: { type: String, trim: true, default: "" },
  },
  { _id: true }
);

const PublicationIndexingSchema = new Schema<IPublicationIndexing>(
  {
    sourceName: {
      type: String,
      required: true,
      enum: ["SCOPUS", "WEB_OF_SCIENCE", "UGC_CARE", "OTHER", "UNKNOWN"],
      default: "SCOPUS",
    },
    recordId: { type: String, trim: true, default: "" },
    url: { type: String, trim: true, default: "" },
    referenceYear: { type: Number, default: null },
    provenance: {
      type: String,
      required: true,
      enum: ["SELF_REPORTED", "DOCUMENT_SUPPORTED", "EXTERNAL_SOURCE"],
      default: "SELF_REPORTED",
    },
    retrievedAt: { type: Date, default: null },
  },
  { _id: true }
);

const PublicationQuartileSchema = new Schema<IPublicationQuartile>(
  {
    quartile: {
      type: String,
      required: true,
      enum: ["Q1", "Q2", "Q3", "Q4", "UNKNOWN", "NOT_APPLICABLE"],
      default: "UNKNOWN",
    },
    source: { type: String, trim: true, default: "" },
    year: { type: Number, default: null },
    subjectCategory: { type: String, trim: true, default: "" },
    sourceUrl: { type: String, trim: true, default: "" },
  },
  { _id: true }
);

const PublicationSchema = new Schema<IPublication>(
  {
    title: {
      type: String,
      required: [true, "Publication title is required"],
      trim: true,
      index: true,
    },
    publicationType: {
      type: String,
      required: true,
      enum: ["JOURNAL", "CONFERENCE", "BOOK_CHAPTER", "OTHER", "UNKNOWN"],
      default: "JOURNAL",
      index: true,
    },
    journalOrConference: {
      type: String,
      required: [true, "Journal or Conference venue is required"],
      trim: true,
    },
    publisher: {
      type: String,
      trim: true,
      default: "",
    },
    volume: {
      type: String,
      trim: true,
      default: "",
    },
    issue: {
      type: String,
      trim: true,
      default: "",
    },
    pages: {
      type: String,
      trim: true,
      default: "",
    },
    issnOrIsbn: {
      type: String,
      trim: true,
      default: "",
    },
    pubStatus: {
      type: String,
      required: true,
      enum: ["PUBLISHED", "ACCEPTED_IN_PRESS", "UNDER_REVIEW", "PREPRINT"],
      default: "PUBLISHED",
      index: true,
    },
    publicationYear: {
      type: Number,
      required: [true, "Publication year is required"],
      index: true,
    },
    publicationMonth: {
      type: Number,
      min: 1,
      max: 12,
      default: null,
    },
    exactPublicationDate: {
      type: Date,
      default: null,
    },
    datePrecision: {
      type: String,
      enum: ["YEAR", "MONTH", "DAY"],
      default: "YEAR",
    },
    doi: {
      type: String,
      trim: true,
      default: "",
    },
    normalizedDoi: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
    },
    url: {
      type: String,
      trim: true,
      default: "",
    },
    documentId: {
      type: String,
      trim: true,
      default: "",
    },
    authorsList: [PublicationAuthorSchema],
    authors: {
      type: [String],
      default: [],
    },
    internalFaculty: [
      {
        type: Schema.Types.ObjectId,
        ref: "Faculty",
        index: true,
      },
    ],
    claimedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    claimedAt: {
      type: Date,
      default: null,
    },
    indexingList: [PublicationIndexingSchema],
    indexing: {
      type: String,
      default: "SCOPUS",
      index: true,
    },
    quartiles: [PublicationQuartileSchema],
    citationCount: {
      type: Number,
      default: null, // Unknown = null, not default 0
      min: 0,
    },
    citationMeasurementDate: {
      type: Date,
      default: null,
    },
    citationWindow: {
      type: String,
      default: "",
    },
    citationSource: {
      type: String,
      default: "",
    },
    citationRetrievedAt: {
      type: Date,
      default: null,
    },
    retractionStatus: {
      type: String,
      enum: ["UNKNOWN", "NOT_RETRACTED", "RETRACTED"],
      default: "UNKNOWN",
      index: true,
    },
    retractionDate: {
      type: Date,
      default: null,
    },
    retractionSource: {
      type: String,
      default: "",
    },
    affiliationEvidence: {
      type: String,
      default: "",
    },
    ...commonRecordFieldsDefinition,
  },
  {
    timestamps: true,
  }
);

// Pre-save hook: normalise DOI and synchronize backward-compatible arrays
PublicationSchema.pre("save", function (next) {
  if (this.doi && this.doi.trim()) {
    // Normalise: strip URL prefixes, whitespace, and lowercase
    let cleaned = this.doi.trim().toLowerCase();
    cleaned = cleaned.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "");
    cleaned = cleaned.replace(/^doi:\s*/i, "");
    this.normalizedDoi = cleaned || null;
  } else {
    this.normalizedDoi = null;
  }

  // Synchronize flat authors array from authorsList if present
  if (this.authorsList && this.authorsList.length > 0) {
    this.authors = this.authorsList.map((a) => a.authorName);
  } else if (this.authors && this.authors.length > 0 && (!this.authorsList || this.authorsList.length === 0)) {
    this.authorsList = this.authors.map((name, idx) => ({
      authorName: name,
      authorOrder: idx + 1,
    }));
  }

  // Synchronize primary indexing string
  if (this.indexingList && this.indexingList.length > 0) {
    this.indexing = this.indexingList[0].sourceName;
  }

  next();
});

// Indexes
PublicationSchema.index({ department: 1, publicationYear: -1, status: 1 });
// Partial unique index on normalizedDoi when present and nonempty
PublicationSchema.index(
  { normalizedDoi: 1 },
  {
    unique: true,
    partialFilterExpression: {
      normalizedDoi: { $type: "string", $gt: "" },
    },
  }
);

export const Publication: Model<IPublication> =
  mongoose.models.Publication || mongoose.model<IPublication>("Publication", PublicationSchema);
