import { Request, Response } from "express";
import mongoose from "mongoose";
import moment from "moment";
import ActivityLog from "../models/ActivityLog";
import User from "../models/User";
import TimeSession from "../models/TimeSession";

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

// Import the correct model
export const getMonthlyLogsReport = async (req: Request, res: Response) => {
  try {
    const { employeeId, startDate, endDate } = req.query;

    const match: any = {};
    if (employeeId) {
      match.user = new mongoose.Types.ObjectId(employeeId as string);
    }

    // Filter by the 'clockIn' Date object
    if (startDate && endDate) {
      match.clockIn = { 
        $gte: new Date(startDate as string), 
        $lte: new Date(endDate as string) 
      };
    }

    const logs = await TimeSession.aggregate([
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
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getAttendanceReport = async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.query;

    if (!employeeId) {
      return res.status(400).json({ success: false, message: "Employee ID is required" });
    }

    // 1. Calculate Date Range (1st of current month to Now)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1); 
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const match: any = {
      user: new mongoose.Types.ObjectId(employeeId as string),
      clockIn: { $gte: startOfMonth, $lte: endOfToday }
    };

    const logs = await TimeSession.aggregate([
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
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};