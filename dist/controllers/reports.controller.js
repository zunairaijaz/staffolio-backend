"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAttendanceReport = exports.getMonthlyLogsReport = exports.getAppUsageReport = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const ActivityLog_1 = __importDefault(require("../models/ActivityLog"));
const TimeSession_1 = __importDefault(require("../models/TimeSession"));
const getAppUsageReport = async (req, res) => {
    try {
        const { employeeId, startDate, endDate, interval = "daily" } = req.query;
        const match = {};
        if (employeeId) {
            match.user = new mongoose_1.default.Types.ObjectId(employeeId);
        }
        if (startDate && endDate) {
            match.date = { $gte: startDate, $lte: endDate };
        }
        // Determine the date format for grouping based on interval
        let dateGroupId;
        switch (interval) {
            case "weekly":
                dateGroupId = { $dateToString: { format: "%Y-W%V", date: { $toDate: "$date" } } };
                break;
            case "monthly":
                dateGroupId = { $dateToString: { format: "%Y-%m", date: { $toDate: "$date" } } };
                break;
            default: dateGroupId = "$date"; // Daily
        }
        const reportData = await ActivityLog_1.default.aggregate([
            { $match: match },
            {
                $group: {
                    _id: {
                        user: "$user",
                        interval: dateGroupId,
                        appName: "$appName"
                    },
                    appSeconds: { $sum: "$duration" },
                    // Assuming you have these fields for activity levels
                    avgMouseClick: { $avg: "$mouseClickCount" },
                    avgKeyCount: { $avg: "$keyboardKeyCount" }
                }
            },
            {
                $group: {
                    _id: { user: "$_id.user", interval: "$_id.interval" },
                    totalIntervalSeconds: { $sum: "$appSeconds" },
                    apps: {
                        $push: {
                            name: "$_id.appName",
                            hours: { $divide: ["$appSeconds", 3600] },
                            percentage: "$appSeconds" // We will calculate this in next stage
                        }
                    },
                    avgActivity: { $avg: { $add: ["$avgMouseClick", "$avgKeyCount"] } }
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "_id.user",
                    foreignField: "_id",
                    as: "userDetails"
                }
            },
            { $unwind: "$userDetails" },
            {
                $project: {
                    _id: 0,
                    employeeName: "$userDetails.name",
                    interval: "$_id.interval",
                    totalHours: { $divide: ["$totalIntervalSeconds", 3600] },
                    activityScore: "$avgActivity",
                    appBreakdown: "$apps"
                }
            },
            { $sort: { interval: -1 } }
        ]);
        return res.status(200).json({
            success: true,
            data: reportData,
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};
exports.getAppUsageReport = getAppUsageReport;
// Import the correct model
const getMonthlyLogsReport = async (req, res) => {
    try {
        const { employeeId, startDate, endDate } = req.query;
        const match = {};
        if (employeeId) {
            match.user = new mongoose_1.default.Types.ObjectId(employeeId);
        }
        // Filter by the 'clockIn' Date object
        if (startDate && endDate) {
            match.clockIn = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }
        const logs = await TimeSession_1.default.aggregate([
            { $match: match },
            {
                $group: {
                    _id: {
                        user: "$user",
                        day: "$date", // Using your 'YYYY-MM-DD' string field
                    },
                    // Pulling the actual values from your TimeSession schema
                    clockIn: { $min: "$clockIn" },
                    clockOut: { $max: "$clockOut" },
                    totalSeconds: { $sum: "$totalDuration" },
                },
            },
            {
                $lookup: {
                    from: "users", // Ensure your collection name is 'users'
                    localField: "_id.user",
                    foreignField: "_id",
                    as: "userDetails",
                },
            },
            { $unwind: "$userDetails" },
            {
                $project: {
                    _id: 0,
                    employeeId: "$_id.user",
                    name: "$userDetails.name",
                    email: "$userDetails.email",
                    date: "$_id.day",
                    clockIn: 1,
                    clockOut: 1,
                    totalHours: {
                        $divide: [{ $ifNull: ["$totalSeconds", 0] }, 3600]
                    },
                },
            },
            { $sort: { date: -1 } },
        ]);
        return res.status(200).json({ success: true, data: logs });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.getMonthlyLogsReport = getMonthlyLogsReport;
const getAttendanceReport = async (req, res) => {
    try {
        const { employeeId } = req.query;
        if (!employeeId) {
            return res.status(400).json({ success: false, message: "Employee ID is required" });
        }
        // 1. Calculate Date Range (1st of current month to Now)
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        const match = {
            user: new mongoose_1.default.Types.ObjectId(employeeId),
            clockIn: { $gte: startOfMonth, $lte: endOfToday }
        };
        const logs = await TimeSession_1.default.aggregate([
            { $match: match },
            {
                $group: {
                    _id: {
                        user: "$user",
                        day: "$date", // Uses your YYYY-MM-DD string
                    },
                    clockIn: { $min: "$clockIn" },
                    clockOut: { $max: "$clockOut" },
                    totalSeconds: { $sum: "$totalDuration" },
                },
            },
            {
                $lookup: {
                    from: "users",
                    localField: "_id.user",
                    foreignField: "_id",
                    as: "userDetails",
                },
            },
            { $unwind: "$userDetails" },
            {
                $project: {
                    _id: 0,
                    clockIn: 1,
                    clockOut: 1,
                    employeeId: "$_id.user",
                    name: "$userDetails.name",
                    email: "$userDetails.email",
                    date: "$_id.day",
                    totalHours: {
                        $divide: [{ $ifNull: ["$totalSeconds", 0] }, 3600]
                    },
                },
            },
            { $sort: { date: -1 } },
        ]);
        // Matches your requested response format exactly
        return res.status(200).json({ success: true, data: logs });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.getAttendanceReport = getAttendanceReport;
