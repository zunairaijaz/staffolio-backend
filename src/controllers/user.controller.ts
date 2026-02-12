import { Response } from "express";
import User from "../models/User";
import { AuthRequest } from "../middlewares/authGuard";
import { sendMail } from "../utils/sendMail";
import bcrypt from "bcryptjs";
const generatePassword = () => {
  return Math.random().toString(36).slice(-8);
};
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
 
export const getUserKPI = async (req: AuthRequest, res: Response) => {
  try {
    // Count total employees
    const totalWorkforce = await User.countDocuments();

    // Count currently active employees
    const currentlyActive = await User.countDocuments({ status: "ACTIVE" });

    // Count employees on leave
    const onLeave = await User.countDocuments({ status: "ON_LEAVE" });

    // Count team leads (adjust according to your DB: role or isTeamLead field)
    const teamLeads = await User.countDocuments({ role: "TEAM_LEAD" }); 
    // or if you have a boolean field: { isTeamLead: true }

    return res.status(200).json({
      success: true,
      data: {
        totalWorkforce,
        currentlyActive,
        onLeave,
        teamLeads,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Something went wrong",
    });
  }
};

export const onboardEmployee = async (req: AuthRequest, res: Response) => {
  try {
    const admin = req.user as any;

    const { name, email, role, teamName } = req.body;

    // ✅ Validation
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: "Name and Email are required",
      });
    }

    // ✅ Check if already exists
    const existingUser = await User.findOne({
      email: email.toLowerCase(),
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists with this email",
      });
    }

    const plainPassword = generatePassword();
    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    const employee = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,

      role: role || "EMPLOYEE",
      teamName: teamName || admin.teamName,

      status: "ACTIVE",
      isVerified: true,
    });

    await sendMail(
      employee.email,
      "Welcome to Staffolio 🎉",
      `
        <h2>Hello ${employee.name},</h2>

        <p>You have been successfully onboarded into Staffolio Workforce System.</p>

        <h3>Your Login Credentials:</h3>
        <p><b>Email:</b> ${employee.email}</p>
        <p><b>Password:</b> ${plainPassword}</p>

        <p>Please login and change your password immediately.</p>

        <br/>
        <p>Regards,<br/>Staffolio HR Team</p>
      `
    );

    return res.status(201).json({
      success: true,
      message: "Employee onboarded successfully & credentials sent via email",
      employee: {
        id: employee._id,
        name: employee.name,
        email: employee.email,
        role: employee.role,
        status: employee.status,
        teamName: employee.teamName,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Onboarding failed",
    });
  }
};
