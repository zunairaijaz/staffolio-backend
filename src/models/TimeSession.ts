import mongoose, { Schema, Document } from "mongoose";

export interface ITimeSession extends Document {
  user: mongoose.Types.ObjectId;
  clockIn: Date;
  clockOut?: Date;
  totalDuration?: number; // in seconds
  date: string; // YYYY-MM-DD
  company: mongoose.Types.ObjectId,
  isActive: boolean;
  screenshots?: {
  imageUrl: string;
  takenAt: Date;
}[];
}

const timeSessionSchema = new Schema<ITimeSession>(
{
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  company: { type: Schema.Types.ObjectId, ref: "Company", required: true },
  clockIn: { type: Date, required: true },
  clockOut: { type: Date },
  totalDuration: { type: Number },
  date: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  screenshots: [
    {
      imageUrl: { type: String },
      takenAt: { type: Date, default: Date.now },
    },
  ],
},
{ timestamps: true }
);

export default mongoose.model<ITimeSession>("TimeSession", timeSessionSchema);
