import { Response } from "express";
import User from "../models/User";
import { AuthRequest } from "../middlewares/authGuard";

export const editProfile = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user as any;

    // 🔑 JWT payload uses `userId`
    const userId = user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User ID missing in token",
      });
    }

    const {
      firstName,
      lastName,
      email,
      phone,
      countryCode,
      teamName,
      dateOfBirth,
    } = req.body;

    const updateData: any = {};

    /* ------------------ Name ------------------ */
    if (firstName || lastName) {
      updateData.name = `${firstName || ""} ${lastName || ""}`.trim();
    }

    /* ------------------ Basic fields ------------------ */
    if (email) updateData.email = email.toLowerCase();
    if (phone) updateData.phone = phone;
    if (countryCode) updateData.countryCode = countryCode;
    if (teamName) updateData.teamName = teamName;

    /* ------------------ Date handling ------------------ */
    if (dateOfBirth) {
      updateData.dateOfBirth = new Date(dateOfBirth);
    }

    /* ------------------ Update user ------------------ */
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      {
        new: true,
        runValidators: true, // ✅ important
      }
    ).select("-password -otp -otpExpiry");

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Something went wrong",
    });
  }
};
/**
 * GET /api/users
 * Returns all users (excluding sensitive info)
 */
export const getAllUsers = async (req: AuthRequest, res: Response) => {
  try {
    const users = await User.find()
      .select("-password -otp -otpExpiry") 
      .sort({ createdAt: -1 }); 

    return res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Something went wrong",
    });
  }
};
