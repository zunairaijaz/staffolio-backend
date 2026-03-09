import { Response } from "express";
import mongoose from "mongoose";
import TimeSession from "../models/TimeSession";
import { AuthRequest } from "../middlewares/authGuard";
import { JwtPayload } from "jsonwebtoken";

/* ✅ Create a proper typed payload */
interface UserPayload extends JwtPayload {
  id: string;
  company: string;
  role?: string;
}
export const getEngagementTrends = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const user = req.user as UserPayload | undefined;

    const companyId =
      user?.company ||
      (req.headers["x-company-id"] as string) ||
      (req.query.companyId as string);

    if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
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

    const sessions = await TimeSession.aggregate([
      {
        $match: {
          company: new mongoose.Types.ObjectId(companyId),
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

    const result: any[] = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date(last7Days);
      date.setDate(last7Days.getDate() + i);

      const formatted = date.toISOString().split("T")[0];

      const found = sessions.find((s: any) => s.date === formatted);

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

  } catch (err: any) {
    console.error("Engagement Trends Error:", err);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

export const getActiveState = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const user = req.user as UserPayload | undefined;

    const companyId =
      user?.company ||
      (req.headers["x-company-id"] as string) ||
      (req.query.companyId as string);

    if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid company id",
      });
    }

    const activeUsers = await TimeSession.distinct("user", {
      company: companyId,
      isActive: true
    });

    const totalUsers = await mongoose.model("User").countDocuments({
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

  } catch (err: any) {
    console.error("Active State Error:", err);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};