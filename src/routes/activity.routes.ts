// routes/activity.ts
import express from "express";
import { logActivity, getUsageStats, getWeeklyPerformance, getLast7DaysActivity } from "../controllers/activity.controller";
const router = express.Router();
router.post("/log", logActivity);         
router.get("/stats/:userId", getUsageStats); 
router.get("/performance/:userId", getWeeklyPerformance); 
router.get("/weekly/:userId", getLast7DaysActivity); 


export default router;
