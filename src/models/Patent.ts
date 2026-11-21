import mongoose, { Schema, Document, Model, Types } from "mongoose";
import { ICommonRecordFields } from "@/types/common";
import { commonRecordFieldsDefinition } from "./commonSchema";

export type PatentLegalStatus =
  | "FILED"
  | "PUBLISHED"
  | "UNDER_EXAMINATION"
  | "GRANTED"
  | "REFUSED"
  | "WITHDRAWN"
  | "ABANDONED"
  | "EXPIRED"
  | "UNKNOWN";

export type PatentJurisdiction =
  | "INDIA"
  | "USPTO"
  | "EPO"
  | "WIPO"
  | "UK"
  | "AUSTRALIA"
  | "OTHER";

export interface IPatentInventor {
  name: string;
  order: number;
  facultyRef?: Types.ObjectId | null;
  facultyId?: string;
  affiliation?: string;
}

export interface IPatentLifecycleEvent {
  eventDate: Date;
  eventType: string; // e.g. "FILING", "FIRST_EXAMINATION_REPORT", "HEARING", "PUBLICATION", "GRANT"
  description?: string;
  referenceUrl?: string;
}

export interface IPatent extends Document, ICommonRecordFields {
  title: string;
  jurisdiction: PatentJurisdiction;
  patentOffice: string;
  applicationNumber: string;
  normalizedApplicationNumber: string;
  publicationNumber?: string;
  grantNumber?: string;

  // Inventors (ordered list)
  inventorsList: IPatentInventor[];
  inventors: string[]; // backward-compatible flat string list
  internalFaculty: Types.ObjectId[];

  // Ownership & Assignee
  applicants: string[];
  applicant: string; // backward-compatible primary string
  assignees: string[];
  institutionAssociation: boolean;
  ownershipEvidence?: string;

  // Lifecycle dates
  filingDate: Date;
  publicationDate?: Date | null;
  grantDate?: Date | null;
  legalStatus: PatentLegalStatus;
  patentStatus: string; // backward-compatible string (FILED, PUBLISHED, GRANTED)
  sourceUrl?: string;

  lifecycleEvents: IPatentLifecycleEvent[];
}

const PatentInventorSchema = new Schema<IPatentInventor>(
  {
    name: { type: String, required: true, trim: true },
    order: { type: Number, required: true, min: 1 },
    facultyRef: { type: Schema.Types.ObjectId, ref: "Faculty", default: null },
    facultyId: { type: String, trim: true, default: "" },
    affiliation: { type: String, trim: true, default: "" },
  },
  { _id: true }
);

const PatentLifecycleEventSchema = new Schema<IPatentLifecycleEvent>(
  {
    eventDate: { type: Date, required: true },
    eventType: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    referenceUrl: { type: String, default: "" },
  },
  { _id: true }
);

const PatentSchema = new Schema<IPatent>(
  {
    title: {
      type: String,
      required: [true, "Patent title is required"],
      trim: true,
      index: true,
    },
    jurisdiction: {
      type: String,
      required: true,
      enum: ["INDIA", "USPTO", "EPO", "WIPO", "UK", "AUSTRALIA", "OTHER"],
      default: "INDIA",
      index: true,
    },
    patentOffice: {
      type: String,
      required: true,
      default: "Indian Patent Office (IPO)",
    },
    applicationNumber: {
      type: String,
      required: [true, "Application number is required"],
      trim: true,
      index: true,
    },
    normalizedApplicationNumber: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    publicationNumber: {
      type: String,
      trim: true,
      default: "",
    },
    grantNumber: {
      type: String,
      trim: true,
      default: "",
    },
    inventorsList: [PatentInventorSchema],
    inventors: {
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
    applicants: {
      type: [String],
      default: [],
    },
    applicant: {
      type: String,
      default: "Dayananda Sagar Academy of Technology & Management",
    },
    assignees: {
      type: [String],
      default: [],
    },
    institutionAssociation: {
      type: Boolean,
      default: true,
    },
    ownershipEvidence: {
      type: String,
      default: "",
    },
    filingDate: {
      type: Date,
      required: [true, "Filing date is required"],
      index: true,
    },
    publicationDate: {
      type: Date,
      default: null,
      index: true,
    },
    grantDate: {
      type: Date,
      default: null,
      index: true,
    },
    legalStatus: {
      type: String,
      required: true,
      enum: [
        "FILED",
        "PUBLISHED",
        "UNDER_EXAMINATION",
        "GRANTED",
        "REFUSED",
        "WITHDRAWN",
        "ABANDONED",
        "EXPIRED",
        "UNKNOWN",
      ],
      default: "FILED",
      index: true,
    },
    patentStatus: {
      type: String,
      default: "FILED",
      index: true,
    },
    sourceUrl: {
      type: String,
      trim: true,
      default: "",
    },
    lifecycleEvents: [PatentLifecycleEventSchema],
    ...commonRecordFieldsDefinition,
  },
  {
    timestamps: true,
  }
);

// Pre-save hook: normalize application number and sync backward-compatible fields
PatentSchema.pre("validate", function (next) {
  if (this.applicationNumber) {
    // Normalise: strip spaces, slashes, hyphens, and lowercase
    this.normalizedApplicationNumber = this.applicationNumber
      .trim()
      .replace(/[\s\-\/]/g, "")
      .toLowerCase();
  }

  // Synchronize flat inventors list
  if (this.inventorsList && this.inventorsList.length > 0) {
    this.inventors = this.inventorsList.map((i) => i.name);
  } else if (this.inventors && this.inventors.length > 0 && (!this.inventorsList || this.inventorsList.length === 0)) {
    this.inventorsList = this.inventors.map((name, idx) => ({
      name,
      order: idx + 1,
    }));
  }

  // Synchronize applicants
  if (this.applicants && this.applicants.length > 0) {
    this.applicant = this.applicants[0];
  } else if (this.applicant && (!this.applicants || this.applicants.length === 0)) {
    this.applicants = [this.applicant];
  }

  // Synchronize patentStatus
  if (this.grantDate) {
    this.patentStatus = "GRANTED";
  } else if (this.publicationDate) {
    this.patentStatus = "PUBLISHED";
  } else {
    this.patentStatus = "FILED";
  }

  next();
});

// Deduplication index: unique application number within jurisdiction
PatentSchema.index(
  { jurisdiction: 1, normalizedApplicationNumber: 1 },
  { unique: true }
);

PatentSchema.index({ department: 1, filingDate: -1, status: 1 });

export const Patent: Model<IPatent> =
  mongoose.models.Patent || mongoose.model<IPatent>("Patent", PatentSchema);
