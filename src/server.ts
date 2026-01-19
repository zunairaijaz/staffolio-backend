import express from "express";
import dotenv from "dotenv";
import authRoutes from "./modules/auth/auth.routes";

dotenv.config();

const app = express();

app.use(express.json());

// routes
app.use("/api/auth", authRoutes);

// health check (VERY useful)
app.get("/", (_req, res) => {
  res.send("API is running 🚀");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
