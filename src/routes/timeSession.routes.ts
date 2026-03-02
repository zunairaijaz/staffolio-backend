import { Router } from "express";
import { clockIn, clockOut, getCompanyTimeLogs, getEmployeeMonthlyLogs, getTimeSessions, getTodaySession, getTodayTotalSeconds } from "../controllers/timeSession.controller";
import { authGuard } from "../middlewares/authGuard";
import { getStats } from "../controllers/timeSession.controller";

const router = Router();

router.post("/clock-in", authGuard, clockIn);
router.post("/clock-out", authGuard, clockOut);
router.get("/today", authGuard, getTodaySession);
router.get("/stats/today-yesterday", authGuard, getStats);
router.get("/sessions", authGuard, getTimeSessions);
router.get("/companySessions", authGuard, getCompanyTimeLogs);
router.get("/today-total", authGuard, getTodayTotalSeconds);
router.get("/monthly-employee-logs", authGuard, getEmployeeMonthlyLogs);
export default router;
