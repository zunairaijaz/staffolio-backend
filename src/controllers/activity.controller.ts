import { Request, Response } from "express";
import ActivityLog from "../models/ActivityLog";

/* ----------------------------------------
   Helper: Convert seconds → HH:MM:SS
---------------------------------------- */
function formatTime(seconds: number) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  return `${hrs.toString().padStart(2, "0")}:${mins
    .toString()
    .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

/* ----------------------------------------
   ✅ Log App Usage API
   POST /api/activity/log
---------------------------------------- */
export const logActivity = async (req: Request, res: Response) => {
  try {
    const { userId, appName, duration } = req.body;

    if (!userId || !appName || !duration) {
      return res.status(400).json({
        success: false,
        message: "userId, appName and duration are required",
      });
    }

    const today = new Date().toISOString().split("T")[0];

    // Check if same app already exists today
    let existing = await ActivityLog.findOne({
      user: userId,
      appName,
      date: today,
    });

    if (existing) {
      existing.duration += duration;
      await existing.save();
    } else {
      await ActivityLog.create({
        user: userId,
        appName,
        duration,
        date: today,
      });
    }

    res.json({
      success: true,
      message: "Activity logged successfully",
    });
  } catch (error) {
    console.error("Activity Log Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/* ----------------------------------------
   ✅ Get Usage Stats API
   GET /api/activity/stats/:userId
---------------------------------------- */
export const getUsageStats = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const todayDate = new Date();
    const today = todayDate.toISOString().split("T")[0];

    const yesterdayDate = new Date();
    yesterdayDate.setDate(todayDate.getDate() - 1);
    const yesterday = yesterdayDate.toISOString().split("T")[0];

    const lastMonthDate = new Date();
    lastMonthDate.setDate(todayDate.getDate() - 30);
    const lastMonthISO = lastMonthDate.toISOString().split("T")[0];

    // ---------------------------
    // Today Total
    // ---------------------------
    const todayLogs = await ActivityLog.find({
      user: userId,
      date: today,
    });

    const todayTotalSeconds = todayLogs.reduce(
      (sum, log) => sum + log.duration,
      0
    );

    // ---------------------------
    // Yesterday Total
    // ---------------------------
    const yesterdayLogs = await ActivityLog.find({
      user: userId,
      date: yesterday,
    });

    const yesterdayTotalSeconds = yesterdayLogs.reduce(
      (sum, log) => sum + log.duration,
      0
    );

    // ---------------------------
    // Last Month Total
    // ---------------------------
    const monthLogs = await ActivityLog.find({
      user: userId,
      date: { $gte: lastMonthISO },
    });

    const monthTotalSeconds = monthLogs.reduce(
      (sum, log) => sum + log.duration,
      0
    );

    // ---------------------------
    // Most Used Apps Today
    // ---------------------------
    const mostUsedApps = todayLogs
      .map((log) => ({
        appName: log.appName,
        time: formatTime(log.duration),
        seconds: log.duration,
      }))
      .sort((a, b) => b.seconds - a.seconds);

    res.json({
      success: true,

      today: {
        total: formatTime(todayTotalSeconds),
      },

      yesterday: {
        total: formatTime(yesterdayTotalSeconds),
      },

      lastMonth: {
        total: formatTime(monthTotalSeconds),
      },

      mostUsedApps,
    });
  } catch (error) {
    console.error("Stats Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
