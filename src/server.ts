import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/db";
import authRoutes from "./routes/auth.routes";
import cors from "cors"; 
import timeSessionRoutes from "./routes/timeSession.routes";
import userRoutes from "./routes/user.routes";
import screenshotRoutes from './routes/screenshots.routes';
import activityRoutes from "./routes/activity.routes";
import teamRoutes from "./routes/team.routes";
import companyRoutes from "./routes/company.routes";
import reportRoutes from './routes/reports.routes';
dotenv.config();
connectDB();

const app = express();

// Allow cross-origin requests from your frontend
app.use(cors({
  origin: "*", 
  methods: ["GET","POST","PUT","DELETE"],
  credentials: true
}));

app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/time-session", timeSessionRoutes);
app.use("/api/user", userRoutes);
app.use('/api/screenshots', screenshotRoutes);
app.use("/api/activity", activityRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/company", companyRoutes);
app.use('/api/reports', reportRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
