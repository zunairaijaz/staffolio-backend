import { Router } from "express";
import { clockIn, clockOut, getTimeSessions, getTodaySession } from "../controllers/timeSession.controller";
import { authGuard } from "../middlewares/authGuard";
import { getStats } from "../controllers/timeSession.controller";

const router = Router();

router.post("/clock-in", authGuard, clockIn);
router.post("/clock-out", authGuard, clockOut);
router.get("/today", authGuard, getTodaySession);
router.get("/stats/today-yesterday", authGuard, getStats);
router.get("/sessions", authGuard, getTimeSessions);

export default router;
