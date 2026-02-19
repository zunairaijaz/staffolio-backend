import { Response } from "express";
import Team from "../models/Team";
import User from "../models/User";
import mongoose from "mongoose";
import { AuthRequest } from "../middlewares/authGuard";

export const createTeam = async (req: AuthRequest, res: Response) => {
  try {
    const company = req.user as any;
    const companyId = company.userId;

    const { teamName, teamLead, members } = req.body;

    if (!teamName)
      return res.status(400).json({ success: false, message: "Team name is required" });

    if (!teamLead)
      return res.status(400).json({ success: false, message: "Team lead is required" });

    // ✅ Check duplicate team inside same company only
    const existingTeam = await Team.findOne({
      teamName,
      company: companyId,
    });

    if (existingTeam)
      return res.status(400).json({
        success: false,
        message: "Team already exists in this company",
      });

    // ✅ Validate teamLead belongs to same company
    const leadUser = await User.findOne({
      _id: teamLead,
      company: companyId,
    });

    if (!leadUser)
      return res.status(400).json({
        success: false,
        message: "Team lead must belong to your company",
      });

    // ✅ Validate members belong to same company
    let memberIds: mongoose.Types.ObjectId[] = [];

    if (members && members.length > 0) {
      const users = await User.find({
        _id: { $in: members },
        company: companyId,
      });

      if (users.length !== members.length)
        return res.status(400).json({
          success: false,
          message: "All members must belong to your company",
        });

      memberIds = members.map(
        (id: string) => new mongoose.Types.ObjectId(id)
      );
    }

const team = await Team.create({
  teamName,
  teamLead,
  members,
  company: companyId,  
  createdBy: companyId,
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
    const company = req.user as any;
    const companyId = company.userId;

    const { teamId } = req.params;
    const { teamName, teamLead, members } = req.body;

    // ✅ Find team only inside this company
    const team = await Team.findOne({
      _id: teamId,
      company: companyId,
    });

    if (!team) {
      return res.status(404).json({
        success: false,
        message: "Team not found in your company",
      });
    }

    // ✅ Update team name (check duplicate inside same company)
    if (teamName) {
      const existing = await Team.findOne({
        teamName,
        company: companyId,
        _id: { $ne: teamId },
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          message: "Another team already exists with this name",
        });
      }

      team.teamName = teamName;
    }

    // ✅ Update team lead (must belong to same company)
    if (teamLead) {
      const leadUser = await User.findOne({
        _id: teamLead,
        company: companyId,
      });

      if (!leadUser) {
        return res.status(400).json({
          success: false,
          message: "Team lead must belong to your company",
        });
      }

      team.teamLead = teamLead;
    }

    // ✅ Update members (must belong to same company)
    if (members && Array.isArray(members)) {
      const users = await User.find({
        _id: { $in: members },
        company: companyId,
      });

      if (users.length !== members.length) {
        return res.status(400).json({
          success: false,
          message: "All members must belong to your company",
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
    const company = req.user as any;
    const companyId = company.userId;

    const { teamId } = req.params;

    // ✅ Only delete if team belongs to this company
    const team = await Team.findOne({
      _id: teamId,
      company: companyId,
    });

    if (!team) {
      return res.status(404).json({
        success: false,
        message: "Team not found in your company",
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
export const getMyCompanyTeams = async (req: AuthRequest, res: Response) => {
  try {
    // ✅ Logged-in company info comes from token
    const loggedUser = req.user as any;

    // companyId is stored inside JWT as userId
    const companyId = loggedUser.userId;

    if (!companyId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Company not found in token",
      });
    }

    // ✅ Fetch only teams of this company
    const teams = await Team.find({ company: companyId })
      .populate("teamLead", "name email status")
      .populate("members", "name email status")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: teams.length,
      teams,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
