"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTeamFullDetailsById = exports.getMyCompanyTeams = exports.deleteTeam = exports.updateTeam = exports.getAllTeams = exports.createTeam = void 0;
const Team_1 = __importDefault(require("../models/Team"));
const User_1 = __importDefault(require("../models/User"));
const mongoose_1 = __importDefault(require("mongoose"));
const TimeSession_1 = __importDefault(require("../models/TimeSession"));
const Screenshot_1 = __importDefault(require("../models/Screenshot"));
const createTeam = async (req, res) => {
    try {
        const company = req.user;
        const companyId = company.userId;
        const { teamName, teamLead, members } = req.body;
        if (!teamName)
            return res.status(400).json({ success: false, message: "Team name is required" });
        if (!teamLead)
            return res.status(400).json({ success: false, message: "Team lead is required" });
        // ✅ Check duplicate team inside same company only
        const existingTeam = await Team_1.default.findOne({
            teamName,
            company: companyId,
        });
        if (existingTeam)
            return res.status(400).json({
                success: false,
                message: "Team already exists in this company",
            });
        // ✅ Validate teamLead belongs to same company
        const leadUser = await User_1.default.findOne({
            _id: teamLead,
            company: companyId,
        });
        if (!leadUser)
            return res.status(400).json({
                success: false,
                message: "Team lead must belong to your company",
            });
        // ✅ Validate members belong to same company
        let memberIds = [];
        if (members && members.length > 0) {
            const users = await User_1.default.find({
                _id: { $in: members },
                company: companyId,
            });
            if (users.length !== members.length)
                return res.status(400).json({
                    success: false,
                    message: "All members must belong to your company",
                });
            memberIds = members.map((id) => new mongoose_1.default.Types.ObjectId(id));
        }
        const team = await Team_1.default.create({
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
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
exports.createTeam = createTeam;
const getAllTeams = async (req, res) => {
    try {
        const teams = await Team_1.default.find()
            .populate("members", "name email status")
            .populate("createdBy", "name email")
            .sort({ createdAt: -1 });
        return res.status(200).json({
            success: true,
            teams,
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
exports.getAllTeams = getAllTeams;
const updateTeam = async (req, res) => {
    try {
        const company = req.user;
        const companyId = company.userId;
        const { teamId } = req.params;
        const { teamName, teamLead, members } = req.body;
        // ✅ Find team only inside this company
        const team = await Team_1.default.findOne({
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
            const existing = await Team_1.default.findOne({
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
            const leadUser = await User_1.default.findOne({
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
            const users = await User_1.default.find({
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
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
exports.updateTeam = updateTeam;
const deleteTeam = async (req, res) => {
    try {
        const company = req.user;
        const companyId = company.userId;
        const { teamId } = req.params;
        // ✅ Only delete if team belongs to this company
        const team = await Team_1.default.findOne({
            _id: teamId,
            company: companyId,
        });
        if (!team) {
            return res.status(404).json({
                success: false,
                message: "Team not found in your company",
            });
        }
        await Team_1.default.findByIdAndDelete(teamId);
        return res.status(200).json({
            success: true,
            message: "Team deleted successfully",
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
exports.deleteTeam = deleteTeam;
const getMyCompanyTeams = async (req, res) => {
    try {
        // ✅ Logged-in company info comes from token
        const loggedUser = req.user;
        // companyId is stored inside JWT as userId
        const companyId = loggedUser.userId;
        if (!companyId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized: Company not found in token",
            });
        }
        // ✅ Fetch only teams of this company
        const teams = await Team_1.default.find({ company: companyId })
            .populate("teamLead", "name email status")
            .populate("members", "name email status")
            .sort({ createdAt: -1 });
        return res.status(200).json({
            success: true,
            count: teams.length,
            teams,
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
exports.getMyCompanyTeams = getMyCompanyTeams;
const getTeamFullDetailsById = async (req, res) => {
    try {
        const loggedUser = req.user;
        const companyId = loggedUser.userId;
        const { teamId } = req.params;
        if (!companyId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        if (!teamId) {
            return res.status(400).json({
                success: false,
                message: "Team ID is required",
            });
        }
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);
        // Get specific team
        const team = await Team_1.default.findOne({
            _id: teamId,
            company: companyId,
        })
            .populate("teamLead", "name email status")
            .populate("members", "name email status");
        if (!team) {
            return res.status(404).json({
                success: false,
                message: "Team not found",
            });
        }
        let totalTeamSeconds = 0;
        let totalProductivity = 0;
        let lateArrivals = 0;
        const membersData = [];
        for (const member of team.members) {
            // Get today's sessions
            const sessions = await TimeSession_1.default.find({
                user: member._id,
                company: companyId,
                date: todayStart.toISOString().split("T")[0],
            }).sort({ clockIn: 1 });
            let userTotalSeconds = 0;
            const sessionDetails = [];
            // Fetch screenshots linked to each session
            for (const session of sessions) {
                userTotalSeconds += session.totalDuration || 0;
                const screenshots = await Screenshot_1.default.find({
                    userId: member._id,
                    takenAt: { $gte: session.clockIn, $lte: session.clockOut || todayEnd },
                }).select("imageUrl takenAt");
                sessionDetails.push({
                    sessionId: session._id,
                    clockIn: session.clockIn,
                    clockOut: session.clockOut,
                    totalSeconds: session.totalDuration || 0,
                    screenshots: screenshots.length > 0 ? screenshots : null,
                });
            }
            // Fetch screenshots taken today but not linked to any session
            const todayScreenshots = await Screenshot_1.default.find({
                userId: member._id,
                takenAt: { $gte: todayStart, $lte: todayEnd },
                _id: { $nin: sessionDetails.flatMap((s) => s.screenshots ? s.screenshots.map((sc) => sc._id) : []) },
            }).select("imageUrl takenAt");
            totalTeamSeconds += userTotalSeconds;
            const productivity = userTotalSeconds > 0 ? Math.min((userTotalSeconds / 28800) * 100, 100) : 0;
            totalProductivity += productivity;
            // Late arrival (after 9:30 AM)
            const firstSession = sessions[0];
            if (firstSession) {
                const clockIn = new Date(firstSession.clockIn);
                if (clockIn.getHours() > 9 || (clockIn.getHours() === 9 && clockIn.getMinutes() > 30)) {
                    lateArrivals++;
                }
            }
            membersData.push({
                _id: member._id,
                name: member.name,
                email: member.email,
                status: member.status,
                totalHoursToday: (userTotalSeconds / 3600).toFixed(2),
                productivity: productivity.toFixed(2),
                sessions: sessionDetails,
                additionalScreenshots: todayScreenshots.length > 0 ? todayScreenshots : null, // ✅ Screenshots not linked to sessions
            });
        }
        return res.status(200).json({
            success: true,
            team: {
                teamId: team._id,
                teamName: team.teamName,
                teamLead: team.teamLead,
                totalTeamHoursToday: (totalTeamSeconds / 3600).toFixed(2),
                avgProductivity: team.members.length > 0
                    ? (totalProductivity / team.members.length).toFixed(2)
                    : 0,
                lateArrivals,
                members: membersData,
            },
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
exports.getTeamFullDetailsById = getTeamFullDetailsById;
