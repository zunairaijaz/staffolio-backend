import { Router } from "express";
import { clockIn, clockOut, getTodaySession } from "../controllers/timeSession.controller";
import { authGuard } from "../middlewares/authGuard";

const router = Router();

router.post("/clock-in", authGuard, clockIn);
router.post("/clock-out", authGuard, clockOut);
router.get("/today", authGuard, getTodaySession);

export default router;
