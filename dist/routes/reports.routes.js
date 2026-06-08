"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const reports_controller_1 = require("../controllers/reports.controller");
const router = (0, express_1.Router)();
router.get("/app-usage", reports_controller_1.getAppUsageReport);
router.get("/monthly-logs", reports_controller_1.getMonthlyLogsReport);
router.get("/monthly-attendance", reports_controller_1.getAttendanceReport);
exports.default = router;
