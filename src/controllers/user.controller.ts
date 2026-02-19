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
    // ✅ Logged company info from token
    const loggedUser = req.user as any;
    const companyId = loggedUser.userId;

    if (!companyId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Company not found in token",
      });
    }

    // ✅ Count total employees of this company only
    const totalWorkforce = await User.countDocuments({
      company: companyId,
    });

    // ✅ Count active employees of this company
    const currentlyActive = await User.countDocuments({
      company: companyId,
      status: "ACTIVE",
    });

    // ✅ Count employees on leave of this company
    const onLeave = await User.countDocuments({
      company: companyId,
      status: "ON_LEAVE",
    });

    // ✅ Count team leads inside this company
    const teamLeads = await User.countDocuments({
      company: companyId,
      role: "TEAM_LEAD",
    });

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
      message: error.message || "Failed to fetch KPI",
    });
  }
};

export const onboardEmployee = async (req: AuthRequest, res: Response) => {
  try {
    const admin = req.user as any;
    
    // Debug: Check if your token actually has the ID
    console.log("Logged in Admin User Object:", admin);

    const companyId = admin.companyId || admin.userId; 

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: Token is missing company association",
      });
    }

    const { name, email, role, teamName } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, message: "Name and Email are required" });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "User already exists" });
    }

    const plainPassword = generatePassword();
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    // Create user
    const employee = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      company: companyId, // Now recognized by the schema
      role: role || "EMPLOYEE",
      teamName: teamName || admin.teamName,
      status: "ACTIVE",
      isVerified: true,
    });

    await sendMail(employee.email, "Welcome", `Email: ${employee.email} Pass: ${plainPassword}`);

    return res.status(201).json({
      success: true,
      message: "Employee onboarded successfully",
      employee: {
        id: employee._id,
        name: employee.name,
        email: employee.email,
        company: employee.company, // Will now show the ID
        role: employee.role,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getMyCompanyEmployees = async (req: AuthRequest, res: Response) => {
  try {
    const loggedInUser = req.user as any;

    // ✅ Company ID comes directly from token
    const companyId = loggedInUser.userId;

    // ✅ Only companies can access
    if (loggedInUser.role !== "COMPANY") {
      return res.status(403).json({
        success: false,
        message: "Only companies can access employees",
      });
    }

    // ✅ Fetch employees of this company
    const employees = await User.find({
      company: companyId,
    })
      .select("-password -otp -otpExpiry")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: employees.length,
      employees,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve company employees",
    });
  }
};
