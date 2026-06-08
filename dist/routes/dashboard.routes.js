"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authGuard_1 = require("../middlewares/authGuard");
const dashboard_controller_1 = require("../controllers/dashboard.controller");
const router = express_1.default.Router();
router.get("/engagement-trends", authGuard_1.authGuard, dashboard_controller_1.getEngagementTrends);
router.get("/active-state", authGuard_1.authGuard, dashboard_controller_1.getActiveState);
exports.default = router;
