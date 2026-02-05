import mongoose, { Schema, Document } from "mongoose";

export interface IActivityLog extends Document {
  user: mongoose.Types.ObjectId;
  appName: string;
  duration: number; // seconds
  date: string; // YYYY-MM-DD
}

const activitySchema = new Schema<IActivityLog>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },

    appName: { type: String, required: true },

    duration: { type: Number, required: true },

    date: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.model<IActivityLog>("ActivityLog", activitySchema);
