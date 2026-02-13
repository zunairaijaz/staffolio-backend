import { Response } from "express";
import TimeSession from "../models/TimeSession";
import { AuthRequest } from "../middlewares/authGuard";
import mongoose from "mongoose";

// ✅ FIXED: Standardize ID extraction to match your generateToken utility
const getUserId = (req: AuthRequest) => {
  const user = req.user as any;
  // Your generateToken uses { userId }, so we must check that first!
  return user?.userId || user?.id || user?._id; 
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
    const userId = (req.user as any).id;
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
    // Optional: only admin or manager can access all sessions
    const requesterId = getUserId(req);
    if (!requesterId) return res.status(401).json({ success: false, message: "Unauthorized" });

    // Optional: filter by user, department, status, or date range
    const { userId, department, status, startDate, endDate } = req.query;

    // Build query dynamically
    const query: any = {};
    if (userId) query.user = userId;
    if (status) query.isActive = status === "active" ? true : false;
    if (startDate || endDate) query.clockIn = {};
    if (startDate) query.clockIn.$gte = new Date(startDate as string);
    if (endDate) query.clockIn.$lte = new Date(endDate as string);

    // Fetch sessions with user info
    const sessions = await TimeSession.find(query)
      .populate({
        path: "user",
        select: "name email department status", // Add any other fields
      })
      .sort({ clockIn: -1 });

    // Map to include in/out duration and clean format
    const formattedSessions = sessions.map((s) => {
      const user = (s.user as any) || {};
      const clockIn = s.clockIn ? new Date(s.clockIn) : null;
      const clockOut = s.clockOut ? new Date(s.clockOut) : null;
      const durationSeconds =
        s.totalDuration ??
        (clockIn && clockOut ? Math.floor((clockOut.getTime() - clockIn.getTime()) / 1000) : 0);

      return {
        id: s._id,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          department: user.teamName || "N/A",
          status: user.status || "Unknown",
        },
        clockIn: clockIn?.toISOString() || null,
        clockOut: clockOut?.toISOString() || null,
        duration: durationSeconds, // seconds
        durationFormatted: `${Math.floor(durationSeconds / 3600)
          .toString()
          .padStart(2, "0")}:${Math.floor((durationSeconds % 3600) / 60)
          .toString()
          .padStart(2, "0")}:${(durationSeconds % 60).toString().padStart(2, "0")}`,
        isActive: s.isActive,
      };
    });

    res.json({ success: true, sessions: formattedSessions });
  } catch (error: any) {
    console.error("❌ getTimeSessions Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
