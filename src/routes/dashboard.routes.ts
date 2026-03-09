import express from "express";
import { authGuard } from "../middlewares/authGuard";
import { getEngagementTrends, getActiveState } from "../controllers/dashboard.controller";
const router = express.Router();

router.get("/engagement-trends", authGuard, getEngagementTrends);
router.get("/active-state", authGuard, getActiveState);

export default router;
