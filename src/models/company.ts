import mongoose, { Schema, Document } from "mongoose";

export interface ICompany extends Document {
  name: string;
  email: string;
  password: string;
  phone?: string;
  status: "ACTIVE" | "INACTIVE";
}

const companySchema = new Schema<ICompany>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    phone: { type: String, trim: true },
    status: { type: String, enum: ["ACTIVE", "INACTIVE"], default: "ACTIVE" },
  },
  { timestamps: true }
);

export default mongoose.model<ICompany>("Company", companySchema);
