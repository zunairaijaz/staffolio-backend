import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "./config/db";
import authRoutes from "./routes/auth.routes";
import cors, { CorsOptions } from "cors";
import timeSessionRoutes from "./routes/timeSession.routes";
import userRoutes from "./routes/user.routes";
import screenshotRoutes from "./routes/screenshots.routes";
import activityRoutes from "./routes/activity.routes";
import teamRoutes from "./routes/team.routes";
import companyRoutes from "./routes/company.routes";
import reportRoutes from "./routes/reports.routes";
import dashboardRoutes from "./routes/dashboard.routes";

dotenv.config();

const app = express();

const allowedOrigins = (process.env.CORS_ORIGINS ??
  "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001,https://staffolio.corbissoft.com,https://www.staffolio.corbissoft.com,https://staffolioadmin.corbissoft.com")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions: CorsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(null, false);
    }
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-company-id"],
  credentials: true,
};

if (process.env.IIS_MANAGES_CORS !== "true") {
  app.use(cors(corsOptions));
  app.options(/.*/, cors(corsOptions));
}

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/", (_req, res) => {
  res.json({ status: "ok", message: "Staffolio API is running" });
});

app.get("/api/health", async (_req, res) => {
  let companies = 0;
  let users = 0;

  try {
    const db = mongoose.connection.db;
    if (db) {
      companies = await db.collection("companies").countDocuments();
      users = await db.collection("users").countDocuments();
    }
  } catch {
    // ignore count errors on health check
  }

  res.json({
    status: "ok",
    message: "Staffolio API is running",
    db: mongoose.connection.readyState,
    database: mongoose.connection.name,
    companies,
    users,
    jwt: Boolean(process.env.JWT_ACCESS_SECRET),
  });
});

app.post("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    message: "POST routing works",
    db: mongoose.connection.readyState,
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/time-session", timeSessionRoutes);
app.use("/api/user", userRoutes);
app.use("/api/screenshots", screenshotRoutes);
app.use("/api/activity", activityRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/company", companyRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/dashboard", dashboardRoutes);

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
  });
