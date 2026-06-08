"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEmployeeMonthlyLogs = exports.getTodayTotalSeconds = exports.getCompanyTimeLogs = exports.getTimeSessions = exports.getStats = exports.getTodaySession = exports.clockOut = exports.clockIn = void 0;
const TimeSession_1 = __importDefault(require("../models/TimeSession"));
const mongoose_1 = __importDefault(require("mongoose"));
// ✅ FIXED: Standardize ID extraction to match your generateToken utility
const getUserId = (req) => {
    const user = req.user;
    // Your generateToken uses { userId }, so we must check that first!
    return user?.userId || user?.id || user?._id;
};
// Helper to extract company ID from token
const getCompanyId = (req) => {
    const user = req.user;
    return user?.companyId || user?.company;
};
// Format time as HH:MM AM/PM
const formatTime = (date) => {
    if (!date)
        return "-";
    return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
    });
};
/**
 * Helper to format seconds into HH:mm:ss
 */
const formatDuration = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return [hours, minutes, seconds]
        .map((val) => val.toString().padStart(2, "0"))
        .join(":");
};
const getTodayDate = () => {
    const today = new Date();
    const offset = today.getTimezoneOffset();
    const localDate = new Date(today.getTime() - offset * 60 * 1000);
    return localDate.toISOString().split("T")[0];
};
// ================= CLOCK IN =================
const clockIn = async (req, res) => {
    try {
        const userId = getUserId(req);
        // 1. Get the company ID from the header you are sending
        const companyId = req.headers["x-company-id"] || req.user?.companyId;
        if (!userId)
            return res.status(401).json({ success: false, message: "User ID missing" });
        // 2. Catch it here before Mongoose fails
        if (!companyId) {
            return res.status(400).json({ success: false, message: "Company ID is missing in headers" });
        }
        const todayDate = getTodayDate();
        let session = await TimeSession_1.default.findOne({ user: userId, isActive: true });
        if (session) {
            return res.json({ success: true, message: "Already clocked in.", session });
        }
        // 3. ✅ ADD THE COMPANY FIELD HERE
        session = await TimeSession_1.default.create({
            user: new mongoose_1.default.Types.ObjectId(userId),
            company: new mongoose_1.default.Types.ObjectId(companyId), // THIS IS THE FIX
            date: todayDate,
            clockIn: new Date(),
            isActive: true,
        });
        res.json({ success: true, message: "Clock-in successful", session });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.clockIn = clockIn;
// ================= CLOCK OUT (Hubstaff/Workfolio Style) =================
const clockOut = async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId)
            return res.status(401).json({ success: false, message: "User ID missing in token" });
        const { totalWorkedSeconds } = req.body || {};
        const session = await TimeSession_1.default.findOne({
            user: new mongoose_1.default.Types.ObjectId(userId),
            isActive: true,
        });
        if (!session) {
            return res.status(404).json({ success: false, message: "No active session found" });
        }
        const clockOutTime = new Date();
        session.clockOut = clockOutTime;
        session.isActive = false;
        // Assignment happens here
        session.totalDuration = totalWorkedSeconds ?? Math.floor((clockOutTime.getTime() - session.clockIn.getTime()) / 1000);
        await session.save();
        // TS Fix applied here using (session.totalDuration || 0)
        res.json({
            success: true,
            message: "Clock-out successful",
            workedMinutes: Math.floor((session.totalDuration || 0) / 60),
            session
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.clockOut = clockOut;
// ================= GET TODAY SESSION =================
const getTodaySession = async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId)
            return res.status(401).json({ success: false, message: "Unauthorized" });
        const todayDate = getTodayDate();
        const session = await TimeSession_1.default.findOne({
            user: userId,
            date: todayDate,
        });
        res.json({ success: true, session });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getTodaySession = getTodaySession;
// ================= TODAY + YESTERDAY TOTAL STATS =================
const getStats = async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({ success: false, message: "User ID missing" });
        }
        const formatDuration = (totalSeconds) => {
            const hrs = Math.floor(totalSeconds / 3600);
            const mins = Math.floor((totalSeconds % 3600) / 60);
            const secs = totalSeconds % 60;
            return `${hrs.toString().padStart(2, "0")}:${mins
                .toString()
                .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
        };
        // ---------- TODAY ----------
        const todayDate = getTodayDate();
        // ---------- YESTERDAY ----------
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const offset = yesterday.getTimezoneOffset();
        const localYesterday = new Date(yesterday.getTime() - offset * 60 * 1000);
        const yesterdayDate = localYesterday.toISOString().split("T")[0];
        // ---------- THIS WEEK ----------
        const now = new Date();
        const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() + diffToMonday);
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(); // up to now
        // ---------- LAST MONTH ----------
        const startOfLastMonth = new Date();
        startOfLastMonth.setMonth(startOfLastMonth.getMonth() - 1);
        startOfLastMonth.setDate(1);
        startOfLastMonth.setHours(0, 0, 0, 0);
        const endOfLastMonth = new Date();
        endOfLastMonth.setDate(0);
        endOfLastMonth.setHours(23, 59, 59, 999);
        // ---------- FETCH DATA ----------
        const sessions = await TimeSession_1.default.find({
            user: userId,
            isActive: false,
        });
        // ---------- CALCULATIONS ----------
        let todaySeconds = 0;
        let yesterdaySeconds = 0;
        let weekSeconds = 0;
        let lastMonthSeconds = 0;
        sessions.forEach((s) => {
            const duration = s.totalDuration || 0;
            // Today
            if (s.date === todayDate) {
                todaySeconds += duration;
            }
            // Yesterday
            if (s.date === yesterdayDate) {
                yesterdaySeconds += duration;
            }
            // This Week
            if (s.clockIn) {
                const clockInTime = new Date(s.clockIn);
                if (clockInTime >= startOfWeek && clockInTime <= endOfWeek) {
                    weekSeconds += duration;
                }
                // Last Month
                if (clockInTime >= startOfLastMonth && clockInTime <= endOfLastMonth) {
                    lastMonthSeconds += duration;
                }
            }
        });
        return res.json({
            success: true,
            // Raw seconds
            todaySeconds,
            yesterdaySeconds,
            weekSeconds,
            lastMonthSeconds,
            // Formatted
            today: formatDuration(todaySeconds),
            yesterday: formatDuration(yesterdaySeconds),
            thisWeek: formatDuration(weekSeconds),
            lastMonth: formatDuration(lastMonthSeconds),
        });
    }
    catch (error) {
        console.error("❌ Stats Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.getStats = getStats;
const getTimeSessions = async (req, res) => {
    try {
        const requesterId = getUserId(req);
        const companyId = getCompanyId(req);
        if (!requesterId || !companyId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized: Missing token info",
            });
        }
        // Optional filters
        const { userId, status, startDate, endDate } = req.query;
        // ✅ Company Restriction Query
        const query = {
            company: companyId,
        };
        // Filter by specific employee
        if (userId)
            query.user = userId;
        // Active/inactive filter
        if (status)
            query.isActive = status === "active" ? true : false;
        // Date range filter
        if (startDate || endDate)
            query.clockIn = {};
        if (startDate)
            query.clockIn.$gte = new Date(startDate);
        if (endDate)
            query.clockIn.$lte = new Date(endDate);
        // ✅ Fetch sessions
        const sessions = await TimeSession_1.default.find(query)
            .populate({
            path: "user",
            select: "name email teamName status",
        })
            .sort({ clockIn: -1 });
        // Format Response
        const formattedSessions = sessions.map((s) => {
            const user = s.user;
            const clockIn = s.clockIn ? new Date(s.clockIn) : null;
            const clockOut = s.clockOut ? new Date(s.clockOut) : null;
            const durationSeconds = s.totalDuration ??
                (clockIn && clockOut
                    ? Math.floor((clockOut.getTime() - clockIn.getTime()) / 1000)
                    : 0);
            return {
                id: s._id,
                user: {
                    id: user?._id,
                    name: user?.name,
                    email: user?.email,
                    department: user?.teamName || "N/A",
                    status: user?.status || "Unknown",
                },
                clockIn: clockIn?.toISOString(),
                clockOut: clockOut?.toISOString(),
                duration: durationSeconds,
                durationFormatted: new Date(durationSeconds * 1000)
                    .toISOString()
                    .substr(11, 8),
                isActive: s.isActive,
            };
        });
        return res.json({
            success: true,
            count: formattedSessions.length,
            sessions: formattedSessions,
        });
    }
    catch (error) {
        console.error("❌ getTimeSessions Error:", error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
exports.getTimeSessions = getTimeSessions;
const getCompanyTimeLogs = async (req, res) => {
    try {
        const companyId = req.headers["x-company-id"];
        if (!companyId) {
            return res.status(401).json({ success: false, message: "Unauthorized: Company ID missing" });
        }
        const { startDate, endDate, status } = req.query;
        const companyObjectId = new mongoose_1.default.Types.ObjectId(companyId);
        // 1. Initial Match: Filter by Company first for performance
        const matchQuery = { company: companyObjectId };
        // 2. Status Filter
        if (status === "active")
            matchQuery.isActive = true;
        if (status === "completed")
            matchQuery.isActive = false;
        // 3. DATE FILTER LOGIC
        if (startDate || endDate) {
            // If user picks a range, we filter the clockIn DATE OBJECT
            matchQuery.clockIn = {};
            if (startDate) {
                const start = new Date(startDate);
                start.setHours(0, 0, 0, 0);
                matchQuery.clockIn.$gte = start;
            }
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                matchQuery.clockIn.$lte = end;
            }
        }
        else {
            // DEFAULT: Use the DATE STRING ("YYYY-MM-DD") to match your other API logic
            const todayStr = new Date().toISOString().split('T')[0];
            matchQuery.date = todayStr;
        }
        // 4. Aggregation Pipeline (Matches your working "Hours" API logic)
        // ... (company and status logic stays the same)
        // 3. DATE FILTER LOGIC - Simplified to match your DB string format
        if (startDate) {
            // If startDate is "2026-03-11T...", split it to get "2026-03-11"
            const filterDate = new Date(startDate).toISOString().split('T')[0];
            matchQuery.date = filterDate;
        }
        else {
            // DEFAULT: Today's date string
            const todayStr = new Date().toISOString().split('T')[0];
            matchQuery.date = todayStr;
        }
        const logs = await TimeSession_1.default.aggregate([
            { $match: matchQuery },
            {
                $project: {
                    user: 1,
                    clockIn: 1,
                    clockOut: 1,
                    isActive: 1,
                    // LIVE CALCULATION (Keep this, it's correct)
                    duration: {
                        $cond: {
                            if: { $or: [{ $eq: ["$totalDuration", 0] }, { $not: ["$totalDuration"] }] },
                            then: { $divide: [{ $subtract: [new Date(), "$clockIn"] }, 1000] },
                            else: "$totalDuration",
                        },
                    },
                },
            },
            {
                $group: {
                    _id: "$user",
                    firstClockIn: { $min: "$clockIn" },
                    lastClockOut: { $max: "$clockOut" },
                    totalSeconds: { $sum: "$duration" },
                    isActive: { $max: { $cond: ["$isActive", 1, 0] } }
                },
            },
            {
                $lookup: {
                    from: "users",
                    localField: "_id",
                    foreignField: "_id",
                    as: "userDetails",
                },
            },
            { $unwind: "$userDetails" },
            {
                $project: {
                    id: "$_id",
                    employeeName: "$userDetails.name",
                    employeeEmail: "$userDetails.email",
                    team: "$userDetails.teamName",
                    clockIn: "$firstClockIn",
                    clockOut: "$lastClockOut",
                    duration: "$totalSeconds",
                    isActive: { $eq: ["$isActive", 1] }
                }
            },
            { $sort: { clockIn: -1 } }
        ]);
        // 5. Final Formatting
        const formattedLogs = logs.map(log => ({
            ...log,
            durationFormatted: formatDuration(log.duration)
        }));
        return res.json({ success: true, count: formattedLogs.length, logs: formattedLogs });
    }
    catch (error) {
        console.error("❌ Filter Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.getCompanyTimeLogs = getCompanyTimeLogs;
// backend/controllers/timeController.ts
const getTodayTotalSeconds = async (req, res) => {
    try {
        const userId = getUserId(req);
        const todayDate = getTodayDate();
        // Find all sessions for today
        const sessions = await TimeSession_1.default.find({ user: userId, date: todayDate });
        let totalSeconds = 0;
        let activeSessionStart = null;
        sessions.forEach((s) => {
            if (s.isActive && s.clockIn) {
                // We found the live session
                activeSessionStart = s.clockIn;
            }
            else {
                // Add completed sessions
                totalSeconds += (s.totalDuration || 0);
            }
        });
        res.json({
            success: true,
            totalSeconds, // Completed time
            activeSessionStart // When the current one started
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getTodayTotalSeconds = getTodayTotalSeconds;
// ================= MONTHLY EMPLOYEE DAILY LOGS + SCREENSHOTS =================
const getEmployeeMonthlyLogs = async (req, res) => {
    try {
        const { employeeId, month, year } = req.query;
        if (!employeeId || !month || !year) {
            return res.status(400).json({
                success: false,
                message: "employeeId, month and year are required",
            });
        }
        const monthNumber = Number(month) - 1;
        const yearNumber = Number(year);
        const startDate = new Date(yearNumber, monthNumber, 1);
        const endDate = new Date(yearNumber, monthNumber + 1, 0, 23, 59, 59);
        const logs = await TimeSession_1.default.aggregate([
            {
                $match: {
                    user: new mongoose_1.default.Types.ObjectId(employeeId),
                    clockIn: { $gte: startDate, $lte: endDate },
                    isActive: false,
                },
            },
            {
                $addFields: {
                    dateOnly: {
                        $dateToString: { format: "%Y-%m-%d", date: "$clockIn" },
                    },
                },
            },
            {
                $group: {
                    _id: "$dateOnly",
                    firstClockIn: { $min: "$clockIn" },
                    lastClockOut: { $max: "$clockOut" },
                    totalSeconds: { $sum: { $ifNull: ["$totalDuration", 0] } },
                },
            },
            // 🔥 LOOKUP screenshots for that day
            {
                $lookup: {
                    from: "screenshots", // collection name in MongoDB
                    let: { date: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                userId: new mongoose_1.default.Types.ObjectId(employeeId),
                            },
                        },
                        {
                            $addFields: {
                                screenshotDate: {
                                    $dateToString: { format: "%Y-%m-%d", date: "$takenAt" },
                                },
                            },
                        },
                        {
                            $match: {
                                $expr: { $eq: ["$screenshotDate", "$$date"] },
                            },
                        },
                        {
                            $project: {
                                _id: 1,
                                imageUrl: 1,
                                takenAt: 1,
                            },
                        },
                    ],
                    as: "screenshots",
                },
            },
            { $sort: { _id: -1 } },
        ]);
        return res.json({
            success: true,
            count: logs.length,
            logs: logs.map((log) => ({
                date: log._id,
                clockIn: log.firstClockIn,
                clockOut: log.lastClockOut,
                totalSeconds: log.totalSeconds,
                totalFormatted: new Date(log.totalSeconds * 1000)
                    .toISOString()
                    .substr(11, 8),
                screenshots: log.screenshots || [],
            })),
        });
    }
    catch (error) {
        console.error("❌ getEmployeeMonthlyLogs Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
exports.getEmployeeMonthlyLogs = getEmployeeMonthlyLogs;
