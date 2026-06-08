"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// routes/activity.ts
const express_1 = __importDefault(require("express"));
const activity_controller_1 = require("../controllers/activity.controller");
const router = express_1.default.Router();
router.post("/log", activity_controller_1.logActivity);
router.get("/stats/:userId", activity_controller_1.getUsageStats);
router.get("/performance/:userId", activity_controller_1.getWeeklyPerformance);
router.get("/weekly/:userId", activity_controller_1.getLast7DaysActivity);
exports.default = router;
