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
const PRODUCTIVE_APPS = [
  "Visual Studio",
  "Postman",
  "Slack",
  "Figma",
  "Chrome", // for work-related sites only if you filter
  "IntelliJ",
  "VS Code",
  "Terminal",
  "Excel",
  "Github"
];const IDLE_APPS = ["Idle", "Whatsap", "Youtube", "Netflix", "Facebook", "Instagram"];

/* ----------------------------------------
   GET /api/activity/weekly/:userId
---------------------------------------- */
export const getLast7DaysActivity = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ success: false, message: "userId is required" });

    const today = new Date();
    const last7Days = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(today.getDate() - i);
      return d.toISOString().split("T")[0];
    }).reverse(); // oldest → newest

    const weeklyData: any[] = [];

    for (const date of last7Days) {
      const logs = await ActivityLog.find({ user: userId, date });

      let productiveSeconds = 0;
      let idleSeconds = 0;
      let manualSeconds = 0;

      logs.forEach((log) => {
        if (PRODUCTIVE_APPS.includes(log.appName)) {
          productiveSeconds += log.duration;
        } else if (log.appName.toLowerCase().includes("idle")) {
          idleSeconds += log.duration;
        } else {
          manualSeconds += log.duration;
        }
      });

      weeklyData.push({
        date,
        productive: productiveSeconds,
        idle: idleSeconds,
        manual: manualSeconds,
        total: productiveSeconds + idleSeconds + manualSeconds,
        formatted: {
          productive: formatTime(productiveSeconds),
          idle: formatTime(idleSeconds),
          manual: formatTime(manualSeconds),
        },
      });
    }

    res.json({ success: true, weeklyData });
  } catch (error: any) {
    console.error("Weekly Activity Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

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
export const getWeeklyPerformance = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const today = new Date();
    const weekDays: string[] = [];
    const performance: Record<
      string,
      { productive: number; manual: number; idle: number }
    > = {};

    // Initialize last 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dayStr = d.toISOString().split("T")[0];
      weekDays.push(dayStr);
      performance[dayStr] = { productive: 0, manual: 0, idle: 0 };
    }

    // Fetch all logs for the last 7 days
    const logs = await ActivityLog.find({
      user: userId,
      date: { $gte: weekDays[0], $lte: weekDays[6] },
    });

    // Aggregate
    logs.forEach((log) => {
      const day = log.date;
      if (!performance[day]) return;

      if (IDLE_APPS.includes(log.appName)) performance[day].idle += log.duration;
      else if (PRODUCTIVE_APPS.includes(log.appName))
        performance[day].productive += log.duration;
      else performance[day].manual += log.duration;
    });

    // Weekly chart data
    const chartData = weekDays.map((day) => ({
      date: day,
      productive: performance[day].productive,
      manual: performance[day].manual,
      idle: performance[day].idle,
    }));

    // Total activity status (percentage)
    let totalProd = 0,
      totalIdle = 0,
      totalManual = 0;
    weekDays.forEach((day) => {
      totalProd += performance[day].productive;
      totalIdle += performance[day].idle;
      totalManual += performance[day].manual;
    });
    const totalTime = totalProd + totalIdle + totalManual || 1; // prevent divide by zero

    const activityStatus = {
      productive: ((totalProd / totalTime) * 100).toFixed(2),
      idle: ((totalIdle / totalTime) * 100).toFixed(2),
      manual: ((totalManual / totalTime) * 100).toFixed(2),
    };

    res.json({
      success: true,
      chartData,
      activityStatus,
    });
  } catch (error) {
    console.error("Weekly Performance Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};