import mongoose, { Schema, Document, Model, Types } from "mongoose";
import { UserRole } from "./User";

export interface ISession extends Document {
  token: string;
  userId: Types.ObjectId;
  role: UserRole;
  department: string;
  userAgent?: string;
  ipAddress?: string;
  expiresAt: Date;
  createdAt: Date;
}

const SessionSchema = new Schema<ISession>(
  {
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    role: {
      type: String,
      required: true,
      enum: ["DEPARTMENT_ADMIN", "FACULTY_CONTRIBUTOR", "REVIEWER", "VIEWER"],
    },
    department: {
      type: String,
      required: true,
      default: "MCA",
    },
    userAgent: {
      type: String,
      default: "",
    },
    ipAddress: {
      type: String,
      default: "",
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // TTL index: MongoDB automatically removes document upon expiration
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export const Session: Model<ISession> =
  mongoose.models.Session || mongoose.model<ISession>("Session", SessionSchema);

