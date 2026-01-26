import { Response } from "express";
import TimeSession from "../models/TimeSession";
import { AuthRequest } from "../middlewares/authGuard";
import mongoose from "mongoose";

// Standardize ID extraction to avoid 401 errors
const getUserId = (req: AuthRequest) => {
  const user = req.user as any;
  return user?.id || user?._id || user?.sub;
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
    
    // This was likely your 401 trigger - improved safety check
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: "Unauthorized: Token valid but User ID not found in payload" 
      });
    }

    // Hubstaff Logic: The frontend tracks active time (subtracting idle time) 
    // and sends the total seconds worked in the request body.
    const { clientDurationSeconds } = req.body; 

    const session = await TimeSession.findOne({
      user: new mongoose.Types.ObjectId(userId),
      isActive: true,
    }).sort({ createdAt: -1 });

    if (!session) {
      return res.status(404).json({ success: false, message: "No active session found" });
    }

    const clockOutTime = new Date();
    session.clockOut = clockOutTime;
    session.isActive = false;

    // Use client-provided duration if available, otherwise calculate from timestamps
    session.totalDuration = clientDurationSeconds ?? Math.floor(
      (clockOutTime.getTime() - session.clockIn.getTime()) / 1000
    );

    await session.save();

    res.json({ 
      success: true, 
      message: "Clock-out successful", 
      durationMinutes: Math.floor((session.totalDuration ?? 0) / 60),
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
