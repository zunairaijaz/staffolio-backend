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

    let session = await TimeSession.findOne({ user: userId, isActive: true });

    if (session) {
      // Instead of failing, just return the active session
      return res.json({ 
        success: true, 
        message: "Already clocked in. Session resumed.", 
        session 
      });
    }

    // If no active session, create a new one
    session = await TimeSession.create({
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

    const { totalWorkedSeconds } = req.body || {};
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
    const sessions = await TimeSession.find({
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
    const companyId = req.headers["x-company-id"];
    if (!companyId) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized: Company ID missing" });
    }

    const { startDate, endDate, status } = req.query;

    // Convert companyId to ObjectId
    const companyObjectId = new mongoose.Types.ObjectId(companyId as string);

    // 1️⃣ Get all employees of this company
    const employees = await User.find({ company: companyObjectId }).select(
      "_id name email teamName status role"
    );

    if (!employees.length) {
      return res.json({ success: true, count: 0, logs: [] });
    }

    const employeeIds = employees.map((e) => e._id);

    // 2️⃣ Build TimeSession query
    const query: any = {
      user: { $in: employeeIds },
    };
    if (status === "active") query.isActive = true;
    if (status === "completed") query.isActive = false;

    if (startDate || endDate) query.clockIn = {};
    if (startDate) query.clockIn.$gte = new Date(startDate as string);
    if (endDate) query.clockIn.$lte = new Date(endDate as string);

    // 3️⃣ Fetch all sessions for these employees
    const sessions = await TimeSession.find(query)
      .populate({ path: "user", select: "_id name email teamName status role" })
      .sort({ clockIn: 1 }); // sort ascending to easily get first clock-in

    // 4️⃣ Group by employee
    const logsMap: Record<string, any> = {};

    sessions.forEach((s) => {
      const user = s.user as any;
      if (!user) return;

      if (!logsMap[user._id.toString()]) {
        logsMap[user._id.toString()] = {
          id: user._id,
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            department: user.teamName || "N/A",
            status: user.status || "Unknown",
          },
          clockIn: s.clockIn ? new Date(s.clockIn).toISOString() : null,
          clockOut: s.clockOut ? new Date(s.clockOut).toISOString() : null,
          duration: s.totalDuration ?? 0,
          isActive: s.isActive ?? false,
        };
      } else {
        // Update clockOut to latest
        const existing = logsMap[user._id.toString()];
        const sessionClockOut = s.clockOut ? new Date(s.clockOut) : null;
        if (sessionClockOut) {
          const existingClockOut = existing.clockOut
            ? new Date(existing.clockOut)
            : null;
          if (!existingClockOut || sessionClockOut > existingClockOut) {
            existing.clockOut = sessionClockOut.toISOString();
            // Recalculate duration if clockIn exists
            if (existing.clockIn) {
              const durationSeconds =
                Math.floor(
                  (sessionClockOut.getTime() - new Date(existing.clockIn).getTime()) /
                    1000
                ) || 0;
              existing.duration = durationSeconds;
            }
          }
        }
      }
    });

    // 5️⃣ Convert map to array and format duration
    const logs = Object.values(logsMap).map((l: any) => ({
      ...l,
      durationFormatted: new Date(l.duration * 1000)
        .toISOString()
        .substr(11, 8),
    }));

    return res.json({ success: true, count: logs.length, logs });
  } catch (error: any) {
    console.error("❌ getCompanyTimeLogs Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
export const getTodayTotalSeconds = async (req: AuthRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const todayDate = getTodayDate();

    // ✅ Get all today's sessions
    const sessions = await TimeSession.find({ user: userId, date: todayDate });

    let totalSeconds = 0;

    sessions.forEach((s) => {
      if (s.totalDuration) {
        totalSeconds += s.totalDuration;
      } else if (s.isActive && s.clockIn) {
        // If session is active, add elapsed time so far
        const elapsed = Math.floor((Date.now() - new Date(s.clockIn).getTime()) / 1000);
        totalSeconds += elapsed;
      }
    });

    res.json({ success: true, totalSeconds });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ================= MONTHLY EMPLOYEE DAILY LOGS + SCREENSHOTS =================
export const getEmployeeMonthlyLogs = async (req: AuthRequest, res: Response) => {
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

   const logs = await TimeSession.aggregate([
  {
    $match: {
      user: new mongoose.Types.ObjectId(employeeId as string),
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
            userId: new mongoose.Types.ObjectId(employeeId as string),
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
  } catch (error: any) {
    console.error("❌ getEmployeeMonthlyLogs Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};