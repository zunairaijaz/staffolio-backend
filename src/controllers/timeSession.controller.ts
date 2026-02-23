import { Response } from "express";
import TimeSession from "../models/TimeSession";
import { AuthRequest } from "../middlewares/authGuard";
import mongoose from "mongoose";
import User from "../models/User";
// ✅ FIXED: Standardize ID extraction to match your generateToken utility
const getUserId = (req: AuthRequest) => {
  const user = req.user as any;
  // Your generateToken uses { userId }, so we must check that first!
  return user?.userId || user?.id || user?._id; 
};
// Helper to extract company ID from token
const getCompanyId = (req: AuthRequest) => {
  const user = req.user as any;
  return user?.companyId || user?.company;
};
// Format time as HH:MM AM/PM
const formatTime = (date: Date | null) => {
  if (!date) return "-";
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
};
// Format seconds to HH:MM:SS
const formatDuration = (seconds: number) => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hrs.toString().padStart(2, "0")}:${mins
    .toString()
    .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};
const getTodayDate = () => {
  const today = new Date();
  const offset = today.getTimezoneOffset();
  const localDate = new Date(today.getTime() - offset * 60 * 1000);
  return localDate.toISOString().split("T")[0];
};

// ================= CLOCK IN =================
export const clockIn = async (req: AuthRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: "User ID missing in token" });

    const todayDate = getTodayDate();
    const activeSession = await TimeSession.findOne({ user: userId, isActive: true });

    if (activeSession) {
      return res.status(400).json({ success: false, message: "Already clocked in" });
    }

    const session = await TimeSession.create({
      user: new mongoose.Types.ObjectId(userId),
      date: todayDate,
      clockIn: new Date(),
      isActive: true,
    });

    res.json({ success: true, message: "Clock-in successful", session });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ================= CLOCK OUT (Hubstaff/Workfolio Style) =================
export const clockOut = async (req: AuthRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: "User ID missing in token" });

    const { totalWorkedSeconds } = req.body; 

    const session = await TimeSession.findOne({
      user: new mongoose.Types.ObjectId(userId),
      isActive: true,
    });

    if (!session) {
      return res.status(404).json({ success: false, message: "No active session found" });
    }

    const clockOutTime = new Date();
    session.clockOut = clockOutTime;
    session.isActive = false;

    // Assignment happens here
    session.totalDuration = totalWorkedSeconds ?? Math.floor(
      (clockOutTime.getTime() - session.clockIn.getTime()) / 1000
    );

    await session.save();

    // TS Fix applied here using (session.totalDuration || 0)
    res.json({ 
      success: true, 
      message: "Clock-out successful", 
      workedMinutes: Math.floor((session.totalDuration || 0) / 60),
      session 
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ================= GET TODAY SESSION =================
export const getTodaySession = async (req: AuthRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    const todayDate = getTodayDate();

    const session = await TimeSession.findOne({
      user: userId,
      date: todayDate,
    });

    res.json({ success: true, session });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ================= TODAY + YESTERDAY TOTAL STATS =================
export const getStats = async (req: AuthRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: "User ID missing" });
    }

    // ✅ Convert seconds → HH:MM:SS
    const formatDuration = (totalSeconds: number) => {
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

    // ---------- LAST MONTH ----------
    const startOfLastMonth = new Date();
    startOfLastMonth.setMonth(startOfLastMonth.getMonth() - 1);
    startOfLastMonth.setDate(1);
    startOfLastMonth.setHours(0, 0, 0, 0);

    const endOfLastMonth = new Date();
    endOfLastMonth.setDate(0); // last day of previous month
    endOfLastMonth.setHours(23, 59, 59, 999);

    // ---------- FETCH DATA ----------
    const sessions = await TimeSession.find({
      user: userId,
      isActive: false,
    });
    // ---------- CALCULATIONS ----------
    let todaySeconds = 0;
    let yesterdaySeconds = 0;
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

      // Last Month
      if (s.clockIn) {
        const clockInTime = new Date(s.clockIn);

        if (clockInTime >= startOfLastMonth && clockInTime <= endOfLastMonth) {
          lastMonthSeconds += duration;
        }
      }
    });

    // ✅ RETURN FORMATTED RESPONSE
    return res.json({
      success: true,

      // Raw seconds (optional)
      todaySeconds,
      yesterdaySeconds,
      lastMonthSeconds,

      // ✅ Formatted values
      today: formatDuration(todaySeconds),
      yesterday: formatDuration(yesterdaySeconds),
      lastMonth: formatDuration(lastMonthSeconds),
    });
  } catch (error: any) {
    console.error("❌ Stats Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getTimeSessions = async (req: AuthRequest, res: Response) => {
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
    const query: any = {
      company: companyId,
    };

    // Filter by specific employee
    if (userId) query.user = userId;

    // Active/inactive filter
    if (status)
      query.isActive = status === "active" ? true : false;

    // Date range filter
    if (startDate || endDate) query.clockIn = {};
    if (startDate) query.clockIn.$gte = new Date(startDate as string);
    if (endDate) query.clockIn.$lte = new Date(endDate as string);

    // ✅ Fetch sessions
    const sessions = await TimeSession.find(query)
      .populate({
        path: "user",
        select: "name email teamName status",
      })
      .sort({ clockIn: -1 });

    // Format Response
    const formattedSessions = sessions.map((s) => {
      const user = s.user as any;

      const clockIn = s.clockIn ? new Date(s.clockIn) : null;
      const clockOut = s.clockOut ? new Date(s.clockOut) : null;

      const durationSeconds =
        s.totalDuration ??
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
  } catch (error: any) {
    console.error("❌ getTimeSessions Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getCompanyTimeLogs = async (req: AuthRequest, res: Response) => {
  try {
    const companyId =  req.headers["x-company-id"];
    if (!companyId) {
      return res.status(401).json({ success: false, message: "Unauthorized: Company ID missing" });
    }

    const { startDate, endDate, status } = req.query;

    // 1️⃣ Get all employees of this company
    const employees = await User.find({ company: companyId }).select("_id name email teamName status role");

    if (!employees.length) {
      return res.json({ success: true, count: 0, logs: [] });
    }

    const employeeIds = employees.map((e) => e._id);

    // 2️⃣ Build TimeSession query for these employees
    const query: any = {
      user: { $in: employeeIds },
      company: companyId, // ✅ Make sure you filter by company too
    };

    // Status filter
    if (status === "active") query.isActive = true;
    if (status === "completed") query.isActive = false;

    // Date range filter
    if (startDate || endDate) query.clockIn = {};
    if (startDate) query.clockIn.$gte = new Date(startDate as string);
    if (endDate) query.clockIn.$lte = new Date(endDate as string);

    // 3️⃣ Fetch sessions and populate user info
    const sessions = await TimeSession.find(query)
      .populate({ path: "user", select: "_id name email teamName status role" })
      .sort({ clockIn: -1 });

    // 4️⃣ Format sessions
    const logs = sessions.map((s) => {
      const user = s.user as any;
      const clockIn = s.clockIn ? new Date(s.clockIn) : null;
      const clockOut = s.clockOut ? new Date(s.clockOut) : null;

      const durationSeconds =
        s.totalDuration ??
        (clockIn && clockOut ? Math.floor((clockOut.getTime() - clockIn.getTime()) / 1000) : 0);

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
        durationFormatted: new Date(durationSeconds * 1000).toISOString().substr(11, 8),
        isActive: s.isActive,
      };
    });

    return res.json({ success: true, count: logs.length, logs });
  } catch (error: any) {
    console.error("❌ getCompanyTimeLogs Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};