import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  phone?: string;
  password: string;

  countryCode?: string;
  teamName?: string;
  dateOfBirth?: Date;

  otp?: string;
  otpExpiry?: Date;
  isVerified: boolean;

  role: "ADMIN" | "EMPLOYEE";
  status: "ACTIVE" | "INACTIVE";

  lastLogin?: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    phone: {
      type: String,
      unique: true,
      sparse: true,
    },

    countryCode: {
      type: String,
      trim: true,
    },

    teamName: {
      type: String,
      trim: true,
    },

    dateOfBirth: {
      type: Date,
    },

    password: {
      type: String,
      required: true,
    },

    otp: String,
    otpExpiry: Date,

    isVerified: {
      type: Boolean,
      default: false,
    },
 role: {
  type: String,
  enum: ['ADMIN', 'TEAM_LEAD', 'MANAGER', 'EMPLOYEE'],
  default: 'EMPLOYEE',
  required: true,
},
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
    },

    lastLogin: Date,
  },
  { timestamps: true }
);

export default mongoose.model<IUser>("User", userSchema);
