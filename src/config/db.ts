import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI not defined in environment");
  }
  await mongoose.connect(process.env.MONGO_URI);
  console.log("MongoDB connected");
};

export default connectDB;
