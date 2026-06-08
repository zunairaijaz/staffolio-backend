"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getActiveState = exports.getEngagementTrends = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const TimeSession_1 = __importDefault(require("../models/TimeSession"));
const getEngagementTrends = async (req, res) => {
    try {
        const user = req.user;
        const companyId = user?.company ||
            req.headers["x-company-id"] ||
            req.query.companyId;
        if (!companyId || !mongoose_1.default.Types.ObjectId.isValid(companyId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid company id",
            });
        }
        const today = new Date();
        const last7Days = new Date();
        last7Days.setDate(today.getDate() - 6);
        const startDate = last7Days.toISOString().split("T")[0];
        const endDate = today.toISOString().split("T")[0];
        const sessions = await TimeSession_1.default.aggregate([
            {
                $match: {
                    company: new mongoose_1.default.Types.ObjectId(companyId),
                    date: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $group: {
                    _id: "$date",
                    totalDuration: { $sum: "$totalDuration" },
                    activeUsers: { $addToSet: "$user" }
                }
            },
            {
                $project: {
                    date: "$_id",
                    totalDuration: 1,
                    activeUsers: { $size: "$activeUsers" }
                }
            }
        ]);
        const result = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date(last7Days);
            date.setDate(last7Days.getDate() + i);
            const formatted = date.toISOString().split("T")[0];
            const found = sessions.find((s) => s.date === formatted);
            result.push({
                name: date.toLocaleDateString("en-US", { weekday: "short" }),
                hours: Number(((found?.totalDuration || 0) / 3600).toFixed(2)),
                activeUsers: found?.activeUsers || 0
            });
        }
        return res.json({
            success: true,
            data: result
        });
    }
    catch (err) {
        console.error("Engagement Trends Error:", err);
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};
exports.getEngagementTrends = getEngagementTrends;
const getActiveState = async (req, res) => {
    try {
        const user = req.user;
        const companyId = user?.company ||
            req.headers["x-company-id"] ||
            req.query.companyId;
        if (!companyId || !mongoose_1.default.Types.ObjectId.isValid(companyId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid company id",
            });
        }
        const activeUsers = await TimeSession_1.default.distinct("user", {
            company: companyId,
            isActive: true
        });
        const totalUsers = await mongoose_1.default.model("User").countDocuments({
            company: companyId
        });
        const active = activeUsers.length;
        const idle = totalUsers - active;
        return res.json({
            success: true,
            data: [
                { name: "Active", value: active },
                { name: "Idle", value: idle }
            ]
        });
    }
    catch (err) {
        console.error("Active State Error:", err);
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};
exports.getActiveState = getActiveState;
