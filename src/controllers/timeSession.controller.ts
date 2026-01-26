import { Response } from "express";
import TimeSession from "../models/TimeSession";
import { AuthRequest } from "../middlewares/authGuard";
import mongoose from "mongoose";

// Helper to get today's date in YYYY-MM-DD format
const getTodayDate = () => {
  const today = new Date();
  const offset = today.getTimezoneOffset();
  const localDate = new Date(today.getTime() - offset * 60 * 1000);
  return localDate.toISOString().split("T")[0];
};

// ================= CLOCK IN =================
export const clockIn = async (req: AuthRequest, res: Response) => {
  try {
    const userId = (req.user as any).id;
    const todayDate = getTodayDate();

    const activeSession = await TimeSession.findOne({
      user: userId,
      date: todayDate,
      isActive: true,
    });

    if (activeSession) {
      return res.status(400).json({
        success: false,
        message: "You are already clocked in",
      });
    }

    const session = await TimeSession.create({
      user: new mongoose.Types.ObjectId(userId),
      date: todayDate,         
      clockIn: new Date(),
      isActive: true,
    });

    res.json({
      success: true,
      message: "Clock-in successful",
      session,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ================= CLOCK OUT =================
export const clockOut = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user as any;
    
    // Attempt to grab the ID from all common JWT fields
    const userId = user?.id || user?._id || user?.sub;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: "User ID not found in token",
        payloadReceived: user // This helps you see what's wrong in the response
      });
    }

    // Use the ID to find the session
    const session = await TimeSession.findOne({
      user: new mongoose.Types.ObjectId(userId),
      isActive: true,
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "No active clock-in session found for this user",
      });
    }

    const clockOutTime = new Date();
    session.clockOut = clockOutTime;
    session.isActive = false;
    session.totalDuration = Math.floor(
      (clockOutTime.getTime() - session.clockIn.getTime()) / 1000
    );

    await session.save();

    res.json({ success: true, message: "Clock-out successful", session });
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
