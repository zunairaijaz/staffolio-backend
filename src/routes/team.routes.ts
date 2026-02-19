import express from "express";
import { createTeam, deleteTeam, getAllTeams, getMyCompanyTeams, updateTeam } from "../controllers/teamController";
import { authGuard } from "../middlewares/authGuard";

const router = express.Router();

router.post("/create", authGuard, createTeam);
router.get("/", authGuard, getAllTeams);
router.put("/:teamId", authGuard, updateTeam);
router.delete("/:teamId", authGuard, deleteTeam);
router.get("/my-teams", authGuard, getMyCompanyTeams);

export default router;
