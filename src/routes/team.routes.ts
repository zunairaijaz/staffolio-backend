import express from "express";
import { createTeam, deleteTeam, getAllTeams, updateTeam } from "../controllers/teamController";
import { authGuard } from "../middlewares/authGuard";

const router = express.Router();

router.post("/create", authGuard, createTeam);
router.get("/", authGuard, getAllTeams);
router.put("/:teamId", authGuard, updateTeam);
router.delete("/:teamId", authGuard, deleteTeam);

export default router;
