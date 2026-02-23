
import { Router } from "express";
import { getAppUsageReport, getAttendanceReport, getMonthlyLogsReport } from "../controllers/reports.controller";

const router = Router();
router.get("/app-usage", getAppUsageReport);
router.get("/monthly-logs", getMonthlyLogsReport);
router.get("/monthly-attendance", getAttendanceReport);

export default router;