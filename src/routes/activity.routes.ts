// routes/activity.ts
import express from "express";
import { logActivity, getUsageStats } from "../controllers/activity.controller";

const router = express.Router();
router.post("/log", logActivity);         
router.get("/stats/:userId", getUsageStats); 


export default router;
