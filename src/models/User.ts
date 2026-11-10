import mongoose, { Schema, Document, Model } from "mongoose";

export type UserRole =
  | "DEPARTMENT_ADMIN"
  | "FACULTY_CONTRIBUTOR"
  | "REVIEWER"
  | "VIEWER";

export type UserStatus = "ACTIVE" | "INVITED" | "DISABLED";

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  department: string;
  employeeId?: string;
  studentId?: string;
  status: UserStatus;
  lastLoginAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters long"],
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    email: {
      type: String,
      required: [true, "Institutional email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid institutional email address"],
      index: true,
    },
    passwordHash: {
      type: String,
      required: [true, "Password hash is required"],
      select: false, // Never return password hash in queries by default
    },
    role: {
      type: String,
      required: [true, "Role is required"],
      enum: {
        values: ["DEPARTMENT_ADMIN", "FACULTY_CONTRIBUTOR", "REVIEWER", "VIEWER"],
        message: "{VALUE} is not a valid user role",
      },
      index: true,
    },
    department: {
      type: String,
      required: [true, "Department is required"],
      default: "MCA",
      enum: ["MCA"],
    },
    employeeId: {
      type: String,
      trim: true,
      sparse: true,
      index: true,
    },
    studentId: {
      type: String,
      trim: true,
      sparse: true,
      index: true,
    },
    status: {
      type: String,
      required: [true, "Status is required"],
      enum: {
        values: ["ACTIVE", "INVITED", "DISABLED"],
        message: "{VALUE} is not a valid user status",
      },
      default: "ACTIVE",
      index: true,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Validation: user must have either employeeId or studentId
UserSchema.pre("validate", function (next) {
  if (!this.employeeId && !this.studentId) {
    this.invalidate("employeeId", "Either Employee ID or Student ID must be provided");
  }
  next();
});

export const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

