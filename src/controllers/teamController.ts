import { Response } from "express";
import Team from "../models/Team";
import User from "../models/User";
import mongoose from "mongoose";
import { AuthRequest } from "../middlewares/authGuard";

export const createTeam = async (req: AuthRequest, res: Response) => {
  try {
    const admin = req.user as any;

    const { teamName, members } = req.body;

    // ✅ Validation
    if (!teamName) {
      return res.status(400).json({
        success: false,
        message: "Team name is required",
      });
    }

    // ✅ Check if team already exists
    const existingTeam = await Team.findOne({ teamName });

    if (existingTeam) {
      return res.status(400).json({
        success: false,
        message: "Team already exists",
      });
    }

    // ✅ Validate Members
    let memberIds: mongoose.Types.ObjectId[] = [];

    if (members && members.length > 0) {
      const users = await User.find({ _id: { $in: members } });

      if (users.length !== members.length) {
        return res.status(400).json({
          success: false,
          message: "One or more members are invalid user IDs",
        });
      }

      memberIds = members.map((id: string) => new mongoose.Types.ObjectId(id));
    }

    // ✅ Create Team
    const team = await Team.create({
      teamName,
      members: memberIds,
      createdBy: admin.userId,
    });

    return res.status(201).json({
      success: true,
      message: "Team created successfully",
      team,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getAllTeams = async (req: AuthRequest, res: Response) => {
  try {
    const teams = await Team.find()
      .populate("members", "name email status")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      teams,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateTeam = async (req: AuthRequest, res: Response) => {
  try {
    const { teamId } = req.params;
    const { teamName, members } = req.body;

    // ✅ Find team
    const team = await Team.findById(teamId);

    if (!team) {
      return res.status(404).json({
        success: false,
        message: "Team not found",
      });
    }

    // ✅ Update teamName
    if (teamName) {
      team.teamName = teamName;
    }

    // ✅ Update members
    if (members && Array.isArray(members)) {
      const users = await User.find({ _id: { $in: members } });

      if (users.length !== members.length) {
        return res.status(400).json({
          success: false,
          message: "Invalid member IDs provided",
        });
      }

      team.members = members;
    }

    await team.save();

    return res.status(200).json({
      success: true,
      message: "Team updated successfully",
      team,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteTeam = async (req: AuthRequest, res: Response) => {
  try {
    const { teamId } = req.params;

    const team = await Team.findById(teamId);

    if (!team) {
      return res.status(404).json({
        success: false,
        message: "Team not found",
      });
    }

    await Team.findByIdAndDelete(teamId);

    return res.status(200).json({
      success: true,
      message: "Team deleted successfully",
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
