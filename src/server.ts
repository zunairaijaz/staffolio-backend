import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/db";
import authRoutes from "./routes/auth.routes";
import cors from "cors"; // <-- import cors

dotenv.config();
connectDB();

const app = express();

// Allow cross-origin requests from your frontend
app.use(cors({
  origin: "*", // for testing only; later replace "*" with your frontend URL
  methods: ["GET","POST","PUT","DELETE"],
  credentials: true
}));

app.use(express.json());
app.use("/api/auth", authRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
