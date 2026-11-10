import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type AuditAction =
  | "login"
  | "logout"
  | "failed login"
  | "admin setup"
  | "user creation"
  | "role change"
  | "password change"
  | "record creation"
  | "record update"
  | "record deletion"
  | "approval"
  | "rejection"
  | "correction request"
  | "file upload"
  | "metric calculation"
  | "extraction start"
  | "extraction completion"
  | "field acceptance"
  | "field rejection"
  | "manual correction"
  | "status change"
  | "settings update";

export interface IAuditLog extends Document {
  action: AuditAction;
  userId?: Types.ObjectId | null;
  userEmail?: string;
  userRole?: string;
  department: string;
  resourceType?: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  status: "SUCCESS" | "FAILURE";
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    action: {
      type: String,
      required: [true, "Action is required"],
      enum: [
        "login",
        "logout",
        "failed login",
        "admin setup",
        "user creation",
        "role change",
        "password change",
        "record creation",
        "record update",
        "record deletion",
        "approval",
        "rejection",
        "correction request",
        "file upload",
        "metric calculation",
        "extraction start",
        "extraction completion",
        "field acceptance",
        "field rejection",
        "manual correction",
        "status change",
        "settings update",
      ],
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    userEmail: {
      type: String,
      default: "",
      index: true,
    },
    userRole: {
      type: String,
      default: "",
      index: true,
    },
    department: {
      type: String,
      required: true,
      default: "MCA",
      index: true,
    },
    resourceType: {
      type: String,
      default: "",
    },
    resourceId: {
      type: String,
      default: "",
    },
    details: {
      type: Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      enum: ["SUCCESS", "FAILURE"],
      default: "SUCCESS",
      index: true,
    },
    ipAddress: {
      type: String,
      default: "",
    },
    userAgent: {
      type: String,
      default: "",
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const AuditLog: Model<IAuditLog> =
  mongoose.models.AuditLog || mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);

