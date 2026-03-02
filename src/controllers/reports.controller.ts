import { Request, Response } from "express";
import mongoose from "mongoose";
import moment from "moment";
import ActivityLog from "../models/ActivityLog";
import User from "../models/User";

export const getAppUsageReport = async (req: Request, res: Response) => {
  try {
    const { employeeId, startDate, endDate, interval = "daily" } = req.query;

    const match: any = {};
    if (employeeId) {
      match.user = new mongoose.Types.ObjectId(employeeId as string);
    }

    if (startDate && endDate) {
      match.date = { $gte: startDate, $lte: endDate };
    }

    // Determine the date format for grouping based on interval
    let dateGroupId: any;
    switch (interval) {
      case "weekly": dateGroupId = { $dateToString: { format: "%Y-W%V", date: { $toDate: "$date" } } }; break;
      case "monthly": dateGroupId = { $dateToString: { format: "%Y-%m", date: { $toDate: "$date" } } }; break;
      default: dateGroupId = "$date"; // Daily
    }

    const reportData = await ActivityLog.aggregate([
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
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getMonthlyLogsReport = async (req: Request, res: Response) => {
  try {
    const { employeeId, startDate, endDate } = req.query;

    const match: any = {};
    if (employeeId) {
      match.user = new mongoose.Types.ObjectId(employeeId as string);
    }
    if (startDate && endDate) {
      match.startTime = { $gte: new Date(startDate as string), $lte: new Date(endDate as string) };
    }

    const logs = await ActivityLog.aggregate([
      { $match: match },

      // Convert startTime to just date string (YYYY-MM-DD) for grouping
      {
        $addFields: {
          day: {
            $dateToString: { format: "%Y-%m-%d", date: "$startTime" },
          },
        },
      },

      {
        $group: {
          _id: {
            user: "$user",
            day: "$day",
          },
          clockIn: { $min: "$startTime" },
          clockOut: { $max: "$endTime" },
          totalSeconds: { $sum: "$duration" },
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
          employeeId: "$_id.user",
          name: "$userDetails.name",
          email: "$userDetails.email",
          date: "$_id.day",
          clockIn: 1,
          clockOut: 1,
          totalHours: { $divide: ["$totalSeconds", 3600] },
        },
      },

      { $sort: { date: -1 } },
    ]);

    return res.status(200).json({ success: true, data: logs });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// --- API 2: ATTENDANCE SUMMARY (Updated) ---
export const getAttendanceReport = async (req: Request, res: Response) => {
  try {
    const { employeeId, month, year } = req.query;
    
    const startOfMonth = moment([parseInt(year as string), parseInt(month as string) - 1]).startOf('month');
    const endOfMonth = moment(startOfMonth).endOf('month');
    const daysInMonth = endOfMonth.date();

    const attendanceData = await ActivityLog.aggregate([
      { 
        $match: { 
          user: new mongoose.Types.ObjectId(employeeId as string),
          date: { $gte: startOfMonth.format("YYYY-MM-DD"), $lte: endOfMonth.format("YYYY-MM-DD") }
        } 
      },
      {
        $group: {
          _id: "$date",
          totalDuration: { $sum: "$duration" },
          firstEntry: { $min: "$startTime" }
        }
      },
      {
        $facet: {
          dailyStats: [
            {
              $project: {
                date: "$_id",
                status: { $cond: [{ $gt: ["$totalDuration", 0] }, "present", "absent"] },
                isLate: { $gt: [{ $hour: { $toDate: "$firstEntry" } }, 9] }
              }
            }
          ],
          summary: [
            {
              $group: {
                _id: null,
                presentDays: { $sum: 1 },
                lateDays: { $sum: { $cond: [{ $gt: [{ $hour: { $toDate: "$firstEntry" } }, 9] }, 1, 0] } }
              }
            }
          ]
        }
      }
    ]);

    const stats = attendanceData[0].summary[0] || { presentDays: 0, lateDays: 0 };
    const result = {
      dailyBreakdown: attendanceData[0].dailyStats,
      summary: {
        present: stats.presentDays,
        late: stats.lateDays,
        absent: Math.max(0, daysInMonth - stats.presentDays)
      }
    };

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error fetching attendance" });
  }
};