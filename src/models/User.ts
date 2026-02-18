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
  company: mongoose.Types.ObjectId; // Reference to Company
  role: "ADMIN" | "TEAM_LEAD" | "MANAGER" | "EMPLOYEE";
  status: "ACTIVE" | "INACTIVE" | "ON_LEAVE";
  lastLogin?: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    
    // ⬇️ THIS IS THE FIX: Explicitly define the relationship ⬇️
    company: { 
      type: Schema.Types.ObjectId, 
      ref: 'Company', 
      required: true 
    },

    role: {
      type: String,
      enum: ['ADMIN', 'TEAM_LEAD', 'MANAGER', 'EMPLOYEE'],
      default: 'EMPLOYEE',
      required: true,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE", "ON_LEAVE"],
      default: "ACTIVE",
    },
    phone: { type: String, unique: true, sparse: true },
    countryCode: { type: String, trim: true },
    teamName: { type: String, trim: true },
    dateOfBirth: { type: Date },
    otp: String,
    otpExpiry: Date,
    isVerified: { type: Boolean, default: false },
    lastLogin: Date,
  },
  { timestamps: true }
);

export default mongoose.model<IUser>("User", userSchema);
