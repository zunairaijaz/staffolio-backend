import { Request, Response } from "express";
import User from "../models/User";
import { AuthRequest } from "../middlewares/authGuard";
import { sendMail } from "../utils/sendMail";
import bcrypt from "bcryptjs";
import TimeSession from "../models/TimeSession";
import mongoose from "mongoose";
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

export const getCompanyEmployeesWithHours = async (req: AuthRequest, res: Response) => {
  try {
    const loggedInUser = req.user as any;
    if (loggedInUser.role !== "COMPANY") {
      return res.status(403).json({ success: false, message: "Only companies can access employees" });
    }

    const companyId = loggedInUser.userId;

    // ✅ Get today's date string matching your DB format "YYYY-MM-DD"
    const todayStr = new Date().toISOString().split('T')[0]; 

    const employees = await User.find({ company: companyId })
      .select("_id name status email teamName")
      .sort({ createdAt: -1 });

    const employeeIds = employees.map(emp => emp._id);

    const todaySessions = await TimeSession.aggregate([
      {
        $match: {
          // ✅ Match by the string "date" field to avoid timezone offsets
          date: todayStr, 
          user: { $in: employeeIds }
        },
      },
      {
        $project: {
          user: 1,
          clockIn: 1,
          clockOut: 1,
          // ✅ Handle active sessions: if totalDuration is 0 or missing, calculate live
          duration: {
            $cond: {
              if: { $or: [{ $eq: ["$totalDuration", 0] }, { $not: ["$totalDuration"] }] },
              then: { $divide: [{ $subtract: [new Date(), "$clockIn"] }, 1000] },
              else: "$totalDuration",
            },
          },
        },
      },
      {
        $group: {
          _id: "$user",
          firstClockIn: { $min: "$clockIn" },
          lastClockOut: { $max: "$clockOut" },
          totalSeconds: { $sum: "$duration" },
        },
      },
    ]);

    const workingMap: Record<string, any> = {};
    todaySessions.forEach(session => {
      workingMap[session._id.toString()] = {
        firstClockIn: session.firstClockIn,
        lastClockOut: session.lastClockOut,
        totalHours: session.totalSeconds / 3600,
      };
    });

    const employeeData = employees.map(emp => {
      const workData = workingMap[emp._id.toString()] || {};
      return {
        id: emp._id,
        name: emp.name,
        status: emp.status,
        email: emp.email,
        team: emp.teamName,
        todayClockIn: workData.firstClockIn || null,
        todayClockOut: workData.lastClockOut || null,
        workingHours: workData.totalHours ? parseFloat(workData.totalHours.toFixed(2)) : 0,
      };
    });

    return res.status(200).json({
      success: true,
      employees: employeeData,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deactivateEmployee = async (req: AuthRequest, res: Response) => {
  try {
    const admin = req.user as any;

    // Ensure employeeId is a string
    let employeeId = req.params.id;
    if (Array.isArray(employeeId)) {
      employeeId = employeeId[0]; // take the first value
    }

    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return res.status(400).json({ success: false, message: "Invalid employee ID" });
    }

    // Only companies can deactivate their employees
    if (admin.role !== "COMPANY") {
      return res.status(403).json({ success: false, message: "Only companies can deactivate employees" });
    }

    // Make sure employee belongs to this company
    const employee = await User.findOne({ _id: employeeId, company: admin.userId });
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found in your company" });
    }

    // Update status to INACTIVE
    employee.status = "INACTIVE";
    await employee.save();

    return res.status(200).json({
      success: true,
      message: `${employee.name} has been deactivated successfully`,
      employee: {
        id: employee._id,
        name: employee.name,
        email: employee.email,
        status: employee.status,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || "Failed to deactivate employee" });
  }
};

export const getWeeklyPerformance = async (req: Request, res: Response) => {
  try {
    const employeeId = req.params.id; 

    // Simple dummy response for testing
    const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    const performance = weekDays.map(day => ({
      day,
      score: Math.floor(Math.random() * 100),
    }));

    res.json({ success: true, performance });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
